// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Divider — Horizontal/vertical divider with label
 * ===============================================================
 * frappe.visual.Divider.create({ container, label, ... })
 */
export class Divider {
	static create(opts = {}) { return new Divider(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			label: '',
			icon: '',
			orientation: 'horizontal',  // horizontal | vertical
			variant: 'solid',            // solid | dashed | dotted | gradient
			color: null,
			thickness: 1,
			spacing: 16,                 // margin top/bottom or left/right
			labelPosition: 'center',     // start | center | end
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		const isVert = o.orientation === 'vertical';
		this.el.className = `fv-div fv-div-${o.orientation} fv-div-${o.variant}`;

		if (isVert) {
			this.el.style.cssText = `display:inline-flex;flex-direction:column;align-items:center;margin:0 ${o.spacing}px;min-height:100%;`;
		} else {
			this.el.style.cssText = `display:flex;align-items:center;margin:${o.spacing}px 0;width:100%;`;
		}

		const lineStyle = () => {
			let css = `flex:1;`;
			if (o.variant === 'gradient') {
				css += isVert
					? `background:linear-gradient(to bottom, transparent, ${o.color || 'var(--border-color,#e2e8f0)'}, transparent);width:${o.thickness}px;`
					: `background:linear-gradient(to right, transparent, ${o.color || 'var(--border-color,#e2e8f0)'}, transparent);height:${o.thickness}px;`;
			} else {
				const border = `${o.thickness}px ${o.variant === 'dotted' ? 'dotted' : o.variant === 'dashed' ? 'dashed' : 'solid'} ${o.color || 'var(--border-color,#e2e8f0)'}`;
				css += isVert ? `border-inline-start:${border};min-height:20px;` : `border-top:${border};`;
			}
			return css;
		};

		if (!o.label && !o.icon) {
			this.el.innerHTML = `<div style="${lineStyle()}"></div>`;
			return;
		}

		const labelHtml = `<span class="fv-div-label fv-div-label-${o.labelPosition}">
			${o.icon ? `<span class="fv-div-icon">${o.icon}</span>` : ''}
			${o.label ? Divider._esc(o.label) : ''}
		</span>`;

		if (o.labelPosition === 'start') {
			this.el.innerHTML = `${labelHtml}<div style="${lineStyle()}"></div>`;
		} else if (o.labelPosition === 'end') {
			this.el.innerHTML = `<div style="${lineStyle()}"></div>${labelHtml}`;
		} else {
			this.el.innerHTML = `<div style="${lineStyle()}"></div>${labelHtml}<div style="${lineStyle()}"></div>`;
		}
	}

	setLabel(label) { this.o.label = label; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
