// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual NumberStepper — +/- stepper input
 * =================================================
 * frappe.visual.NumberStepper.create({ container, ... })
 */
export class NumberStepper {
	static create(opts = {}) { return new NumberStepper(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			value: 0,
			min: -Infinity,
			max: Infinity,
			step: 1,
			precision: 0,
			size: 'md',
			disabled: false,
			showInput: true,
			prefix: '',
			suffix: '',
			variant: 'default',     // default | compact | horizontal
			onChange: null,
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		const atMin = o.value <= o.min;
		const atMax = o.value >= o.max;
		this.el.className = `fv-ns fv-ns-${o.variant} fv-ns-${o.size}${o.disabled ? ' fv-ns-disabled' : ''}`;

		this.el.innerHTML = `
			<button class="fv-ns-btn fv-ns-dec${atMin ? ' fv-ns-btn-disabled' : ''}" ${atMin || o.disabled ? 'disabled' : ''}>−</button>
			${o.showInput ? `<div class="fv-ns-display">
				${o.prefix ? `<span class="fv-ns-prefix">${NumberStepper._esc(o.prefix)}</span>` : ''}
				<input class="fv-ns-input" type="number" value="${o.value.toFixed(o.precision)}" min="${o.min}" max="${o.max}" step="${o.step}" ${o.disabled ? 'disabled' : ''}/>
				${o.suffix ? `<span class="fv-ns-suffix">${NumberStepper._esc(o.suffix)}</span>` : ''}
			</div>` : `<span class="fv-ns-value">${o.prefix}${o.value.toFixed(o.precision)}${o.suffix}</span>`}
			<button class="fv-ns-btn fv-ns-inc${atMax ? ' fv-ns-btn-disabled' : ''}" ${atMax || o.disabled ? 'disabled' : ''}>+</button>
		`;

		this.el.querySelector('.fv-ns-dec').onclick = () => this._step(-1);
		this.el.querySelector('.fv-ns-inc').onclick = () => this._step(1);

		const inp = this.el.querySelector('.fv-ns-input');
		if (inp) {
			inp.onchange = () => {
				let v = parseFloat(inp.value);
				if (isNaN(v)) v = o.min > -Infinity ? o.min : 0;
				this._setValue(v);
			};
		}
	}

	_step(dir) {
		this._setValue(this.o.value + dir * this.o.step);
	}

	_setValue(v) {
		v = Math.max(this.o.min, Math.min(this.o.max, v));
		v = parseFloat(v.toFixed(this.o.precision));
		if (v === this.o.value) return;
		this.o.value = v;
		this._render();
		if (this.o.onChange) this.o.onChange(v);
	}

	getValue() { return this.o.value; }
	setValue(v) { this._setValue(v); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
