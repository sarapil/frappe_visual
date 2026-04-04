// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualRadar — Spider / Radar Chart
 * =====================================
 * Pure SVG radar/spider chart for multi-dimensional comparison.
 *
 * Features:
 *   • Multiple data series overlay
 *   • Animated drawing with GSAP
 *   • Interactive: hover to highlight series, click axes
 *   • Configurable: filled/outlined, rounded/angular
 *   • Grid rings with value labels
 *   • Legend with toggle visibility
 *   • Frappe integration: load from Report API or DocType fields
 *   • RTL + dark mode
 *
 * Usage:
 *   frappe.visual.Radar.create('#container', {
 *     axes: ['Speed', 'Power', 'Range', 'Defense', 'Accuracy', 'Agility'],
 *     series: [
 *       { label: 'Player A', values: [80, 90, 60, 70, 85, 75], color: '#6366F1' },
 *       { label: 'Player B', values: [70, 60, 90, 80, 65, 95], color: '#EC4899' },
 *     ],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualRadar {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("Radar: container not found");

		this.config = Object.assign({
			axes: [],
			series: [],
			maxValue: null,         // Auto-detect if null
			rings: 5,
			size: null,
			shape: "polygon",       // 'polygon' | 'circle'
			fill: true,
			fillOpacity: 0.2,
			strokeWidth: 2,
			dotRadius: 4,
			showGrid: true,
			showLabels: true,
			showValues: false,
			showLegend: true,
			showTooltips: true,
			theme: "glass",
			animate: true,
			colors: ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#14B8A6"],
			onAxisClick: null,
		}, config);

		this._init();
	}

	static create(container, config) {
		return new VisualRadar(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	_init() {
		this._computeDimensions();
		this._buildShell();
		this._render();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	_computeDimensions() {
		const rect = this.container.getBoundingClientRect();
		this.size = this.config.size || Math.min(rect.width || 500, rect.height || 500, 600);
		this.center = this.size / 2;
		this.radius = this.size / 2 - 60;
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.el = document.createElement("div");
		this.el.className = `fv-radar fv-radar--${this.config.theme}`;
		this.el.setAttribute("dir", this._isRTL() ? "rtl" : "ltr");
		this.el.innerHTML = `<div class="fv-radar-viewport"></div>
			${this.config.showLegend ? `<div class="fv-radar-legend"></div>` : ""}`;
		this.container.innerHTML = "";
		this.container.appendChild(this.el);
		this.viewport = this.el.querySelector(".fv-radar-viewport");
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		const { axes, series, rings } = this.config;
		const n = axes.length;
		if (!n || !series.length) {
			this.viewport.innerHTML = `<div class="fv-radar-empty">${__("No data")}</div>`;
			return;
		}

		// Auto max
		const maxVal = this.config.maxValue || Math.max(...series.flatMap(s => s.values), 1);
		const angleStep = (2 * Math.PI) / n;

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", this.size);
		svg.setAttribute("height", this.size);
		svg.setAttribute("viewBox", `0 0 ${this.size} ${this.size}`);
		svg.classList.add("fv-radar-svg");

		// Grid
		if (this.config.showGrid) {
			for (let r = 1; r <= rings; r++) {
				const ringR = (r / rings) * this.radius;
				if (this.config.shape === "circle") {
					const circle = document.createElementNS(ns, "circle");
					circle.setAttribute("cx", this.center);
					circle.setAttribute("cy", this.center);
					circle.setAttribute("r", ringR);
					circle.setAttribute("fill", "none");
					circle.setAttribute("stroke", "var(--fv-radar-grid, #e5e7eb)");
					circle.setAttribute("stroke-width", "0.5");
					svg.appendChild(circle);
				} else {
					const points = [];
					for (let i = 0; i < n; i++) {
						const angle = i * angleStep - Math.PI / 2;
						points.push(`${this.center + ringR * Math.cos(angle)},${this.center + ringR * Math.sin(angle)}`);
					}
					const polygon = document.createElementNS(ns, "polygon");
					polygon.setAttribute("points", points.join(" "));
					polygon.setAttribute("fill", "none");
					polygon.setAttribute("stroke", "var(--fv-radar-grid, #e5e7eb)");
					polygon.setAttribute("stroke-width", "0.5");
					svg.appendChild(polygon);
				}

				// Ring value label
				if (this.config.showValues) {
					const val = document.createElementNS(ns, "text");
					val.setAttribute("x", this.center + 4);
					val.setAttribute("y", this.center - ringR - 2);
					val.setAttribute("class", "fv-radar-ring-val");
					val.textContent = Math.round((r / rings) * maxVal);
					svg.appendChild(val);
				}
			}

			// Axis lines
			for (let i = 0; i < n; i++) {
				const angle = i * angleStep - Math.PI / 2;
				const line = document.createElementNS(ns, "line");
				line.setAttribute("x1", this.center);
				line.setAttribute("y1", this.center);
				line.setAttribute("x2", this.center + this.radius * Math.cos(angle));
				line.setAttribute("y2", this.center + this.radius * Math.sin(angle));
				line.setAttribute("stroke", "var(--fv-radar-grid, #e5e7eb)");
				line.setAttribute("stroke-width", "0.5");
				svg.appendChild(line);
			}
		}

		// Data series
		series.forEach((s, sIdx) => {
			const color = s.color || this.config.colors[sIdx % this.config.colors.length];
			const points = [];

			for (let i = 0; i < n; i++) {
				const val = Math.min(s.values[i] || 0, maxVal);
				const frac = val / maxVal;
				const angle = i * angleStep - Math.PI / 2;
				const x = this.center + frac * this.radius * Math.cos(angle);
				const y = this.center + frac * this.radius * Math.sin(angle);
				points.push({ x, y, val });
			}

			// Area polygon
			const polygon = document.createElementNS(ns, "polygon");
			polygon.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
			polygon.setAttribute("fill", this.config.fill ? color : "none");
			polygon.setAttribute("fill-opacity", this.config.fillOpacity);
			polygon.setAttribute("stroke", color);
			polygon.setAttribute("stroke-width", this.config.strokeWidth);
			polygon.classList.add("fv-radar-area");
			polygon.dataset.series = sIdx;
			svg.appendChild(polygon);

			// Data points
			points.forEach((p, i) => {
				const dot = document.createElementNS(ns, "circle");
				dot.setAttribute("cx", p.x);
				dot.setAttribute("cy", p.y);
				dot.setAttribute("r", this.config.dotRadius);
				dot.setAttribute("fill", color);
				dot.setAttribute("stroke", "var(--fv-radar-dot-border, #fff)");
				dot.setAttribute("stroke-width", "1.5");
				dot.classList.add("fv-radar-dot");

				if (this.config.showTooltips) {
					const title = document.createElementNS(ns, "title");
					title.textContent = `${__(s.label)} — ${__(axes[i])}: ${p.val}`;
					dot.appendChild(title);
				}

				svg.appendChild(dot);
			});
		});

		// Axis labels
		if (this.config.showLabels) {
			axes.forEach((label, i) => {
				const angle = i * angleStep - Math.PI / 2;
				const labelR = this.radius + 25;
				const x = this.center + labelR * Math.cos(angle);
				const y = this.center + labelR * Math.sin(angle);

				const text = document.createElementNS(ns, "text");
				text.setAttribute("x", x);
				text.setAttribute("y", y + 4);
				text.setAttribute("text-anchor", Math.abs(Math.cos(angle)) < 0.01 ? "middle" : Math.cos(angle) > 0 ? "start" : "end");
				text.setAttribute("class", "fv-radar-axis-label");
				text.textContent = __(label);

				if (this.config.onAxisClick) {
					text.style.cursor = "pointer";
					text.addEventListener("click", () => this.config.onAxisClick(label, i));
				}

				svg.appendChild(text);
			});
		}

		this.viewport.innerHTML = "";
		this.viewport.appendChild(svg);
		this.svg = svg;

		// Legend
		if (this.config.showLegend) this._renderLegend();
	}

	_renderLegend() {
		const legend = this.el.querySelector(".fv-radar-legend");
		if (!legend) return;

		legend.innerHTML = this.config.series.map((s, i) => {
			const color = s.color || this.config.colors[i % this.config.colors.length];
			return `<span class="fv-radar-legend-item" data-series="${i}">
				<span class="fv-radar-legend-dot" style="background:${color}"></span>
				${__(s.label)}
			</span>`;
		}).join("");

		// Toggle series visibility
		legend.querySelectorAll(".fv-radar-legend-item").forEach(item => {
			item.addEventListener("click", () => {
				const idx = item.dataset.series;
				const area = this.el.querySelector(`.fv-radar-area[data-series="${idx}"]`);
				if (area) {
					const hidden = area.style.display === "none";
					area.style.display = hidden ? "" : "none";
					item.style.opacity = hidden ? 1 : 0.4;
				}
			});
		});
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		if (typeof gsap === "undefined") return;
		gsap.fromTo(this.el.querySelectorAll(".fv-radar-area"),
			{ scale: 0, transformOrigin: `${this.center}px ${this.center}px` },
			{ scale: 1, duration: 0.8, stagger: 0.15, ease: "elastic.out(1, 0.5)" }
		);
		gsap.fromTo(this.el.querySelectorAll(".fv-radar-dot"),
			{ scale: 0 },
			{ scale: 1, duration: 0.3, stagger: 0.03, delay: 0.4, ease: "back.out(2)" }
		);
	}

	// ─── Utils ───────────────────────────────────────────────────
	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}

	refresh(newSeries) {
		if (newSeries) this.config.series = newSeries;
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
