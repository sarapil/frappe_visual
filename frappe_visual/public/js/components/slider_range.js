// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — SliderRange
 * ==============================
 * Dual-handle range slider with histogram distribution, step marks,
 * value labels, min/max constraints, and keyboard support.
 *
 * Usage:
 *   frappe.visual.SliderRange.create('#el', {
 *     min: 0, max: 1000,
 *     value: [200, 800],
 *     step: 50,
 *     prefix: '$',
 *     histogram: [4,8,15,22,30,45,38,28,18,10,5],
 *     onChange: ([lo, hi]) => console.log(lo, hi)
 *   })
 *
 * @module frappe_visual/components/slider_range
 */

export class SliderRange {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("SliderRange: container not found");

		this.opts = Object.assign({
			theme: "glass",
			min: 0,
			max: 100,
			value: [25, 75],        // [low, high] for range; single number for slider
			step: 1,
			range: true,            // false = single handle
			prefix: "",
			suffix: "",
			color: "#6366f1",
			showLabels: true,
			showTooltip: true,
			showSteps: false,
			histogram: null,        // array of bar heights for distribution
			histogramColor: "#e2e8f0",
			disabled: false,
			onChange: null,
			onInput: null,          // fires continuously while dragging
		}, opts);

		this._lo = this.opts.range ? this.opts.value[0] : this.opts.min;
		this._hi = this.opts.range ? this.opts.value[1] : this.opts.value;
		this._activeHandle = null;
		this._init();
	}

	static create(container, opts = {}) { return new SliderRange(container, opts); }

	_init() {
		this.container.classList.add("fv-sr", `fv-sr--${this.opts.theme}`);
		if (this.opts.disabled) this.container.classList.add("fv-sr--disabled");
		this.container.innerHTML = "";

		// Histogram
		if (this.opts.histogram) {
			this._renderHistogram();
		}

		// Track
		const track = document.createElement("div");
		track.className = "fv-sr-track";
		this.container.appendChild(track);
		this._trackEl = track;

		// Active range fill
		this._fillEl = document.createElement("div");
		this._fillEl.className = "fv-sr-fill";
		this._fillEl.style.background = this.opts.color;
		track.appendChild(this._fillEl);

		// Step marks
		if (this.opts.showSteps && this.opts.step > 0) {
			this._renderSteps();
		}

		// Handles
		if (this.opts.range) {
			this._loHandle = this._createHandle("lo");
			track.appendChild(this._loHandle);
		}
		this._hiHandle = this._createHandle("hi");
		track.appendChild(this._hiHandle);

		// Labels
		if (this.opts.showLabels) {
			const labels = document.createElement("div");
			labels.className = "fv-sr-labels";
			this._loLabelEl = document.createElement("span");
			this._loLabelEl.className = "fv-sr-label fv-sr-label--lo";
			this._hiLabelEl = document.createElement("span");
			this._hiLabelEl.className = "fv-sr-label fv-sr-label--hi";
			labels.appendChild(this._loLabelEl);
			labels.appendChild(this._hiLabelEl);
			this.container.appendChild(labels);
		}

		this._updatePositions();
		this._bindEvents();
	}

	_createHandle(type) {
		const handle = document.createElement("div");
		handle.className = `fv-sr-handle fv-sr-handle--${type}`;
		handle.tabIndex = 0;
		handle.setAttribute("role", "slider");
		handle.setAttribute("aria-valuemin", this.opts.min);
		handle.setAttribute("aria-valuemax", this.opts.max);

		if (this.opts.showTooltip) {
			const tip = document.createElement("div");
			tip.className = "fv-sr-tooltip";
			handle.appendChild(tip);
			if (type === "lo") this._loTip = tip;
			else this._hiTip = tip;
		}

		return handle;
	}

	_renderHistogram() {
		const data = this.opts.histogram;
		const maxVal = Math.max(...data);
		const wrap = document.createElement("div");
		wrap.className = "fv-sr-histogram";

		for (let i = 0; i < data.length; i++) {
			const bar = document.createElement("div");
			bar.className = "fv-sr-hist-bar";
			const pct = maxVal > 0 ? (data[i] / maxVal) * 100 : 0;
			bar.style.height = pct + "%";

			// Color bars within range
			const barCenter = this.opts.min + ((i + 0.5) / data.length) * (this.opts.max - this.opts.min);
			const inRange = barCenter >= this._lo && barCenter <= this._hi;
			bar.style.background = inRange ? this.opts.color + "40" : this.opts.histogramColor;

			wrap.appendChild(bar);
		}
		this.container.appendChild(wrap);
		this._histEl = wrap;
	}

	_renderSteps() {
		const steps = Math.floor((this.opts.max - this.opts.min) / this.opts.step);
		if (steps > 50) return; // Too many to render
		for (let i = 0; i <= steps; i++) {
			const mark = document.createElement("div");
			mark.className = "fv-sr-step-mark";
			mark.style.left = (i / steps * 100) + "%";
			this._trackEl.appendChild(mark);
		}
	}

	_bindEvents() {
		const onMouseDown = (handle, type) => {
			if (this.opts.disabled) return;
			handle.addEventListener("mousedown", (e) => {
				e.preventDefault();
				this._activeHandle = type;
				handle.classList.add("fv-sr-handle--active");

				const onMove = (ev) => this._onDrag(ev.clientX);
				const onUp = () => {
					this._activeHandle = null;
					handle.classList.remove("fv-sr-handle--active");
					document.removeEventListener("mousemove", onMove);
					document.removeEventListener("mouseup", onUp);
					this._emit();
				};
				document.addEventListener("mousemove", onMove);
				document.addEventListener("mouseup", onUp);
			});

			// Touch
			handle.addEventListener("touchstart", (e) => {
				if (this.opts.disabled) return;
				this._activeHandle = type;
				const onMove = (ev) => this._onDrag(ev.touches[0].clientX);
				const onEnd = () => {
					this._activeHandle = null;
					handle.removeEventListener("touchmove", onMove);
					handle.removeEventListener("touchend", onEnd);
					this._emit();
				};
				handle.addEventListener("touchmove", onMove, { passive: true });
				handle.addEventListener("touchend", onEnd);
			}, { passive: true });

			// Keyboard
			handle.addEventListener("keydown", (e) => {
				if (this.opts.disabled) return;
				const delta = e.shiftKey ? this.opts.step * 10 : this.opts.step;
				if (e.key === "ArrowRight" || e.key === "ArrowUp") {
					e.preventDefault();
					this._adjustHandle(type, delta);
				} else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
					e.preventDefault();
					this._adjustHandle(type, -delta);
				}
			});
		};

		if (this.opts.range && this._loHandle) onMouseDown(this._loHandle, "lo");
		onMouseDown(this._hiHandle, "hi");

		// Click on track to move nearest handle
		this._trackEl.addEventListener("click", (e) => {
			if (this.opts.disabled) return;
			const rect = this._trackEl.getBoundingClientRect();
			const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const val = this._snap(this.opts.min + frac * (this.opts.max - this.opts.min));

			if (this.opts.range) {
				if (Math.abs(val - this._lo) < Math.abs(val - this._hi)) {
					this._lo = Math.min(val, this._hi);
				} else {
					this._hi = Math.max(val, this._lo);
				}
			} else {
				this._hi = val;
			}
			this._updatePositions();
			this._emit();
		});
	}

	_onDrag(clientX) {
		const rect = this._trackEl.getBoundingClientRect();
		const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		let val = this._snap(this.opts.min + frac * (this.opts.max - this.opts.min));

		if (this._activeHandle === "lo") {
			this._lo = Math.min(val, this._hi);
		} else {
			this._hi = this.opts.range ? Math.max(val, this._lo) : val;
		}

		this._updatePositions();
		if (this.opts.onInput) {
			this.opts.onInput(this.opts.range ? [this._lo, this._hi] : this._hi);
		}
	}

	_adjustHandle(type, delta) {
		if (type === "lo") {
			this._lo = this._snap(Math.max(this.opts.min, Math.min(this._hi, this._lo + delta)));
		} else {
			const minVal = this.opts.range ? this._lo : this.opts.min;
			this._hi = this._snap(Math.max(minVal, Math.min(this.opts.max, this._hi + delta)));
		}
		this._updatePositions();
		this._emit();
	}

	_snap(val) {
		return Math.round(val / this.opts.step) * this.opts.step;
	}

	_updatePositions() {
		const range = this.opts.max - this.opts.min || 1;
		const loPct = ((this._lo - this.opts.min) / range) * 100;
		const hiPct = ((this._hi - this.opts.min) / range) * 100;

		if (this.opts.range) {
			this._fillEl.style.left = loPct + "%";
			this._fillEl.style.width = (hiPct - loPct) + "%";
			this._loHandle.style.left = loPct + "%";
			this._loHandle.setAttribute("aria-valuenow", this._lo);
		} else {
			this._fillEl.style.left = "0%";
			this._fillEl.style.width = hiPct + "%";
		}

		this._hiHandle.style.left = hiPct + "%";
		this._hiHandle.setAttribute("aria-valuenow", this._hi);

		// Labels
		const fmt = (v) => `${this.opts.prefix}${v.toLocaleString()}${this.opts.suffix}`;
		if (this._loLabelEl) this._loLabelEl.textContent = fmt(this.opts.range ? this._lo : this.opts.min);
		if (this._hiLabelEl) this._hiLabelEl.textContent = fmt(this._hi);

		// Tooltips
		if (this._loTip) this._loTip.textContent = fmt(this._lo);
		if (this._hiTip) this._hiTip.textContent = fmt(this._hi);

		// Update histogram highlighting
		if (this._histEl && this.opts.histogram) {
			const bars = this._histEl.querySelectorAll(".fv-sr-hist-bar");
			const data = this.opts.histogram;
			for (let i = 0; i < bars.length; i++) {
				const barCenter = this.opts.min + ((i + 0.5) / data.length) * (this.opts.max - this.opts.min);
				const inRange = barCenter >= this._lo && barCenter <= this._hi;
				bars[i].style.background = inRange ? this.opts.color + "40" : this.opts.histogramColor;
			}
		}
	}

	_emit() {
		if (this.opts.onChange) {
			this.opts.onChange(this.opts.range ? [this._lo, this._hi] : this._hi);
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this.opts.range ? [this._lo, this._hi] : this._hi; }
	setValue(v) {
		if (this.opts.range && Array.isArray(v)) { this._lo = v[0]; this._hi = v[1]; }
		else if (!this.opts.range) { this._hi = v; }
		this._updatePositions();
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sr", `fv-sr--${this.opts.theme}`, "fv-sr--disabled");
	}
}
