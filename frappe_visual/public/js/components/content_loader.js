/**
 * ContentLoader — Structured skeleton placeholder (lines + circles + rects)
 *
 * frappe.visual.ContentLoader.create({
 *   preset: 'card',   // card | list | article | profile | table | custom
 *   rows: 5,
 *   animate: true
 * })
 */

export class ContentLoader {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			preset: "card",       // card | list | article | profile | table | custom
			rows: 4,
			animate: true,
			speed: 1.4,
			width: null,
			borderRadius: "8px",
			customShapes: null,   // [{ type:'rect'|'circle', x, y, w, h, r? }]
			theme: "glass",
			dark: document.documentElement.classList.contains("dark"),
		}, opts);

		this._esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
		this.id = "fv-content-loader-" + Math.random().toString(36).slice(2, 9);
		this._build();
	}

	/* ── presets ───────────────────────────────────────────── */
	_presetShapes() {
		const p = {
			card: [
				{ type: "rect", x: 0, y: 0, w: "100%", h: 160 },
				{ type: "rect", x: 16, y: 176, w: "60%", h: 16 },
				{ type: "rect", x: 16, y: 200, w: "90%", h: 12 },
				{ type: "rect", x: 16, y: 220, w: "75%", h: 12 },
			],
			list: Array.from({ length: this.rows }, (_, i) => [
				{ type: "circle", x: 16, y: 20 + i * 56, r: 20 },
				{ type: "rect", x: 56, y: 10 + i * 56, w: "50%", h: 14 },
				{ type: "rect", x: 56, y: 30 + i * 56, w: "30%", h: 10 },
			]).flat(),
			article: [
				{ type: "rect", x: 0, y: 0, w: "70%", h: 20 },
				{ type: "rect", x: 0, y: 32, w: "100%", h: 12 },
				{ type: "rect", x: 0, y: 52, w: "100%", h: 12 },
				{ type: "rect", x: 0, y: 72, w: "85%", h: 12 },
				{ type: "rect", x: 0, y: 100, w: "100%", h: 12 },
				{ type: "rect", x: 0, y: 120, w: "92%", h: 12 },
			],
			profile: [
				{ type: "circle", x: 40, y: 40, r: 36 },
				{ type: "rect", x: 92, y: 20, w: "40%", h: 16 },
				{ type: "rect", x: 92, y: 44, w: "25%", h: 12 },
			],
			table: Array.from({ length: this.rows }, (_, i) => [
				{ type: "rect", x: 0, y: i * 44, w: "18%", h: 14 },
				{ type: "rect", x: "22%", y: i * 44, w: "25%", h: 14 },
				{ type: "rect", x: "50%", y: i * 44, w: "20%", h: 14 },
				{ type: "rect", x: "74%", y: i * 44, w: "24%", h: 14 },
			]).flat(),
		};
		return this.preset === "custom" ? (this.customShapes || p.card) : (p[this.preset] || p.card);
	}

	/* ── build ─────────────────────────────────────────────── */
	_build() {
		const el = document.createElement("div");
		el.id = this.id;
		el.className = `fv-content-loader fv-content-loader--${this.dark ? "dark" : "light"}`;
		el.setAttribute("role", "status");
		el.setAttribute("aria-label", "Loading content");

		const bgBase = this.dark ? "rgba(255,255,255,0.06)" : "#e5e7eb";
		const bgShine = this.dark ? "rgba(255,255,255,0.10)" : "#f3f4f6";

		Object.assign(el.style, {
			position: "relative",
			width: this.width || "100%",
			borderRadius: this.borderRadius,
			overflow: "hidden",
		});

		const shapes = this._presetShapes();
		let maxY = 0;
		shapes.forEach((s) => {
			const div = document.createElement("div");
			div.className = "fv-content-loader__shape";
			const isCircle = s.type === "circle";
			const px = (v) => typeof v === "number" ? `${v}px` : v;

			Object.assign(div.style, {
				position: "absolute",
				background: bgBase,
				borderRadius: isCircle ? "50%" : "4px",
				left: isCircle ? px(s.x - (s.r || 0)) : px(s.x),
				top: isCircle ? px(s.y - (s.r || 0)) : px(s.y),
				width: isCircle ? px((s.r || 16) * 2) : px(s.w),
				height: isCircle ? px((s.r || 16) * 2) : px(s.h),
			});

			if (this.animate) {
				div.style.backgroundImage = `linear-gradient(90deg, ${bgBase} 25%, ${bgShine} 50%, ${bgBase} 75%)`;
				div.style.backgroundSize = "200% 100%";
				div.style.animation = `fvShimmer ${this.speed}s infinite linear`;
			}

			el.appendChild(div);
			const bottom = (isCircle ? s.y + (s.r || 16) : (typeof s.y === "number" ? s.y : 0) + (typeof s.h === "number" ? s.h : 20));
			if (bottom > maxY) maxY = bottom;
		});

		el.style.height = `${maxY + 16}px`;
		this.el = el;

		if (this.target) {
			const t = typeof this.target === "string" ? document.querySelector(this.target) : this.target;
			if (t) t.appendChild(el);
		}
	}

	/* ── API ───────────────────────────────────────────────── */
	show() { if (this.el) this.el.style.display = ""; }
	hide() { if (this.el) this.el.style.display = "none"; }

	destroy() {
		if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
		this.el = null;
	}

	static create(opts) { return new ContentLoader(opts); }
}
