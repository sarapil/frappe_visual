// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Combobox — Searchable dropdown with create option
 * ================================================================
 * frappe.visual.Combobox.create({ container, options, ... })
 */
export class Combobox {
	static create(opts = {}) { return new Combobox(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			options: [],            // [{ value, label, icon?, group? }] or strings
			value: null,
			placeholder: 'Select...',
			searchable: true,
			creatable: false,
			createLabel: 'Create "{query}"',
			clearable: true,
			disabled: false,
			maxHeight: 240,
			size: 'md',
			onChange: null,
			onCreate: null,
		}, opts);

		this._open = false;
		this._query = '';
		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);

		// Close on outside click
		this._outsideHandler = (e) => { if (!this.el.contains(e.target)) this._close(); };
		document.addEventListener('click', this._outsideHandler);
	}

	_normalize(opt) {
		if (typeof opt === 'string') return { value: opt, label: opt };
		return opt;
	}

	_render() {
		const o = this.o;
		const selected = o.options.map(op => this._normalize(op)).find(op => op.value === o.value);
		this.el.className = `fv-cmb fv-cmb-${o.size}${this._open ? ' fv-cmb-open' : ''}${o.disabled ? ' fv-cmb-disabled' : ''}`;

		this.el.innerHTML = `
			<div class="fv-cmb-trigger">
				${selected ? `<span class="fv-cmb-selected">${selected.icon ? `<span class="fv-cmb-icon">${selected.icon}</span>` : ''}${Combobox._esc(selected.label)}</span>` : `<span class="fv-cmb-placeholder">${Combobox._esc(o.placeholder)}</span>`}
				${o.clearable && selected ? '<span class="fv-cmb-clear">&times;</span>' : ''}
				<span class="fv-cmb-arrow">▾</span>
			</div>
			<div class="fv-cmb-dropdown" style="max-height:${o.maxHeight}px">
				${o.searchable ? '<input class="fv-cmb-search" placeholder="Search..." />' : ''}
				<div class="fv-cmb-list"></div>
			</div>
		`;

		this._renderList();

		// Trigger
		this.el.querySelector('.fv-cmb-trigger').onclick = () => {
			if (o.disabled) return;
			this._open ? this._close() : this._openDropdown();
		};

		// Clear
		const clearBtn = this.el.querySelector('.fv-cmb-clear');
		if (clearBtn) clearBtn.onclick = (e) => { e.stopPropagation(); this.o.value = null; this._render(); if (o.onChange) o.onChange(null); };

		// Search
		const search = this.el.querySelector('.fv-cmb-search');
		if (search) {
			search.oninput = () => { this._query = search.value; this._renderList(); };
			search.onkeydown = (e) => { if (e.key === 'Escape') this._close(); };
		}
	}

	_renderList() {
		const list = this.el.querySelector('.fv-cmb-list');
		if (!list) return;
		const q = this._query.toLowerCase();
		const opts = this.o.options.map(op => this._normalize(op));
		const filtered = q ? opts.filter(op => op.label.toLowerCase().includes(q)) : opts;

		let html = filtered.map(op =>
			`<div class="fv-cmb-option${op.value === this.o.value ? ' fv-cmb-option-sel' : ''}" data-value="${Combobox._esc(String(op.value))}">
				${op.icon ? `<span class="fv-cmb-icon">${op.icon}</span>` : ''}
				<span>${Combobox._esc(op.label)}</span>
			</div>`
		).join('');

		if (!filtered.length && q && this.o.creatable) {
			const label = this.o.createLabel.replace('{query}', q);
			html = `<div class="fv-cmb-create" data-value="${Combobox._esc(q)}">+ ${Combobox._esc(label)}</div>`;
		} else if (!filtered.length) {
			html = '<div class="fv-cmb-empty">No results</div>';
		}

		list.innerHTML = html;

		list.querySelectorAll('.fv-cmb-option').forEach(el => {
			el.onclick = () => {
				this.o.value = el.dataset.value;
				this._close();
				this._render();
				if (this.o.onChange) this.o.onChange(this.o.value);
			};
		});

		const createBtn = list.querySelector('.fv-cmb-create');
		if (createBtn) {
			createBtn.onclick = () => {
				const val = createBtn.dataset.value;
				this.o.options.push({ value: val, label: val });
				this.o.value = val;
				this._close();
				this._render();
				if (this.o.onCreate) this.o.onCreate(val);
				if (this.o.onChange) this.o.onChange(val);
			};
		}
	}

	_openDropdown() {
		this._open = true;
		this.el.classList.add('fv-cmb-open');
		const search = this.el.querySelector('.fv-cmb-search');
		if (search) requestAnimationFrame(() => search.focus());
	}

	_close() {
		this._open = false;
		this._query = '';
		this.el.classList.remove('fv-cmb-open');
	}

	getValue() { return this.o.value; }
	setValue(v) { this.o.value = v; this._render(); }
	destroy() { document.removeEventListener('click', this._outsideHandler); this.el.remove(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
