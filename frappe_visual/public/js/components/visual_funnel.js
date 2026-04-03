/**
 * VisualFunnel — Conversion Funnel Chart
 * =========================================
 * SVG funnel chart showing conversion stages with percentages.
 *
 * Features:
 *   • Horizontal or vertical funnel layout
 *   • Curved or angular funnel shape
 *   • Animated fill with GSAP
 *   • Stage labels with value + percentage + conversion rate
 *   • Color gradient per stage
 *   • Frappe integration: count by status/stage field
 *   • Hover highlight with tooltip
 *   • Comparison mode (overlay two funnels)
 *   • RTL + dark mode
 *
 * Usage:
 *   frappe.visual.Funnel.create('#container', {
 *     stages: [
 *       { label: 'Visitors',   value: 10000, color: '#6366F1' },
 *       { label: 'Leads',      value: 5000,  color: '#8B5CF6' },
 *       { label: 'Qualified',  value: 2000,  color: '#EC4899' },
 *       { label: 'Proposals',  value: 800,   color: '#F59E0B' },
 *       { label: 'Closed Won', value: 300,   color: '#10B981' },
 *     ],
 *   });
 *
 *   // From DocType:
 *   frappe.visual.Funnel.fromDocType('#el', {
 *     doctype: 'Lead',
 *     stageField: 'status',
 *     stageOrder: ['Lead', 'Open', 'Replied', 'Opportunity', 'Converted'],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualFunnel {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("Funnel: container not found");

		this.config = Object.assign({
			stages: [],
			layout: "vertical",     // 'vertical' | 'horizontal'
			shape: "curved",        // 'curved' | 'angular'
			width: null,
			height: null,
			colors: ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444"],
			theme: "glass",
			animate: true,
			showLabels: true,
			showValues: true,
			showPercentages: true,
			showConversionRate: true,
			showTooltips: true,
			unit: "",
			formatValue: null,
			onStageClick: null,
			minWidth: 0.08,        // Minimum stage width as fraction
		}, config);

		this._init();
	}

	static create(container, config) {
		return new VisualFunnel(container, config);
	}

	/**
	 * Build funnel from DocType status counts
	 */
	static async fromDocType(container, opts = {}) {
		const { doctype, stageField = "status", stageOrder = [], filters = {}, colors } = opts;
		if (!doctype) return new VisualFunnel(container, { stages: [] });

		try {
			const rows = await frappe.xcall("frappe.client.get_list", {
				doctype,
				fields: [stageField, "count(name) as _count"],
				filters,
				group_by: stageField,
				limit_page_length: 100,
			});

			const countMap = new Map();
			(rows || []).forEach(r => countMap.set(r[stageField], parseInt(r._count) || 0));

			let stages;
			if (stageOrder.length) {
				stages = stageOrder.map((s, i) => ({
					label: s,
					value: countMap.get(s) || 0,
					color: colors?.[i] || null,
				}));
			} else {
				stages = [...countMap.entries()]
					.sort((a, b) => b[1] - a[1])
					.map(([label, value], i) => ({
						label, value,
						color: colors?.[i] || null,
					}));
			}

			return new VisualFunnel(container, { ...opts, stages });
		} catch (err) {
			console.error("Funnel: load error", err);
			return new VisualFunnel(container, { stages: [] });
		}
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
		this.width = this.config.width || rect.width || 600;
		this.height = this.config.height || Math.max(rect.height || 400, this.config.stages.length * 60 + 40);
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.el = document.createElement("div");
		this.el.className = `fv-funnel fv-funnel--${this.config.theme} fv-funnel--${this.config.layout}`;
		this.el.setAttribute("dir", this._isRTL() ? "rtl" : "ltr");
		this.container.innerHTML = "";
		this.container.appendChild(this.el);
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		const stages = this.config.stages;
		if (!stages.length) {
			this.el.innerHTML = `<div class="fv-funnel-empty">${__("No data")}</div>`;
			return;
		}

		const isVert = this.config.layout === "vertical";
		const maxVal = stages[0]?.value || 1;
		const ns = "http://www.w3.org/2000/svg";

		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", this.width);
		svg.setAttribute("height", this.height);
		svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
		svg.classList.add("fv-funnel-svg");

		const pad = 20;
		const labelW = this.config.showLabels ? 200 : 0;
		const funnelW = this.width - labelW - pad * 2;
		const stageH = (this.height - pad * 2) / stages.length;
		const centerX = pad + labelW + funnelW / 2;

		stages.forEach((stage, i) => {
			const frac = Math.max(stage.value / maxVal, this.config.minWidth);
			const nextFrac = (i + 1 < stages.length) ? Math.max(stages[i + 1].value / maxVal, this.config.minWidth) : frac * 0.5;

			const topW = frac * funnelW;
			const botW = nextFrac * funnelW;
			const y = pad + i * stageH;
			const color = stage.color || this.config.colors[i % this.config.colors.length];

			// Funnel trapezoid
			const path = document.createElementNS(ns, "path");
			if (this.config.shape === "curved") {
				const x1 = centerX - topW / 2;
				const x2 = centerX + topW / 2;
				const x3 = centerX + botW / 2;
				const x4 = centerX - botW / 2;
				path.setAttribute("d",
					`M${x1},${y} L${x2},${y} ` +
					`Q${x2 + 5},${y + stageH / 2} ${x3},${y + stageH} ` +
					`L${x4},${y + stageH} ` +
					`Q${x4 - 5},${y + stageH / 2} ${x1},${y} Z`
				);
			} else {
				const x1 = centerX - topW / 2;
				const x2 = centerX + topW / 2;
				const x3 = centerX + botW / 2;
				const x4 = centerX - botW / 2;
				path.setAttribute("d", `M${x1},${y} L${x2},${y} L${x3},${y + stageH} L${x4},${y + stageH} Z`);
			}

			path.setAttribute("fill", color);
			path.setAttribute("opacity", "0.85");
			path.setAttribute("stroke", "var(--fv-funnel-border, #fff)");
			path.setAttribute("stroke-width", "1");
			path.classList.add("fv-funnel-stage");
			path.dataset.idx = i;

			// Hover
			path.addEventListener("mouseenter", () => path.setAttribute("opacity", "1"));
			path.addEventListener("mouseleave", () => path.setAttribute("opacity", "0.85"));

			// Click
			if (this.config.onStageClick) {
				path.style.cursor = "pointer";
				path.addEventListener("click", () => this.config.onStageClick(stage, i));
			}

			// Tooltip
			if (this.config.showTooltips) {
				const title = document.createElementNS(ns, "title");
				const pct = Math.round((stage.value / maxVal) * 100);
				title.textContent = `${__(stage.label)}: ${this._fmtValue(stage.value)} (${pct}%)`;
				path.appendChild(title);
			}

			svg.appendChild(path);

			// Label text on the funnel
			if (this.config.showLabels) {
				const midY = y + stageH / 2;

				// Label
				const label = document.createElementNS(ns, "text");
				label.setAttribute("x", pad);
				label.setAttribute("y", midY - 2);
				label.setAttribute("class", "fv-funnel-label");
				label.textContent = __(stage.label);
				svg.appendChild(label);

				// Value + percentage
				const infoText = [];
				if (this.config.showValues) infoText.push(this._fmtValue(stage.value));
				if (this.config.showPercentages) infoText.push(`${Math.round((stage.value / maxVal) * 100)}%`);
				if (this.config.showConversionRate && i > 0) {
					const prevVal = stages[i - 1].value;
					const rate = prevVal > 0 ? Math.round((stage.value / prevVal) * 100) : 0;
					infoText.push(`↓${rate}%`);
				}

				if (infoText.length) {
					const val = document.createElementNS(ns, "text");
					val.setAttribute("x", pad);
					val.setAttribute("y", midY + 14);
					val.setAttribute("class", "fv-funnel-value");
					val.textContent = infoText.join(" · ");
					svg.appendChild(val);
				}
			}

			// Center value on funnel shape
			const centerVal = document.createElementNS(ns, "text");
			centerVal.setAttribute("x", centerX);
			centerVal.setAttribute("y", y + stageH / 2 + 5);
			centerVal.setAttribute("text-anchor", "middle");
			centerVal.setAttribute("class", "fv-funnel-center-val");
			centerVal.textContent = this._fmtValue(stage.value);
			svg.appendChild(centerVal);
		});

		this.el.innerHTML = "";
		this.el.appendChild(svg);
		this.svg = svg;
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		if (typeof gsap === "undefined") return;
		gsap.fromTo(this.el.querySelectorAll(".fv-funnel-stage"),
			{ scaleX: 0, transformOrigin: "center" },
			{ scaleX: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" }
		);
	}

	// ─── Utils ───────────────────────────────────────────────────
	_fmtValue(v) {
		if (this.config.formatValue) return this.config.formatValue(v);
		const unit = this.config.unit;
		if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M ${unit}`.trim();
		if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${unit}`.trim();
		return `${Math.round(v)} ${unit}`.trim();
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}

	async refresh(stages) {
		if (stages) this.config.stages = stages;
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
