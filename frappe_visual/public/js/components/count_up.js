// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * CountUp — Animated number counter
 * ====================================
 * Smooth counting animation from start to end value.
 *
 * frappe.visual.CountUp.create({
 *   target: "#revenue",
 *   start: 0,
 *   end: 125000,
 *   duration: 2000,        // ms
 *   prefix: "$",
 *   suffix: "",
 *   separator: ",",        // thousands separator
 *   decimals: 0,
 *   useGrouping: true,
 *   easing: true,           // ease-out deceleration
 *   onComplete: () => {}
 * })
 */

export class CountUp {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			start: 0,
			end: 0,
			duration: 2000,
			prefix: "",
			suffix: "",
			separator: ",",
			decimals: 0,
			useGrouping: true,
			easing: true,
			onComplete: null,
		}, opts);

		this._raf = null;
		this.render();
	}

	static create(opts) { return new CountUp(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		el.classList.add("fv-cu");
		el.style.fontVariantNumeric = "tabular-nums";
		this._el = el;
		this._display(this.start);

		/* Start on visibility */
		if ("IntersectionObserver" in window) {
			const obs = new IntersectionObserver(([entry]) => {
				if (entry.isIntersecting) {
					obs.disconnect();
					this._animate();
				}
			}, { threshold: 0.1 });
			obs.observe(el);
		} else {
			this._animate();
		}
	}

	_format(val) {
		const fixed = val.toFixed(this.decimals);
		if (!this.useGrouping) return `${this.prefix}${fixed}${this.suffix}`;

		const [int, dec] = fixed.split(".");
		const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, this.separator);
		return `${this.prefix}${grouped}${dec !== undefined ? "." + dec : ""}${this.suffix}`;
	}

	_display(val) {
		if (this._el) this._el.textContent = this._format(val);
	}

	_animate() {
		const startTime = performance.now();

		const tick = (now) => {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / this.duration, 1);

			/* Ease-out cubic */
			const eased = this.easing
				? 1 - Math.pow(1 - progress, 3)
				: progress;

			const current = this.start + (this.end - this.start) * eased;
			this._display(current);

			if (progress < 1) {
				this._raf = requestAnimationFrame(tick);
			} else {
				this._display(this.end);
				this.onComplete?.();
			}
		};

		this._raf = requestAnimationFrame(tick);
	}

	update(newEnd) {
		cancelAnimationFrame(this._raf);
		this.start = this.end;
		this.end = newEnd;
		this._animate();
	}

	destroy() { cancelAnimationFrame(this._raf); }
}
