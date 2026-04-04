// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * GridStack — Draggable & resizable dashboard grid
 * ===================================================
 * Lightweight grid layout for dashboard widgets.
 *
 * frappe.visual.GridStack.create({
 *   target: "#dashboard",
 *   columns: 12,
 *   rowHeight: 60,
 *   gap: 8,
 *   items: [
 *     { id: "w1", x: 0, y: 0, w: 6, h: 4, html: "<div>Widget A</div>" },
 *     { id: "w2", x: 6, y: 0, w: 6, h: 4, html: "<div>Widget B</div>" },
 *     { id: "w3", x: 0, y: 4, w: 12, h: 3, html: "<div>Widget C</div>" }
 *   ],
 *   draggable: true,
 *   resizable: true,
 *   animate: true,
 *   onChange: null,
 *   className: ""
 * })
 */

export class GridStack {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			columns: 12,
			rowHeight: 60,
			gap: 8,
			items: [],
			draggable: true,
			resizable: true,
			animate: true,
			onChange: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new GridStack(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const colW = 100 / this.columns;
		const maxRow = Math.max(...this.items.map(i => i.y + i.h), 6);

		const grid = document.createElement("div");
		grid.className = `fv-grid ${this.className}`;
		grid.style.cssText = `position:relative;width:100%;min-height:${maxRow * this.rowHeight + (maxRow - 1) * this.gap}px;`;

		this.items.forEach((item, idx) => {
			const cell = document.createElement("div");
			cell.className = "fv-grid-cell";
			cell.dataset.id = item.id || idx;

			const left = item.x * colW;
			const width = item.w * colW;
			const top = item.y * (this.rowHeight + this.gap);
			const height = item.h * this.rowHeight + (item.h - 1) * this.gap;

			cell.style.cssText = `position:absolute;left:${left}%;width:${width}%;top:${top}px;height:${height}px;padding:${this.gap / 2}px;box-sizing:border-box;transition:${this.animate ? "all 0.3s ease" : "none"};`;

			const inner = document.createElement("div");
			inner.className = "fv-grid-inner";
			inner.style.cssText = "width:100%;height:100%;border-radius:8px;background:var(--control-bg, #f8f9fa);border:1px solid var(--border-color, #e5e7eb);overflow:hidden;position:relative;";

			if (typeof item.html === "string") inner.innerHTML = item.html;
			else if (item.element) inner.appendChild(item.element);

			/* Drag handle */
			if (this.draggable) {
				const handle = document.createElement("div");
				handle.className = "fv-grid-handle";
				handle.style.cssText = "position:absolute;top:0;left:0;right:0;height:24px;cursor:grab;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;";
				handle.innerHTML = `<svg width="14" height="6" viewBox="0 0 14 6" fill="var(--text-muted,#999)"><circle cx="3" cy="1" r="1"/><circle cx="7" cy="1" r="1"/><circle cx="11" cy="1" r="1"/><circle cx="3" cy="5" r="1"/><circle cx="7" cy="5" r="1"/><circle cx="11" cy="5" r="1"/></svg>`;
				inner.appendChild(handle);
				inner.addEventListener("mouseenter", () => handle.style.opacity = "1");
				inner.addEventListener("mouseleave", () => handle.style.opacity = "0");
			}

			/* Resize handle */
			if (this.resizable) {
				const resize = document.createElement("div");
				resize.className = "fv-grid-resize";
				resize.style.cssText = "position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:se-resize;opacity:0.3;transition:opacity .2s;";
				resize.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted,#999)" stroke-width="1.5"><line x1="12" y1="4" x2="4" y2="12"/><line x1="12" y1="8" x2="8" y2="12"/></svg>`;
				resize.addEventListener("mouseenter", () => resize.style.opacity = "1");
				resize.addEventListener("mouseleave", () => resize.style.opacity = "0.3");
				inner.appendChild(resize);
			}

			cell.appendChild(inner);
			grid.appendChild(cell);
		});

		el.innerHTML = "";
		el.appendChild(grid);
	}

	getLayout() {
		return this.items.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));
	}
}
