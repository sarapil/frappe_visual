/**
 * DataCard — Rich stat card with sparkline + trend
 * ===================================================
 * Self-contained KPI card combining value, label, trend,
 * and optional sparkline or icon — ideal for dashboards.
 *
 * frappe.visual.DataCard.create({
 *   target: "#card",
 *   title: "Monthly Revenue",
 *   value: "$45,200",
 *   change: 12.5,           // positive = up, negative = down
 *   changeLabel: "vs last month",
 *   sparkData: [10,15,12,18,20,17,25,22,30,28,35,45],
 *   sparkColor: null,       // auto from change
 *   icon: "chart-line",     // Tabler icon name or SVG
 *   iconColor: null,
 *   theme: "glass",         // "glass" | "flat" | "outline" | "minimal"
 *   size: "md",             // "sm" | "md" | "lg"
 *   onClick: null,
 *   className: ""
 * })
 */

export class DataCard {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			title: "",
			value: "",
			change: null,
			changeLabel: "",
			sparkData: [],
			sparkColor: null,
			icon: null,
			iconColor: null,
			theme: "glass",
			size: "md",
			onClick: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new DataCard(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const card = document.createElement("div");
		card.className = `fv-dc fv-dc-${this.theme} fv-dc-${this.size} ${this.className}`;
		if (this.onClick) card.style.cursor = "pointer";

		/* Icon */
		let iconHtml = "";
		if (this.icon) {
			const color = this.iconColor || "var(--primary, #6366f1)";
			iconHtml = `<div class="fv-dc-icon" style="color:${color}">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><use href="/assets/frappe_visual/icons/tabler-sprite.svg#tabler-${this.icon}"/></svg>
			</div>`;
		}

		/* Trend */
		let trendHtml = "";
		if (this.change !== null && this.change !== undefined) {
			const isUp = this.change >= 0;
			const color = isUp ? "var(--green-500, #10b981)" : "var(--red-500, #ef4444)";
			const arrow = isUp ? "↑" : "↓";
			trendHtml = `<div class="fv-dc-trend" style="color:${color}">
				<span class="fv-dc-arrow">${arrow}</span>
				<span class="fv-dc-change">${Math.abs(this.change).toFixed(1)}%</span>
				${this.changeLabel ? `<span class="fv-dc-change-label">${this.changeLabel}</span>` : ""}
			</div>`;
		}

		/* Mini sparkline */
		let sparkHtml = "";
		if (this.sparkData.length >= 2) {
			const w = this.size === "sm" ? 60 : 80;
			const h = 24;
			const max = Math.max(...this.sparkData);
			const min = Math.min(...this.sparkData);
			const range = max - min || 1;
			const pts = this.sparkData.map((v, i) => {
				const x = (i / (this.sparkData.length - 1)) * w;
				const y = h - ((v - min) / range) * (h - 4) - 2;
				return `${x},${y}`;
			});
			const color = this.sparkColor || (this.change >= 0 ? "#10b981" : "#ef4444");
			sparkHtml = `<div class="fv-dc-spark"><svg width="${w}" height="${h}"><path d="M${pts.join("L")}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg></div>`;
		}

		card.innerHTML = `
			<div class="fv-dc-header">${iconHtml}<div class="fv-dc-title">${this.title}</div></div>
			<div class="fv-dc-body">
				<div class="fv-dc-value">${this.value}</div>
				${sparkHtml}
			</div>
			${trendHtml}
		`;

		if (this.onClick) card.addEventListener("click", () => this.onClick());

		el.innerHTML = "";
		el.appendChild(card);
	}
}
