/**
 * Bento — Bento-box responsive grid layout
 * ==========================================
 * Auto-flowing grid with defined item sizes, inspired by
 * Apple's design system.
 *
 * frappe.visual.Bento.create({
 *   target: "#bento",
 *   items: [
 *     { size: "lg", html: "<div>Hero</div>" },       // 2x2
 *     { size: "md", html: "<div>Card A</div>" },      // 2x1
 *     { size: "sm", html: "<div>Card B</div>" },      // 1x1
 *     { size: "wide", html: "<div>Card C</div>" },    // 3x1
 *     { size: "tall", html: "<div>Card D</div>" }     // 1x2
 *   ],
 *   columns: 4,
 *   rowHeight: 140,
 *   gap: 12,
 *   animate: true,
 *   className: ""
 * })
 */

export class Bento {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			columns: 4,
			rowHeight: 140,
			gap: 12,
			animate: true,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new Bento(opts); }

	/* Size map: name → { cols, rows } */
	static SIZES = {
		sm:   { cols: 1, rows: 1 },
		md:   { cols: 2, rows: 1 },
		lg:   { cols: 2, rows: 2 },
		wide: { cols: 3, rows: 1 },
		tall: { cols: 1, rows: 2 },
		full: { cols: 4, rows: 2 },
	};

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const grid = document.createElement("div");
		grid.className = `fv-bento ${this.className}`;
		grid.style.cssText = `display:grid;grid-template-columns:repeat(${this.columns}, 1fr);grid-auto-rows:${this.rowHeight}px;gap:${this.gap}px;`;

		this.items.forEach((item, i) => {
			const s = Bento.SIZES[item.size] || Bento.SIZES.sm;
			const cell = document.createElement("div");
			cell.className = `fv-bento-cell fv-bento-${item.size || "sm"}`;
			cell.style.cssText = `grid-column:span ${Math.min(s.cols, this.columns)};grid-row:span ${s.rows};border-radius:16px;overflow:hidden;background:var(--control-bg, #f8f9fa);border:1px solid var(--border-color, #e5e7eb);`;

			if (this.animate) {
				cell.style.opacity = "0";
				cell.style.transform = "scale(0.92)";
				cell.style.transition = `all 0.35s ease ${i * 0.05}s`;
				requestAnimationFrame(() => requestAnimationFrame(() => {
					cell.style.opacity = "1";
					cell.style.transform = "scale(1)";
				}));
			}

			if (typeof item.html === "string") cell.innerHTML = item.html;
			else if (item.element) cell.appendChild(item.element);

			grid.appendChild(cell);
		});

		el.innerHTML = "";
		el.appendChild(grid);
	}
}
