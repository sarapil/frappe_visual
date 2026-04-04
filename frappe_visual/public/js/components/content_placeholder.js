// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * ContentPlaceholder — Animated skeleton placeholder
 * ====================================================
 * Shimmer / wave / pulse placeholder for loading states.
 *
 * frappe.visual.ContentPlaceholder.create({
 *   target: "#loading",
 *   rows: [
 *     { type: "circle", size: 48 },
 *     { type: "line", width: "60%", height: 16 },
 *     { type: "line", width: "100%" },
 *     { type: "line", width: "80%" },
 *     { type: "rect", width: "100%", height: 120 },
 *     { type: "line", width: "40%" },
 *   ],
 *   animation: "shimmer",   // shimmer | wave | pulse
 *   gap: 12,
 *   radius: 4,
 *   // Preset templates:
 *   preset: null  // "card" | "list" | "form" | "profile" | "table"
 * })
 */

const PRESETS = {
	card: [
		{ type: "rect", width: "100%", height: 160 },
		{ type: "line", width: "70%", height: 18 },
		{ type: "line", width: "100%" },
		{ type: "line", width: "90%" },
		{ type: "line", width: "30%", height: 12 },
	],
	list: [
		...Array.from({ length: 5 }, () => [
			{ type: "line", width: "100%", height: 44 },
		]).flat(),
	],
	form: [
		{ type: "line", width: "30%", height: 12 },
		{ type: "line", width: "100%", height: 36 },
		{ type: "line", width: "30%", height: 12 },
		{ type: "line", width: "100%", height: 36 },
		{ type: "line", width: "30%", height: 12 },
		{ type: "rect", width: "100%", height: 80 },
		{ type: "line", width: "20%", height: 36 },
	],
	profile: [
		{ type: "circle", size: 64 },
		{ type: "line", width: "40%", height: 18 },
		{ type: "line", width: "25%", height: 12 },
		{ type: "line", width: "100%" },
		{ type: "line", width: "90%" },
	],
	table: [
		{ type: "line", width: "100%", height: 36 },
		...Array.from({ length: 6 }, () => [
			{ type: "line", width: "100%", height: 28 },
		]).flat(),
	],
};

export class ContentPlaceholder {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			rows: [],
			animation: "shimmer",
			gap: 12,
			radius: 4,
			preset: null,
		}, opts);

		if (this.preset && PRESETS[this.preset]) {
			this.rows = PRESETS[this.preset];
		}

		this.render();
	}

	static create(opts) { return new ContentPlaceholder(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-cp fv-cp-${this.animation}`;
		wrap.style.display = "flex";
		wrap.style.flexDirection = "column";
		wrap.style.gap = `${this.gap}px`;

		this.rows.forEach((row) => {
			const item = document.createElement("div");
			item.className = "fv-cp-item";

			switch (row.type) {
				case "circle":
					item.style.width = `${row.size || 40}px`;
					item.style.height = `${row.size || 40}px`;
					item.style.borderRadius = "50%";
					break;
				case "rect":
					item.style.width = row.width || "100%";
					item.style.height = `${row.height || 80}px`;
					item.style.borderRadius = `${this.radius}px`;
					break;
				case "line":
				default:
					item.style.width = row.width || "100%";
					item.style.height = `${row.height || 14}px`;
					item.style.borderRadius = `${this.radius}px`;
					break;
			}

			wrap.appendChild(item);
		});

		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;
	}

	destroy() { this._wrap?.remove(); }
}
