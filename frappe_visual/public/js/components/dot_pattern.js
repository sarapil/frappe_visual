/**
 * DotPattern — Decorative dot grid background
 * ==============================================
 * Canvas/CSS-based dot matrix pattern for hero sections,
 * backgrounds, and visual accents.
 *
 * frappe.visual.DotPattern.create({
 *   target: "#hero",
 *   size: 2,            // dot radius
 *   gap: 24,            // spacing between dots
 *   color: "rgba(0,0,0,.15)",
 *   animate: false,     // gentle pulse animation
 *   fade: "radial",     // "radial" | "linear-top" | "linear-bottom" | "none"
 *   className: "",
 *   responsive: true    // resize with container
 * })
 */

export class DotPattern {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			size: 2,
			gap: 24,
			color: "rgba(0,0,0,.15)",
			animate: false,
			fade: "radial",
			className: "",
			responsive: true,
		}, opts);

		this._raf = null;
		this._phase = 0;
		this.render();
	}

	static create(opts) { return new DotPattern(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-dots ${this.className}`;
		wrap.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;";

		const canvas = document.createElement("canvas");
		canvas.style.cssText = "width:100%;height:100%;";
		wrap.appendChild(canvas);

		/* Fade mask via CSS */
		if (this.fade === "radial") {
			wrap.style.mask = "radial-gradient(ellipse at 50% 50%,#000 30%,transparent 70%)";
			wrap.style.webkitMask = wrap.style.mask;
		} else if (this.fade === "linear-top") {
			wrap.style.mask = "linear-gradient(to bottom,transparent,#000 40%)";
			wrap.style.webkitMask = wrap.style.mask;
		} else if (this.fade === "linear-bottom") {
			wrap.style.mask = "linear-gradient(to top,transparent,#000 40%)";
			wrap.style.webkitMask = wrap.style.mask;
		}

		el.style.position = el.style.position || "relative";
		el.insertBefore(wrap, el.firstChild);

		this._canvas = canvas;
		this._ctx = canvas.getContext("2d");
		this._wrap = wrap;

		this._resize();
		if (this.responsive) {
			this._ro = new ResizeObserver(() => this._resize());
			this._ro.observe(el);
		}

		if (this.animate) this._animate();
	}

	_resize() {
		const rect = this._wrap.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		this._canvas.width = rect.width * dpr;
		this._canvas.height = rect.height * dpr;
		this._ctx.scale(dpr, dpr);
		this._w = rect.width;
		this._h = rect.height;
		if (!this.animate) this._draw(0);
	}

	_draw(phase) {
		const ctx = this._ctx;
		const { size, gap, color, _w: w, _h: h } = this;
		const dpr = window.devicePixelRatio || 1;

		ctx.clearRect(0, 0, w * dpr, h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = color;

		const cols = Math.ceil(w / gap) + 1;
		const rows = Math.ceil(h / gap) + 1;
		const ofsX = (w - (cols - 1) * gap) / 2;
		const ofsY = (h - (rows - 1) * gap) / 2;

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const x = ofsX + c * gap;
				const y = ofsY + r * gap;
				const pulse = this.animate
					? size * (0.8 + 0.4 * Math.sin(phase + (r + c) * 0.3))
					: size;
				ctx.beginPath();
				ctx.arc(x, y, Math.max(0.5, pulse), 0, Math.PI * 2);
				ctx.fill();
			}
		}
	}

	_animate() {
		const tick = () => {
			this._phase += 0.03;
			this._draw(this._phase);
			this._raf = requestAnimationFrame(tick);
		};
		this._raf = requestAnimationFrame(tick);
	}

	destroy() {
		cancelAnimationFrame(this._raf);
		this._ro?.disconnect();
		this._wrap?.remove();
	}
}
