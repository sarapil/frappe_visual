// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual CurrencyInput — Formatted currency input with symbol
 * ===================================================================
 * frappe.visual.CurrencyInput.create({ container, ... })
 */
export class CurrencyInput {
	static create(opts = {}) { return new CurrencyInput(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			value: 0,
			currency: 'USD',
			locale: 'en-US',
			symbol: '$',
			symbolPosition: 'start',  // start | end
			precision: 2,
			min: -Infinity,
			max: Infinity,
			size: 'md',
			disabled: false,
			placeholder: '0.00',
			showCurrency: true,
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
		this.el.className = `fv-cur fv-cur-${o.size}${o.disabled ? ' fv-cur-disabled' : ''}`;

		const symbolHtml = o.showCurrency
			? `<span class="fv-cur-symbol">${CurrencyInput._esc(o.symbol)}</span>`
			: '';

		this.el.innerHTML = `
			<div class="fv-cur-wrap">
				${o.symbolPosition === 'start' ? symbolHtml : ''}
				<input class="fv-cur-input" type="text"
					value="${this._format(o.value)}"
					placeholder="${CurrencyInput._esc(o.placeholder)}"
					${o.disabled ? 'disabled' : ''}
					inputmode="decimal" />
				${o.symbolPosition === 'end' ? symbolHtml : ''}
				${o.showCurrency ? `<span class="fv-cur-code">${CurrencyInput._esc(o.currency)}</span>` : ''}
			</div>
		`;

		const inp = this.el.querySelector('.fv-cur-input');

		inp.onfocus = () => {
			inp.value = o.value !== 0 ? String(o.value) : '';
			inp.select();
		};

		inp.onblur = () => {
			let v = parseFloat(inp.value.replace(/[^0-9.\-]/g, ''));
			if (isNaN(v)) v = 0;
			v = Math.max(o.min, Math.min(o.max, v));
			v = parseFloat(v.toFixed(o.precision));
			o.value = v;
			inp.value = this._format(v);
			if (o.onChange) o.onChange(v);
		};

		inp.onkeydown = (e) => {
			if (e.key === 'Enter') inp.blur();
		};
	}

	_format(num) {
		try {
			return new Intl.NumberFormat(this.o.locale, {
				minimumFractionDigits: this.o.precision,
				maximumFractionDigits: this.o.precision,
			}).format(num);
		} catch {
			return num.toFixed(this.o.precision);
		}
	}

	getValue() { return this.o.value; }
	setValue(v) { this.o.value = v; this._render(); }
	setCurrency(currency, symbol) {
		this.o.currency = currency;
		if (symbol) this.o.symbol = symbol;
		this._render();
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
