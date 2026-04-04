// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Clipboard — Copy-to-clipboard button with feedback
 * =================================================================
 * frappe.visual.Clipboard.create({ container, text, ... })
 */
export class Clipboard {
	static create(opts = {}) { return new Clipboard(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			text: '',
			label: 'Copy',
			copiedLabel: 'Copied!',
			copiedDuration: 2000,
			showIcon: true,
			variant: 'button',       // button | icon | inline
			size: 'md',              // sm | md | lg
			onCopy: null,
		}, opts);

		this.el = document.createElement('span');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-clip fv-clip-${o.variant} fv-clip-${o.size}`;

		const icon = o.showIcon ? '<svg class="fv-clip-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' : '';
		const checkIcon = '<svg class="fv-clip-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

		this.el.innerHTML = `${icon}<span class="fv-clip-label">${Clipboard._esc(o.label)}</span>${checkIcon}`;
		this.el.style.cursor = 'pointer';
		this.el.title = o.label;

		this.el.onclick = () => this.copy();
	}

	async copy(text) {
		const val = text || this.o.text;
		try {
			await navigator.clipboard.writeText(val);
		} catch {
			// Fallback
			const ta = document.createElement('textarea');
			ta.value = val; ta.style.position = 'fixed'; ta.style.opacity = '0';
			document.body.appendChild(ta); ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		}

		this.el.classList.add('fv-clip-copied');
		const lbl = this.el.querySelector('.fv-clip-label');
		if (lbl) lbl.textContent = this.o.copiedLabel;

		if (this.o.onCopy) this.o.onCopy(val);

		setTimeout(() => {
			this.el.classList.remove('fv-clip-copied');
			if (lbl) lbl.textContent = this.o.label;
		}, this.o.copiedDuration);
	}

	setText(t) { this.o.text = t; }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
