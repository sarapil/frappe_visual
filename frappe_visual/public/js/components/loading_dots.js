/**
 * LoadingDots — Animated dot sequence indicator
 *
 * frappe.visual.LoadingDots.create({ count: 3, size: 8, color: '#6366f1', speed: 0.6 })
 */

export class LoadingDots {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			count: 3,
			size: 8,
			gap: 6,
			color: "var(--primary, #6366f1)",
			speed: 0.6,
			variant: "bounce",       // bounce | fade | scale | pulse
			label: "",
			theme: "glass",
			dark: document.documentElement.classList.contains("dark"),
		}, opts);

		this._esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
		this.id = "fv-loading-dots-" + Math.random().toString(36).slice(2, 9);
		this._build();
	}

	/* ── build ─────────────────────────────────────────────── */
	_build() {
		const el = document.createElement("div");
		el.id = this.id;
		el.className = `fv-loading-dots fv-loading-dots--${this.variant}`;
		el.setAttribute("role", "status");
		el.setAttribute("aria-label", this.label || "Loading");

		const wrap = document.createElement("div");
		wrap.className = "fv-loading-dots__wrap";
		wrap.style.display = "flex";
		wrap.style.alignItems = "center";
		wrap.style.gap = `${this.gap}px`;

		for (let i = 0; i < this.count; i++) {
			const dot = document.createElement("span");
			dot.className = "fv-loading-dots__dot";
			Object.assign(dot.style, {
				width: `${this.size}px`,
				height: `${this.size}px`,
				borderRadius: "50%",
				background: this.color,
				display: "inline-block",
				animationDelay: `${i * (this.speed / this.count)}s`,
				animation: `fvDots${this._cap(this.variant)} ${this.speed}s infinite ease-in-out`,
			});
			wrap.appendChild(dot);
		}

		el.appendChild(wrap);

		if (this.label) {
			const lbl = document.createElement("span");
			lbl.className = "fv-loading-dots__label";
			lbl.textContent = this.label;
			lbl.style.cssText = "margin-inline-start:8px;font-size:0.82rem;opacity:0.7;";
			el.appendChild(lbl);
		}

		this.el = el;
		if (this.target) {
			const t = typeof this.target === "string" ? document.querySelector(this.target) : this.target;
			if (t) t.appendChild(el);
		}
	}

	_cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

	/* ── API ───────────────────────────────────────────────── */
	show() { if (this.el) this.el.style.display = ""; }
	hide() { if (this.el) this.el.style.display = "none"; }

	destroy() {
		if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
		this.el = null;
	}

	static create(opts) { return new LoadingDots(opts); }
}
