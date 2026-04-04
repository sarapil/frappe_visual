// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualHeatmapCalendar — Activity Heatmap Calendar
 * ====================================================
 * GitHub-style contribution/activity heatmap, fully SVG.
 *
 * Features:
 *   • Year-at-a-glance heatmap grid (52 weeks × 7 days)
 *   • Color intensity scale based on value ranges
 *   • Month labels, day-of-week labels
 *   • Tooltip on hover with date + value
 *   • Click handler per cell
 *   • Year navigation (prev/next)
 *   • Frappe integration: count records per day from any DocType
 *   • Custom color scales (green, blue, purple, red, custom gradient)
 *   • Legend bar showing intensity scale
 *   • RTL layout for Arabic calendars
 *   • Dark mode compatible
 *
 * Usage:
 *   frappe.visual.HeatmapCalendar.create('#container', {
 *     doctype: 'Communication',
 *     dateField: 'communication_date',
 *     year: 2025,
 *     colorScale: 'green',
 *   });
 *
 *   // Static data:
 *   frappe.visual.HeatmapCalendar.create('#el', {
 *     data: { '2025-01-15': 5, '2025-01-16': 12, '2025-02-01': 3 },
 *     year: 2025,
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualHeatmapCalendar {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("HeatmapCalendar: container not found");

		this.config = Object.assign({
			data: null,
			doctype: null,
			dateField: "creation",
			filters: {},
			year: new Date().getFullYear(),
			colorScale: "green",      // 'green' | 'blue' | 'purple' | 'red' | 'orange' | [array of colors]
			theme: "glass",
			cellSize: 14,
			cellGap: 3,
			showMonthLabels: true,
			showDayLabels: true,
			showLegend: true,
			showNavigation: true,
			showTooltips: true,
			animate: true,
			onCellClick: null,
			label: null,
			unit: "activities",
		}, config);

		this.dayData = {};
		this._init();
	}

	static create(container, config) {
		return new VisualHeatmapCalendar(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._loadData();
		this._render();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.el = document.createElement("div");
		this.el.className = `fv-hm fv-hm--${this.config.theme}`;
		this.el.setAttribute("dir", this._isRTL() ? "rtl" : "ltr");

		let header = "";
		if (this.config.showNavigation) {
			header = `<div class="fv-hm-header">
				<button class="fv-hm-nav-btn" data-dir="-1">◀</button>
				<span class="fv-hm-year">${this.config.year}</span>
				<button class="fv-hm-nav-btn" data-dir="1">▶</button>
				${this.config.label ? `<span class="fv-hm-label">${__(this.config.label)}</span>` : ""}
			</div>`;
		}

		this.el.innerHTML = `${header}<div class="fv-hm-viewport"></div>
			${this.config.showLegend ? `<div class="fv-hm-legend"></div>` : ""}`;

		this.container.innerHTML = "";
		this.container.appendChild(this.el);
		this.viewport = this.el.querySelector(".fv-hm-viewport");

		// Nav buttons
		this.el.querySelectorAll(".fv-hm-nav-btn").forEach(btn => {
			btn.addEventListener("click", async () => {
				this.config.year += parseInt(btn.dataset.dir);
				const yearLabel = this.el.querySelector(".fv-hm-year");
				if (yearLabel) yearLabel.textContent = this.config.year;
				await this._loadData();
				this._render();
				if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
			});
		});
	}

	// ─── Data ────────────────────────────────────────────────────
	async _loadData() {
		if (this.config.data && !this.config.doctype) {
			this.dayData = this.config.data;
			return;
		}

		if (!this.config.doctype) {
			this.dayData = {};
			return;
		}

		try {
			const year = this.config.year;
			const dateField = this.config.dateField;
			const rows = await frappe.xcall("frappe.client.get_list", {
				doctype: this.config.doctype,
				fields: [`DATE(${dateField}) as _date`, "count(name) as _count"],
				filters: {
					...this.config.filters,
					[dateField]: ["between", [`${year}-01-01`, `${year}-12-31`]],
				},
				group_by: `DATE(${dateField})`,
				limit_page_length: 366,
			});

			this.dayData = {};
			(rows || []).forEach(r => {
				if (r._date) this.dayData[r._date] = parseInt(r._count) || 0;
			});
		} catch (err) {
			console.error("HeatmapCalendar: data load error", err);
			this.dayData = {};
		}
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		const year = this.config.year;
		const cs = this.config.cellSize;
		const gap = this.config.cellGap;
		const step = cs + gap;

		// Calculate grid
		const jan1 = new Date(year, 0, 1);
		const dec31 = new Date(year, 11, 31);
		const startDow = jan1.getDay();

		// Generate all days
		const days = [];
		const d = new Date(jan1);
		while (d <= dec31) {
			days.push(new Date(d));
			d.setDate(d.getDate() + 1);
		}

		// Colors
		const colors = this._getColorScale();
		const values = Object.values(this.dayData);
		const maxVal = values.length ? Math.max(...values) : 1;

		// SVG dimensions
		const leftPad = this.config.showDayLabels ? 30 : 0;
		const topPad = this.config.showMonthLabels ? 20 : 0;
		const numWeeks = Math.ceil((startDow + days.length) / 7);
		const svgW = leftPad + numWeeks * step + 10;
		const svgH = topPad + 7 * step + 10;

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", svgW);
		svg.setAttribute("height", svgH);
		svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
		svg.classList.add("fv-hm-svg");

		// Day-of-week labels
		if (this.config.showDayLabels) {
			const dayNames = [__("Sun"), __("Mon"), __("Tue"), __("Wed"), __("Thu"), __("Fri"), __("Sat")];
			[1, 3, 5].forEach(i => {
				const text = document.createElementNS(ns, "text");
				text.setAttribute("x", leftPad - 6);
				text.setAttribute("y", topPad + i * step + cs * 0.7);
				text.setAttribute("text-anchor", "end");
				text.setAttribute("class", "fv-hm-day-label");
				text.textContent = dayNames[i];
				svg.appendChild(text);
			});
		}

		// Month labels
		if (this.config.showMonthLabels) {
			const months = [];
			for (let m = 0; m < 12; m++) {
				const firstOfMonth = new Date(year, m, 1);
				const dayOfYear = Math.floor((firstOfMonth - jan1) / 86400000);
				const weekIdx = Math.floor((startDow + dayOfYear) / 7);
				months.push({
					label: firstOfMonth.toLocaleString(frappe.boot?.lang || "en", { month: "short" }),
					x: leftPad + weekIdx * step,
				});
			}
			months.forEach(m => {
				const text = document.createElementNS(ns, "text");
				text.setAttribute("x", m.x);
				text.setAttribute("y", topPad - 5);
				text.setAttribute("class", "fv-hm-month-label");
				text.textContent = m.label;
				svg.appendChild(text);
			});
		}

		// Day cells
		days.forEach(date => {
			const dayOfYear = Math.floor((date - jan1) / 86400000);
			const dow = date.getDay();
			const weekIdx = Math.floor((startDow + dayOfYear) / 7);

			const dateStr = date.toISOString().split("T")[0];
			const val = this.dayData[dateStr] || 0;
			const intensity = maxVal > 0 ? val / maxVal : 0;
			const colorIdx = Math.min(Math.floor(intensity * (colors.length - 1)), colors.length - 1);
			const color = val === 0 ? "var(--fv-hm-empty, #ebedf0)" : colors[colorIdx];

			const x = leftPad + weekIdx * step;
			const y = topPad + dow * step;

			const rect = document.createElementNS(ns, "rect");
			rect.setAttribute("x", x);
			rect.setAttribute("y", y);
			rect.setAttribute("width", cs);
			rect.setAttribute("height", cs);
			rect.setAttribute("rx", 2);
			rect.setAttribute("fill", color);
			rect.classList.add("fv-hm-cell");
			rect.dataset.date = dateStr;
			rect.dataset.value = val;

			// Tooltip
			if (this.config.showTooltips) {
				const title = document.createElementNS(ns, "title");
				const fmtDate = date.toLocaleDateString(frappe.boot?.lang || "en", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
				title.textContent = val > 0 ? `${fmtDate}: ${val} ${this.config.unit}` : `${fmtDate}: ${__("No activity")}`;
				rect.appendChild(title);
			}

			// Click
			if (this.config.onCellClick) {
				rect.style.cursor = "pointer";
				rect.addEventListener("click", () => this.config.onCellClick(dateStr, val));
			}

			svg.appendChild(rect);
		});

		this.viewport.innerHTML = "";
		this.viewport.appendChild(svg);

		// Legend
		if (this.config.showLegend) this._renderLegend(colors, maxVal);
	}

	_renderLegend(colors, maxVal) {
		const legend = this.el.querySelector(".fv-hm-legend");
		if (!legend) return;

		legend.innerHTML = `<span class="fv-hm-legend-text">${__("Less")}</span>` +
			["var(--fv-hm-empty, #ebedf0)", ...colors].map(c =>
				`<span class="fv-hm-legend-cell" style="background:${c}"></span>`
			).join("") +
			`<span class="fv-hm-legend-text">${__("More")}</span>`;
	}

	// ─── Color Scales ────────────────────────────────────────────
	_getColorScale() {
		const scale = this.config.colorScale;
		if (Array.isArray(scale)) return scale;

		const scales = {
			green:  ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
			blue:   ["#9ecae1", "#6baed6", "#3182bd", "#08519c"],
			purple: ["#c4b5fd", "#a78bfa", "#7c3aed", "#5b21b6"],
			red:    ["#fca5a5", "#f87171", "#ef4444", "#b91c1c"],
			orange: ["#fed7aa", "#fdba74", "#f97316", "#c2410c"],
		};
		return scales[scale] || scales.green;
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		if (typeof gsap === "undefined") return;
		const cells = this.el.querySelectorAll(".fv-hm-cell");
		gsap.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: { amount: 1.2, from: "start" }, ease: "power1.out" });
	}

	// ─── Public API ──────────────────────────────────────────────
	async setYear(year) {
		this.config.year = year;
		const yearLabel = this.el.querySelector(".fv-hm-year");
		if (yearLabel) yearLabel.textContent = year;
		await this._loadData();
		this._render();
	}

	getTotal() {
		return Object.values(this.dayData).reduce((s, v) => s + v, 0);
	}

	destroy() {
		if (this.el) this.el.remove();
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}
}
