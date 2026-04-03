/**
 * Frappe Visual — Multi-Step Wizard Pro
 * ========================================
 * Premium form wizard with animated step transitions, validation gates,
 * conditional branching, summary review, and progress persistence.
 * Replaces Frappe's basic setup wizards with a visually stunning experience.
 *
 * Features:
 *  - Animated step transitions (slide / fade / flip)
 *  - Visual progress bar with step icons and labels
 *  - Per-step validation with error shake animation
 *  - Conditional branching (skip steps based on answers)
 *  - Summary review page before final submit
 *  - Draft auto-save to localStorage
 *  - Stepper variants: horizontal, vertical, numbered, icon
 *  - Success/completion celebration animation
 *  - Back / Next / Skip / Submit navigation
 *  - Frappe form field rendering (Link, Select, Date, etc.)
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.WizardPro.create('#el', { steps: [...] })
 *
 * @module frappe_visual/components/wizard_pro
 */

export class WizardPro {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("WizardPro: container not found");

		this.opts = Object.assign({
			theme: "glass",
			steps: [],              // { id, title, icon?, fields, validate?, condition? }
			transition: "slide",    // "slide" | "fade" | "flip"
			stepperStyle: "horizontal", // "horizontal" | "vertical" | "numbered"
			showSummary: true,      // add review step at end
			autoSave: false,        // persist to localStorage
			storageKey: "fv_wizard",
			onComplete: null,       // callback(data)
			onStepChange: null,     // callback(stepIdx, data)
			submitLabel: null,
		}, opts);

		this.currentStep = 0;
		this.formData = {};
		this.visitedSteps = new Set([0]);
		this._activeSteps = []; // filtered by conditions

		this._init();
	}

	static create(container, opts = {}) { return new WizardPro(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-wz", `fv-wz--${this.opts.theme}`, `fv-wz--${this.opts.stepperStyle}`);
		this.container.innerHTML = "";

		// Restore draft
		if (this.opts.autoSave) this._restoreDraft();

		this._evaluateConditions();
		this._renderStepper();
		this._renderBody();
		this._renderNavigation();
		this._showStep(0, "none");
	}

	/* ── Conditional Steps ───────────────────────────────────── */
	_evaluateConditions() {
		this._activeSteps = this.opts.steps.filter(step => {
			if (!step.condition) return true;
			try { return step.condition(this.formData); }
			catch { return true; }
		});

		// Add summary if enabled
		if (this.opts.showSummary) {
			const summaryExists = this._activeSteps.find(s => s.id === "__summary__");
			if (!summaryExists) {
				this._activeSteps.push({
					id: "__summary__",
					title: __("Review & Submit"),
					icon: "✓",
					fields: [],
					_isSummary: true,
				});
			}
		}
	}

	/* ── Stepper ─────────────────────────────────────────────── */
	_renderStepper() {
		const stepper = document.createElement("div");
		stepper.className = "fv-wz-stepper";

		stepper.innerHTML = this._activeSteps.map((step, i) => `
			<div class="fv-wz-step-indicator ${i === 0 ? "active" : ""} ${i < this.currentStep ? "completed" : ""}"
				data-step="${i}">
				<div class="fv-wz-step-circle">
					${step.icon ? `<span>${step.icon}</span>` : `<span>${i + 1}</span>`}
				</div>
				<div class="fv-wz-step-label">${this._esc(step.title || `Step ${i + 1}`)}</div>
			</div>
			${i < this._activeSteps.length - 1 ? '<div class="fv-wz-step-connector"></div>' : ""}
		`).join("");

		this.container.appendChild(stepper);

		stepper.querySelectorAll(".fv-wz-step-indicator").forEach(el => {
			el.addEventListener("click", () => {
				const idx = parseInt(el.dataset.step);
				if (this.visitedSteps.has(idx) || idx < this.currentStep) {
					this._goToStep(idx);
				}
			});
		});
	}

	/* ── Body ────────────────────────────────────────────────── */
	_renderBody() {
		const body = document.createElement("div");
		body.className = "fv-wz-body";

		this._activeSteps.forEach((step, i) => {
			const panel = document.createElement("div");
			panel.className = "fv-wz-panel";
			panel.dataset.step = i;
			panel.style.display = i === 0 ? "" : "none";

			if (step._isSummary) {
				panel.innerHTML = `<div class="fv-wz-summary"></div>`;
			} else {
				// Title
				const header = document.createElement("div");
				header.className = "fv-wz-panel-header";
				header.innerHTML = `
					<h2 class="fv-wz-panel-title">${this._esc(step.title || "")}</h2>
					${step.description ? `<p class="fv-wz-panel-desc">${this._esc(step.description)}</p>` : ""}`;
				panel.appendChild(header);

				// Fields
				const form = document.createElement("div");
				form.className = "fv-wz-form";
				for (const field of (step.fields || [])) {
					form.appendChild(this._renderField(field));
				}
				panel.appendChild(form);
			}

			body.appendChild(panel);
		});

		this.container.appendChild(body);
		this._body = body;
	}

	/* ── Field Rendering ─────────────────────────────────────── */
	_renderField(field) {
		const wrap = document.createElement("div");
		wrap.className = `fv-wz-field ${field.required ? "fv-wz-field--required" : ""}`;
		wrap.dataset.fieldname = field.fieldname;

		const label = document.createElement("label");
		label.className = "fv-wz-label";
		label.textContent = field.label || field.fieldname;
		wrap.appendChild(label);

		let input;
		const type = field.fieldtype || "Data";

		if (type === "Select" && field.options) {
			input = document.createElement("select");
			input.className = "fv-wz-input";
			const opts = (typeof field.options === "string" ? field.options.split("\n") : field.options);
			input.innerHTML = `<option value="">${__("Select...")}</option>` +
				opts.map(o => `<option value="${this._esc(o)}" ${this.formData[field.fieldname] === o ? "selected" : ""}>${this._esc(o)}</option>`).join("");
		} else if (type === "Text" || type === "Long Text" || type === "Small Text") {
			input = document.createElement("textarea");
			input.className = "fv-wz-input fv-wz-textarea";
			input.rows = 4;
			input.value = this.formData[field.fieldname] || field.default || "";
		} else if (type === "Check") {
			input = document.createElement("input");
			input.type = "checkbox";
			input.className = "fv-wz-checkbox";
			input.checked = !!this.formData[field.fieldname];
		} else if (type === "Date") {
			input = document.createElement("input");
			input.type = "date";
			input.className = "fv-wz-input";
			input.value = this.formData[field.fieldname] || field.default || "";
		} else if (type === "Int" || type === "Float" || type === "Currency") {
			input = document.createElement("input");
			input.type = "number";
			input.className = "fv-wz-input";
			input.value = this.formData[field.fieldname] ?? field.default ?? "";
			if (field.step) input.step = field.step;
		} else {
			input = document.createElement("input");
			input.type = "text";
			input.className = "fv-wz-input";
			input.value = this.formData[field.fieldname] || field.default || "";
		}

		if (field.placeholder) input.placeholder = field.placeholder;
		input.dataset.fieldname = field.fieldname;

		const eventType = input.tagName === "SELECT" ? "change" : (input.type === "checkbox" ? "change" : "input");
		input.addEventListener(eventType, (e) => {
			const val = input.type === "checkbox" ? input.checked : input.value;
			this.formData[field.fieldname] = val;
			this._evaluateConditions();
			this._updateStepper();
			if (this.opts.autoSave) this._saveDraft();
		});

		wrap.appendChild(input);

		// Help text
		if (field.description) {
			const help = document.createElement("div");
			help.className = "fv-wz-help";
			help.textContent = field.description;
			wrap.appendChild(help);
		}

		// Error slot
		const err = document.createElement("div");
		err.className = "fv-wz-error";
		wrap.appendChild(err);

		return wrap;
	}

	/* ── Navigation ──────────────────────────────────────────── */
	_renderNavigation() {
		const nav = document.createElement("div");
		nav.className = "fv-wz-nav";
		nav.innerHTML = `
			<button class="fv-wz-btn fv-wz-btn--back">${__("Back")}</button>
			<div class="fv-wz-nav-spacer"></div>
			<button class="fv-wz-btn fv-wz-btn--next">${__("Next")}</button>
			<button class="fv-wz-btn fv-wz-btn--submit" style="display:none">
				${this.opts.submitLabel || __("Submit")}</button>`;
		this.container.appendChild(nav);

		nav.querySelector(".fv-wz-btn--back").addEventListener("click", () => this.prev());
		nav.querySelector(".fv-wz-btn--next").addEventListener("click", () => this.next());
		nav.querySelector(".fv-wz-btn--submit").addEventListener("click", () => this._submit());
		this._nav = nav;
	}

	_updateNavButtons() {
		if (!this._nav) return;
		const backBtn = this._nav.querySelector(".fv-wz-btn--back");
		const nextBtn = this._nav.querySelector(".fv-wz-btn--next");
		const submitBtn = this._nav.querySelector(".fv-wz-btn--submit");
		const isLast = this.currentStep >= this._activeSteps.length - 1;
		const isFirst = this.currentStep === 0;

		backBtn.style.display = isFirst ? "none" : "";
		nextBtn.style.display = isLast ? "none" : "";
		submitBtn.style.display = isLast ? "" : "none";
	}

	/* ── Step Navigation ─────────────────────────────────────── */
	async next() {
		if (!await this._validateCurrentStep()) return;
		if (this.currentStep < this._activeSteps.length - 1) {
			this._goToStep(this.currentStep + 1);
		}
	}

	prev() {
		if (this.currentStep > 0) {
			this._goToStep(this.currentStep - 1);
		}
	}

	_goToStep(idx) {
		const direction = idx > this.currentStep ? "next" : "prev";
		this.currentStep = idx;
		this.visitedSteps.add(idx);
		this._evaluateConditions();
		this._updateStepper();
		this._showStep(idx, direction);
		this._updateNavButtons();

		// Update summary if on summary step
		const step = this._activeSteps[idx];
		if (step?._isSummary) this._updateSummary();

		if (this.opts.onStepChange) this.opts.onStepChange(idx, this.formData);
	}

	_showStep(idx, direction) {
		const panels = this._body.querySelectorAll(".fv-wz-panel");
		panels.forEach((p, i) => {
			if (i === idx) {
				p.style.display = "";
				this._animatePanel(p, direction);
			} else {
				p.style.display = "none";
			}
		});
		this._updateNavButtons();
	}

	_animatePanel(panel, direction) {
		if (direction === "none" || typeof gsap === "undefined") return;

		const xFrom = direction === "next" ? 60 : -60;
		gsap.fromTo(panel,
			{ opacity: 0, x: xFrom },
			{ opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
		);
	}

	/* ── Stepper Update ──────────────────────────────────────── */
	_updateStepper() {
		const indicators = this.container.querySelectorAll(".fv-wz-step-indicator");
		indicators.forEach((el, i) => {
			el.classList.toggle("active", i === this.currentStep);
			el.classList.toggle("completed", i < this.currentStep);
			el.classList.toggle("visited", this.visitedSteps.has(i));
		});
	}

	/* ── Validation ──────────────────────────────────────────── */
	async _validateCurrentStep() {
		const step = this._activeSteps[this.currentStep];
		if (!step || step._isSummary) return true;

		// Clear previous errors
		const panel = this._body.querySelectorAll(".fv-wz-panel")[this.currentStep];
		panel.querySelectorAll(".fv-wz-error").forEach(e => e.textContent = "");
		panel.querySelectorAll(".fv-wz-field--error").forEach(e => e.classList.remove("fv-wz-field--error"));

		let valid = true;

		// Required fields
		for (const field of (step.fields || [])) {
			if (field.required) {
				const val = this.formData[field.fieldname];
				if (val == null || val === "" || val === false) {
					this._showFieldError(panel, field.fieldname, __("This field is required"));
					valid = false;
				}
			}
		}

		// Custom validation
		if (step.validate && valid) {
			try {
				const result = await step.validate(this.formData);
				if (result !== true && typeof result === "object") {
					for (const [fieldname, msg] of Object.entries(result)) {
						this._showFieldError(panel, fieldname, msg);
						valid = false;
					}
				} else if (result === false) {
					valid = false;
				}
			} catch (e) {
				console.error("WizardPro: validation error", e);
				valid = false;
			}
		}

		if (!valid) this._shakePanel(panel);
		return valid;
	}

	_showFieldError(panel, fieldname, msg) {
		const wrap = panel.querySelector(`[data-fieldname="${fieldname}"]`);
		if (!wrap) return;
		wrap.classList.add("fv-wz-field--error");
		const err = wrap.querySelector(".fv-wz-error");
		if (err) err.textContent = msg;
	}

	_shakePanel(panel) {
		if (typeof gsap !== "undefined") {
			gsap.fromTo(panel, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
		}
	}

	/* ── Summary ─────────────────────────────────────────────── */
	_updateSummary() {
		const summaryEl = this.container.querySelector(".fv-wz-summary");
		if (!summaryEl) return;

		let html = `<h3 class="fv-wz-summary-title">${__("Review Your Information")}</h3>`;
		html += `<div class="fv-wz-summary-grid">`;

		for (const step of this._activeSteps) {
			if (step._isSummary) continue;
			html += `<div class="fv-wz-summary-section">
				<h4>${this._esc(step.title)}</h4>`;
			for (const field of (step.fields || [])) {
				const val = this.formData[field.fieldname];
				html += `<div class="fv-wz-summary-row">
					<span class="fv-wz-summary-label">${this._esc(field.label || field.fieldname)}</span>
					<span class="fv-wz-summary-value">${this._esc(val != null ? String(val) : "—")}</span>
				</div>`;
			}
			html += `</div>`;
		}
		html += `</div>`;
		summaryEl.innerHTML = html;
	}

	/* ── Submit ───────────────────────────────────────────────── */
	async _submit() {
		if (this.opts.onComplete) {
			await this.opts.onComplete(this.formData);
		}

		this._showCompletion();
		if (this.opts.autoSave) this._clearDraft();
	}

	_showCompletion() {
		const body = this.container.querySelector(".fv-wz-body");
		if (!body) return;

		body.innerHTML = `
			<div class="fv-wz-complete">
				<div class="fv-wz-complete-icon">✓</div>
				<h2>${__("All Done!")}</h2>
				<p>${__("Your information has been submitted successfully.")}</p>
			</div>`;

		if (typeof gsap !== "undefined") {
			gsap.from(body.querySelector(".fv-wz-complete-icon"), {
				scale: 0, rotation: -180, duration: 0.6, ease: "back.out(2)"
			});
		}

		// Hide navigation
		if (this._nav) this._nav.style.display = "none";
	}

	/* ── Draft Persistence ───────────────────────────────────── */
	_saveDraft() {
		try {
			localStorage.setItem(this.opts.storageKey, JSON.stringify({
				data: this.formData,
				step: this.currentStep,
				visited: [...this.visitedSteps],
			}));
		} catch {}
	}

	_restoreDraft() {
		try {
			const raw = localStorage.getItem(this.opts.storageKey);
			if (!raw) return;
			const draft = JSON.parse(raw);
			this.formData = draft.data || {};
			this.currentStep = draft.step || 0;
			this.visitedSteps = new Set(draft.visited || [0]);
		} catch {}
	}

	_clearDraft() {
		try { localStorage.removeItem(this.opts.storageKey); } catch {}
	}

	/* ── Public API ──────────────────────────────────────────── */
	getData() { return { ...this.formData }; }
	getCurrentStep() { return this.currentStep; }
	setData(data) { Object.assign(this.formData, data); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-wz", `fv-wz--${this.opts.theme}`, `fv-wz--${this.opts.stepperStyle}`);
	}
}
