// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FeatureList — Check / cross feature comparison
 * =================================================
 * Feature comparison list across plans or products.
 *
 * frappe.visual.FeatureList.create({
 *   target: "#features",
 *   columns: ["Free", "Pro", "Enterprise"],
 *   features: [
 *     { label: "Users", values: ["5", "50", "Unlimited"] },
 *     { label: "API Access", values: [false, true, true] },
 *     { label: "Support", values: ["Email", "Priority", "24/7 Dedicated"] },
 *     { label: "Custom Domain", values: [false, false, true] }
 *   ],
 *   highlightColumn: 1,  // 0-indexed, highlighted plan
 *   variant: "default",   // default | striped | compact
 *   icons: { check: "✓", cross: "✕" }
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class FeatureList {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			columns: [],
			features: [],
			highlightColumn: -1,
			variant: "default",
			icons: { check: "✓", cross: "✕" },
		}, opts);

		this.render();
	}

	static create(opts) { return new FeatureList(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const table = document.createElement("table");
		table.className = `fv-fl fv-fl-${this.variant}`;

		/* Header */
		const thead = document.createElement("thead");
		let hRow = `<tr><th class="fv-fl-feature-col"></th>`;
		this.columns.forEach((col, i) => {
			const hl = i === this.highlightColumn ? " fv-fl-hl" : "";
			hRow += `<th class="fv-fl-col${hl}">${_esc(col)}</th>`;
		});
		hRow += `</tr>`;
		thead.innerHTML = hRow;
		table.appendChild(thead);

		/* Body */
		const tbody = document.createElement("tbody");
		this.features.forEach((feat) => {
			let row = `<tr><td class="fv-fl-label">${_esc(feat.label)}</td>`;
			(feat.values || []).forEach((val, i) => {
				const hl = i === this.highlightColumn ? " fv-fl-hl" : "";
				let cell;
				if (val === true) {
					cell = `<span class="fv-fl-check">${this.icons.check}</span>`;
				} else if (val === false) {
					cell = `<span class="fv-fl-cross">${this.icons.cross}</span>`;
				} else {
					cell = _esc(String(val));
				}
				row += `<td class="fv-fl-val${hl}">${cell}</td>`;
			});
			row += `</tr>`;
			tbody.innerHTML += row;
		});
		table.appendChild(tbody);

		el.innerHTML = "";
		el.appendChild(table);
		this._el = table;
	}
}
