// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual SegmentedControl — Button group toggle
 * =====================================================
 * frappe.visual.SegmentedControl.create({ container, items, ... })
 */
export class SegmentedControl {
	static create(opts = {}) { return new SegmentedControl(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			items: [],              // [{ value, label, icon?, disabled? }]
			value: null,
			size: 'md',             // sm | md | lg
			fullWidth: false,
			variant: 'default',     // default | pill | underline
			onChange: null,
		}, opts);

		if (!this.o.value && this.o.items.length) this.o.value = this.o.items[0].value;
		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-seg fv-seg-${o.variant} fv-seg-${o.size}${o.fullWidth ? ' fv-seg-full' : ''}`;
		this.el.innerHTML = o.items.map(item => {
			const active = item.value === o.value ? ' fv-seg-active' : '';
			const disabled = item.disabled ? ' fv-seg-disabled' : '';
			return `<button class="fv-seg-btn${active}${disabled}" data-value="${SegmentedControl._esc(String(item.value))}" ${item.disabled ? 'disabled' : ''}>
				${item.icon ? `<span class="fv-seg-icon">${item.icon}</span>` : ''}
				${item.label ? `<span>${SegmentedControl._esc(item.label)}</span>` : ''}
			</button>`;
		}).join('');

		this.el.querySelectorAll('.fv-seg-btn').forEach(btn => {
			btn.onclick = () => {
				if (btn.disabled) return;
				const val = btn.dataset.value;
				if (val === String(this.o.value)) return;
				this.o.value = val;
				this._render();
				if (this.o.onChange) this.o.onChange(val);
			};
		});
	}

	getValue() { return this.o.value; }
	setValue(v) { this.o.value = v; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
