// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Masonry — Responsive masonry / Pinterest-style layout
 * =======================================================
 * CSS-column or JS-based masonry grid for card layouts.
 *
 * frappe.visual.Masonry.create({
 *   target: "#grid",
 *   items: [
 *     { html: "<div>Card 1</div>", height: null },
 *     ...
 *   ],
 *   columns: 3,             // fixed or "auto"
 *   columnWidth: 280,       // for "auto" columns
 *   gap: 16,
 *   animate: true,
 *   className: ""
 * })
 */

export class Masonry {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			columns: 3,
			columnWidth: 280,
			gap: 16,
			animate: true,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new Masonry(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.items.length) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-masonry ${this.className}`;

		const cols = this.columns === "auto"
			? Math.max(1, Math.floor(el.offsetWidth / this.columnWidth))
			: this.columns;

		wrap.style.cssText = `column-count:${cols};column-gap:${this.gap}px;`;

		this.items.forEach((item, i) => {
			const cell = document.createElement("div");
			cell.className = "fv-masonry-item";
			cell.style.cssText = `break-inside:avoid;margin-bottom:${this.gap}px;`;

			if (this.animate) {
				cell.style.opacity = "0";
				cell.style.transform = "translateY(20px)";
				cell.style.transition = `all 0.35s ease ${i * 0.04}s`;
				requestAnimationFrame(() => requestAnimationFrame(() => {
					cell.style.opacity = "1";
					cell.style.transform = "translateY(0)";
				}));
			}

			if (typeof item === "string") {
				cell.innerHTML = item;
			} else if (item.html) {
				cell.innerHTML = item.html;
			} else if (item.element) {
				cell.appendChild(item.element);
			}

			wrap.appendChild(cell);
		});

		el.innerHTML = "";
		el.appendChild(wrap);

		/* Responsive reflow */
		if (this.columns === "auto") {
			this._ro = new ResizeObserver(() => {
				const newCols = Math.max(1, Math.floor(el.offsetWidth / this.columnWidth));
				wrap.style.columnCount = newCols;
			});
			this._ro.observe(el);
		}
	}

	destroy() {
		this._ro?.disconnect();
	}
}
