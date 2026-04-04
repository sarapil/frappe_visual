// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual ChipInput — Multi-value tag input
 * ==================================================
 * frappe.visual.ChipInput.create({ container, ... })
 */
export class ChipInput {
	static create(opts = {}) { return new ChipInput(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			values: [],
			suggestions: [],
			placeholder: 'Add tag...',
			maxTags: Infinity,
			allowDuplicates: false,
			variant: 'default',      // default | outline
			size: 'md',
			color: 'indigo',
			disabled: false,
			validator: null,         // fn(value) → true | false
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
		this.el.className = `fv-chi fv-chi-${o.size}${o.disabled ? ' fv-chi-disabled' : ''}`;

		let html = '<div class="fv-chi-wrap">';
		o.values.forEach((val, i) => {
			html += `<span class="fv-chi-chip fv-chi-${o.variant} fv-badge-${o.color}">
				<span class="fv-chi-text">${ChipInput._esc(val)}</span>
				${!o.disabled ? `<button class="fv-chi-remove" data-idx="${i}">&times;</button>` : ''}
			</span>`;
		});

		if (o.values.length < o.maxTags && !o.disabled) {
			html += `<input class="fv-chi-input" placeholder="${ChipInput._esc(o.placeholder)}" />`;
		}
		html += '</div>';

		if (o.suggestions.length) {
			html += '<div class="fv-chi-suggestions"></div>';
		}

		this.el.innerHTML = html;

		// Remove chips
		this.el.querySelectorAll('.fv-chi-remove').forEach(btn => {
			btn.onclick = () => {
				this.o.values.splice(parseInt(btn.dataset.idx), 1);
				this._render();
				if (o.onChange) o.onChange([...this.o.values]);
			};
		});

		// Input handling
		const inp = this.el.querySelector('.fv-chi-input');
		if (inp) {
			inp.onkeydown = (e) => {
				if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) {
					e.preventDefault();
					this._addValue(inp.value.trim());
					inp.value = '';
					this._hideSuggestions();
				}
				if (e.key === 'Backspace' && !inp.value && o.values.length) {
					o.values.pop();
					this._render();
					if (o.onChange) o.onChange([...o.values]);
				}
				if (e.key === 'Escape') this._hideSuggestions();
			};

			inp.oninput = () => {
				if (o.suggestions.length) this._showSuggestions(inp.value);
			};

			inp.onfocus = () => {
				if (o.suggestions.length && inp.value) this._showSuggestions(inp.value);
			};
		}

		// Click to focus input
		this.el.querySelector('.fv-chi-wrap').onclick = () => { if (inp) inp.focus(); };
	}

	_addValue(val) {
		if (!this.o.allowDuplicates && this.o.values.includes(val)) return;
		if (this.o.validator && !this.o.validator(val)) return;
		if (this.o.values.length >= this.o.maxTags) return;
		this.o.values.push(val);
		this._render();
		if (this.o.onChange) this.o.onChange([...this.o.values]);
	}

	_showSuggestions(query) {
		const sugEl = this.el.querySelector('.fv-chi-suggestions');
		if (!sugEl) return;
		const q = query.toLowerCase();
		const filtered = this.o.suggestions.filter(s =>
			s.toLowerCase().includes(q) && !this.o.values.includes(s)
		).slice(0, 8);

		if (!filtered.length) { sugEl.innerHTML = ''; return; }

		sugEl.innerHTML = filtered.map(s =>
			`<div class="fv-chi-sug-item">${ChipInput._esc(s)}</div>`
		).join('');

		sugEl.querySelectorAll('.fv-chi-sug-item').forEach(el => {
			el.onmousedown = (e) => {
				e.preventDefault();
				this._addValue(el.textContent);
				const inp = this.el.querySelector('.fv-chi-input');
				if (inp) { inp.value = ''; inp.focus(); }
				this._hideSuggestions();
			};
		});
	}

	_hideSuggestions() {
		const sugEl = this.el.querySelector('.fv-chi-suggestions');
		if (sugEl) sugEl.innerHTML = '';
	}

	getValues() { return [...this.o.values]; }
	setValues(vals) { this.o.values = [...vals]; this._render(); }
	addValue(v) { this._addValue(v); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
