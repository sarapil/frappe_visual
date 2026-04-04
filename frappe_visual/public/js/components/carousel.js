// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Carousel — Image / content carousel
 * ======================================
 * Dots / arrows navigation, autoplay, swipe, loop, fade / slide transition.
 *
 * frappe.visual.Carousel.create({
 *   target: "#hero",
 *   slides: [{ content: "<img …>", caption: "A" }, …],
 *   autoplay: 4000,          // ms, 0 = off
 *   loop: true,
 *   transition: "slide",     // slide | fade
 *   showDots: true,
 *   showArrows: true,
 *   height: "300px",
 *   onChange: (idx) => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class Carousel {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			slides: [],
			autoplay: 0,
			loop: true,
			transition: "slide",
			showDots: true,
			showArrows: true,
			height: "300px",
			onChange: null,
		}, opts);

		this.current = 0;
		this._timer = null;
		this.render();
	}

	static create(opts) { return new Carousel(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const len = this.slides.length;
		if (!len) return;

		const isFade = this.transition === "fade";
		const wrap = document.createElement("div");
		wrap.className = "fv-carousel";
		wrap.style.height = this.height;

		/* Track */
		const track = document.createElement("div");
		track.className = `fv-car-track ${isFade ? "fv-car-fade" : ""}`;
		this.slides.forEach((s, i) => {
			const slide = document.createElement("div");
			slide.className = `fv-car-slide ${i === 0 ? "fv-car-active" : ""}`;
			slide.innerHTML = s.content || "";
			if (s.caption) {
				const cap = document.createElement("div");
				cap.className = "fv-car-caption";
				cap.textContent = s.caption;
				slide.appendChild(cap);
			}
			track.appendChild(slide);
		});
		wrap.appendChild(track);

		/* Arrows */
		if (this.showArrows && len > 1) {
			const prev = document.createElement("button");
			prev.className = "fv-car-arrow fv-car-prev";
			prev.innerHTML = "&#8249;";
			prev.onclick = () => this.go(this.current - 1);

			const next = document.createElement("button");
			next.className = "fv-car-arrow fv-car-next";
			next.innerHTML = "&#8250;";
			next.onclick = () => this.go(this.current + 1);

			wrap.appendChild(prev);
			wrap.appendChild(next);
		}

		/* Dots */
		if (this.showDots && len > 1) {
			const dots = document.createElement("div");
			dots.className = "fv-car-dots";
			for (let i = 0; i < len; i++) {
				const d = document.createElement("button");
				d.className = `fv-car-dot ${i === 0 ? "fv-car-dot-active" : ""}`;
				d.onclick = () => this.go(i);
				dots.appendChild(d);
			}
			wrap.appendChild(dots);
		}

		el.innerHTML = "";
		el.appendChild(wrap);

		this._wrap = wrap;
		this._track = track;
		this._slides = track.querySelectorAll(".fv-car-slide");
		this._dots = wrap.querySelectorAll(".fv-car-dot");

		/* Swipe */
		let startX = 0;
		wrap.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
		wrap.addEventListener("touchend", (e) => {
			const diff = e.changedTouches[0].clientX - startX;
			if (Math.abs(diff) > 40) this.go(this.current + (diff < 0 ? 1 : -1));
		});

		this._startAutoplay();
	}

	go(idx) {
		const len = this._slides.length;
		if (this.loop) {
			idx = ((idx % len) + len) % len;
		} else {
			idx = Math.max(0, Math.min(idx, len - 1));
		}
		if (idx === this.current) return;

		const isFade = this.transition === "fade";
		this._slides[this.current].classList.remove("fv-car-active");
		this._slides[idx].classList.add("fv-car-active");

		if (!isFade) {
			this._track.style.transform = `translateX(${-idx * 100}%)`;
		}

		if (this._dots.length) {
			this._dots[this.current]?.classList.remove("fv-car-dot-active");
			this._dots[idx]?.classList.add("fv-car-dot-active");
		}

		this.current = idx;
		this.onChange?.(idx);
		this._startAutoplay();
	}

	_startAutoplay() {
		clearInterval(this._timer);
		if (this.autoplay > 0) {
			this._timer = setInterval(() => this.go(this.current + 1), this.autoplay);
		}
	}

	destroy() { clearInterval(this._timer); }
}
