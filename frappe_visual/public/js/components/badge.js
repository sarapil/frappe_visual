// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Badge — Labeled badge/tag component
 * ==================================================
 * frappe.visual.Badge.create({ label, color, variant, ... })
 */
export class Badge {
	static create(opts = {}) { return new Badge(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			label: '',
			color: 'gray',         // gray | blue | green | red | yellow | purple | pink | indigo | orange | cyan
			variant: 'subtle',      // subtle | solid | outline | dot
			size: 'md',            // sm | md | lg
			icon: null,            // SVG string (before label)
			removable: false,
			pill: true,
			onClick: null,
			onRemove: null,
		}, opts);

		this.el = document.createElement('span');
		this._render();
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-badge fv-badge-${o.variant} fv-badge-${o.color} fv-badge-${o.size}`;
		if (o.pill) this.el.classList.add('fv-badge-pill');
		if (o.onClick) { this.el.style.cursor = 'pointer'; this.el.onclick = o.onClick; }

		let html = '';
		if (o.variant === 'dot') html += `<span class="fv-badge-dot"></span>`;
		if (o.icon) html += `<span class="fv-badge-icon">${o.icon}</span>`;
		html += `<span class="fv-badge-label">${Badge._esc(o.label)}</span>`;
		if (o.removable) html += `<button class="fv-badge-remove" aria-label="Remove">&times;</button>`;

		this.el.innerHTML = html;

		if (o.removable) {
			this.el.querySelector('.fv-badge-remove').onclick = (e) => {
				e.stopPropagation();
				this.el.remove();
				if (o.onRemove) o.onRemove();
			};
		}
	}

	setLabel(label) { this.o.label = label; this._render(); }
	setColor(color) { this.o.color = color; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
