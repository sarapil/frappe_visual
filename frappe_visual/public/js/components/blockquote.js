// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Blockquote — Styled blockquote component
 * ==========================================
 * Quote with icon, citation, color variants, sizes.
 *
 * frappe.visual.Blockquote.create({
 *   target: "#quote",
 *   text: "Design is not just what it looks like…",
 *   cite: "Steve Jobs",
 *   citeRole: "Apple CEO",
 *   variant: "default",   // default | bordered | filled | gradient
 *   color: "blue",        // blue | green | red | purple | orange | neutral
 *   size: "md",           // sm | md | lg
 *   icon: true,           // show quote icon
 *   avatar: null           // URL for cite avatar
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

const QUOTE_COLORS = {
	blue:    { border: "#6366f1", bg: "#eef2ff", text: "#4338ca" },
	green:   { border: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
	red:     { border: "#ef4444", bg: "#fef2f2", text: "#dc2626" },
	purple:  { border: "#a855f7", bg: "#faf5ff", text: "#7c3aed" },
	orange:  { border: "#f97316", bg: "#fff7ed", text: "#c2410c" },
	neutral: { border: "#94a3b8", bg: "#f8fafc", text: "#475569" },
};

export class Blockquote {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			text: "",
			cite: "",
			citeRole: "",
			variant: "default",
			color: "blue",
			size: "md",
			icon: true,
			avatar: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new Blockquote(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const c = QUOTE_COLORS[this.color] || QUOTE_COLORS.blue;

		const bq = document.createElement("blockquote");
		bq.className = `fv-bq fv-bq-${this.variant} fv-bq-${this.size}`;
		bq.style.setProperty("--fv-bq-border", c.border);
		bq.style.setProperty("--fv-bq-bg", c.bg);
		bq.style.setProperty("--fv-bq-text", c.text);

		let html = "";

		/* Quote icon */
		if (this.icon) {
			html += `<svg class="fv-bq-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${c.border}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/>
				<path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
			</svg>`;
		}

		/* Text */
		html += `<p class="fv-bq-text">${_esc(this.text)}</p>`;

		/* Citation */
		if (this.cite) {
			html += `<footer class="fv-bq-footer">`;
			if (this.avatar) {
				html += `<img class="fv-bq-avatar" src="${_esc(this.avatar)}" alt="${_esc(this.cite)}" />`;
			}
			html += `<div class="fv-bq-cite">
				<span class="fv-bq-author">${_esc(this.cite)}</span>
				${this.citeRole ? `<span class="fv-bq-role">${_esc(this.citeRole)}</span>` : ""}
			</div></footer>`;
		}

		bq.innerHTML = html;
		el.innerHTML = "";
		el.appendChild(bq);
		this._el = bq;
	}
}
