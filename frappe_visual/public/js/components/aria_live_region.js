/**
 * AriaLiveRegion — Managed ARIA live region for dynamic content updates
 *
 * Creates a positioned live region that can be attached to any container.
 * Supports log, status, alert, timer, and marquee roles with automatic
 * clearing and queue management.
 *
 * frappe.visual.AriaLiveRegion.create({ role: "status", container: "#panel" })
 */
export class AriaLiveRegion {
	static create(opts = {}) { return new AriaLiveRegion(opts); }

	static ROLES = {
		status:  { role: "status",  live: "polite",    atomic: true  },
		alert:   { role: "alert",   live: "assertive", atomic: true  },
		log:     { role: "log",     live: "polite",    atomic: false },
		timer:   { role: "timer",   live: "off",       atomic: true  },
		marquee: { role: "marquee", live: "off",       atomic: true  },
	};

	constructor(opts) {
		this.opts = Object.assign({
			role: "status", container: null, visible: false,
			maxMessages: 50, clearAfterMs: 0, className: ""
		}, opts);
		this._messages = [];
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Push a message into the live region */
	push(message) {
		if (!message) return;
		this._messages.push({ text: message, time: Date.now() });
		if (this._messages.length > this.opts.maxMessages) this._messages.shift();
		this._render();
		if (this.opts.clearAfterMs > 0) {
			clearTimeout(this._clearTimer);
			this._clearTimer = setTimeout(() => this.clear(), this.opts.clearAfterMs);
		}
	}

	/** Set the region content directly (replaces everything) */
	set(content) {
		this._messages = [{ text: content, time: Date.now() }];
		this._render();
	}

	/** Clear the region */
	clear() {
		this._messages = [];
		this._el.textContent = "";
	}

	/** Get all messages */
	get messages() { return this._messages.map(m => m.text); }

	/** Update the role dynamically */
	setRole(roleName) {
		const cfg = AriaLiveRegion.ROLES[roleName] || AriaLiveRegion.ROLES.status;
		this._el.setAttribute("role", cfg.role);
		this._el.setAttribute("aria-live", cfg.live);
		this._el.setAttribute("aria-atomic", String(cfg.atomic));
	}

	/** Show the live region visually */
	show() {
		this._el.classList.remove("fv-alr--hidden");
		this._el.removeAttribute("aria-hidden");
	}

	/** Hide visually but keep screen-reader accessible */
	hide() {
		this._el.classList.add("fv-alr--hidden");
	}

	destroy() {
		clearTimeout(this._clearTimer);
		this._el?.remove();
	}

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const cfg = AriaLiveRegion.ROLES[this.opts.role] || AriaLiveRegion.ROLES.status;
		this._el = document.createElement("div");
		this._el.className = "fv-aria-live-region " + (this.opts.className || "");
		this._el.setAttribute("role", cfg.role);
		this._el.setAttribute("aria-live", cfg.live);
		this._el.setAttribute("aria-atomic", String(cfg.atomic));
		this._el.setAttribute("aria-relevant", "additions text");
		if (!this.opts.visible) {
			this._el.classList.add("fv-alr--hidden");
			Object.assign(this._el.style, {
				position: "absolute", width: "1px", height: "1px",
				overflow: "hidden", clip: "rect(0,0,0,0)",
				whiteSpace: "nowrap", border: "0"
			});
		}
		const parent = this.opts.container
			? (typeof this.opts.container === "string"
				? document.querySelector(this.opts.container) : this.opts.container)
			: document.body;
		parent.appendChild(this._el);
	}

	_render() {
		const role = this._el.getAttribute("role");
		if (role === "log") {
			// Log mode: append new messages
			this._el.textContent = "";
			this._messages.forEach(m => {
				const p = document.createElement("p");
				p.textContent = m.text;
				this._el.appendChild(p);
			});
		} else {
			// Status/alert mode: show latest
			const latest = this._messages[this._messages.length - 1];
			// Force re-announcement by clearing first
			this._el.textContent = "";
			requestAnimationFrame(() => {
				this._el.textContent = latest ? latest.text : "";
			});
		}
	}
}
