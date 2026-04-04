// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * TextLoop — Rotating text with smooth transitions
 * ===================================================
 * Cycles through words with slide/fade/blur transitions.
 *
 * frappe.visual.TextLoop.create({
 *   target: "#tagline",
 *   words: ["Amazing", "Beautiful", "Powerful"],
 *   interval: 2500,
 *   transition: "slideUp",  // slideUp | slideDown | fade | blur
 *   duration: 400,
 *   className: ""           // extra class on the word span
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class TextLoop {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			words: [],
			interval: 2500,
			transition: "slideUp",
			duration: 400,
			className: "",
		}, opts);

		this._idx = 0;
		this._timer = null;
		this.render();
	}

	static create(opts) { return new TextLoop(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.words.length) return;

		const wrap = document.createElement("span");
		wrap.className = "fv-tl2";
		wrap.style.cssText = "display:inline-block;position:relative;overflow:hidden;vertical-align:bottom;";

		/* Measure max width */
		const measure = document.createElement("span");
		measure.style.cssText = "visibility:hidden;position:absolute;white-space:nowrap;";
		let maxW = 0;
		this.words.forEach((w) => {
			measure.textContent = w;
			document.body.appendChild(measure);
			maxW = Math.max(maxW, measure.offsetWidth);
			measure.remove();
		});
		wrap.style.width = `${maxW + 4}px`;

		const word = document.createElement("span");
		word.className = `fv-tl2-word ${this.className}`;
		word.style.cssText = `display:inline-block;transition:all ${this.duration}ms ease;`;
		word.textContent = this.words[0];

		wrap.appendChild(word);
		el.innerHTML = "";
		el.appendChild(wrap);

		this._word = word;
		this._wrap = wrap;

		this._timer = setInterval(() => this._next(), this.interval);
	}

	_next() {
		const prev = this._idx;
		this._idx = (this._idx + 1) % this.words.length;
		const word = this._word;

		/* Exit animation */
		const exitMap = {
			slideUp:   "translateY(-100%)",
			slideDown: "translateY(100%)",
			fade:      "",
			blur:      "",
		};
		const t = this.transition;

		word.style.opacity = "0";
		if (exitMap[t]) word.style.transform = exitMap[t];
		if (t === "blur") word.style.filter = "blur(4px)";

		setTimeout(() => {
			word.style.transition = "none";

			/* Reset to entry position */
			const enterMap = {
				slideUp:   "translateY(100%)",
				slideDown: "translateY(-100%)",
				fade:      "",
				blur:      "",
			};
			if (enterMap[t]) word.style.transform = enterMap[t];

			word.textContent = this.words[this._idx];

			requestAnimationFrame(() => {
				word.style.transition = `all ${this.duration}ms ease`;
				word.style.opacity = "1";
				word.style.transform = "translateY(0)";
				word.style.filter = "";
			});
		}, this.duration);
	}

	destroy() { clearInterval(this._timer); }
}
