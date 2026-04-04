// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * StatusDot — Animated status indicator
 * =======================================
 * Pulsing dot for online/offline/busy/away/error states.
 *
 * frappe.visual.StatusDot.create({
 *   target: "#user-status",
 *   status: "online",     // online | offline | busy | away | error
 *   size: "md",           // sm | md | lg
 *   label: "Online",      // optional text label
 *   pulse: true,          // animated pulse ring
 *   inline: false         // if true, returns HTML string instead
 * })
 *
 * // Inline usage:
 * frappe.visual.StatusDot.html("online", { size: "sm", label: "Active" })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

const STATUS_COLORS = {
	online:  "#22c55e",
	offline: "#94a3b8",
	busy:    "#ef4444",
	away:    "#f59e0b",
	error:   "#ef4444",
};

const SIZES = { sm: 8, md: 10, lg: 14 };

export class StatusDot {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			status: "offline",
			size: "md",
			label: "",
			pulse: true,
		}, opts);

		if (this.target) this.render();
	}

	static create(opts) { return new StatusDot(opts); }

	static html(status, opts = {}) {
		const sd = new StatusDot({ ...opts, status });
		return sd.toHTML();
	}

	toHTML() {
		const color = STATUS_COLORS[this.status] || STATUS_COLORS.offline;
		const sz = SIZES[this.size] || SIZES.md;
		const pulse = this.pulse && this.status !== "offline"
			? `<span class="fv-sd-pulse" style="position:absolute;inset:-3px;border-radius:50%;border:2px solid ${color};animation:fvSdPulse 2s infinite;"></span>`
			: "";

		return `<span class="fv-sd fv-sd-${this.status}" style="display:inline-flex;align-items:center;gap:6px;">
			<span style="position:relative;display:inline-block;width:${sz}px;height:${sz}px;">
				<span class="fv-sd-dot" style="display:block;width:100%;height:100%;border-radius:50%;background:${color};"></span>
				${pulse}
			</span>
			${this.label ? `<span class="fv-sd-label" style="font-size:0.8125rem;color:var(--text-color,#1e293b)">${_esc(this.label)}</span>` : ""}
		</span>`;
	}

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		el.innerHTML = this.toHTML();
		this._el = el;
	}

	setStatus(status, label) {
		this.status = status;
		if (label !== undefined) this.label = label;
		if (this._el) this.render();
	}
}
