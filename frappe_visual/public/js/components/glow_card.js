// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * GlowCard — Card with mouse-tracking glow border
 * ==================================================
 * Gradient glow follows cursor position on card border.
 *
 * frappe.visual.GlowCard.create({
 *   target: "#card-area",
 *   content: "<h3>Premium</h3><p>Details here</p>",
 *   glowColor: "#6366f1",
 *   glowSize: 200,         // px radius
 *   borderRadius: 16,
 *   padding: "24px",
 *   className: "",
 *   onClick: () => {}
 * })
 */

export class GlowCard {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			content: "",
			glowColor: "#6366f1",
			glowSize: 200,
			borderRadius: 16,
			padding: "24px",
			className: "",
			onClick: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new GlowCard(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const outer = document.createElement("div");
		outer.className = `fv-glow ${this.className}`;
		outer.style.cssText = `
			position: relative;
			border-radius: ${this.borderRadius}px;
			padding: 1px;
			background: var(--border-color, #e2e8f0);
			cursor: ${this.onClick ? "pointer" : "default"};
		`;

		const glow = document.createElement("div");
		glow.className = "fv-glow-effect";
		glow.style.cssText = `
			position: absolute;
			inset: 0;
			border-radius: inherit;
			opacity: 0;
			transition: opacity 0.3s;
			pointer-events: none;
		`;

		const inner = document.createElement("div");
		inner.className = "fv-glow-inner";
		inner.style.cssText = `
			position: relative;
			background: var(--card-bg, #fff);
			border-radius: ${this.borderRadius - 1}px;
			padding: ${this.padding};
			z-index: 1;
		`;

		if (typeof this.content === "string") {
			inner.innerHTML = this.content;
		} else if (this.content instanceof HTMLElement) {
			inner.appendChild(this.content);
		}

		outer.appendChild(glow);
		outer.appendChild(inner);

		/* Mouse tracking */
		outer.addEventListener("mousemove", (e) => {
			const rect = outer.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			glow.style.background = `radial-gradient(${this.glowSize}px circle at ${x}px ${y}px, ${this.glowColor}40, transparent)`;
			glow.style.opacity = "1";
		});

		outer.addEventListener("mouseleave", () => {
			glow.style.opacity = "0";
		});

		if (this.onClick) {
			outer.addEventListener("click", this.onClick);
		}

		el.innerHTML = "";
		el.appendChild(outer);
		this._el = outer;
	}
}
