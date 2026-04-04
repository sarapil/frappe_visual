// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Callout — Info / warning / error / success callout box
 * ========================================================
 * Prominent callout with icon, title, body, dismiss.
 *
 * frappe.visual.Callout.create({
 *   target: "#notices",
 *   type: "info",         // info | success | warning | error | tip
 *   title: "Note",
 *   message: "This is important information.",
 *   icon: true,           // auto-icon per type
 *   dismissible: true,
 *   variant: "default",   // default | filled | outline | soft
 *   onDismiss: () => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

const TYPE_CONFIG = {
	info:    { color: "#3b82f6", bg: "#eff6ff", icon: "ℹ" },
	success: { color: "#22c55e", bg: "#f0fdf4", icon: "✓" },
	warning: { color: "#f59e0b", bg: "#fffbeb", icon: "⚠" },
	error:   { color: "#ef4444", bg: "#fef2f2", icon: "✕" },
	tip:     { color: "#8b5cf6", bg: "#f5f3ff", icon: "💡" },
};

export class Callout {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			type: "info",
			title: "",
			message: "",
			icon: true,
			dismissible: true,
			variant: "default",
			onDismiss: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new Callout(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const cfg = TYPE_CONFIG[this.type] || TYPE_CONFIG.info;

		const box = document.createElement("div");
		box.className = `fv-call fv-call-${this.type} fv-call-${this.variant}`;
		box.style.setProperty("--fv-call-color", cfg.color);
		box.style.setProperty("--fv-call-bg", cfg.bg);

		let html = "";

		if (this.icon) {
			html += `<span class="fv-call-icon">${cfg.icon}</span>`;
		}

		html += `<div class="fv-call-body">`;
		if (this.title) html += `<div class="fv-call-title">${_esc(this.title)}</div>`;
		if (this.message) html += `<div class="fv-call-msg">${this.message}</div>`;
		html += `</div>`;

		if (this.dismissible) {
			html += `<button class="fv-call-close" aria-label="Close">&times;</button>`;
		}

		box.innerHTML = html;

		if (this.dismissible) {
			box.querySelector(".fv-call-close").onclick = () => {
				box.style.opacity = "0";
				box.style.transform = "translateY(-8px)";
				setTimeout(() => {
					box.remove();
					this.onDismiss?.();
				}, 200);
			};
		}

		el.appendChild(box);
		this._el = box;

		/* Animate in */
		requestAnimationFrame(() => {
			box.style.opacity = "1";
			box.style.transform = "translateY(0)";
		});
	}

	dismiss() {
		this._el?.querySelector(".fv-call-close")?.click();
	}
}
