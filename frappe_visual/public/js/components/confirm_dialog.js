/**
 * FrappeVisual ConfirmDialog — Beautiful confirm/alert/prompt dialogs
 * ====================================================================
 * frappe.visual.ConfirmDialog.confirm({ title, message, ... })
 * frappe.visual.ConfirmDialog.alert({ title, message, ... })
 * frappe.visual.ConfirmDialog.prompt({ title, message, inputLabel, ... })
 */
export class ConfirmDialog {
	/**
	 * Confirm dialog — returns promise resolving to true/false
	 */
	static confirm(opts = {}) {
		return new Promise(resolve => {
			new ConfirmDialog({
				type: 'confirm',
				icon: opts.icon || ConfirmDialog._defaultIcon(opts.danger ? 'danger' : 'question'),
				...opts,
				onConfirm: () => resolve(true),
				onCancel: () => resolve(false),
			});
		});
	}

	/**
	 * Alert dialog — returns promise resolving when dismissed
	 */
	static alert(opts = {}) {
		return new Promise(resolve => {
			new ConfirmDialog({
				type: 'alert',
				icon: opts.icon || ConfirmDialog._defaultIcon(opts.variant || 'info'),
				cancelLabel: null,
				...opts,
				onConfirm: () => resolve(),
			});
		});
	}

	/**
	 * Prompt dialog — returns promise resolving to input value or null
	 */
	static prompt(opts = {}) {
		return new Promise(resolve => {
			new ConfirmDialog({
				type: 'prompt',
				icon: opts.icon || ConfirmDialog._defaultIcon('question'),
				...opts,
				onConfirm: (val) => resolve(val),
				onCancel: () => resolve(null),
			});
		});
	}

	constructor(opts = {}) {
		this.o = Object.assign({
			type: 'confirm',
			title: '',
			message: '',
			icon: null,
			confirmLabel: __('Confirm'),
			cancelLabel: __('Cancel'),
			danger: false,
			inputLabel: '',
			inputPlaceholder: '',
			inputDefault: '',
			inputType: 'text',
			onConfirm: null,
			onCancel: null,
		}, opts);

		this._build();
		this._bind();
		document.body.appendChild(this.overlay);
		requestAnimationFrame(() => this.overlay.classList.add('fv-cd-visible'));
	}

	_build() {
		const o = this.o;
		this.overlay = document.createElement('div');
		this.overlay.className = 'fv-cd-overlay';

		const dialog = document.createElement('div');
		dialog.className = `fv-cd ${o.danger ? 'fv-cd-danger' : ''}`;
		dialog.setAttribute('role', 'dialog');
		dialog.setAttribute('aria-modal', 'true');

		let html = '';
		if (o.icon) html += `<div class="fv-cd-icon">${o.icon}</div>`;
		if (o.title) html += `<div class="fv-cd-title">${ConfirmDialog._esc(o.title)}</div>`;
		if (o.message) html += `<div class="fv-cd-msg">${ConfirmDialog._esc(o.message)}</div>`;

		if (o.type === 'prompt') {
			html += `<div class="fv-cd-input-wrap">`;
			if (o.inputLabel) html += `<label class="fv-cd-input-label">${ConfirmDialog._esc(o.inputLabel)}</label>`;
			html += `<input class="fv-cd-input" type="${o.inputType}" placeholder="${ConfirmDialog._esc(o.inputPlaceholder)}" value="${ConfirmDialog._esc(o.inputDefault)}" />`;
			html += `</div>`;
		}

		html += `<div class="fv-cd-footer">`;
		if (o.cancelLabel) html += `<button class="fv-cd-btn fv-cd-btn-cancel">${ConfirmDialog._esc(o.cancelLabel)}</button>`;
		html += `<button class="fv-cd-btn fv-cd-btn-confirm ${o.danger ? 'fv-cd-btn-danger' : ''}">${ConfirmDialog._esc(o.confirmLabel)}</button>`;
		html += `</div>`;

		dialog.innerHTML = html;
		this.overlay.appendChild(dialog);
		this.dialog = dialog;
	}

	_bind() {
		const o = this.o;
		const close = () => {
			this.overlay.classList.remove('fv-cd-visible');
			this.overlay.addEventListener('transitionend', () => this.overlay.remove(), { once: true });
		};

		this.dialog.querySelector('.fv-cd-btn-confirm').onclick = () => {
			if (o.type === 'prompt') {
				const val = this.dialog.querySelector('.fv-cd-input').value;
				if (o.onConfirm) o.onConfirm(val);
			} else {
				if (o.onConfirm) o.onConfirm();
			}
			close();
		};

		const cancelBtn = this.dialog.querySelector('.fv-cd-btn-cancel');
		if (cancelBtn) cancelBtn.onclick = () => { if (o.onCancel) o.onCancel(); close(); };

		// Overlay click
		this.overlay.addEventListener('click', (e) => {
			if (e.target === this.overlay) { if (o.onCancel) o.onCancel(); close(); }
		});

		// Keyboard
		this._keyHandler = (e) => {
			if (e.key === 'Escape') { if (o.onCancel) o.onCancel(); close(); document.removeEventListener('keydown', this._keyHandler); }
			if (e.key === 'Enter' && o.type !== 'prompt') { this.dialog.querySelector('.fv-cd-btn-confirm').click(); document.removeEventListener('keydown', this._keyHandler); }
		};
		document.addEventListener('keydown', this._keyHandler);

		// Focus input in prompt
		if (o.type === 'prompt') {
			requestAnimationFrame(() => {
				const inp = this.dialog.querySelector('.fv-cd-input');
				if (inp) { inp.focus(); inp.select(); }
			});
		}
	}

	static _defaultIcon(type) {
		const icons = {
			question: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fv-primary, #6366f1)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
			danger:  '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
			info:    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--fv-primary, #6366f1)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
			success: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
		};
		return icons[type] || icons.info;
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
