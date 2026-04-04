// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VirtualList — Virtualized list for large datasets
 * ====================================================
 * Renders only visible items for performance with 10K+ rows.
 *
 * frappe.visual.VirtualList.create({
 *   target: "#vlist",
 *   items: [...],            // full array
 *   itemHeight: 40,          // fixed row height
 *   containerHeight: 400,
 *   renderItem: (item, i) => `<div>${item.name}</div>`,
 *   overscan: 5,            // extra items above/below viewport
 *   className: ""
 * })
 */

export class VirtualList {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			itemHeight: 40,
			containerHeight: 400,
			renderItem: (item, i) => `<div style="padding:8px 12px;border-bottom:1px solid var(--border-color,#e5e7eb);">${typeof item === "string" ? item : item.label || JSON.stringify(item)}</div>`,
			overscan: 5,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new VirtualList(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const viewport = document.createElement("div");
		viewport.className = `fv-vlist ${this.className}`;
		viewport.style.cssText = `overflow-y:auto;height:${this.containerHeight}px;position:relative;`;

		const spacer = document.createElement("div");
		spacer.style.height = `${this.items.length * this.itemHeight}px`;

		const content = document.createElement("div");
		content.className = "fv-vlist-content";
		content.style.cssText = "position:absolute;left:0;right:0;";

		viewport.appendChild(spacer);
		viewport.appendChild(content);

		el.innerHTML = "";
		el.appendChild(viewport);

		this._viewport = viewport;
		this._content = content;

		this._update();
		viewport.addEventListener("scroll", () => this._update());
	}

	_update() {
		const scrollTop = this._viewport.scrollTop;
		const visible = Math.ceil(this.containerHeight / this.itemHeight);
		const startIdx = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
		const endIdx = Math.min(this.items.length, startIdx + visible + this.overscan * 2);

		this._content.style.top = `${startIdx * this.itemHeight}px`;

		let html = "";
		for (let i = startIdx; i < endIdx; i++) {
			html += `<div class="fv-vlist-item" style="height:${this.itemHeight}px;box-sizing:border-box;">${this.renderItem(this.items[i], i)}</div>`;
		}
		this._content.innerHTML = html;
	}

	scrollTo(index) {
		this._viewport.scrollTop = index * this.itemHeight;
	}

	updateItems(items) {
		this.items = items;
		this._viewport.querySelector("div").style.height = `${items.length * this.itemHeight}px`;
		this._update();
	}
}
