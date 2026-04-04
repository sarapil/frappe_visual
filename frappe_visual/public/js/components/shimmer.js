/**
 * Shimmer — Animated shimmer / shine effect overlay
 *
 * frappe.visual.Shimmer.create({ target: el, speed: 1.2, angle: -20, color: '#e0e0e0' })
 */

export class Shimmer {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			speed: 1.4,
			angle: -20,
			color: "#e5e7eb",
			highlightColor: "#f3f4f6",
			borderRadius: null,
			width: null,
			height: null,
			theme: "glass",
			dark: document.documentElement.classList.contains("dark"),
		}, opts);

		this._esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
		this.id = "fv-shimmer-" + Math.random().toString(36).slice(2, 9);
		this._build();
	}

	/* ── build ─────────────────────────────────────────────── */
	_build() {
		const el = document.createElement("div");
		el.id = this.id;
		el.className = `fv-shimmer fv-shimmer--${this.dark ? "dark" : "light"}`;

		const bg = this.dark ? "rgba(255,255,255,0.04)" : this.color;
		const hi = this.dark ? "rgba(255,255,255,0.08)" : this.highlightColor;

		Object.assign(el.style, {
			position: "relative",
			overflow: "hidden",
			background: bg,
			borderRadius: this.borderRadius || "8px",
			width: this.width || "100%",
			height: this.height || "100%",
		});

		const shine = document.createElement("div");
		shine.className = "fv-shimmer__shine";
		Object.assign(shine.style, {
			position: "absolute",
			top: 0, left: 0, right: 0, bottom: 0,
			background: `linear-gradient(${this.angle}deg, transparent 30%, ${hi} 50%, transparent 70%)`,
			backgroundSize: "200% 100%",
			animation: `fvShimmer ${this.speed}s infinite linear`,
		});

		el.appendChild(shine);
		this.el = el;

		if (this.target) {
			const t = typeof this.target === "string" ? document.querySelector(this.target) : this.target;
			if (t) {
				t.style.position = "relative";
				t.appendChild(el);
			}
		}
	}

	/* ── API ───────────────────────────────────────────────── */
	show() { if (this.el) this.el.style.display = ""; }
	hide() { if (this.el) this.el.style.display = "none"; }

	destroy() {
		if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
		this.el = null;
	}

	static create(opts) { return new Shimmer(opts); }
}
