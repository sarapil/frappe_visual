// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Highlight — Text highlight / mark component
 * ==============================================
 * Multi-color text highlighting with animated appearance.
 *
 * frappe.visual.Highlight.create({
 *   target: "#result",
 *   text: "The quick brown fox",
 *   highlights: [
 *     { start: 4, end: 9, color: "yellow", label: "Adj" },
 *     { start: 10, end: 15, color: "green" }
 *   ],
 *   // OR use pattern matching:
 *   // patterns: [{ regex: /fox/gi, color: "red" }],
 *   animate: true,
 *   onClick: (hl, idx) => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

const COLORS = {
	yellow: { bg: "#fef9c3", border: "#facc15" },
	green: { bg: "#dcfce7", border: "#4ade80" },
	blue: { bg: "#dbeafe", border: "#60a5fa" },
	red: { bg: "#fee2e2", border: "#f87171" },
	purple: { bg: "#f3e8ff", border: "#c084fc" },
	orange: { bg: "#ffedd5", border: "#fb923c" },
	pink: { bg: "#fce7f3", border: "#f472b6" },
	cyan: { bg: "#cffafe", border: "#22d3ee" },
};

export class Highlight {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			text: "",
			highlights: [],
			patterns: [],
			animate: true,
			onClick: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new Highlight(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		/* Resolve pattern-based highlights */
		let hls = [...this.highlights];
		this.patterns.forEach((p) => {
			const rx = p.regex instanceof RegExp ? p.regex : new RegExp(p.regex, "gi");
			let m;
			while ((m = rx.exec(this.text)) !== null) {
				hls.push({ start: m.index, end: m.index + m[0].length, color: p.color, label: p.label });
			}
		});

		/* Sort by start, merge overlaps not handled — render ordered */
		hls.sort((a, b) => a.start - b.start);

		/* Build annotated HTML */
		let html = "";
		let pos = 0;

		hls.forEach((hl, idx) => {
			const s = Math.max(hl.start, pos);
			const e = Math.min(hl.end, this.text.length);
			if (s > pos) html += _esc(this.text.slice(pos, s));
			if (e > s) {
				const c = COLORS[hl.color] || COLORS.yellow;
				const anim = this.animate ? " fv-hl-anim" : "";
				const style = `background:${c.bg};border-bottom:2px solid ${c.border}`;
				html += `<mark class="fv-hl-mark${anim}" style="${style}" data-idx="${idx}"`;
				if (hl.label) html += ` data-label="${_esc(hl.label)}"`;
				html += `>${_esc(this.text.slice(s, e))}</mark>`;
			}
			pos = e;
		});
		if (pos < this.text.length) html += _esc(this.text.slice(pos));

		const wrap = document.createElement("div");
		wrap.className = "fv-highlight";
		wrap.innerHTML = html;

		if (this.onClick) {
			wrap.querySelectorAll(".fv-hl-mark").forEach((mark) => {
				mark.style.cursor = "pointer";
				mark.onclick = () => {
					const i = parseInt(mark.dataset.idx);
					this.onClick(hls[i], i);
				};
			});
		}

		el.innerHTML = "";
		el.appendChild(wrap);
		this._el = wrap;
	}
}
