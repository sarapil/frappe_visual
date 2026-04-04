// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * NumberTicker — Slot machine-style number animation
 * =====================================================
 * Digits roll like a slot machine from old to new value.
 *
 * frappe.visual.NumberTicker.create({
 *   target: "#counter",
 *   value: 1234,
 *   duration: 1500,
 *   prefix: "",
 *   suffix: "",
 *   separator: ",",
 *   padStart: 0,           // pad with leading zeros
 *   onComplete: () => {}
 * })
 */

export class NumberTicker {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			value: 0,
			duration: 1500,
			prefix: "",
			suffix: "",
			separator: ",",
			padStart: 0,
			onComplete: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new NumberTicker(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		this._el = el;
		el.classList.add("fv-nt");
		el.style.display = "inline-flex";
		el.style.overflow = "hidden";

		this.setValue(this.value);
	}

	setValue(val) {
		this.value = val;
		const str = String(Math.abs(Math.round(val)));
		const padded = str.padStart(this.padStart, "0");

		/* Add separator */
		let formatted = "";
		for (let i = 0; i < padded.length; i++) {
			if (i > 0 && (padded.length - i) % 3 === 0 && this.separator) {
				formatted += this.separator;
			}
			formatted += padded[i];
		}

		const full = `${val < 0 ? "-" : ""}${this.prefix}${formatted}${this.suffix}`;
		this._animateDigits(full);
	}

	_animateDigits(str) {
		const el = this._el;
		el.innerHTML = "";

		[...str].forEach((char, i) => {
			const col = document.createElement("span");
			col.className = "fv-nt-col";
			col.style.cssText = "display:inline-block;overflow:hidden;position:relative;";

			const isDigit = /\d/.test(char);
			if (isDigit) {
				const digit = parseInt(char);
				const strip = document.createElement("span");
				strip.className = "fv-nt-strip";
				strip.style.cssText = `display:flex;flex-direction:column;transition:transform ${this.duration}ms cubic-bezier(0.16, 1, 0.3, 1);`;

				/* Create 0-9 + wrap */
				for (let d = 0; d <= 9; d++) {
					const cell = document.createElement("span");
					cell.className = "fv-nt-digit";
					cell.textContent = d;
					cell.style.cssText = "display:block;text-align:center;line-height:1.2;";
					strip.appendChild(cell);
				}

				col.appendChild(strip);

				/* Measure height after append */
				requestAnimationFrame(() => {
					const h = col.querySelector(".fv-nt-digit")?.offsetHeight || 20;
					col.style.height = `${h}px`;
					col.style.width = `${col.querySelector(".fv-nt-digit")?.offsetWidth || 12}px`;

					/* Random start */
					const start = Math.floor(Math.random() * 10);
					strip.style.transform = `translateY(${-start * h}px)`;

					/* Delay per column */
					setTimeout(() => {
						strip.style.transform = `translateY(${-digit * h}px)`;
					}, 50 + i * 80);
				});
			} else {
				col.textContent = char;
				col.style.lineHeight = "1.2";
			}

			el.appendChild(col);
		});

		setTimeout(() => this.onComplete?.(), this.duration + str.length * 80);
	}

	update(newVal) { this.setValue(newVal); }
}
