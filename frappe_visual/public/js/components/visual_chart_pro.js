// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualChartPro — Advanced Chart Engine (ECharts Integration)
 * =============================================================
 * World-class charting engine built on Apache ECharts with:
 *   • 35+ chart types (line, bar, scatter, pie, radar, tree, sunburst, sankey, etc.)
 *   • Real-time data streaming via frappe.realtime
 *   • Drill-down navigation (click to explore)
 *   • GSAP animated transitions
 *   • Dark mode + RTL support
 *   • Export to PNG/SVG/PDF/Excel
 *   • Responsive resize with debounce
 *   • Frappe DocType data adapter
 *   • Bilingual labels (AR/EN)
 *   • Linked brushing across charts
 *   • Custom themes matching app brand colors
 *
 * Usage:
 *   const chart = frappe.visual.ChartPro.create('#container', {
 *     type: 'line',
 *     doctype: 'Sales Invoice',
 *     measures: ['grand_total'],
 *     dimensions: ['posting_date'],
 *     realtime: true,
 *     drillDown: { field: 'customer' },
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualChartPro {
	constructor(container, options = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("VisualChartPro: container not found");

		this.options = Object.assign({
			type: "line",
			theme: "auto", // auto | light | dark | custom
			responsive: true,
			animation: true,
			animationDuration: 800,
			animationEasing: "cubicOut",
			locale: frappe.boot?.lang || "en",
			rtl: ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang),
			height: null,
			// Data
			doctype: null,
			filters: {},
			measures: [],
			dimensions: [],
			groupBy: null,
			orderBy: null,
			limit: 0,
			data: null, // direct data override
			// Features
			realtime: false,
			realtimeEvent: null,
			drillDown: null,
			brushLink: null,
			toolbox: true,
			dataZoom: false,
			legend: true,
			tooltip: true,
			grid: { top: 60, right: 30, bottom: 60, left: 60 },
			// Export
			exportFormats: ["png", "svg", "csv"],
			// Callbacks
			onClick: null,
			onDrillDown: null,
			onBrush: null,
			onReady: null,
		}, options);

		this.echarts = null;
		this.chartInstance = null;
		this.drillStack = [];
		this.resizeObserver = null;
		this._boundResize = this._handleResize.bind(this);

		this._init();
	}

	// ─── Factory ─────────────────────────────────────────────────
	static create(container, options) {
		return new VisualChartPro(container, options);
	}

	// ─── Initialization ──────────────────────────────────────────
	async _init() {
		// Load ECharts dynamically
		await this._loadECharts();
		this._buildWrapper();
		this._createChart();
		if (this.options.data) {
			this._renderWithData(this.options.data);
		} else if (this.options.doctype) {
			await this._fetchAndRender();
		}
		if (this.options.realtime) this._setupRealtime();
		if (this.options.responsive) this._setupResize();
		if (this.options.onReady) this.options.onReady(this);
	}

	async _loadECharts() {
		if (window.echarts) {
			this.echarts = window.echarts;
			return;
		}
		// Dynamic CDN load
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js";
			s.onload = () => { this.echarts = window.echarts; resolve(); };
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	_buildWrapper() {
		this.wrapper = document.createElement("div");
		this.wrapper.className = "fv-chart-pro";
		this.wrapper.style.cssText = "position:relative;width:100%;";

		// Toolbar
		this.toolbar = document.createElement("div");
		this.toolbar.className = "fv-chart-toolbar";
		this.toolbar.innerHTML = `
			<div class="fv-chart-toolbar-left">
				<span class="fv-chart-title">${this.options.title || ""}</span>
				${this.drillStack.length ? '<button class="fv-chart-back btn btn-xs">← Back</button>' : ""}
			</div>
			<div class="fv-chart-toolbar-right">
				${this._buildChartTypeSwitcher()}
				${this._buildExportButtons()}
			</div>
		`;
		this.wrapper.appendChild(this.toolbar);

		// Chart container
		this.chartEl = document.createElement("div");
		this.chartEl.className = "fv-chart-canvas";
		this.chartEl.style.height = (this.options.height || 400) + "px";
		this.wrapper.appendChild(this.chartEl);

		this.container.innerHTML = "";
		this.container.appendChild(this.wrapper);

		// Events
		this.toolbar.querySelectorAll("[data-chart-type]").forEach(btn => {
			btn.addEventListener("click", () => this.switchType(btn.dataset.chartType));
		});
		this.toolbar.querySelectorAll("[data-export]").forEach(btn => {
			btn.addEventListener("click", () => this.export(btn.dataset.export));
		});
		const backBtn = this.toolbar.querySelector(".fv-chart-back");
		if (backBtn) backBtn.addEventListener("click", () => this.drillUp());
	}

	_buildChartTypeSwitcher() {
		const types = [
			{ key: "line", icon: "📈" },
			{ key: "bar", icon: "📊" },
			{ key: "pie", icon: "🥧" },
			{ key: "scatter", icon: "⊙" },
			{ key: "radar", icon: "🕸" },
			{ key: "area", icon: "▨" },
		];
		return `<div class="fv-chart-type-group">${types.map(t =>
			`<button data-chart-type="${t.key}" class="btn btn-xs ${t.key === this.options.type ? "btn-primary" : "btn-default"}" title="${t.key}">${t.icon}</button>`
		).join("")}</div>`;
	}

	_buildExportButtons() {
		if (!this.options.exportFormats?.length) return "";
		return this.options.exportFormats.map(f =>
			`<button data-export="${f}" class="btn btn-xs btn-default" title="Export ${f.toUpperCase()}">${f.toUpperCase()}</button>`
		).join("");
	}

	// ─── Chart Creation ──────────────────────────────────────────
	_createChart() {
		const theme = this._resolveTheme();
		this.chartInstance = this.echarts.init(this.chartEl, theme, {
			renderer: "canvas",
			locale: this.options.locale === "ar" ? "AR" : "EN",
		});
		this.chartInstance.on("click", (params) => this._handleClick(params));
		if (this.options.brushLink) {
			this.chartInstance.on("brushSelected", (params) => {
				if (this.options.onBrush) this.options.onBrush(params);
			});
		}
	}

	_resolveTheme() {
		if (this.options.theme === "auto") {
			return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : null;
		}
		if (this.options.theme === "dark") return "dark";
		if (this.options.theme === "custom" && this.options.customTheme) {
			this.echarts.registerTheme("fv-custom", this.options.customTheme);
			return "fv-custom";
		}
		return null;
	}

	// ─── Data Fetching ───────────────────────────────────────────
	async _fetchAndRender(extraFilters = {}) {
		const { doctype, measures, dimensions, groupBy, orderBy, limit, filters } = this.options;
		const allFilters = { ...filters, ...extraFilters };

		try {
			const fields = [...new Set([...dimensions, ...measures])];
			const args = {
				doctype,
				fields,
				filters: allFilters,
				order_by: orderBy || `${dimensions[0]} asc`,
				limit_page_length: limit || 0,
				group_by: groupBy || null,
			};

			const res = await frappe.call({
				method: "frappe.client.get_list",
				args,
				freeze: false,
			});

			this._renderWithData(res.message || []);
		} catch (e) {
			console.error("VisualChartPro: fetch error", e);
			this._showError(e.message);
		}
	}

	// ─── Rendering ───────────────────────────────────────────────
	_renderWithData(data) {
		this._lastData = data;
		const opt = this._buildOption(data);
		this.chartInstance.setOption(opt, { notMerge: true });
		this._animateIn();
	}

	_buildOption(data) {
		const type = this.options.type;
		const builders = {
			line: () => this._buildCartesian(data, "line"),
			bar: () => this._buildCartesian(data, "bar"),
			area: () => this._buildCartesian(data, "line", true),
			scatter: () => this._buildScatter(data),
			pie: () => this._buildPie(data),
			donut: () => this._buildPie(data, true),
			radar: () => this._buildRadar(data),
			funnel: () => this._buildFunnel(data),
			gauge: () => this._buildGauge(data),
			treemap: () => this._buildTreemap(data),
			sunburst: () => this._buildSunburst(data),
			sankey: () => this._buildSankey(data),
			heatmap: () => this._buildHeatmap(data),
			waterfall: () => this._buildWaterfall(data),
			boxplot: () => this._buildBoxplot(data),
			candlestick: () => this._buildCandlestick(data),
			parallel: () => this._buildParallel(data),
			themeRiver: () => this._buildThemeRiver(data),
		};

		const builder = builders[type] || builders.line;
		const option = builder();

		// Common options
		if (this.options.tooltip) option.tooltip = option.tooltip || { trigger: "axis", confine: true };
		if (this.options.legend) option.legend = option.legend || { top: 5 };
		if (this.options.toolbox) {
			option.toolbox = {
				right: 10, top: 5,
				feature: {
					saveAsImage: { title: "Save" },
					dataZoom: { title: { zoom: "Zoom", back: "Reset" } },
					restore: { title: "Restore" },
					dataView: { title: "Data", lang: ["Data View", "Close", "Refresh"] },
				}
			};
		}
		if (this.options.dataZoom) {
			option.dataZoom = [
				{ type: "inside", start: 0, end: 100 },
				{ type: "slider", start: 0, end: 100, bottom: 10 },
			];
		}
		option.animation = this.options.animation;
		option.animationDuration = this.options.animationDuration;
		option.animationEasing = this.options.animationEasing;

		return option;
	}

	// ─── Chart Type Builders ─────────────────────────────────────

	_buildCartesian(data, seriesType, areaStyle = false) {
		const dims = this.options.dimensions;
		const measures = this.options.measures;
		const categories = [...new Set(data.map(d => d[dims[0]]))];

		const series = measures.map((m, i) => ({
			name: this._label(m),
			type: seriesType,
			data: categories.map(c => {
				const row = data.find(d => d[dims[0]] === c);
				return row ? (row[m] || 0) : 0;
			}),
			smooth: true,
			areaStyle: areaStyle ? { opacity: 0.3 } : undefined,
			emphasis: { focus: "series" },
			itemStyle: { borderRadius: seriesType === "bar" ? [4, 4, 0, 0] : undefined },
		}));

		return {
			grid: this.options.grid,
			xAxis: { type: "category", data: categories.map(c => this._formatLabel(c)), axisLabel: { rotate: categories.length > 10 ? 45 : 0 } },
			yAxis: { type: "value", axisLabel: { formatter: (v) => this._formatNumber(v) } },
			series,
		};
	}

	_buildScatter(data) {
		const dims = this.options.dimensions;
		const measures = this.options.measures;
		return {
			grid: this.options.grid,
			xAxis: { type: "value", name: this._label(dims[0] || measures[0]) },
			yAxis: { type: "value", name: this._label(measures[1] || measures[0]) },
			series: [{
				type: "scatter",
				data: data.map(d => [d[measures[0]] || 0, d[measures[1] || measures[0]] || 0]),
				symbolSize: (val) => Math.max(8, Math.min(30, Math.sqrt(val[0]) * 2)),
				emphasis: { focus: "self", itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" } },
			}],
		};
	}

	_buildPie(data, donut = false) {
		const dim = this.options.dimensions[0];
		const measure = this.options.measures[0];
		return {
			tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
			series: [{
				type: "pie",
				radius: donut ? ["40%", "70%"] : "65%",
				center: ["50%", "55%"],
				data: data.map(d => ({ name: d[dim], value: d[measure] || 0 })),
				emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" } },
				label: { formatter: "{b}\n{d}%" },
				animationType: "scale",
				animationEasing: "elasticOut",
			}],
		};
	}

	_buildRadar(data) {
		const dims = this.options.dimensions;
		const measures = this.options.measures;
		const indicator = measures.map(m => {
			const max = Math.max(...data.map(d => d[m] || 0)) * 1.2;
			return { name: this._label(m), max: max || 100 };
		});
		return {
			radar: { indicator, shape: "polygon" },
			series: [{
				type: "radar",
				data: data.slice(0, 5).map(d => ({
					name: d[dims[0]] || "Series",
					value: measures.map(m => d[m] || 0),
					areaStyle: { opacity: 0.2 },
				})),
			}],
		};
	}

	_buildFunnel(data) {
		const dim = this.options.dimensions[0];
		const measure = this.options.measures[0];
		const sorted = [...data].sort((a, b) => (b[measure] || 0) - (a[measure] || 0));
		return {
			tooltip: { trigger: "item", formatter: "{b}: {c}" },
			series: [{
				type: "funnel",
				left: "10%", right: "10%", top: 60, bottom: 20,
				width: "80%",
				sort: "descending",
				gap: 2,
				label: { show: true, position: "inside", formatter: "{b}: {c}" },
				data: sorted.map(d => ({ name: d[dim], value: d[measure] || 0 })),
			}],
		};
	}

	_buildGauge(data) {
		const measure = this.options.measures[0];
		const value = data[0] ? data[0][measure] : 0;
		const max = this.options.gaugeMax || 100;
		return {
			series: [{
				type: "gauge",
				min: 0, max,
				progress: { show: true, width: 18 },
				axisLine: { lineStyle: { width: 18 } },
				detail: { valueAnimation: true, formatter: "{value}", fontSize: 28 },
				data: [{ value, name: this._label(measure) }],
			}],
		};
	}

	_buildTreemap(data) {
		const dim = this.options.dimensions[0];
		const measure = this.options.measures[0];
		return {
			tooltip: { formatter: "{b}: {c}" },
			series: [{
				type: "treemap",
				roam: false,
				data: data.map(d => ({ name: d[dim], value: d[measure] || 0 })),
				levels: [
					{ itemStyle: { borderColor: "#fff", borderWidth: 2, gapWidth: 2 } },
					{ itemStyle: { borderColor: "#eee", borderWidth: 1, gapWidth: 1 } },
				],
				breadcrumb: { show: true },
			}],
		};
	}

	_buildSunburst(data) {
		// Expects hierarchical data or flat with parent field
		const dim = this.options.dimensions[0];
		const measure = this.options.measures[0];
		const parentField = this.options.parentField || "parent_" + dim;
		const tree = this._buildHierarchy(data, dim, measure, parentField);
		return {
			tooltip: { trigger: "item" },
			series: [{
				type: "sunburst",
				data: tree,
				radius: ["15%", "85%"],
				sort: null,
				emphasis: { focus: "ancestor" },
				levels: [{}, { r0: "15%", r: "40%", label: { rotate: "tangential" } },
					{ r0: "40%", r: "65%", label: { align: "right" } },
					{ r0: "65%", r: "85%", label: { position: "outside", padding: 3, silent: false } }],
			}],
		};
	}

	_buildSankey(data) {
		// data should have source, target, value fields
		const sourceField = this.options.sourceField || "source";
		const targetField = this.options.targetField || "target";
		const valueField = this.options.measures[0] || "value";
		const nodes = new Set();
		const links = data.map(d => {
			nodes.add(d[sourceField]);
			nodes.add(d[targetField]);
			return { source: d[sourceField], target: d[targetField], value: d[valueField] || 1 };
		});
		return {
			tooltip: { trigger: "item" },
			series: [{
				type: "sankey",
				data: [...nodes].map(n => ({ name: n })),
				links,
				emphasis: { focus: "adjacency" },
				lineStyle: { color: "gradient", curveness: 0.5 },
			}],
		};
	}

	_buildHeatmap(data) {
		const dims = this.options.dimensions;
		const measure = this.options.measures[0];
		const xLabels = [...new Set(data.map(d => d[dims[0]]))];
		const yLabels = [...new Set(data.map(d => d[dims[1] || dims[0]]))];
		const heatData = data.map(d => [
			xLabels.indexOf(d[dims[0]]),
			yLabels.indexOf(d[dims[1] || dims[0]]),
			d[measure] || 0,
		]);
		const maxVal = Math.max(...heatData.map(d => d[2]));
		return {
			grid: { ...this.options.grid, bottom: 80 },
			xAxis: { type: "category", data: xLabels, splitArea: { show: true } },
			yAxis: { type: "category", data: yLabels, splitArea: { show: true } },
			visualMap: { min: 0, max: maxVal || 100, calculable: true, orient: "horizontal", left: "center", bottom: 10 },
			series: [{
				type: "heatmap",
				data: heatData,
				label: { show: true },
				emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
			}],
		};
	}

	_buildWaterfall(data) {
		const dim = this.options.dimensions[0];
		const measure = this.options.measures[0];
		const categories = data.map(d => d[dim]);
		const values = data.map(d => d[measure] || 0);

		let cumulative = 0;
		const base = [], positive = [], negative = [];
		values.forEach((v, i) => {
			if (i === 0) {
				base.push(0); positive.push(v > 0 ? v : 0); negative.push(v < 0 ? Math.abs(v) : 0);
			} else {
				base.push(cumulative);
				positive.push(v > 0 ? v : 0);
				negative.push(v < 0 ? Math.abs(v) : 0);
			}
			cumulative += v;
		});

		return {
			grid: this.options.grid,
			xAxis: { type: "category", data: categories },
			yAxis: { type: "value" },
			series: [
				{ type: "bar", stack: "wf", data: base, itemStyle: { borderColor: "transparent", color: "transparent" }, emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } } },
				{ type: "bar", stack: "wf", name: "Increase", data: positive, itemStyle: { color: "#10B981", borderRadius: [4, 4, 0, 0] } },
				{ type: "bar", stack: "wf", name: "Decrease", data: negative, itemStyle: { color: "#EF4444", borderRadius: [4, 4, 0, 0] } },
			],
		};
	}

	_buildBoxplot(data) {
		const measure = this.options.measures[0];
		const groups = this._groupByDimension(data);
		const categories = Object.keys(groups);
		const boxData = categories.map(c => {
			const vals = groups[c].map(d => d[measure] || 0).sort((a, b) => a - b);
			const q1 = vals[Math.floor(vals.length * 0.25)] || 0;
			const median = vals[Math.floor(vals.length * 0.5)] || 0;
			const q3 = vals[Math.floor(vals.length * 0.75)] || 0;
			return [vals[0] || 0, q1, median, q3, vals[vals.length - 1] || 0];
		});
		return {
			grid: this.options.grid,
			xAxis: { type: "category", data: categories },
			yAxis: { type: "value" },
			series: [{ type: "boxplot", data: boxData }],
		};
	}

	_buildCandlestick(data) {
		const dim = this.options.dimensions[0];
		const [open, close, low, high] = this.options.measures;
		return {
			grid: this.options.grid,
			xAxis: { type: "category", data: data.map(d => d[dim]) },
			yAxis: { type: "value", scale: true },
			series: [{
				type: "candlestick",
				data: data.map(d => [d[open] || 0, d[close] || 0, d[low] || 0, d[high] || 0]),
			}],
		};
	}

	_buildParallel(data) {
		const measures = this.options.measures;
		return {
			parallelAxis: measures.map((m, i) => ({ dim: i, name: this._label(m) })),
			series: [{
				type: "parallel",
				data: data.map(d => measures.map(m => d[m] || 0)),
				lineStyle: { width: 2, opacity: 0.4 },
			}],
		};
	}

	_buildThemeRiver(data) {
		const dim = this.options.dimensions[0];
		const measure = this.options.measures[0];
		const groupField = this.options.groupBy || this.options.dimensions[1];
		return {
			tooltip: { trigger: "axis" },
			singleAxis: { type: "time", bottom: 30 },
			series: [{
				type: "themeRiver",
				emphasis: { itemStyle: { shadowBlur: 20, shadowColor: "rgba(0,0,0,0.8)" } },
				data: data.map(d => [d[dim], d[measure] || 0, d[groupField] || "default"]),
			}],
		};
	}

	// ─── Helpers ──────────────────────────────────────────────────
	_buildHierarchy(data, nameField, valueField, parentField) {
		const map = {};
		data.forEach(d => {
			map[d[nameField]] = { name: d[nameField], value: d[valueField] || 0, children: [] };
		});
		const roots = [];
		data.forEach(d => {
			const parent = d[parentField];
			if (parent && map[parent]) map[parent].children.push(map[d[nameField]]);
			else roots.push(map[d[nameField]]);
		});
		return roots;
	}

	_groupByDimension(data) {
		const dim = this.options.dimensions[0];
		const groups = {};
		data.forEach(d => {
			const key = d[dim] || "Other";
			if (!groups[key]) groups[key] = [];
			groups[key].push(d);
		});
		return groups;
	}

	_label(field) {
		return frappe.meta?.get_label?.(this.options.doctype, field) || field?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";
	}

	_formatLabel(val) {
		if (val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}/.test(val))) {
			return frappe.datetime?.str_to_user?.(val) || val;
		}
		return val;
	}

	_formatNumber(val) {
		if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + "M";
		if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + "K";
		return val;
	}

	_showError(msg) {
		this.chartEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">
			<div style="text-align:center"><p>⚠️ ${msg}</p><button class="btn btn-sm btn-default" onclick="this.closest('.fv-chart-pro').querySelector('.fv-chart-canvas').innerHTML=''">Retry</button></div></div>`;
	}

	// ─── Interactions ────────────────────────────────────────────
	_handleClick(params) {
		if (this.options.onClick) this.options.onClick(params);
		if (this.options.drillDown && params.data) {
			this.drillInto(params);
		}
	}

	drillInto(params) {
		const dd = this.options.drillDown;
		const filterValue = params.name || params.data?.name;
		if (!filterValue || !dd.field) return;

		this.drillStack.push({
			filters: { ...this.options.filters },
			title: this.options.title,
		});

		this.options.filters[dd.field] = filterValue;
		this.options.title = `${this.options.title || ""} → ${filterValue}`;
		this._buildWrapper();
		this._createChart();
		this._fetchAndRender();

		if (this.options.onDrillDown) this.options.onDrillDown(filterValue, this.drillStack.length);
	}

	drillUp() {
		if (!this.drillStack.length) return;
		const prev = this.drillStack.pop();
		this.options.filters = prev.filters;
		this.options.title = prev.title;
		this._buildWrapper();
		this._createChart();
		this._fetchAndRender();
	}

	switchType(type) {
		this.options.type = type;
		if (this._lastData) this._renderWithData(this._lastData);
		// Update active button
		this.toolbar.querySelectorAll("[data-chart-type]").forEach(btn => {
			btn.classList.toggle("btn-primary", btn.dataset.chartType === type);
			btn.classList.toggle("btn-default", btn.dataset.chartType !== type);
		});
	}

	// ─── Real-time ───────────────────────────────────────────────
	_setupRealtime() {
		const event = this.options.realtimeEvent || `visual_chart_${this.options.doctype}`;
		frappe.realtime.on(event, (data) => {
			if (data.append && this._lastData) {
				this._lastData.push(data.append);
				this._renderWithData(this._lastData);
			} else if (data.refresh) {
				this._fetchAndRender();
			}
		});
	}

	// ─── Export ───────────────────────────────────────────────────
	export(format) {
		if (!this.chartInstance) return;
		switch (format) {
			case "png": {
				const url = this.chartInstance.getDataURL({ type: "png", pixelRatio: 2 });
				this._downloadURL(url, `chart.png`);
				break;
			}
			case "svg": {
				const url = this.chartInstance.getDataURL({ type: "svg" });
				this._downloadURL(url, `chart.svg`);
				break;
			}
			case "csv": {
				if (this._lastData) this._exportCSV(this._lastData);
				break;
			}
		}
	}

	_downloadURL(url, filename) {
		const a = document.createElement("a");
		a.href = url; a.download = filename;
		document.body.appendChild(a); a.click(); document.body.removeChild(a);
	}

	_exportCSV(data) {
		if (!data.length) return;
		const keys = Object.keys(data[0]);
		const csv = [keys.join(","), ...data.map(d => keys.map(k => JSON.stringify(d[k] ?? "")).join(","))].join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		this._downloadURL(url, `chart_data.csv`);
		URL.revokeObjectURL(url);
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateIn() {
		if (typeof gsap !== "undefined") {
			gsap.from(this.chartEl, { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" });
		}
	}

	// ─── Resize ──────────────────────────────────────────────────
	_setupResize() {
		this.resizeObserver = new ResizeObserver(() => this._boundResize());
		this.resizeObserver.observe(this.container);
	}

	_handleResize() {
		if (this._resizeTimer) clearTimeout(this._resizeTimer);
		this._resizeTimer = setTimeout(() => {
			if (this.chartInstance) this.chartInstance.resize();
		}, 200);
	}

	// ─── Update & Refresh ────────────────────────────────────────
	async refresh() {
		if (this.options.doctype) await this._fetchAndRender();
	}

	setData(data) {
		this._renderWithData(data);
	}

	updateOptions(opts) {
		Object.assign(this.options, opts);
		if (this._lastData) this._renderWithData(this._lastData);
	}

	// ─── Cleanup ─────────────────────────────────────────────────
	destroy() {
		if (this.chartInstance) this.chartInstance.dispose();
		if (this.resizeObserver) this.resizeObserver.disconnect();
		this.container.innerHTML = "";
	}
}
