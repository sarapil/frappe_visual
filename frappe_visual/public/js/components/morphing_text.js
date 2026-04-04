/**
 * MorphingText — Text morphing between words
 * =============================================
 * Smooth SVG filter-based text morph transition.
 *
 * frappe.visual.MorphingText.create({
 *   target: "#morph",
 *   words: ["Innovation", "Creativity", "Excellence"],
 *   interval: 3000,
 *   morphDuration: 1500,
 *   className: "",
 *   fontSize: "3rem",
 *   fontWeight: "800",
 *   color: null              // CSS color or gradient
 * })
 */

export class MorphingText {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			words: [],
			interval: 3000,
			morphDuration: 1500,
			className: "",
			fontSize: "3rem",
			fontWeight: "800",
			color: null,
		}, opts);

		this._idx = 0;
		this._raf = null;
		this._timer = null;
		this.render();
	}

	static create(opts) { return new MorphingText(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || this.words.length < 2) return;

		/* SVG filter for blur-morph */
		const filterId = `fv-morph-${Date.now()}`;
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.style.cssText = "position:absolute;width:0;height:0;";
		svg.innerHTML = `<defs><filter id="${filterId}">
			<feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
			<feColorMatrix in="blur" type="matrix"
				values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="morph" />
			<feComposite in="SourceGraphic" in2="morph" operator="atop" />
		</filter></defs>`;
		document.body.appendChild(svg);

		const wrap = document.createElement("div");
		wrap.className = `fv-morph ${this.className}`;
		wrap.style.cssText = `position:relative;display:inline-block;filter:url(#${filterId});font-size:${this.fontSize};font-weight:${this.fontWeight};`;
		if (this.color) wrap.style.color = this.color;

		const text1 = document.createElement("span");
		text1.className = "fv-morph-text";
		text1.style.cssText = "display:inline-block;position:absolute;inset:0;";
		text1.textContent = this.words[0];

		const text2 = document.createElement("span");
		text2.className = "fv-morph-text";
		text2.style.cssText = "display:inline-block;";
		text2.textContent = this.words[0];

		wrap.appendChild(text1);
		wrap.appendChild(text2);
		el.innerHTML = "";
		el.appendChild(wrap);

		this._t1 = text1;
		this._t2 = text2;
		this._filter = svg.querySelector("feGaussianBlur");
		this._svg = svg;

		this._timer = setInterval(() => this._morph(), this.interval);
	}

	_morph() {
		const next = (this._idx + 1) % this.words.length;
		const nextWord = this.words[next];

		this._t1.textContent = this.words[this._idx];
		this._t2.textContent = nextWord;

		const start = performance.now();
		const dur = this.morphDuration;

		const animate = (now) => {
			const p = Math.min((now - start) / dur, 1);

			/* Blur in middle, sharp at ends */
			const blur = Math.sin(p * Math.PI) * 8;
			this._filter.setAttribute("stdDeviation", blur);

			this._t1.style.opacity = 1 - p;
			this._t2.style.opacity = p;

			if (p < 1) {
				this._raf = requestAnimationFrame(animate);
			} else {
				this._filter.setAttribute("stdDeviation", "0");
				this._idx = next;
			}
		};

		this._raf = requestAnimationFrame(animate);
	}

	destroy() {
		clearInterval(this._timer);
		cancelAnimationFrame(this._raf);
		this._svg?.remove();
	}
}
