// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Drawer — Slide-out panel from any edge
 * =====================================================
 * frappe.visual.Drawer.create({ position, title, content, ... })
 *
 * Positions: left | right | top | bottom
 */
export class Drawer {
	static create(opts = {}) { return new Drawer(opts); }
	static _stack = [];

	constructor(opts = {}) {
		this.o = Object.assign({
			position: 'right',      // left | right | top | bottom
			title: '',
			content: '',            // html, element, or render fn
			size: 400,              // px width (left/right) or height (top/bottom)
			overlay: true,
			closeOnOverlay: true,
			closeOnEsc: true,
			showClose: true,
			push: false,            // push page content instead of overlay
			headerActions: [],      // [{ icon, onClick, title }]
			footer: null,           // html or element
			onOpen: null,
			onClose: null,
		}, opts);

		this.visible = false;
		this._build();
	}

	_build() {
		const o = this.o;

		// Overlay
		this.overlayEl = document.createElement('div');
		this.overlayEl.className = 'fv-dw-overlay';

		// Drawer panel
		this.el = document.createElement('div');
		this.el.className = `fv-dw fv-dw-${o.position}`;
		this.el.setAttribute('role', 'dialog');
		this.el.setAttribute('aria-modal', 'true');

		const isHoriz = o.position === 'left' || o.position === 'right';
		if (isHoriz) this.el.style.width = o.size + 'px';
		else this.el.style.height = o.size + 'px';

		// Header
		let html = `<div class="fv-dw-header">`;
		html += `<div class="fv-dw-title">${Drawer._esc(o.title)}</div>`;
		html += `<div class="fv-dw-header-actions">`;
		o.headerActions.forEach((a, i) => {
			html += `<button class="fv-dw-header-btn" data-idx="${i}" title="${Drawer._esc(a.title || '')}">${a.icon || ''}</button>`;
		});
		if (o.showClose) html += `<button class="fv-dw-close" aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
		html += `</div></div>`;

		// Body
		html += `<div class="fv-dw-body"></div>`;

		// Footer
		if (o.footer) html += `<div class="fv-dw-footer"></div>`;
		this.el.innerHTML = html;

		// Content
		const body = this.el.querySelector('.fv-dw-body');
		if (typeof o.content === 'function') {
			const r = o.content(body);
			if (r instanceof HTMLElement) body.appendChild(r);
			else if (typeof r === 'string') body.innerHTML = r;
		} else if (o.content instanceof HTMLElement) {
			body.appendChild(o.content);
		} else {
			body.innerHTML = o.content;
		}

		// Footer content
		if (o.footer) {
			const foot = this.el.querySelector('.fv-dw-footer');
			if (o.footer instanceof HTMLElement) foot.appendChild(o.footer);
			else foot.innerHTML = o.footer;
		}

		// Events
		if (o.showClose) this.el.querySelector('.fv-dw-close').onclick = () => this.close();
		o.headerActions.forEach((a, i) => {
			this.el.querySelector(`[data-idx="${i}"]`).onclick = () => { if (a.onClick) a.onClick(); };
		});
		if (o.closeOnOverlay) this.overlayEl.onclick = () => this.close();
	}

	open() {
		if (this.visible) return this;
		document.body.appendChild(this.overlayEl);
		document.body.appendChild(this.el);

		// Stack management
		Drawer._stack.push(this);
		document.body.style.overflow = 'hidden';

		requestAnimationFrame(() => {
			this.overlayEl.classList.add('fv-dw-overlay-visible');
			this.el.classList.add('fv-dw-open');
		});

		if (this.o.closeOnEsc) {
			this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
			document.addEventListener('keydown', this._escHandler);
		}

		this.visible = true;
		if (this.o.onOpen) this.o.onOpen();
		return this;
	}

	close() {
		if (!this.visible) return this;
		this.el.classList.remove('fv-dw-open');
		this.overlayEl.classList.remove('fv-dw-overlay-visible');

		const idx = Drawer._stack.indexOf(this);
		if (idx > -1) Drawer._stack.splice(idx, 1);
		if (Drawer._stack.length === 0) document.body.style.overflow = '';

		if (this._escHandler) document.removeEventListener('keydown', this._escHandler);

		setTimeout(() => {
			if (this.el.parentNode) this.el.remove();
			if (this.overlayEl.parentNode) this.overlayEl.remove();
		}, 300);

		this.visible = false;
		if (this.o.onClose) this.o.onClose();
		return this;
	}

	toggle() { this.visible ? this.close() : this.open(); return this; }

	destroy() {
		this.close();
		this.el = null;
		this.overlayEl = null;
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
