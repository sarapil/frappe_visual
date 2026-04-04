/**
 * ReducedMotion — Respect prefers-reduced-motion and provide animation fallbacks
 *
 * Detects the user's motion preference and provides helpers to conditionally
 * apply animations. Can override preference for the session and emits events
 * on change.
 *
 * frappe.visual.ReducedMotion.create()
 */
export class ReducedMotion {
	static create(opts = {}) { return new ReducedMotion(opts); }

	static isReduced() {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
			document.documentElement.dataset.fvReducedMotion === "true";
	}

	constructor(opts) {
		this.opts = Object.assign({ autoApply: true, storageKey: "fv-reduced-motion" }, opts);
		this._listeners = [];
		this._mql = window.matchMedia("(prefers-reduced-motion: reduce)");
		this._override = null;
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Whether motion should be reduced */
	get isReduced() {
		if (this._override !== null) return this._override;
		return this._mql.matches;
	}

	/** Force reduced motion on for this session */
	enable() { this._setOverride(true); }

	/** Force reduced motion off for this session */
	disable() { this._setOverride(false); }

	/** Reset to system preference */
	reset() {
		this._override = null;
		localStorage.removeItem(this.opts.storageKey);
		this._apply();
		this._emit();
	}

	/** Conditionally return animation or static fallback */
	pick(animated, fallback) { return this.isReduced ? fallback : animated; }

	/** Get a safe duration (0 if reduced) */
	duration(ms) { return this.isReduced ? 0 : ms; }

	/** Get safe GSAP vars */
	gsapVars(vars) {
		if (!this.isReduced) return vars;
		return Object.assign({}, vars, { duration: 0, delay: 0, stagger: 0 });
	}

	/** Register a callback for motion preference changes */
	onChange(fn) { this._listeners.push(fn); return this; }

	/** Create a CSS class toggle component */
	createToggle(container) {
		const wrapper = typeof container === "string"
			? document.querySelector(container) : container;
		if (!wrapper) return null;
		const btn = document.createElement("button");
		btn.className = "fv-reduced-motion-toggle";
		btn.setAttribute("role", "switch");
		btn.setAttribute("aria-label", __("Toggle reduced motion"));
		btn.setAttribute("aria-checked", String(this.isReduced));
		btn.innerHTML = `<span class="fv-rmt-icon">${this.isReduced ? "⏸" : "▶"}</span>
			<span class="fv-rmt-label">${this.isReduced ? __("Motion off") : __("Motion on")}</span>`;
		btn.addEventListener("click", () => {
			this.isReduced ? this.disable() : this.enable();
			btn.setAttribute("aria-checked", String(this.isReduced));
			btn.querySelector(".fv-rmt-icon").textContent = this.isReduced ? "⏸" : "▶";
			btn.querySelector(".fv-rmt-label").textContent = this.isReduced ? __("Motion off") : __("Motion on");
		});
		wrapper.appendChild(btn);
		return btn;
	}

	destroy() {
		this._mql.removeEventListener("change", this._handler);
		this._listeners = [];
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		// Restore saved preference
		const saved = localStorage.getItem(this.opts.storageKey);
		if (saved !== null) this._override = saved === "true";
		// Listen for system changes
		this._handler = () => { if (this._override === null) { this._apply(); this._emit(); } };
		this._mql.addEventListener("change", this._handler);
		if (this.opts.autoApply) this._apply();
	}

	_setOverride(val) {
		this._override = val;
		localStorage.setItem(this.opts.storageKey, String(val));
		this._apply();
		this._emit();
	}

	_apply() {
		document.documentElement.dataset.fvReducedMotion = String(this.isReduced);
		document.documentElement.classList.toggle("fv-reduced-motion", this.isReduced);
	}

	_emit() {
		const reduced = this.isReduced;
		this._listeners.forEach(fn => { try { fn(reduced); } catch (e) { /* ignore */ } });
	}
}
