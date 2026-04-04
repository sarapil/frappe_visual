// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Banner — Full-width top banner with CTA
 * ==========================================
 * Dismissible promotional / announcement banner.
 *
 * frappe.visual.Banner.create({
 *   target: "body",         // prepend to this
 *   message: "🎉 New version available!",
 *   cta: { label: "Update Now", href: "/update" },
 *   type: "info",           // info | success | warning | error | gradient
 *   dismissible: true,
 *   sticky: false,          // stick to top
 *   storageKey: null,        // localStorage key to remember dismissal
 *   onDismiss: () => {},
 *   onCTA: () => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

const BANNER_COLORS = {
	info:     { bg: "#3b82f6", color: "#fff" },
	success:  { bg: "#22c55e", color: "#fff" },
	warning:  { bg: "#f59e0b", color: "#1e293b" },
	error:    { bg: "#ef4444", color: "#fff" },
	gradient: { bg: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)", color: "#fff" },
};

export class Banner {
	constructor(opts = {}) {
		Object.assign(this, {
			target: "body",
			message: "",
			cta: null,
			type: "info",
			dismissible: true,
			sticky: false,
			storageKey: null,
			onDismiss: null,
			onCTA: null,
		}, opts);

		/* Check if already dismissed */
		if (this.storageKey && localStorage.getItem(this.storageKey) === "dismissed") return;

		this.render();
	}

	static create(opts) { return new Banner(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const cfg = BANNER_COLORS[this.type] || BANNER_COLORS.info;

		const bar = document.createElement("div");
		bar.className = `fv-banner fv-banner-${this.type}`;
		bar.style.background = cfg.bg;
		bar.style.color = cfg.color;
		if (this.sticky) {
			bar.style.position = "sticky";
			bar.style.top = "0";
			bar.style.zIndex = "1100";
		}

		let html = `<div class="fv-banner-inner">`;
		html += `<span class="fv-banner-msg">${_esc(this.message)}</span>`;

		if (this.cta) {
			html += `<a class="fv-banner-cta" href="${_esc(this.cta.href || "#")}">${_esc(this.cta.label || "Learn More")}</a>`;
		}

		html += `</div>`;

		if (this.dismissible) {
			html += `<button class="fv-banner-close" aria-label="Close">&times;</button>`;
		}

		bar.innerHTML = html;

		if (this.dismissible) {
			bar.querySelector(".fv-banner-close").onclick = () => {
				bar.style.maxHeight = "0";
				bar.style.padding = "0";
				bar.style.overflow = "hidden";
				setTimeout(() => {
					bar.remove();
					if (this.storageKey) localStorage.setItem(this.storageKey, "dismissed");
					this.onDismiss?.();
				}, 300);
			};
		}

		if (this.cta && this.onCTA) {
			bar.querySelector(".fv-banner-cta").addEventListener("click", (e) => {
				e.preventDefault();
				this.onCTA();
			});
		}

		el.prepend(bar);
		this._el = bar;
	}

	dismiss() { this._el?.querySelector(".fv-banner-close")?.click(); }
}
