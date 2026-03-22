/**
 * VisualDashboard — Graph-based Dashboard Widgets
 * ==================================================
 * Replaces traditional dashboard number cards with visual mini-graphs.
 */

import { ColorSystem } from "../utils/color_system";

export class VisualDashboard {
	/**
	 * Create a visual dashboard in the given container.
	 * @param {HTMLElement} container
	 * @param {Array} widgets - Widget definitions
	 */
	static create(container, widgets) {
		return new VisualDashboard(container, widgets);
	}

	constructor(container, widgets) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		this.widgets = widgets;
		this._render();
	}

	_render() {
		this.container.classList.add("fv-stagger-children");
		this.container.style.cssText +=
			";display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;";

		this.widgets.forEach((w) => {
			const card = document.createElement("div");
			card.className = "fv-dash-card";
			card.style.cssText = `
				background: var(--fv-bg-surface, white);
				border: 1px solid var(--fv-border-primary, #e2e8f0);
				border-radius: var(--fv-radius-lg, 16px);
				border-left: 4px solid ${w.color || "var(--fv-accent)"};
				padding: 20px;
				cursor: pointer;
				transition: box-shadow 0.25s ease, transform 0.25s ease;
			`;
			card.addEventListener("mouseenter", () => {
				card.style.boxShadow = "var(--fv-shadow-glow)";
				card.style.transform = "translateY(-2px)";
			});
			card.addEventListener("mouseleave", () => {
				card.style.boxShadow = "";
				card.style.transform = "";
			});

			if (w.onClick) {
				card.addEventListener("click", w.onClick);
			}

			card.innerHTML = `
				<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
					<div>
						<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--fv-text-tertiary);margin-bottom:4px;">${w.label}</div>
						<div style="font-size:28px;font-weight:800;color:var(--fv-text-primary);line-height:1;">${w.value}</div>
					</div>
					<div style="font-size:28px;opacity:0.6;">${w.icon || "📊"}</div>
				</div>
				${w.subtitle ? `<div style="font-size:12px;color:var(--fv-text-secondary);">${w.subtitle}</div>` : ""}
				${w.badges ? `<div style="display:flex;gap:6px;margin-top:8px;">${w.badges.map((b) => `<span class="fv-badge fv-badge-${b.type || "info"}">${b.label}</span>`).join("")}</div>` : ""}
				${w.sparkline ? `<div class="fv-sparkline-area" style="margin-top:12px;height:40px;"></div>` : ""}
			`;

			this.container.appendChild(card);
		});
	}
}
