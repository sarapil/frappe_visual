// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual DescriptionList — Key-value display pairs
 * ========================================================
 * frappe.visual.DescriptionList.create({ container, items, ... })
 */
export class DescriptionList {
	static create(opts = {}) { return new DescriptionList(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			items: [],              // [{ label, value, copyable, link, icon, formatter }]
			direction: 'vertical',  // vertical | horizontal | grid
			columns: 2,            // for grid layout
			striped: false,
			bordered: false,
			size: 'md',            // sm | md | lg
		}, opts);

		this.el = document.createElement('dl');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-dl fv-dl-${o.direction} fv-dl-${o.size}`;
		if (o.striped) this.el.classList.add('fv-dl-striped');
		if (o.bordered) this.el.classList.add('fv-dl-bordered');
		if (o.direction === 'grid') this.el.style.setProperty('--fv-dl-cols', o.columns);

		this.el.innerHTML = '';

		o.items.forEach(item => {
			const pair = document.createElement('div');
			pair.className = 'fv-dl-pair';

			// Term (label)
			const dt = document.createElement('dt');
			dt.className = 'fv-dl-term';
			let dtHtml = '';
			if (item.icon) dtHtml += `<span class="fv-dl-icon">${item.icon}</span>`;
			dtHtml += DescriptionList._esc(item.label || '');
			dt.innerHTML = dtHtml;

			// Definition (value)
			const dd = document.createElement('dd');
			dd.className = 'fv-dl-def';

			const formatted = item.formatter
				? item.formatter(item.value)
				: DescriptionList._esc(item.value ?? '—');

			let ddHtml = '';
			if (item.link) {
				ddHtml += `<a class="fv-dl-link" href="${DescriptionList._esc(item.link)}">${formatted}</a>`;
			} else {
				ddHtml += `<span class="fv-dl-value">${formatted}</span>`;
			}

			if (item.copyable) {
				ddHtml += `<button class="fv-dl-copy" title="${__('Copy')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>`;
			}

			dd.innerHTML = ddHtml;

			if (item.copyable) {
				dd.querySelector('.fv-dl-copy').onclick = () => {
					navigator.clipboard.writeText(item.value || '').then(() => {
						const btn = dd.querySelector('.fv-dl-copy');
						btn.innerHTML = '✓';
						setTimeout(() => {
							btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
						}, 1500);
					});
				};
			}

			pair.appendChild(dt);
			pair.appendChild(dd);
			this.el.appendChild(pair);
		});
	}

	setItems(items) { this.o.items = items; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
