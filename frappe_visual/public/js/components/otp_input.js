/**
 * Frappe Visual — OTPInput
 * ==========================
 * One-time password input with auto-focus advance, paste support,
 * backspace-to-previous, completion callback, and timer countdown.
 *
 * Usage:
 *   frappe.visual.OTPInput.create('#el', {
 *     length: 6,
 *     onComplete: code => console.log(code)
 *   })
 *
 * @module frappe_visual/components/otp_input
 */

export class OTPInput {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("OTPInput: container not found");

		this.opts = Object.assign({
			theme: "glass",
			length: 6,
			type: "number",          // number | text | password
			placeholder: "",
			autoFocus: true,
			mask: false,             // show dots instead of chars
			separator: null,         // index after which to show separator (e.g., 3 for XXX-XXX)
			size: "md",              // sm | md | lg
			disabled: false,
			resendTimer: 0,          // seconds (0 = no timer)
			onComplete: null,
			onChange: null,
			onResend: null,
		}, opts);

		this._values = new Array(this.opts.length).fill("");
		this._inputs = [];
		this._timerInterval = null;
		this._timerRemaining = 0;
		this._init();
	}

	static create(container, opts = {}) { return new OTPInput(container, opts); }

	_init() {
		this.container.classList.add("fv-otp", `fv-otp--${this.opts.theme}`, `fv-otp--${this.opts.size}`);
		if (this.opts.disabled) this.container.classList.add("fv-otp--disabled");
		this.container.innerHTML = "";

		const wrap = document.createElement("div");
		wrap.className = "fv-otp-wrap";

		for (let i = 0; i < this.opts.length; i++) {
			// Separator
			if (this.opts.separator && i === this.opts.separator) {
				const sep = document.createElement("span");
				sep.className = "fv-otp-sep";
				sep.textContent = "—";
				wrap.appendChild(sep);
			}

			const input = document.createElement("input");
			input.className = "fv-otp-cell";
			input.type = this.opts.mask ? "password" : (this.opts.type === "number" ? "tel" : "text");
			input.maxLength = 1;
			input.inputMode = this.opts.type === "number" ? "numeric" : "text";
			input.autocomplete = "one-time-code";
			input.placeholder = this.opts.placeholder;
			input.disabled = this.opts.disabled;
			input.dataset.index = i;

			input.addEventListener("input", (e) => this._onInput(i, e));
			input.addEventListener("keydown", (e) => this._onKeydown(i, e));
			input.addEventListener("paste", (e) => this._onPaste(i, e));
			input.addEventListener("focus", () => { input.select(); input.classList.add("fv-otp-cell--focus"); });
			input.addEventListener("blur", () => input.classList.remove("fv-otp-cell--focus"));

			this._inputs.push(input);
			wrap.appendChild(input);
		}

		this.container.appendChild(wrap);

		// Resend timer
		if (this.opts.resendTimer > 0 || this.opts.onResend) {
			this._timerEl = document.createElement("div");
			this._timerEl.className = "fv-otp-timer";
			this.container.appendChild(this._timerEl);

			if (this.opts.resendTimer > 0) {
				this._startTimer();
			} else {
				this._showResendButton();
			}
		}

		// Auto focus first input
		if (this.opts.autoFocus && !this.opts.disabled) {
			requestAnimationFrame(() => this._inputs[0]?.focus());
		}
	}

	_onInput(index, e) {
		const val = e.target.value;

		if (this.opts.type === "number" && !/^\d*$/.test(val)) {
			e.target.value = "";
			return;
		}

		this._values[index] = val.slice(-1); // Only last char
		e.target.value = this._values[index];

		// Visual feedback
		if (this._values[index]) {
			e.target.classList.add("fv-otp-cell--filled");
		} else {
			e.target.classList.remove("fv-otp-cell--filled");
		}

		// Auto-advance
		if (this._values[index] && index < this.opts.length - 1) {
			this._inputs[index + 1].focus();
		}

		this._emitChange();

		// Check completion
		if (this._values.every(v => v !== "")) {
			const code = this._values.join("");
			if (this.opts.onComplete) this.opts.onComplete(code);
		}
	}

	_onKeydown(index, e) {
		if (e.key === "Backspace") {
			if (!this._values[index] && index > 0) {
				e.preventDefault();
				this._inputs[index - 1].focus();
				this._values[index - 1] = "";
				this._inputs[index - 1].value = "";
				this._inputs[index - 1].classList.remove("fv-otp-cell--filled");
				this._emitChange();
			}
		} else if (e.key === "ArrowLeft" && index > 0) {
			e.preventDefault();
			this._inputs[index - 1].focus();
		} else if (e.key === "ArrowRight" && index < this.opts.length - 1) {
			e.preventDefault();
			this._inputs[index + 1].focus();
		}
	}

	_onPaste(index, e) {
		e.preventDefault();
		const text = (e.clipboardData || window.clipboardData).getData("text").trim();
		const chars = text.split("").filter(c => this.opts.type !== "number" || /\d/.test(c));

		for (let i = 0; i < Math.min(chars.length, this.opts.length - index); i++) {
			this._values[index + i] = chars[i];
			this._inputs[index + i].value = chars[i];
			this._inputs[index + i].classList.add("fv-otp-cell--filled");
		}

		// Focus the next empty or last
		const nextEmpty = this._values.findIndex((v, idx) => idx >= index && !v);
		if (nextEmpty >= 0) this._inputs[nextEmpty].focus();
		else this._inputs[this.opts.length - 1].focus();

		this._emitChange();

		if (this._values.every(v => v !== "")) {
			if (this.opts.onComplete) this.opts.onComplete(this._values.join(""));
		}
	}

	_emitChange() {
		if (this.opts.onChange) this.opts.onChange(this._values.join(""));
	}

	_startTimer() {
		this._timerRemaining = this.opts.resendTimer;
		this._updateTimerDisplay();

		this._timerInterval = setInterval(() => {
			this._timerRemaining--;
			if (this._timerRemaining <= 0) {
				clearInterval(this._timerInterval);
				this._showResendButton();
			} else {
				this._updateTimerDisplay();
			}
		}, 1000);
	}

	_updateTimerDisplay() {
		if (!this._timerEl) return;
		const m = Math.floor(this._timerRemaining / 60);
		const s = String(this._timerRemaining % 60).padStart(2, "0");
		this._timerEl.innerHTML = `<span class="fv-otp-timer-text">${__("Resend in")} ${m}:${s}</span>`;
	}

	_showResendButton() {
		if (!this._timerEl) return;
		this._timerEl.innerHTML = `<button type="button" class="fv-otp-resend">${__("Resend Code")}</button>`;
		this._timerEl.querySelector(".fv-otp-resend").addEventListener("click", () => {
			if (this.opts.onResend) this.opts.onResend();
			if (this.opts.resendTimer > 0) this._startTimer();
		});
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this._values.join(""); }

	clear() {
		this._values = new Array(this.opts.length).fill("");
		this._inputs.forEach(inp => { inp.value = ""; inp.classList.remove("fv-otp-cell--filled"); });
		if (this.opts.autoFocus) this._inputs[0]?.focus();
	}

	focus() { this._inputs[0]?.focus(); }

	setError(msg) {
		this._inputs.forEach(inp => inp.classList.add("fv-otp-cell--error"));
		if (msg) {
			let errEl = this.container.querySelector(".fv-otp-error");
			if (!errEl) { errEl = document.createElement("div"); errEl.className = "fv-otp-error"; this.container.appendChild(errEl); }
			errEl.textContent = msg;
		}
	}

	clearError() {
		this._inputs.forEach(inp => inp.classList.remove("fv-otp-cell--error"));
		const errEl = this.container.querySelector(".fv-otp-error");
		if (errEl) errEl.remove();
	}

	destroy() {
		if (this._timerInterval) clearInterval(this._timerInterval);
		this.container.innerHTML = "";
		this.container.classList.remove("fv-otp", `fv-otp--${this.opts.theme}`, `fv-otp--${this.opts.size}`, "fv-otp--disabled");
	}
}
