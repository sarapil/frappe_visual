/**
 * HighContrastMode — Toggle high-contrast colour scheme for accessibility
 *
 * Applies a high-contrast CSS overlay that ensures WCAG AAA contrast ratios.
 * Supports forced-colors media query detection and manual toggle.
 *
 * frappe.visual.HighContrastMode.create({ autoDetect: true })
 */
export class HighContrastMode {
	static create(opts = {}) { return new HighContrastMode(opts); }

	constructor(opts) {
		this.opts = Object.assign({ autoDetect: true, storageKey: "fv-high-contrast", cssClass: "fv-high-contrast" }, opts);
		this._active = false;
		this._listeners = [];
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	get isActive() { return this._active; }

	enable() { this._set(true); }
	disable() { this._set(false); }
	toggle() { this._set(!this._active); }

	/** Create a visual toggle button */
	createToggle(container) {
		const wrapper = typeof container === "string"
			? document.querySelector(container) : container;
		if (!wrapper) return null;
		const btn = document.createElement("button");
		btn.className = "fv-hc-toggle";
		btn.setAttribute("role", "switch");
		btn.setAttribute("aria-label", __("Toggle high contrast"));
		btn.setAttribute("aria-checked", String(this._active));
		this._updateToggle(btn);
		btn.addEventListener("click", () => {
			this.toggle();
			btn.setAttribute("aria-checked", String(this._active));
			this._updateToggle(btn);
		});
		wrapper.appendChild(btn);
		this._toggleBtn = btn;
		return btn;
	}

	onChange(fn) { this._listeners.push(fn); return this; }

	destroy() {
		this._forcedMql?.removeEventListener("change", this._forcedHandler);
		this._listeners = [];
		document.documentElement.classList.remove(this.opts.cssClass);
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		const saved = localStorage.getItem(this.opts.storageKey);
		if (saved !== null) {
			this._set(saved === "true", false);
		} else if (this.opts.autoDetect) {
			this._detectForced();
		}
	}

	_detectForced() {
		this._forcedMql = window.matchMedia("(forced-colors: active)");
		this._forcedHandler = (e) => this._set(e.matches, false);
		this._forcedMql.addEventListener("change", this._forcedHandler);
		if (this._forcedMql.matches) this._set(true, false);
	}

	_set(active, persist = true) {
		this._active = active;
		document.documentElement.classList.toggle(this.opts.cssClass, active);
		document.documentElement.dataset.fvHighContrast = String(active);
		if (persist) localStorage.setItem(this.opts.storageKey, String(active));
		this._injectVars();
		this._listeners.forEach(fn => { try { fn(active); } catch (e) { /* ignore */ } });
	}

	_injectVars() {
		const root = document.documentElement.style;
		if (this._active) {
			root.setProperty("--fv-hc-bg", "#000000");
			root.setProperty("--fv-hc-fg", "#ffffff");
			root.setProperty("--fv-hc-link", "#ffff00");
			root.setProperty("--fv-hc-border", "#ffffff");
			root.setProperty("--fv-hc-focus", "#00ffff");
			root.setProperty("--fv-hc-error", "#ff6666");
			root.setProperty("--fv-hc-success", "#66ff66");
			root.setProperty("--fv-hc-warning", "#ffcc00");
			root.setProperty("--fv-hc-btn-bg", "#333333");
			root.setProperty("--fv-hc-btn-fg", "#ffffff");
		} else {
			["bg", "fg", "link", "border", "focus", "error", "success", "warning", "btn-bg", "btn-fg"]
				.forEach(k => root.removeProperty("--fv-hc-" + k));
		}
	}

	_updateToggle(btn) {
		btn.innerHTML = `<span class="fv-hc-icon">${this._active ? "◑" : "◐"}</span>
			<span class="fv-hc-label">${this._active ? __("High contrast on") : __("High contrast off")}</span>`;
	}
}
