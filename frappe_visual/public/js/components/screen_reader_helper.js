/**
 * ScreenReaderHelper — Manage ARIA live regions for dynamic content announcements
 *
 * Provides a centralized API for announcing content changes to screen readers
 * without visible UI disruption. Supports polite/assertive/off modes and
 * queued announcements with debouncing.
 *
 * frappe.visual.ScreenReaderHelper.create({ defaultPoliteness: "polite" })
 */
export class ScreenReaderHelper {
	static create(opts = {}) { return new ScreenReaderHelper(opts); }

	constructor(opts) {
		this.opts = Object.assign({ defaultPoliteness: "polite", debounceMs: 150, maxQueue: 20 }, opts);
		this._queue = [];
		this._timer = null;
		this._regions = {};
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Announce a message to screen readers */
	announce(message, { politeness, clearAfter } = {}) {
		if (!message) return;
		const mode = politeness || this.opts.defaultPoliteness;
		this._queue.push({ message, mode, clearAfter: clearAfter || 5000 });
		if (this._queue.length > this.opts.maxQueue) this._queue.shift();
		this._scheduleFlush();
	}

	/** Announce assertively (interrupts current speech) */
	assertive(message) { this.announce(message, { politeness: "assertive" }); }

	/** Announce politely (waits for current speech) */
	polite(message) { this.announce(message, { politeness: "polite" }); }

	/** Create a named live region for a specific area */
	createRegion(name, { politeness = "polite", atomic = true, relevant = "additions text" } = {}) {
		if (this._regions[name]) return this._regions[name];
		const el = document.createElement("div");
		el.setAttribute("role", "status");
		el.setAttribute("aria-live", politeness);
		el.setAttribute("aria-atomic", String(atomic));
		el.setAttribute("aria-relevant", relevant);
		Object.assign(el.style, { position: "absolute", width: "1px", height: "1px",
			overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: "0" });
		el.className = "fv-sr-region fv-sr-region--" + name;
		this._host.appendChild(el);
		this._regions[name] = el;
		return el;
	}

	/** Update a named region's content */
	updateRegion(name, content) {
		const el = this._regions[name];
		if (!el) return;
		el.textContent = "";
		requestAnimationFrame(() => { el.textContent = content; });
	}

	/** Announce navigation to a new page/section */
	announceNavigation(pageTitle) {
		this.assertive(__("{0} page loaded", [pageTitle]));
	}

	/** Announce form validation errors */
	announceErrors(errors = []) {
		if (!errors.length) return;
		const msg = errors.length === 1
			? __("Error: {0}", [errors[0]])
			: __("{0} errors found. First: {1}", [errors.length, errors[0]]);
		this.assertive(msg);
	}

	/** Announce a status change */
	announceStatus(status) { this.polite(__("Status changed to {0}", [status])); }

	destroy() {
		clearTimeout(this._timer);
		this._host?.remove();
		this._queue = [];
		this._regions = {};
	}

	/* ── private ────────────────────────────────────────────── */

	_build() {
		this._host = document.createElement("div");
		this._host.className = "fv-sr-host";
		this._host.setAttribute("aria-hidden", "false");
		Object.assign(this._host.style, { position: "absolute", width: "1px", height: "1px",
			overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: "0" });
		// Pre-create the two standard regions
		this._politeRegion = this._makeRegion("polite");
		this._assertiveRegion = this._makeRegion("assertive");
		document.body.appendChild(this._host);
	}

	_makeRegion(politeness) {
		const el = document.createElement("div");
		el.setAttribute("role", politeness === "assertive" ? "alert" : "status");
		el.setAttribute("aria-live", politeness);
		el.setAttribute("aria-atomic", "true");
		this._host.appendChild(el);
		return el;
	}

	_scheduleFlush() {
		clearTimeout(this._timer);
		this._timer = setTimeout(() => this._flush(), this.opts.debounceMs);
	}

	_flush() {
		if (!this._queue.length) return;
		const item = this._queue.shift();
		const region = item.mode === "assertive" ? this._assertiveRegion : this._politeRegion;
		// Clear and re-set to trigger announcement
		region.textContent = "";
		requestAnimationFrame(() => {
			region.textContent = item.message;
			if (item.clearAfter > 0) {
				setTimeout(() => { region.textContent = ""; }, item.clearAfter);
			}
		});
		// Process remaining queue items with stagger
		if (this._queue.length) {
			this._timer = setTimeout(() => this._flush(), 500);
		}
	}
}
