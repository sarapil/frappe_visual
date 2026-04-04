// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual PinInput — OTP/PIN code input
 * =============================================
 * frappe.visual.PinInput.create({ container, length, ... })
 */
export class PinInput {
	static create(opts = {}) { return new PinInput(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			length: 6,
			mask: false,
			type: 'number',         // number | alphanumeric
			size: 'md',
			autoFocus: true,
			placeholder: '○',
			onComplete: null,
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
		this.el.className = `fv-pin fv-pin-${o.size}`;
		this.el.innerHTML = '';

		this._inputs = [];
		for (let i = 0; i < o.length; i++) {
			const inp = document.createElement('input');
			inp.className = 'fv-pin-input';
			inp.type = o.mask ? 'password' : 'text';
			inp.maxLength = 1;
			inp.placeholder = o.placeholder;
			inp.inputMode = o.type === 'number' ? 'numeric' : 'text';
			inp.autocomplete = 'one-time-code';

			inp.oninput = (e) => {
				let val = inp.value;
				if (o.type === 'number') val = val.replace(/\D/g, '');
				inp.value = val.slice(0, 1);
				if (val && i < o.length - 1) this._inputs[i + 1].focus();
				if (o.onChange) o.onChange(this.getValue());
				if (this.getValue().length === o.length && o.onComplete) o.onComplete(this.getValue());
			};

			inp.onkeydown = (e) => {
				if (e.key === 'Backspace' && !inp.value && i > 0) {
					this._inputs[i - 1].focus();
					this._inputs[i - 1].value = '';
				}
				if (e.key === 'ArrowLeft' && i > 0) this._inputs[i - 1].focus();
				if (e.key === 'ArrowRight' && i < o.length - 1) this._inputs[i + 1].focus();
			};

			inp.onpaste = (e) => {
				e.preventDefault();
				const data = (e.clipboardData || window.clipboardData).getData('text').trim();
				const chars = data.split('').slice(0, o.length);
				chars.forEach((c, j) => { if (this._inputs[j]) this._inputs[j].value = c; });
				const last = Math.min(chars.length, o.length) - 1;
				if (this._inputs[last]) this._inputs[last].focus();
				if (o.onChange) o.onChange(this.getValue());
				if (this.getValue().length === o.length && o.onComplete) o.onComplete(this.getValue());
			};

			inp.onfocus = () => inp.select();

			this._inputs.push(inp);
			this.el.appendChild(inp);
		}

		if (o.autoFocus) requestAnimationFrame(() => this._inputs[0]?.focus());
	}

	getValue() { return this._inputs.map(i => i.value).join(''); }
	setValue(v) {
		const chars = String(v).split('');
		this._inputs.forEach((inp, i) => { inp.value = chars[i] || ''; });
	}
	clear() { this._inputs.forEach(i => { i.value = ''; }); this._inputs[0]?.focus(); }
	focus() { this._inputs[0]?.focus(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
