// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * Component Browser — Comprehensive Design System Reference
 * ==========================================================
 * Browse all 287+ frappe_visual components with:
 * • Live interactive demos
 * • AI interaction names (how to ask AI to use them)
 * • Usage scenarios
 * • Code examples with copy-to-clipboard
 * • Full API reference (params, methods, events)
 *
 * Route: /desk#component-browser
 */
frappe.pages["component-browser"].on_page_show = function (wrapper) {
	if (wrapper._cb_loaded) return;
	wrapper._cb_loaded = true;

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Component Browser"),
		single_column: true,
	});

	page.set_indicator(__("287+ Components"), "blue");

	page.set_secondary_action(__("Toggle Dark"), () => {
		document.body.classList.toggle("dark");
	}, "ti ti-moon");

	page.add_menu_item(__("Visual Hub"), () => frappe.set_route("visual-hub"));
	page.add_menu_item(__("Playground"), () => frappe.set_route("visual-playground"));

	_initComponentBrowser(page);
};

async function _initComponentBrowser(page) {
	const $body = $(page.body);
	$body.html(`<div class="cb-loading" style="text-align:center;padding:80px 20px">
		<div class="cb-loading-spinner"></div>
		<p style="margin-top:16px;color:var(--text-muted)">${__("Loading component catalog...")}</p>
	</div>`);

	// Fetch catalog from server
	let catalog = [];
	let stats = {};
	try {
		const res = await frappe.xcall(
			"frappe_visual.api.v1.component_catalog.get_component_catalog"
		);
		catalog = res.catalog || [];
		stats = res.stats || {};
	} catch (e) {
		$body.html(`<div style="text-align:center;padding:60px;color:var(--red-500)">
			<i class="ti ti-alert-triangle" style="font-size:48px"></i>
			<p style="margin-top:12px">${__("Failed to load catalog")}: ${frappe.utils.escape_html(e.message || e)}</p>
		</div>`);
		return;
	}

	// Build main layout
	$body.html(`
		<div class="cb-root fv-fx-page-enter">
			<!-- Header -->
			<div class="cb-hero">
				<div class="cb-hero-inner">
					<div class="cb-hero-badge">${__("Design System Reference")}</div>
					<h1 class="cb-hero-title fv-fx-gradient-text">
						${__("Component Browser")}
					</h1>
					<p class="cb-hero-desc">
						${__("Browse {0} components across {1} tiers. Live demos, code examples, and full API reference.", [
							`<strong>${stats.total_components || 80}</strong>`,
							`<strong>${stats.total_tiers || 10}</strong>`
						])}
					</p>
					<div class="cb-hero-search">
						<i class="ti ti-search cb-hero-search-icon"></i>
						<input type="text" class="cb-search-input"
							placeholder="${__("Search components... (e.g. kanban, heatmap, calendar)")}" />
						<kbd class="cb-hero-search-kbd">⌘K</kbd>
					</div>
					<div class="cb-hero-stats">
						<div class="cb-stat"><span class="cb-stat-num">${stats.total_shorthands || 287}</span><span class="cb-stat-label">${__("Shorthands")}</span></div>
						<div class="cb-stat"><span class="cb-stat-num">${stats.total_tiers || 10}</span><span class="cb-stat-label">${__("Tiers")}</span></div>
						<div class="cb-stat"><span class="cb-stat-num">13</span><span class="cb-stat-label">${__("Demo Pages")}</span></div>
					</div>
				</div>
			</div>

			<!-- Main Content -->
			<div class="cb-layout">
				<!-- Sidebar -->
				<aside class="cb-sidebar" id="cb-sidebar">
					<div class="cb-sidebar-header">
						<span class="cb-sidebar-title">${__("Components")}</span>
						<button class="cb-sidebar-collapse-btn" title="${__("Collapse")}">
							<i class="ti ti-layout-sidebar-left-collapse"></i>
						</button>
					</div>
					<div class="cb-sidebar-tiers" id="cb-sidebar-tiers"></div>
				</aside>

				<!-- Detail Panel -->
				<main class="cb-main" id="cb-main">
					<div class="cb-welcome" id="cb-welcome">
						<div class="cb-welcome-icon">📚</div>
						<h2>${__("Select a component")}</h2>
						<p>${__("Choose from the sidebar to see its demo, code examples, and API reference.")}</p>
						<div class="cb-tier-grid" id="cb-tier-grid"></div>
					</div>
					<div class="cb-detail" id="cb-detail" style="display:none"></div>
				</main>
			</div>
		</div>
	`);

	// Build sidebar
	const $sidebar = $body.find("#cb-sidebar-tiers");
	const $tierGrid = $body.find("#cb-tier-grid");

	catalog.forEach(tier => {
		// Sidebar tier group
		const $tierGroup = $(`
			<div class="cb-tier-group" data-tier="${tier.tier}">
				<div class="cb-tier-header">
					<span class="cb-tier-badge">T${tier.tier}</span>
					<span class="cb-tier-name">${__(tier.category)}</span>
					<span class="cb-tier-count">${tier.components.length}</span>
					<i class="ti ti-chevron-down cb-tier-chevron"></i>
				</div>
				<div class="cb-tier-items"></div>
			</div>
		`);

		const $items = $tierGroup.find(".cb-tier-items");
		tier.components.forEach(comp => {
			$items.append(`
				<div class="cb-comp-item" data-id="${comp.id}" data-tier="${tier.tier}" data-name="${comp.name.toLowerCase()}">
					<i class="${comp.icon} cb-comp-icon"></i>
					<span class="cb-comp-name">${__(comp.name)}</span>
				</div>
			`);
		});

		$sidebar.append($tierGroup);

		// Welcome tier card
		$tierGrid.append(`
			<div class="cb-tier-card fv-fx-glass fv-fx-hover-lift" data-tier="${tier.tier}">
				<div class="cb-tier-card-badge">Tier ${tier.tier}</div>
				<h4>${__(tier.category)}</h4>
				<p>${tier.components.length} ${__("components")}</p>
			</div>
		`);
	});

	// ── Event Handlers ───────────────────────────────────────────

	// Tier header toggle
	$sidebar.on("click", ".cb-tier-header", function () {
		const $group = $(this).closest(".cb-tier-group");
		$group.toggleClass("cb-collapsed");
	});

	// Component item click
	$sidebar.on("click", ".cb-comp-item", function () {
		const id = $(this).data("id");
		const tierNum = $(this).data("tier");
		$body.find(".cb-comp-item").removeClass("active");
		$(this).addClass("active");
		_renderDetail(id, tierNum, catalog, $body);
	});

	// Welcome tier card click → expand that tier and select first component
	$tierGrid.on("click", ".cb-tier-card", function () {
		const tierNum = $(this).data("tier");
		const $group = $sidebar.find(`.cb-tier-group[data-tier="${tierNum}"]`);
		$sidebar.find(".cb-tier-group").addClass("cb-collapsed");
		$group.removeClass("cb-collapsed");
		$group.find(".cb-comp-item").first().trigger("click");
		// Scroll sidebar to the tier
		$group[0]?.scrollIntoView({ behavior: "smooth", block: "start" });
	});

	// Search
	$body.find(".cb-search-input").on("input", function () {
		const q = $(this).val().toLowerCase().trim();
		if (!q) {
			$sidebar.find(".cb-comp-item").show();
			$sidebar.find(".cb-tier-group").show().removeClass("cb-collapsed");
			return;
		}
		$sidebar.find(".cb-tier-group").each(function () {
			const $group = $(this);
			let hasVisible = false;
			$group.find(".cb-comp-item").each(function () {
				const name = $(this).data("name") || "";
				const match = name.includes(q);
				$(this).toggle(match);
				if (match) hasVisible = true;
			});
			$group.toggle(hasVisible);
			if (hasVisible) $group.removeClass("cb-collapsed");
		});
	});

	// ⌘K shortcut
	$(document).on("keydown.cb", function (e) {
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault();
			$body.find(".cb-search-input").focus().select();
		}
	});

	// Sidebar collapse toggle
	$body.find(".cb-sidebar-collapse-btn").on("click", function () {
		$body.find(".cb-root").toggleClass("cb-sidebar-hidden");
	});
}


/**
 * Render the full detail panel for a selected component.
 */
function _renderDetail(compId, tierNum, catalog, $body) {
	const tier = catalog.find(t => t.tier === tierNum);
	if (!tier) return;
	const comp = tier.components.find(c => c.id === compId);
	if (!comp) return;

	$body.find("#cb-welcome").hide();
	const $detail = $body.find("#cb-detail").show().empty();

	const escapedCode = _escapeHtml(comp.code || "");
	const scenariosHtml = (comp.scenarios || []).map(s =>
		`<li><i class="ti ti-check" style="color:var(--green-500);margin-inline-end:6px"></i>${__(s)}</li>`
	).join("");

	// API reference tables
	const api = comp.api || {};
	const paramsHtml = _buildApiTable(api.params || [], ["name", "type", "desc", "default"], [__("Parameter"), __("Type"), __("Description"), __("Default")]);
	const methodsHtml = _buildApiTable(api.methods || [], ["name", "desc"], [__("Method"), __("Description")]);
	const eventsHtml = _buildApiTable(api.events || [], ["name", "desc"], [__("Event"), __("Description")]);

	$detail.html(`
		<div class="cb-detail-scroll">
			<!-- Component Header -->
			<div class="cb-detail-header fv-fx-glass">
				<div class="cb-detail-icon-wrap">
					<i class="${comp.icon}" style="font-size:32px;color:var(--primary)"></i>
				</div>
				<div class="cb-detail-meta">
					<div class="cb-detail-tier-badge">Tier ${tierNum} — ${__(tier.category)}</div>
					<h2 class="cb-detail-name">${__(comp.name)}</h2>
					<p class="cb-detail-desc">${__(comp.description)}</p>
					${comp.description_ar ? `<p class="cb-detail-desc-ar" dir="rtl">${comp.description_ar}</p>` : ""}
				</div>
			</div>

			<!-- AI Name -->
			<div class="cb-section">
				<h3 class="cb-section-title">
					<i class="ti ti-robot"></i> ${__("AI Interaction Name")}
				</h3>
				<div class="cb-ai-name-card fv-fx-glass">
					<code class="cb-ai-name-code">${_escapeHtml(comp.ai_name)}</code>
					<button class="btn btn-xs btn-default cb-copy-btn" data-copy="${_escapeHtml(comp.ai_name)}">
						<i class="ti ti-copy"></i> ${__("Copy")}
					</button>
				</div>
				<p class="cb-ai-hint">${__("Use this exact name when asking AI to add this component to your page.")}</p>
			</div>

			<!-- Usage Scenarios -->
			${scenariosHtml ? `
			<div class="cb-section">
				<h3 class="cb-section-title">
					<i class="ti ti-bulb"></i> ${__("Usage Scenarios")}
				</h3>
				<ul class="cb-scenarios">${scenariosHtml}</ul>
			</div>` : ""}

			<!-- Live Demo -->
			<div class="cb-section">
				<h3 class="cb-section-title">
					<i class="ti ti-player-play"></i> ${__("Live Demo")}
				</h3>
				<div class="cb-demo-container fv-fx-glass" id="cb-demo-${compId}">
					<div class="cb-demo-area" id="cb-demo-area-${compId}" style="min-height:250px"></div>
				</div>
			</div>

			<!-- Code Example -->
			<div class="cb-section">
				<h3 class="cb-section-title">
					<i class="ti ti-code"></i> ${__("Code Example")}
				</h3>
				<div class="cb-code-block">
					<div class="cb-code-header">
						<span>JavaScript</span>
						<button class="btn btn-xs btn-default cb-copy-btn" data-copy="${_escapeAttr(comp.code || "")}">
							<i class="ti ti-copy"></i> ${__("Copy")}
						</button>
					</div>
					<pre class="cb-code-pre"><code>${escapedCode}</code></pre>
				</div>
			</div>

			<!-- API Reference -->
			<div class="cb-section">
				<h3 class="cb-section-title">
					<i class="ti ti-book"></i> ${__("API Reference")}
				</h3>

				${paramsHtml ? `
				<div class="cb-api-group">
					<h4 class="cb-api-group-title">${__("Parameters")}</h4>
					${paramsHtml}
				</div>` : ""}

				${methodsHtml ? `
				<div class="cb-api-group">
					<h4 class="cb-api-group-title">${__("Methods")}</h4>
					${methodsHtml}
				</div>` : ""}

				${eventsHtml ? `
				<div class="cb-api-group">
					<h4 class="cb-api-group-title">${__("Events")}</h4>
					${eventsHtml}
				</div>` : ""}

				${!paramsHtml && !methodsHtml && !eventsHtml ? `
				<p class="text-muted">${__("No additional API documentation for this component.")}</p>` : ""}
			</div>
		</div>
	`);

	// Copy buttons
	$detail.on("click", ".cb-copy-btn", function () {
		const text = $(this).data("copy");
		if (text) {
			frappe.utils.copy_to_clipboard(text);
			frappe.show_alert({ message: __("Copied!"), indicator: "green" }, 2);
		}
	});

	// Render live demo
	_renderLiveDemo(compId, comp, $body);
}


/**
 * Render a live interactive demo for the component.
 */
function _renderLiveDemo(compId, comp, $body) {
	const $area = $body.find(`#cb-demo-area-${compId}`);
	if (!$area.length) return;

	frappe.require("frappe_visual.bundle.js", () => {
		const v = frappe.visual;
		if (!v) {
			$area.html(`<p class="text-muted text-center" style="padding:40px">${__("Visual bundle not loaded")}</p>`);
			return;
		}

		try {
			// Use demo_config if available, otherwise generate from component type
			const demoRenderers = _getDemoRenderers(v);
			if (demoRenderers[compId]) {
				demoRenderers[compId]($area[0], $area);
			} else if (comp.demo_config && typeof v[compId] === "function") {
				v[compId]($area[0], comp.demo_config);
			} else if (typeof v[compId] === "function") {
				// Try to render with empty opts — some components self-demo
				$area.html(`
					<div class="cb-demo-placeholder">
						<div style="font-size:40px;margin-bottom:12px">${comp.icon ? `<i class="${comp.icon}"></i>` : "📦"}</div>
						<p><strong>${__(comp.name)}</strong></p>
						<p class="text-muted" style="font-size:13px">
							${__("Use the code example below to integrate this component.")}
						</p>
						<code style="font-size:12px;color:var(--primary)">${_escapeHtml(comp.ai_name)}</code>
					</div>
				`);
			} else {
				$area.html(`
					<div class="cb-demo-placeholder">
						<div style="font-size:40px;margin-bottom:12px">📦</div>
						<p>${__(comp.name)}</p>
						<code style="font-size:12px">${_escapeHtml(comp.ai_name)}</code>
					</div>
				`);
			}
		} catch (err) {
			$area.html(`
				<div class="cb-demo-error">
					<i class="ti ti-alert-triangle" style="font-size:32px;color:var(--red-500)"></i>
					<p>${__("Demo error")}: ${_escapeHtml(err.message)}</p>
				</div>
			`);
		}
	});
}


/**
 * Live demo renderers for specific components that need custom setup.
 */
function _getDemoRenderers(v) {
	return {
		// ── Data Viz ──
		heatmap: (el) => v.heatmap?.(el, {
			data: Array.from({ length: 60 }, (_, i) => ({
				date: frappe.datetime.add_days(frappe.datetime.now_date(), -60 + i),
				value: Math.floor(Math.random() * 20),
			})),
			colorScale: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
		}),
		sparkline: (el) => v.sparkline?.(el, {
			data: Array.from({ length: 20 }, () => Math.floor(Math.random() * 100)),
			color: "#6366f1", height: 80,
		}),
		donutChart: (el) => v.donutChart?.(el, {
			data: [
				{ label: __("Active"), value: 45 },
				{ label: __("Pending"), value: 25 },
				{ label: __("Completed"), value: 30 },
			],
		}),
		areaChart: (el) => v.areaChart?.(el, {
			labels: [__("Jan"), __("Feb"), __("Mar"), __("Apr"), __("May"), __("Jun")],
			datasets: [{ label: __("Revenue"), data: [40, 55, 45, 70, 65, 80] }],
		}),
		radarChart: (el) => v.radarChart?.(el, {
			labels: [__("Speed"), __("Quality"), __("Cost"), __("Support"), __("Features")],
			datasets: [
				{ label: __("Product A"), data: [80, 90, 60, 70, 85] },
				{ label: __("Product B"), data: [70, 65, 80, 90, 75] },
			],
		}),
		funnelChart: (el) => v.funnelChart?.(el, {
			data: [
				{ label: __("Visits"), value: 5000 },
				{ label: __("Leads"), value: 2500 },
				{ label: __("Opportunities"), value: 1200 },
				{ label: __("Proposals"), value: 600 },
				{ label: __("Closed"), value: 200 },
			],
		}),
		sankeyChart: (el) => v.sankeyChart?.(el, {
			nodes: [{ name: __("Source A") }, { name: __("Source B") }, { name: __("Process") }, { name: __("Output") }],
			links: [{ source: 0, target: 2, value: 40 }, { source: 1, target: 2, value: 30 }, { source: 2, target: 3, value: 70 }],
		}),
		treemapChart: (el) => v.treemapChart?.(el, {
			data: [
				{ name: __("Sales"), value: 120, children: [{ name: __("Online"), value: 80 }, { name: __("Retail"), value: 40 }] },
				{ name: __("Marketing"), value: 80 },
				{ name: __("Engineering"), value: 160 },
			],
		}),
		gaugeChart: (el) => v.gaugeChart?.(el, { value: 73, min: 0, max: 100 }),
		bulletChart: (el) => v.bulletChart?.(el, {
			data: [{ label: __("Revenue"), actual: 270, target: 250, ranges: [150, 225, 300] }],
		}),
		metricCard: (el) => v.metricCard?.(el, {
			label: __("Revenue"), value: "$125,000", trend: "+12.5%", trendDirection: "up",
			sparklineData: [40, 55, 45, 70, 65, 80, 92],
		}),
		wordCloud: (el) => v.wordCloud?.(el, {
			words: [
				{ text: "Frappe", weight: 100 }, { text: "Visual", weight: 80 },
				{ text: "Components", weight: 60 }, { text: "Design", weight: 50 },
				{ text: "System", weight: 45 }, { text: "Interactive", weight: 40 },
				{ text: "Dashboard", weight: 35 }, { text: "Kanban", weight: 30 },
			],
		}),

		// ── Business Views ──
		kanban: (el) => v.kanban?.(el, {
			columns: [
				{ title: __("Backlog"), status: "backlog", color: "#94a3b8" },
				{ title: __("To Do"), status: "todo", color: "#6366f1" },
				{ title: __("In Progress"), status: "wip", color: "#f59e0b" },
				{ title: __("Done"), status: "done", color: "#10b981" },
			],
			cards: [
				{ title: __("Design system audit"), status: "backlog" },
				{ title: __("API documentation"), status: "todo" },
				{ title: __("Build pipeline"), status: "wip" },
				{ title: __("v1 Release"), status: "done" },
			],
		}),
		calendar: (el) => v.calendar?.(el, {
			events: [
				{ title: __("Meeting"), start: frappe.datetime.now_datetime(), allDay: false },
				{ title: __("Deadline"), start: frappe.datetime.add_days(frappe.datetime.now_date(), 2), allDay: true },
				{ title: __("Review"), start: frappe.datetime.add_days(frappe.datetime.now_date(), 5), allDay: true },
			],
		}),
		gantt: (el) => v.gantt?.(el, {
			tasks: [
				{ name: __("Phase 1"), start: "2024-01-01", end: "2024-02-15", progress: 100 },
				{ name: __("Phase 2"), start: "2024-02-01", end: "2024-04-30", progress: 60 },
				{ name: __("Phase 3"), start: "2024-04-01", end: "2024-06-30", progress: 20 },
			],
		}),
		tree: (el) => v.tree?.(el, {
			data: {
				label: __("Company"), children: [
					{ label: __("Sales"), children: [{ label: __("Online") }, { label: __("Retail") }] },
					{ label: __("Engineering"), children: [{ label: __("Frontend") }, { label: __("Backend") }] },
					{ label: __("HR"), children: [{ label: __("Recruitment") }] },
				],
			},
			searchable: true,
		}),

		// ── Layout ──
		masonry: (el) => v.masonry?.(el, {
			columns: 3,
			items: Array.from({ length: 6 }, (_, i) => ({
				html: `<div class="fv-fx-glass" style="padding:20px;border-radius:10px;min-height:${80 + Math.random() * 100}px">
					<strong>${__("Card {0}", [i + 1])}</strong>
					<p style="color:var(--text-muted);font-size:12px;margin:4px 0 0">${__("Sample masonry item")}</p>
				</div>`,
			})),
		}),
		bento: (el) => v.bento?.(el, {
			columns: 4,
			items: [
				{ colSpan: 2, rowSpan: 2, html: `<div class="fv-fx-glass" style="padding:24px;height:100%"><h3>${__("Featured")}</h3><p style="color:var(--text-muted)">${__("Highlight card")}</p></div>` },
				{ colSpan: 1, rowSpan: 1, html: `<div class="fv-fx-glass" style="padding:16px;height:100%">${__("Metric A")}</div>` },
				{ colSpan: 1, rowSpan: 1, html: `<div class="fv-fx-glass" style="padding:16px;height:100%">${__("Metric B")}</div>` },
				{ colSpan: 2, rowSpan: 1, html: `<div class="fv-fx-glass" style="padding:16px;height:100%">${__("Wide card")}</div>` },
			],
		}),
		sortable: (el) => v.sortable?.(el, {
			items: [__("Task 1"), __("Task 2"), __("Task 3"), __("Task 4"), __("Task 5")],
		}),

		// ── Navigation (special interactive) ──
		commandBar: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<p>${__("Press")} <kbd>⌘</kbd> + <kbd>K</kbd> ${__("to open the Command Bar")}</p>
				<button class="btn btn-primary btn-sm cb-demo-action">${__("Open Command Bar")}</button>
			</div>`);
			$el.find(".cb-demo-action").on("click", () => v.commandBar?.open?.());
		},
		bottomSheet: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<button class="btn btn-primary btn-sm cb-demo-action">${__("Open Bottom Sheet")}</button>
			</div>`);
			$el.find(".cb-demo-action").on("click", () => {
				v.bottomSheet?.({ title: __("Sample Sheet"), content: `<p style="padding:20px">${__("Bottom sheet content from frappe_visual")}</p>` });
			});
		},
		speedDial: (el) => v.speedDial?.(el, {
			actions: [
				{ label: __("Action 1"), icon: "plus", onClick: () => frappe.show_alert(__("Action 1 triggered")) },
				{ label: __("Action 2"), icon: "edit", onClick: () => frappe.show_alert(__("Action 2 triggered")) },
			],
		}),

		// ── Animations ──
		typewriter: (el) => v.typewriter?.(el, {
			strings: [__("Building the future..."), __("One component at a time..."), "frappe.visual ✨"],
			speed: 80, loop: true,
		}),
		confetti: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<button class="btn btn-primary btn-sm cb-demo-action">🎉 ${__("Launch Confetti")}</button>
			</div>`);
			$el.find(".cb-demo-action").on("click", () => v.confetti?.({ particleCount: 150, spread: 70 }));
		},
		numberTicker: (el) => v.numberTicker?.(el, {
			from: 0, to: 12847, duration: 2000, prefix: "$",
		}),
		morphingText: (el) => v.morphingText?.(el, {
			texts: [__("Hello"), "مرحبا", "Merhaba", "Bonjour", "Hola"],
			interval: 2000,
		}),
		glowCard: (el) => v.glowCard?.(el, {
			color: "#6366f1", intensity: 0.5,
			content: `<div style="padding:32px;text-align:center"><h3 style="margin:0">${__("Premium Feature")}</h3><p style="color:var(--text-muted);margin:8px 0 0">${__("Hover to see the glow effect")}</p></div>`,
		}),
		ripple: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<button class="btn btn-primary btn-lg cb-demo-ripple" style="min-width:200px">${__("Click me for ripple!")}</button>
			</div>`);
			v.ripple?.($el.find(".cb-demo-ripple")[0]);
		},

		// ── Form ──
		tagInput: (el) => v.tagInput?.(el, {
			placeholder: __("Add tags..."),
			suggestions: ["JavaScript", "Python", "CSS", "HTML", "Frappe", "ERPNext"],
		}),
		wizard: (el) => v.wizard?.(el, {
			steps: [
				{ title: __("Details"), content: `<div style="padding:20px"><p>${__("Step 1: Enter basic details")}</p></div>` },
				{ title: __("Configuration"), content: `<div style="padding:20px"><p>${__("Step 2: Configure settings")}</p></div>` },
				{ title: __("Review"), content: `<div style="padding:20px"><p>${__("Step 3: Review and confirm")}</p></div>` },
			],
		}),

		// ── Feedback ──
		toast: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
					<button class="btn btn-success btn-sm cb-demo-toast" data-type="success">${__("Success")}</button>
					<button class="btn btn-danger btn-sm cb-demo-toast" data-type="error">${__("Error")}</button>
					<button class="btn btn-warning btn-sm cb-demo-toast" data-type="warning">${__("Warning")}</button>
					<button class="btn btn-info btn-sm cb-demo-toast" data-type="info">${__("Info")}</button>
				</div>
			</div>`);
			$el.on("click", ".cb-demo-toast", function () {
				const type = $(this).data("type");
				v.toast?.({ message: __("{0} toast message", [type]), type, duration: 3000 });
			});
		},
		confirmDialog: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<button class="btn btn-danger btn-sm cb-demo-action">${__("Show Confirm Dialog")}</button>
			</div>`);
			$el.find(".cb-demo-action").on("click", () => {
				v.confirmDialog?.({ title: __("Delete Record?"), message: __("This action cannot be undone."), destructive: true });
			});
		},
		drawer: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<button class="btn btn-primary btn-sm cb-demo-action">${__("Open Drawer")}</button>
			</div>`);
			$el.find(".cb-demo-action").on("click", () => {
				v.drawer?.({ title: __("Detail Panel"), content: `<div style="padding:20px"><p>${__("Drawer content goes here")}</p></div>`, side: "right" });
			});
		},
		onboardingTour: (el, $el) => {
			$el.html(`<div class="cb-demo-placeholder">
				<button class="btn btn-primary btn-sm cb-demo-action">${__("Start Demo Tour")}</button>
			</div>`);
			$el.find(".cb-demo-action").on("click", () => {
				v.onboardingTour?.({
					steps: [
						{ target: ".cb-hero", title: __("Header"), content: __("This is the component browser header") },
						{ target: ".cb-sidebar", title: __("Sidebar"), content: __("Browse components by tier") },
					],
				});
			});
		},
	};
}


// ── Utility Functions ────────────────────────────────────────────

function _buildApiTable(items, fields, headers) {
	if (!items || !items.length) return "";
	const ths = headers.map(h => `<th>${h}</th>`).join("");
	const rows = items.map(item => {
		const tds = fields.map(f => {
			let val = item[f] || "";
			if (f === "name") val = `<code>${_escapeHtml(val)}</code>`;
			if (f === "type") val = `<code class="cb-type">${_escapeHtml(val)}</code>`;
			if (f === "default") val = val ? `<code>${_escapeHtml(val)}</code>` : "—";
			return `<td>${val}</td>`;
		}).join("");
		return `<tr>${tds}</tr>`;
	}).join("");
	return `<div class="cb-api-table-wrap"><table class="cb-api-table"><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function _escapeHtml(str) {
	if (!str) return "";
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function _escapeAttr(str) {
	if (!str) return "";
	return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
