// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Dock — Macintosh-style dock bar
 * =================================
 * Animated icon dock with magnification on hover.
 *
 * frappe.visual.Dock.create({
 *   target: "#dock",
 *   items: [
 *     { icon: "home", label: "Home", href: "/", badge: 3 },
 *     { icon: "settings", label: "Settings", onClick: fn },
 *     { separator: true },
 *     { icon: "bell", label: "Notifications", onClick: fn }
 *   ],
 *   position: "bottom",    // "bottom" | "top" | "left" | "right"
 *   iconSize: 40,
 *   magnification: 1.6,
 *   magnifyRange: 3,       // number of neighbors affected
 *   className: ""
 * })
 */

export class Dock {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			position: "bottom",
			iconSize: 40,
			magnification: 1.6,
			magnifyRange: 3,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new Dock(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.items.length) return;

		const isVert = this.position === "left" || this.position === "right";
		const dock = document.createElement("div");
		dock.className = `fv-dock fv-dock-${this.position} ${this.className}`;
		dock.style.cssText = `display:flex;align-items:flex-end;gap:4px;padding:8px 12px;border-radius:16px;background:rgba(255,255,255,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.3);box-shadow:0 8px 32px rgba(0,0,0,.1);${isVert ? "flex-direction:column;" : ""}`;

		const itemEls = [];

		this.items.forEach((item) => {
			if (item.separator) {
				const sep = document.createElement("div");
				sep.className = "fv-dock-sep";
				sep.style.cssText = isVert
					? "height:1px;width:70%;background:rgba(0,0,0,.1);margin:4px auto;"
					: "width:1px;height:70%;background:rgba(0,0,0,.1);margin:0 4px;align-self:center;";
				dock.appendChild(sep);
				return;
			}

			const btn = document.createElement("div");
			btn.className = "fv-dock-item";
			btn.style.cssText = `width:${this.iconSize}px;height:${this.iconSize}px;display:flex;align-items:center;justify-content:center;border-radius:10px;cursor:pointer;transition:transform .15s cubic-bezier(.4,0,.2,1);position:relative;`;
			btn.title = item.label || "";

			btn.innerHTML = `<svg width="${this.iconSize * 0.6}" height="${this.iconSize * 0.6}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="/assets/frappe_visual/icons/tabler-sprite.svg#tabler-${item.icon || "circle"}"/></svg>`;

			if (item.badge) {
				const badge = document.createElement("span");
				badge.className = "fv-dock-badge";
				badge.style.cssText = "position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;";
				badge.textContent = item.badge > 99 ? "99+" : item.badge;
				btn.appendChild(badge);
			}

			if (item.href) btn.addEventListener("click", () => window.location.href = item.href);
			else if (item.onClick) btn.addEventListener("click", item.onClick);

			dock.appendChild(btn);
			itemEls.push(btn);
		});

		/* Magnification on hover */
		dock.addEventListener("mousemove", (e) => {
			const rect = dock.getBoundingClientRect();
			const mousePos = isVert
				? (e.clientY - rect.top) / rect.height
				: (e.clientX - rect.left) / rect.width;

			itemEls.forEach((el, i) => {
				const pos = (i + 0.5) / itemEls.length;
				const dist = Math.abs(mousePos - pos) * itemEls.length;
				const scale = dist < this.magnifyRange
					? 1 + (this.magnification - 1) * (1 - dist / this.magnifyRange)
					: 1;
				el.style.transform = `scale(${scale})`;
			});
		});

		dock.addEventListener("mouseleave", () => {
			itemEls.forEach(el => { el.style.transform = "scale(1)"; });
		});

		el.innerHTML = "";
		el.appendChild(dock);
	}
}
