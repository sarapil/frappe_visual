/**
 * Typewriter — Typewriter text animation
 * ========================================
 * Types text character by character with blinking cursor.
 *
 * frappe.visual.Typewriter.create({
 *   target: "#hero-text",
 *   strings: ["Hello World", "Welcome to Frappe", "Build Amazing Apps"],
 *   speed: 80,            // ms per character
 *   deleteSpeed: 40,
 *   pauseTime: 2000,      // pause between strings
 *   loop: true,
 *   cursor: "|",
 *   cursorBlink: true,
 *   onComplete: () => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class Typewriter {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			strings: [],
			speed: 80,
			deleteSpeed: 40,
			pauseTime: 2000,
			loop: true,
			cursor: "|",
			cursorBlink: true,
			onComplete: null,
		}, opts);

		this._idx = 0;
		this._charIdx = 0;
		this._deleting = false;
		this._timeout = null;
		this.render();
	}

	static create(opts) { return new Typewriter(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("span");
		wrap.className = "fv-tw";

		const text = document.createElement("span");
		text.className = "fv-tw-text";

		const cur = document.createElement("span");
		cur.className = `fv-tw-cursor ${this.cursorBlink ? "fv-tw-blink" : ""}`;
		cur.textContent = this.cursor;

		wrap.appendChild(text);
		wrap.appendChild(cur);
		el.innerHTML = "";
		el.appendChild(wrap);

		this._el = text;
		this._tick();
	}

	_tick() {
		const str = this.strings[this._idx] || "";

		if (!this._deleting) {
			this._charIdx++;
			this._el.textContent = str.slice(0, this._charIdx);

			if (this._charIdx >= str.length) {
				/* Pause at full string */
				if (this.strings.length === 1 && !this.loop) {
					this.onComplete?.();
					return;
				}
				this._timeout = setTimeout(() => {
					this._deleting = true;
					this._tick();
				}, this.pauseTime);
				return;
			}
			this._timeout = setTimeout(() => this._tick(), this.speed);
		} else {
			this._charIdx--;
			this._el.textContent = str.slice(0, this._charIdx);

			if (this._charIdx <= 0) {
				this._deleting = false;
				this._idx++;
				if (this._idx >= this.strings.length) {
					if (this.loop) {
						this._idx = 0;
					} else {
						this.onComplete?.();
						return;
					}
				}
				this._timeout = setTimeout(() => this._tick(), 300);
				return;
			}
			this._timeout = setTimeout(() => this._tick(), this.deleteSpeed);
		}
	}

	destroy() { clearTimeout(this._timeout); }
}
