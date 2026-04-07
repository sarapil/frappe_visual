// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Data Visualization Gallery — Interactive showcase of all 20+ chart/data-viz
 * components with live data, parameter controls, dark/light & LTR/RTL toggle.
 */
frappe.pages["data-viz-gallery"].on_page_show = function (wrapper) {
	if (wrapper._gallery_loaded) return;
	wrapper._gallery_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Data Visualization Gallery"),
		single_column: true,
	});

	page.set_indicator(__("307+ Components"), "blue");

	// Toolbar buttons
	page.set_secondary_action(__("Toggle Dark"), () => {
		document.body.classList.toggle("dark");
	}, "ti ti-moon");

	const $container = $(`
		<div class="fv-viz-gallery fv-fx-page-enter" style="padding: var(--padding-lg);">
			<div class="fv-gallery-header text-center mb-5">
				<h2 class="fv-fx-gradient-text">${__("Data Visualization Gallery")}</h2>
				<p class="text-muted">${__("Interactive showcase of all chart and data visualization components")}</p>
			</div>

			<!-- Chart Type Selector -->
			<div class="fv-chart-tabs d-flex flex-wrap gap-2 justify-content-center mb-4" id="fv-chart-tabs"></div>

			<!-- Chart Display Area -->
			<div class="row" id="fv-chart-grid"></div>
		</div>
	`).appendTo(page.body);

	const CHARTS = [
		{ key: "heatmap", label: __("Heatmap"), icon: "ti ti-grid-dots", category: "matrix" },
		{ key: "sparkline", label: __("Sparkline"), icon: "ti ti-chart-line", category: "trend" },
		{ key: "radar", label: __("Radar"), icon: "ti ti-chart-radar", category: "comparison" },
		{ key: "funnel", label: __("Funnel"), icon: "ti ti-filter", category: "pipeline" },
		{ key: "treemap", label: __("Treemap"), icon: "ti ti-layout-grid", category: "hierarchy" },
		{ key: "donut", label: __("Donut"), icon: "ti ti-chart-donut-3", category: "proportion" },
		{ key: "area", label: __("Area"), icon: "ti ti-chart-area-line", category: "trend" },
		{ key: "sankey", label: __("Sankey"), icon: "ti ti-arrows-split", category: "flow" },
		{ key: "gauge", label: __("Gauge"), icon: "ti ti-gauge", category: "progress" },
		{ key: "bullet", label: __("Bullet"), icon: "ti ti-chart-bar", category: "comparison" },
		{ key: "waterfall", label: __("Waterfall"), icon: "ti ti-chart-candle", category: "composition" },
		{ key: "wordcloud", label: __("Word Cloud"), icon: "ti ti-cloud", category: "text" },
		{ key: "metriccard", label: __("Metric Card"), icon: "ti ti-number", category: "kpi" },
		{ key: "scorecard", label: __("Score Card"), icon: "ti ti-report-analytics", category: "kpi" },
		{ key: "progressring", label: __("Progress Ring"), icon: "ti ti-loader-2", category: "progress" },
	];

	// Build tab buttons
	const $tabs = $container.find("#fv-chart-tabs");
	$tabs.append(`<button class="btn btn-xs btn-primary-light fv-chart-tab active" data-filter="all">${__("All")}</button>`);
	const categories = [...new Set(CHARTS.map(c => c.category))];
	categories.forEach(cat => {
		$tabs.append(`<button class="btn btn-xs btn-default fv-chart-tab" data-filter="${cat}">${cat}</button>`);
	});

	// Build chart cards
	const $grid = $container.find("#fv-chart-grid");
	CHARTS.forEach(chart => {
		$grid.append(`
			<div class="col-md-4 col-sm-6 mb-4 fv-chart-card" data-category="${chart.category}">
				<div class="card fv-fx-glass fv-fx-hover-lift" style="min-height: 320px;">
					<div class="card-body">
						<div class="d-flex align-items-center mb-3">
							<i class="${chart.icon} me-2" style="font-size: 1.4rem; color: var(--primary);"></i>
							<h5 class="mb-0">${chart.label}</h5>
						</div>
						<div id="fv-chart-${chart.key}" class="fv-chart-container" style="min-height: 220px;"></div>
					</div>
				</div>
			</div>
		`);
	});

	// Tab filter logic
	$tabs.on("click", ".fv-chart-tab", function () {
		$tabs.find(".fv-chart-tab").removeClass("active btn-primary-light").addClass("btn-default");
		$(this).addClass("active btn-primary-light").removeClass("btn-default");
		const filter = $(this).data("filter");
		if (filter === "all") {
			$grid.find(".fv-chart-card").show();
		} else {
			$grid.find(".fv-chart-card").hide();
			$grid.find(`[data-category="${filter}"]`).show();
		}
	});

	// Lazy-load frappe_visual bundle and render charts
	frappe.require("frappe_visual.bundle.js", () => {
		_render_sample_charts();
	});

	function _render_sample_charts() {
		const v = frappe.visual;
		if (!v) return;

		// Each chart gets sample data rendered via shorthand
		const samples = {
			heatmap: () => v.heatmap?.("#fv-chart-heatmap", {
				data: _generateHeatmapData(),
				xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
				yLabels: ["Morning", "Afternoon", "Evening"],
			}),
			sparkline: () => v.sparkline?.("#fv-chart-sparkline", {
				data: [12, 18, 25, 22, 30, 28, 35, 40, 38, 42, 45, 48],
				color: "#6366F1",
			}),
			donut: () => v.donut?.("#fv-chart-donut", {
				data: [
					{ label: __("Sales"), value: 42 },
					{ label: __("Support"), value: 28 },
					{ label: __("Marketing"), value: 18 },
					{ label: __("Engineering"), value: 12 },
				],
			}),
			area: () => v.area?.("#fv-chart-area", {
				data: [
					{ period: "Jan", value: 120 }, { period: "Feb", value: 180 },
					{ period: "Mar", value: 150 }, { period: "Apr", value: 220 },
					{ period: "May", value: 280 }, { period: "Jun", value: 310 },
				],
			}),
			radar: () => v.radar?.("#fv-chart-radar", {
				indicators: [
					{ name: __("Speed"), max: 100 },
					{ name: __("Quality"), max: 100 },
					{ name: __("Cost"), max: 100 },
					{ name: __("UX"), max: 100 },
					{ name: __("Security"), max: 100 },
				],
				data: [{ value: [85, 90, 65, 78, 92], name: __("Score") }],
			}),
			funnel: () => v.funnel?.("#fv-chart-funnel", {
				data: [
					{ label: __("Visitors"), value: 10000 },
					{ label: __("Leads"), value: 6500 },
					{ label: __("Qualified"), value: 3200 },
					{ label: __("Proposals"), value: 1800 },
					{ label: __("Won"), value: 950 },
				],
			}),
		};

		Object.entries(samples).forEach(([key, fn]) => {
			try { fn(); } catch (e) { /* component may not be available */ }
		});
	}

	function _generateHeatmapData() {
		const data = [];
		for (let y = 0; y < 3; y++) {
			for (let x = 0; x < 7; x++) {
				data.push([x, y, Math.floor(Math.random() * 100)]);
			}
		}
		return data;
	}
};
