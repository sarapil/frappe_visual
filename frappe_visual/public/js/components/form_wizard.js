/**
 * Frappe Visual — FormWizard
 * ============================
 * Multi-step guided form with validation, conditional steps,
 * progress indicator, data persistence, and review step.
 *
 * Usage:
 *   FormWizard.create({
 *     target: '#mount',
 *     steps: [
 *       { id: 'basic', title: 'Basic Info', icon: '📝', fields: [...] },
 *       { id: 'details', title: 'Details', icon: '📋', fields: [...], condition: data => data.type === 'advanced' },
 *       { id: 'review', title: 'Review', icon: '✅', type: 'review' }
 *     ],
 *     onSubmit: data => frappe.call({ method: '...', args: data }),
 *     theme: 'glass'
 *   });
 */

const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ── Field types ──────────────────────────────────────────── */
const FIELD_RENDERERS = {
	text(f, val) {
		return `<input class="fv-fwz-input" type="text" name="${_esc(f.fieldname)}" 
			value="${_esc(val)}" placeholder="${_esc(f.placeholder || f.label)}"
			${f.required ? 'required' : ''} ${f.readonly ? 'readonly' : ''}>`;
	},
	number(f, val) {
		return `<input class="fv-fwz-input" type="number" name="${_esc(f.fieldname)}" 
			value="${_esc(val)}" placeholder="${_esc(f.placeholder || '')}"
			${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}
			${f.required ? 'required' : ''}>`;
	},
	email(f, val) {
		return `<input class="fv-fwz-input" type="email" name="${_esc(f.fieldname)}" 
			value="${_esc(val)}" placeholder="${_esc(f.placeholder || 'email@example.com')}"
			${f.required ? 'required' : ''}>`;
	},
	password(f, val) {
		return `<input class="fv-fwz-input" type="password" name="${_esc(f.fieldname)}" 
			value="${_esc(val)}" placeholder="${_esc(f.placeholder || '')}"
			${f.required ? 'required' : ''}>`;
	},
	textarea(f, val) {
		return `<textarea class="fv-fwz-textarea" name="${_esc(f.fieldname)}" rows="${f.rows || 4}"
			placeholder="${_esc(f.placeholder || '')}" ${f.required ? 'required' : ''}>${_esc(val)}</textarea>`;
	},
	select(f, val) {
		const opts = (f.options || []).map(o => {
			const optVal = typeof o === 'string' ? o : o.value;
			const optLbl = typeof o === 'string' ? o : o.label;
			return `<option value="${_esc(optVal)}" ${optVal === val ? 'selected' : ''}>${_esc(optLbl)}</option>`;
		}).join('');
		return `<select class="fv-fwz-select" name="${_esc(f.fieldname)}" ${f.required ? 'required' : ''}>
			<option value="">${_esc(f.placeholder || '-- Select --')}</option>${opts}</select>`;
	},
	checkbox(f, val) {
		return `<label class="fv-fwz-check-label">
			<input type="checkbox" name="${_esc(f.fieldname)}" ${val ? 'checked' : ''}>
			<span>${_esc(f.label)}</span></label>`;
	},
	radio(f, val) {
		return (f.options || []).map(o => {
			const optVal = typeof o === 'string' ? o : o.value;
			const optLbl = typeof o === 'string' ? o : o.label;
			return `<label class="fv-fwz-radio-label">
				<input type="radio" name="${_esc(f.fieldname)}" value="${_esc(optVal)}" ${optVal === val ? 'checked' : ''}>
				<span>${_esc(optLbl)}</span></label>`;
		}).join('');
	},
	date(f, val) {
		return `<input class="fv-fwz-input" type="date" name="${_esc(f.fieldname)}" value="${_esc(val)}" ${f.required ? 'required' : ''}>`;
	},
	datetime(f, val) {
		return `<input class="fv-fwz-input" type="datetime-local" name="${_esc(f.fieldname)}" value="${_esc(val)}" ${f.required ? 'required' : ''}>`;
	},
	file(f) {
		return `<div class="fv-fwz-file-drop" data-field="${_esc(f.fieldname)}">
			<div class="fv-fwz-file-icon">📎</div>
			<div>Drag & drop or <label class="fv-fwz-file-browse">browse<input type="file" name="${_esc(f.fieldname)}" 
				${f.accept ? `accept="${_esc(f.accept)}"` : ''} ${f.multiple ? 'multiple' : ''} hidden></label></div>
			<div class="fv-fwz-file-hint">${_esc(f.hint || 'Max 10 MB')}</div></div>`;
	},
	section_break() { return `<hr class="fv-fwz-section-break">`; },
	column_break() { return `</div><div class="fv-fwz-column">`; },
	html(f) { return f.html || ''; },
	link(f, val) {
		return `<div class="fv-fwz-link-wrap">
			<input class="fv-fwz-input" type="text" name="${_esc(f.fieldname)}" value="${_esc(val)}"
				placeholder="${_esc(f.placeholder || `Search ${f.options || ''}...`)}" ${f.required ? 'required' : ''}
				data-link-doctype="${_esc(f.options || '')}">
			<span class="fv-fwz-link-icon">🔗</span></div>`;
	}
};

export class FormWizard {
	constructor(opts = {}) {
		this.opts = Object.assign({
			target: null,
			steps: [],
			theme: 'glass',       // glass | flat | minimal
			showStepNumbers: true,
			showProgress: true,
			allowSkip: false,
			saveKey: null,         // localStorage key for draft persistence
			onSubmit: null,
			onStepChange: null,
			onCancel: null,
			submitLabel: __('Submit'),
			nextLabel: __('Next'),
			prevLabel: __('Previous'),
			cancelLabel: __('Cancel'),
			dark: false
		}, opts);

		this.data = {};
		this.currentStep = 0;
		this.errors = {};
		this.el = null;

		// Restore draft
		if (this.opts.saveKey) {
			try {
				const saved = localStorage.getItem(`fv_wizard_${this.opts.saveKey}`);
				if (saved) this.data = JSON.parse(saved);
			} catch (e) { /* ignore */ }
		}

		if (this.opts.target) this._mount();
	}

	static create(opts) { return new FormWizard(opts); }

	/* ── Lifecycle ────────────────────────────────────────── */

	_mount() {
		const target = typeof this.opts.target === 'string'
			? document.querySelector(this.opts.target) : this.opts.target;
		if (!target) return;

		this.el = document.createElement('div');
		this.el.className = `fv-fwz fv-fwz--${this.opts.theme}${this.opts.dark ? ' fv-fwz--dark' : ''}`;
		target.appendChild(this.el);
		this.render();
	}

	destroy() { this.el?.remove(); }

	/* ── Steps ────────────────────────────────────────────── */

	get visibleSteps() {
		return this.opts.steps.filter(s => !s.condition || s.condition(this.data));
	}

	get activeStep() { return this.visibleSteps[this.currentStep]; }
	get isFirst() { return this.currentStep === 0; }
	get isLast() { return this.currentStep === this.visibleSteps.length - 1; }

	/* ── Render ───────────────────────────────────────────── */

	render() {
		if (!this.el) return;
		const steps = this.visibleSteps;
		const step = steps[this.currentStep];
		if (!step) return;

		const progressPct = ((this.currentStep + 1) / steps.length * 100).toFixed(0);

		this.el.innerHTML = `
			${this.opts.showProgress ? `<div class="fv-fwz-progress">
				<div class="fv-fwz-progress-bar"><div class="fv-fwz-progress-fill" style="width:${progressPct}%"></div></div>
				<span class="fv-fwz-progress-text">${this.currentStep + 1} / ${steps.length}</span>
			</div>` : ''}

			<div class="fv-fwz-stepper">
				${steps.map((s, i) => `
					<div class="fv-fwz-step ${i === this.currentStep ? 'active' : ''} ${i < this.currentStep ? 'done' : ''}"
						data-step="${i}">
						<div class="fv-fwz-step-dot">${i < this.currentStep ? '✓' : (this.opts.showStepNumbers ? i + 1 : (s.icon || ''))}</div>
						<div class="fv-fwz-step-label">${_esc(s.title)}</div>
					</div>
					${i < steps.length - 1 ? '<div class="fv-fwz-step-line"></div>' : ''}
				`).join('')}
			</div>

			<div class="fv-fwz-body">
				<h3 class="fv-fwz-title">${_esc(step.icon || '')} ${_esc(step.title)}</h3>
				${step.description ? `<p class="fv-fwz-desc">${_esc(step.description)}</p>` : ''}
				<div class="fv-fwz-fields">
					${step.type === 'review' ? this._renderReview(steps) : this._renderFields(step.fields || [])}
				</div>
			</div>

			<div class="fv-fwz-nav">
				<div class="fv-fwz-nav-left">
					${!this.isFirst ? `<button class="fv-fwz-btn" data-action="prev">${_esc(this.opts.prevLabel)}</button>` : ''}
					<button class="fv-fwz-btn fv-fwz-btn--ghost" data-action="cancel">${_esc(this.opts.cancelLabel)}</button>
				</div>
				<div class="fv-fwz-nav-right">
					${this.opts.allowSkip && !this.isLast ? `<button class="fv-fwz-btn fv-fwz-btn--ghost" data-action="skip">Skip</button>` : ''}
					${this.isLast
						? `<button class="fv-fwz-btn fv-fwz-btn--primary" data-action="submit">${_esc(this.opts.submitLabel)}</button>`
						: `<button class="fv-fwz-btn fv-fwz-btn--primary" data-action="next">${_esc(this.opts.nextLabel)}</button>`}
				</div>
			</div>
		`;

		this._bindEvents();
	}

	_renderFields(fields) {
		let html = '<div class="fv-fwz-columns"><div class="fv-fwz-column">';
		for (const f of fields) {
			const renderer = FIELD_RENDERERS[f.fieldtype || 'text'];
			if (!renderer) continue;
			const val = this.data[f.fieldname] ?? f.default ?? '';
			const errMsg = this.errors[f.fieldname];

			if (f.fieldtype === 'section_break' || f.fieldtype === 'column_break') {
				html += renderer(f, val);
				continue;
			}

			html += `<div class="fv-fwz-field ${f.hidden ? 'hidden' : ''} ${errMsg ? 'fv-fwz-field--error' : ''}">
				${f.fieldtype !== 'checkbox' ? `<label class="fv-fwz-label">${_esc(f.label)}${f.required ? ' <span class="fv-fwz-req">*</span>' : ''}</label>` : ''}
				${renderer(f, val)}
				${f.description ? `<div class="fv-fwz-help">${_esc(f.description)}</div>` : ''}
				${errMsg ? `<div class="fv-fwz-error">${_esc(errMsg)}</div>` : ''}
			</div>`;
		}
		html += '</div></div>';
		return html;
	}

	_renderReview(steps) {
		let html = '<div class="fv-fwz-review">';
		for (const step of steps) {
			if (step.type === 'review') continue;
			const fields = (step.fields || []).filter(f => !['section_break', 'column_break', 'html'].includes(f.fieldtype));
			if (!fields.length) continue;
			html += `<div class="fv-fwz-review-section">
				<h4 class="fv-fwz-review-title">${_esc(step.icon || '')} ${_esc(step.title)}</h4>
				<div class="fv-fwz-review-grid">
					${fields.map(f => `<div class="fv-fwz-review-item">
						<div class="fv-fwz-review-label">${_esc(f.label)}</div>
						<div class="fv-fwz-review-value">${_esc(this.data[f.fieldname] || '—')}</div>
					</div>`).join('')}
				</div>
			</div>`;
		}
		html += '</div>';
		return html;
	}

	/* ── Events ───────────────────────────────────────────── */

	_bindEvents() {
		this.el.querySelectorAll('[data-action]').forEach(btn => {
			btn.addEventListener('click', () => this._handleAction(btn.dataset.action));
		});

		this.el.querySelectorAll('[data-step]').forEach(dot => {
			dot.addEventListener('click', () => {
				const idx = parseInt(dot.dataset.step);
				if (idx < this.currentStep) this.goTo(idx);
			});
		});

		// Live data collection
		this.el.querySelectorAll('input, select, textarea').forEach(inp => {
			const ev = inp.type === 'checkbox' ? 'change' : 'input';
			inp.addEventListener(ev, () => this._collectField(inp));
		});

		// File drops
		this.el.querySelectorAll('.fv-fwz-file-drop').forEach(zone => {
			zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('fv-fwz-file-dragover'); });
			zone.addEventListener('dragleave', () => zone.classList.remove('fv-fwz-file-dragover'));
			zone.addEventListener('drop', e => {
				e.preventDefault(); zone.classList.remove('fv-fwz-file-dragover');
				const files = e.dataTransfer.files;
				const fn = zone.dataset.field;
				if (files.length && fn) { this.data[fn] = files; this._saveDraft(); }
			});
		});
	}

	_collectField(inp) {
		const name = inp.name;
		if (!name) return;
		if (inp.type === 'checkbox') this.data[name] = inp.checked;
		else if (inp.type === 'file') this.data[name] = inp.files;
		else this.data[name] = inp.value;
		// Clear error on edit
		delete this.errors[name];
		this._saveDraft();
	}

	_handleAction(action) {
		switch (action) {
			case 'next': this.next(); break;
			case 'prev': this.prev(); break;
			case 'skip': this.skip(); break;
			case 'submit': this.submit(); break;
			case 'cancel': this.cancel(); break;
		}
	}

	/* ── Navigation ───────────────────────────────────────── */

	validate() {
		this.errors = {};
		const step = this.activeStep;
		if (!step || step.type === 'review') return true;

		for (const f of (step.fields || [])) {
			if (!f.required) continue;
			const val = this.data[f.fieldname];
			if (val === undefined || val === null || val === '') {
				this.errors[f.fieldname] = __('This field is required');
			}
			// Custom validator
			if (f.validate && typeof f.validate === 'function') {
				const err = f.validate(val, this.data);
				if (err) this.errors[f.fieldname] = err;
			}
		}

		// Step-level validator
		if (step.validate) {
			const stepErr = step.validate(this.data);
			if (stepErr && typeof stepErr === 'object') Object.assign(this.errors, stepErr);
		}

		return Object.keys(this.errors).length === 0;
	}

	next() {
		if (!this.validate()) { this.render(); return; }
		if (!this.isLast) {
			this.currentStep++;
			this.render();
			this.opts.onStepChange?.(this.currentStep, this.activeStep, this.data);
		}
	}

	prev() {
		if (!this.isFirst) {
			this.currentStep--;
			this.render();
			this.opts.onStepChange?.(this.currentStep, this.activeStep, this.data);
		}
	}

	skip() {
		if (!this.isLast) {
			this.currentStep++;
			this.render();
		}
	}

	goTo(idx) {
		if (idx >= 0 && idx < this.visibleSteps.length) {
			this.currentStep = idx;
			this.render();
		}
	}

	async submit() {
		if (!this.validate()) { this.render(); return; }
		if (this.opts.onSubmit) {
			try {
				const btn = this.el.querySelector('[data-action="submit"]');
				if (btn) { btn.disabled = true; btn.textContent = __('Submitting...'); }
				await this.opts.onSubmit(this.data);
				this._clearDraft();
			} catch (e) {
				frappe.throw(e.message || __('Submission failed'));
			}
		}
	}

	cancel() {
		if (this.opts.onCancel) this.opts.onCancel(this.data);
	}

	/* ── Draft persistence ────────────────────────────────── */

	_saveDraft() {
		if (!this.opts.saveKey) return;
		try {
			const simple = {};
			for (const [k, v] of Object.entries(this.data)) {
				if (!(v instanceof FileList)) simple[k] = v;
			}
			localStorage.setItem(`fv_wizard_${this.opts.saveKey}`, JSON.stringify(simple));
		} catch (e) { /* ignore */ }
	}

	_clearDraft() {
		if (this.opts.saveKey) localStorage.removeItem(`fv_wizard_${this.opts.saveKey}`);
	}

	/* ── Public API ───────────────────────────────────────── */

	setData(obj) { Object.assign(this.data, obj); this.render(); }
	getData() { return { ...this.data }; }
	reset() { this.data = {}; this.currentStep = 0; this.errors = {}; this._clearDraft(); this.render(); }
}
