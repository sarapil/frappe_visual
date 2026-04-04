// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual AlertBanner — Full-width notification banners
 * ============================================================
 * frappe.visual.AlertBanner.create({ container, message, type, ... })
 *
 * Types: info | success | warning | error
 */
export class AlertBanner {
	static create(opts = {}) { return new AlertBanner(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			message: '',
			title: '',
			type: 'info',
			icon: null,
			closable: true,
			sticky: false,          // position: sticky top: 0
			collapsible: false,
			collapsed: false,
			actions: [],            // [{ label, onClick, variant }]
			onClose: null,
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = this.o.container
			? (typeof this.o.container === 'string' ? document.querySelector(this.o.container) : this.o.container)
			: document.body;

		if (this.o.sticky) {
			target.prepend(this.el);
		} else if (this.o.container) {
			target.appendChild(this.el);
		} else {
			document.body.prepend(this.el);
		}
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-ab fv-ab-${o.type}`;
		if (o.sticky) this.el.classList.add('fv-ab-sticky');
		if (o.collapsed) this.el.classList.add('fv-ab-collapsed');

		const icon = o.icon || AlertBanner._defaultIcon(o.type);
		let html = `<div class="fv-ab-inner">`;
		html += `<div class="fv-ab-icon">${icon}</div>`;
		html += `<div class="fv-ab-content">`;
		if (o.title) html += `<strong class="fv-ab-title">${AlertBanner._esc(o.title)}</strong> `;
		html += `<span class="fv-ab-msg">${AlertBanner._esc(o.message)}</span>`;
		html += `</div>`;

		if (o.actions.length) {
			html += `<div class="fv-ab-actions">`;
			o.actions.forEach((a, i) => {
				html += `<button class="fv-ab-action fv-ab-action-${a.variant || 'ghost'}" data-idx="${i}">${AlertBanner._esc(a.label)}</button>`;
			});
			html += `</div>`;
		}

		if (o.collapsible) html += `<button class="fv-ab-toggle" aria-label="Toggle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>`;
		if (o.closable) html += `<button class="fv-ab-close" aria-label="Close">&times;</button>`;
		html += `</div>`;

		if (o.collapsible) html += `<div class="fv-ab-detail"></div>`;
		this.el.innerHTML = html;

		// Events
		if (o.closable) this.el.querySelector('.fv-ab-close').onclick = () => this.dismiss();
		if (o.collapsible) this.el.querySelector('.fv-ab-toggle').onclick = () => this.toggleCollapse();

		o.actions.forEach((a, i) => {
			this.el.querySelector(`[data-idx="${i}"]`).onclick = () => { if (a.onClick) a.onClick(); };
		});
	}

	dismiss() {
		this.el.classList.add('fv-ab-exit');
		this.el.addEventListener('animationend', () => {
			this.el.remove();
			if (this.o.onClose) this.o.onClose();
		}, { once: true });
	}

	toggleCollapse() {
		this.el.classList.toggle('fv-ab-collapsed');
	}

	setDetail(html) {
		const d = this.el.querySelector('.fv-ab-detail');
		if (d) d.innerHTML = html;
	}

	static _defaultIcon(type) {
		const icons = {
			info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
			success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
			warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
			error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
		};
		return icons[type] || icons.info;
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
