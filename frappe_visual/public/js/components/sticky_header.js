/**
 * StickyHeader — Scroll-aware sticky header
 * ============================================
 * Sticks to top on scroll with backdrop blur, shadow, and auto-hide variants.
 *
 * frappe.visual.StickyHeader.create({
 *   target: "#page-header",
 *   content: "<nav>…</nav>",
 *   offset: 0,              // pixels to scroll before sticking
 *   blur: true,             // backdrop-filter: blur
 *   shadow: true,           // box-shadow when stuck
 *   autoHide: false,        // hide on scroll-down, show on scroll-up
 *   variant: "default",     // default | transparent | glass
 *   zIndex: 1000,
 *   onStick: (stuck) => {}
 * })
 */

export class StickyHeader {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			content: "",
			offset: 0,
			blur: true,
			shadow: true,
			autoHide: false,
			variant: "default",
			zIndex: 1000,
			onStick: null,
		}, opts);

		this._stuck = false;
		this._hidden = false;
		this._lastY = 0;
		this.render();
	}

	static create(opts) { return new StickyHeader(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-sticky fv-sticky-${this.variant}`;
		wrap.style.position = "sticky";
		wrap.style.top = "0";
		wrap.style.zIndex = this.zIndex;
		wrap.style.transition = "transform 0.25s ease, box-shadow 0.25s ease, backdrop-filter 0.25s ease";

		if (typeof this.content === "string") {
			wrap.innerHTML = this.content;
		} else if (this.content instanceof HTMLElement) {
			wrap.appendChild(this.content);
		}

		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;

		/* Sentinel for intersection observer (cheaper than scroll) */
		const sentinel = document.createElement("div");
		sentinel.className = "fv-sticky-sentinel";
		sentinel.style.cssText = `height:1px;margin-top:-1px;pointer-events:none;`;
		el.insertBefore(sentinel, wrap);

		/* Observer for stuck state */
		if ("IntersectionObserver" in window) {
			this._observer = new IntersectionObserver(
				([entry]) => {
					const stuck = !entry.isIntersecting;
					if (stuck !== this._stuck) {
						this._stuck = stuck;
						wrap.classList.toggle("fv-sticky-stuck", stuck);
						if (stuck) {
							if (this.blur) wrap.style.backdropFilter = "blur(12px)";
							if (this.shadow) wrap.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
						} else {
							wrap.style.backdropFilter = "";
							wrap.style.boxShadow = "";
						}
						this.onStick?.(stuck);
					}
				},
				{ threshold: [1] }
			);
			this._observer.observe(sentinel);
		}

		/* Auto-hide on scroll-down */
		if (this.autoHide) {
			this._scrollHandler = () => {
				const y = window.scrollY;
				const down = y > this._lastY && y > this.offset + 50;
				if (down && !this._hidden) {
					wrap.style.transform = "translateY(-100%)";
					this._hidden = true;
				} else if (!down && this._hidden) {
					wrap.style.transform = "";
					this._hidden = false;
				}
				this._lastY = y;
			};
			window.addEventListener("scroll", this._scrollHandler, { passive: true });
		}
	}

	destroy() {
		this._observer?.disconnect();
		if (this._scrollHandler) window.removeEventListener("scroll", this._scrollHandler);
	}
}
