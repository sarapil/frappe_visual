/**
 * ParallaxScroll — Scroll-driven parallax layers
 * =================================================
 * Apply parallax speed to child elements on scroll.
 *
 * frappe.visual.ParallaxScroll.create({
 *   target: "#hero",
 *   layers: [
 *     { selector: ".bg",   speed: 0.3 },   // slow
 *     { selector: ".mid",  speed: 0.6 },
 *     { selector: ".fg",   speed: 1.0 }    // fast
 *   ],
 *   direction: "vertical",  // vertical | horizontal
 *   disabled: false          // disable on mobile
 * })
 */

export class ParallaxScroll {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			layers: [],
			direction: "vertical",
			disabled: false,
		}, opts);

		this._raf = null;
		this.render();
	}

	static create(opts) { return new ParallaxScroll(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || this.disabled) return;

		/* Disable on mobile for performance */
		if (window.innerWidth < 768) return;

		this._el = el;
		this._layerEls = this.layers.map((l) => ({
			el: el.querySelector(l.selector),
			speed: l.speed ?? 0.5,
		})).filter((l) => l.el);

		this._handler = () => {
			if (this._raf) return;
			this._raf = requestAnimationFrame(() => {
				this._update();
				this._raf = null;
			});
		};

		window.addEventListener("scroll", this._handler, { passive: true });
		this._update();
	}

	_update() {
		const rect = this._el.getBoundingClientRect();
		const viewH = window.innerHeight;
		const progress = -(rect.top - viewH) / (rect.height + viewH);

		this._layerEls.forEach(({ el, speed }) => {
			const offset = (progress - 0.5) * speed * 100;
			if (this.direction === "vertical") {
				el.style.transform = `translateY(${offset}px)`;
			} else {
				el.style.transform = `translateX(${offset}px)`;
			}
		});
	}

	destroy() {
		window.removeEventListener("scroll", this._handler);
		cancelAnimationFrame(this._raf);
	}
}
