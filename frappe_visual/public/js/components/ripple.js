// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Ripple — Material-style click ripple effect
 * ==============================================
 * Adds ripple on click to any element.
 *
 * frappe.visual.Ripple.create({
 *   target: ".btn-primary",   // selector or element(s)
 *   color: "rgba(255,255,255,0.35)",
 *   duration: 600,
 *   centered: false           // always ripple from center
 * })
 *
 * // Or apply to a single element:
 * frappe.visual.Ripple.attach(el, { color: "#fff3" })
 */

export class Ripple {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			color: "rgba(255,255,255,0.35)",
			duration: 600,
			centered: false,
		}, opts);

		this.render();
	}

	static create(opts) { return new Ripple(opts); }

	static attach(el, opts = {}) {
		if (!el) return;
		const r = new Ripple({ ...opts, target: null });
		r._attachTo(el);
		return r;
	}

	render() {
		if (!this.target) return;

		const els = typeof this.target === "string"
			? document.querySelectorAll(this.target)
			: this.target instanceof NodeList ? this.target : [this.target];

		els.forEach((el) => this._attachTo(el));
	}

	_attachTo(el) {
		el.style.position = el.style.position || "relative";
		el.style.overflow = "hidden";

		el.addEventListener("pointerdown", (e) => {
			const rect = el.getBoundingClientRect();
			const size = Math.max(rect.width, rect.height) * 2;

			let x, y;
			if (this.centered) {
				x = rect.width / 2;
				y = rect.height / 2;
			} else {
				x = e.clientX - rect.left;
				y = e.clientY - rect.top;
			}

			const ripple = document.createElement("span");
			ripple.className = "fv-ripple";
			ripple.style.cssText = `
				position: absolute;
				width: ${size}px;
				height: ${size}px;
				left: ${x - size / 2}px;
				top: ${y - size / 2}px;
				background: ${this.color};
				border-radius: 50%;
				transform: scale(0);
				opacity: 1;
				pointer-events: none;
				animation: fvRipple ${this.duration}ms ease forwards;
			`;

			el.appendChild(ripple);
			setTimeout(() => ripple.remove(), this.duration);
		});
	}
}
