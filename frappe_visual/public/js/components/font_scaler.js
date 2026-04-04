/**
 * FontScaler — Dynamic font size adjustment for accessibility
 *
 * Provides a slider or +/- buttons to scale the base font size.
 * Persists preference to localStorage. Uses CSS custom properties
 * so all frappe_visual components respond automatically.
 *
 * frappe.visual.FontScaler.create({ container: "#toolbar", min: 12, max: 24, step: 1 })
 */
export class FontScaler {
	static create(opts = {}) { return new FontScaler(opts); }

	static PRESETS = {
		small:   { label: "S", scale: 0.875, size: 14 },
		normal:  { label: "M", scale: 1.0,   size: 16 },
		large:   { label: "L", scale: 1.125, size: 18 },
		xlarge:  { label: "XL", scale: 1.25, size: 20 },
	};

	constructor(opts) {
		this.opts = Object.assign({
			container: null, min: 12, max: 24, step: 1, default: 16,
			storageKey: "fv-font-size", showPresets: true, showSlider: true
		}, opts);
		this._current = this.opts.default;
		this._listeners = [];
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	get size() { return this._current; }
	get scale() { return this._current / 16; }

	setSize(px) {
		px = Math.max(this.opts.min, Math.min(this.opts.max, Math.round(px)));
		if (px === this._current) return;
		this._current = px;
		this._apply();
		this._persist();
		this._emit();
	}

	increase() { this.setSize(this._current + this.opts.step); }
	decrease() { this.setSize(this._current - this.opts.step); }
	reset() { this.setSize(this.opts.default); }

	applyPreset(name) {
		const p = FontScaler.PRESETS[name];
		if (p) this.setSize(p.size);
	}

	/** Build and insert the scaler UI */
	render(container) {
		const wrap = typeof container === "string"
			? document.querySelector(container) : container || this.opts.container;
		if (!wrap) return;
		const el = document.createElement("div");
		el.className = "fv-font-scaler";
		el.setAttribute("role", "group");
		el.setAttribute("aria-label", __("Font size"));
		let html = "";
		// Decrease button
		html += `<button class="fv-fs-btn fv-fs-decrease" aria-label="${__("Decrease font size")}">A−</button>`;
		// Slider
		if (this.opts.showSlider) {
			html += `<input type="range" class="fv-fs-slider" min="${this.opts.min}" max="${this.opts.max}"
				step="${this.opts.step}" value="${this._current}"
				aria-label="${__("Font size slider")}" aria-valuemin="${this.opts.min}"
				aria-valuemax="${this.opts.max}" aria-valuenow="${this._current}">`;
		}
		// Increase button
		html += `<button class="fv-fs-btn fv-fs-increase" aria-label="${__("Increase font size")}">A+</button>`;
		// Value indicator
		html += `<span class="fv-fs-value" aria-live="polite">${this._current}px</span>`;
		// Presets
		if (this.opts.showPresets) {
			html += `<div class="fv-fs-presets">`;
			for (const [key, p] of Object.entries(FontScaler.PRESETS)) {
				const active = this._current === p.size ? " fv-fs-preset--active" : "";
				html += `<button class="fv-fs-preset${active}" data-preset="${key}"
					aria-label="${__("Font size {0}", [p.label])}">${p.label}</button>`;
			}
			html += `</div>`;
		}
		// Reset
		html += `<button class="fv-fs-btn fv-fs-reset" aria-label="${__("Reset font size")}">${__("Reset")}</button>`;
		el.innerHTML = html;
		// Events
		el.querySelector(".fv-fs-decrease")?.addEventListener("click", () => this.decrease());
		el.querySelector(".fv-fs-increase")?.addEventListener("click", () => this.increase());
		el.querySelector(".fv-fs-reset")?.addEventListener("click", () => this.reset());
		const slider = el.querySelector(".fv-fs-slider");
		slider?.addEventListener("input", (e) => this.setSize(parseInt(e.target.value)));
		el.querySelectorAll(".fv-fs-preset").forEach(btn => {
			btn.addEventListener("click", () => this.applyPreset(btn.dataset.preset));
		});
		this._el = el;
		this._slider = slider;
		this._valueEl = el.querySelector(".fv-fs-value");
		(typeof wrap === "string" ? document.querySelector(wrap) : wrap).appendChild(el);
	}

	onChange(fn) { this._listeners.push(fn); return this; }

	destroy() {
		this._el?.remove();
		this._listeners = [];
		document.documentElement.style.removeProperty("--fv-font-size");
		document.documentElement.style.removeProperty("--fv-font-scale");
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		const saved = localStorage.getItem(this.opts.storageKey);
		if (saved) this._current = parseInt(saved) || this.opts.default;
		this._apply();
	}

	_apply() {
		document.documentElement.style.setProperty("--fv-font-size", this._current + "px");
		document.documentElement.style.setProperty("--fv-font-scale", String(this.scale));
		if (this._slider) this._slider.value = this._current;
		if (this._valueEl) this._valueEl.textContent = this._current + "px";
		this._el?.querySelectorAll(".fv-fs-preset").forEach(btn => {
			const p = FontScaler.PRESETS[btn.dataset.preset];
			btn.classList.toggle("fv-fs-preset--active", p && p.size === this._current);
		});
	}

	_persist() { localStorage.setItem(this.opts.storageKey, String(this._current)); }
	_emit() { this._listeners.forEach(fn => { try { fn(this._current, this.scale); } catch (e) { /* ignore */ } }); }
}
