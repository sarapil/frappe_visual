// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Visual Hub — Main dashboard page for Frappe Visual framework.
 * Entry point: Component catalog, KPI cards, quick-link grid to all pages,
 * App Map explorer, and recent visual assets.
 */

frappe.pages["visual-hub"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Visual Hub"),
		single_column: true,
	});

	page.set_title_sub(__("307+ Visual Components — Interactive Application Explorer"));

	// ─── Custom action buttons ───
	page.set_primary_action(__("Onboarding"), () => {
		frappe.set_route("frappe-visual-onboarding");
	}, "ti ti-rocket");

	page.set_secondary_action(__("Settings"), () => {
		frappe.set_route("Form", "Frappe Visual Settings");
	});

	page.add_menu_item(__("Export Stats as CSV"), () => {
		if (frappe.visual.exportData) {
			frappe.xcall("frappe_visual.api.get_quick_stats").then(stats => {
				const rows = [["Metric", "Value"]];
				for (const [k, v] of Object.entries(stats || {})) rows.push([k, v]);
				frappe.visual.exportData.toCSV(rows, "frappe_visual_stats");
			});
		}
	}, false, "ti ti-download");

	// ─── Skeleton loader while content builds ───
	if (frappe.visual.skeleton) {
		frappe.visual.skeleton.show(page.main[0], { type: "card", rows: 1, cols: 4 });
	} else {
		page.main.html(`
			<div class="fv-hub-skeleton" style="padding:20px">
				<div class="row">
					${[1,2,3,4].map(() => `
						<div class="col-md-3 col-sm-6 mb-3">
							<div style="background:var(--subtle-fg);border-radius:var(--border-radius-lg);height:100px;animation:pulse 1.5s infinite"></div>
						</div>
					`).join('')}
				</div>
			</div>
			<style>@keyframes pulse{0%,100%{opacity:.6}50%{opacity:.3}}</style>
		`);
	}

	// Set up accessibility
	if (frappe.visual.a11y) {
		frappe.visual.a11y.skipLink("fv-hub-main");
	}

	// Build the full dashboard
	setTimeout(() => buildHub(page), 100);
};

async function buildHub(page) {
	// ─── Fetch data in parallel ───
	const [statsRes, appsRes] = await Promise.all([
		frappe.xcall("frappe_visual.api.get_quick_stats").catch(() => null),
		frappe.xcall("frappe.client.get_list", {
			doctype: "Module Def",
			fields: ["distinct app_name as name"],
			limit_page_length: 0,
		}).catch(() => []),
	]);

	const stats = statsRes || {};
	const apps = (appsRes || []).map(a => a.name).filter(Boolean);

	// ─── Render full page ───
	page.main.html("");

	const $main = $(page.main);
	$main.append(`<div id="fv-hub-main" class="fv-hub-wrapper" style="padding:0 10px" role="main" aria-label="${__("Visual Hub Dashboard")}"><div id="fv-hub-presence" style="position:sticky;top:0;z-index:10;padding:4px 0;text-align:end"></div></div>`);

	// Show who else is viewing this page
	if (frappe.visual.realtime) {
		frappe.visual.realtime.showPresence("#fv-hub-presence", "visual-hub");
	}
	const $w = $main.find(".fv-hub-wrapper");

	// ═══ Section 1: KPI Cards ═══
	const kpis = [
		{ icon: "ti ti-components",   label: __("Components"),  value: "307+",                        color: "#6366F1" },
		{ icon: "ti ti-layout-grid",  label: __("Pages"),       value: "13",                          color: "#22C55E" },
		{ icon: "ti ti-database",     label: __("DocTypes"),    value: stats.total_doctypes || "5",   color: "#F59E0B" },
		{ icon: "ti ti-chart-bar",    label: __("Visual Assets"), value: stats.total_records || "—",  color: "#EF4444" },
	];

	$w.append(`
		<section class="fv-hub-kpis mb-4" aria-label="${__("Statistics")}">
			<div class="row">${kpis.map(k => `
				<div class="col-lg-3 col-sm-6 mb-3">
					<div class="fv-fx-glass fv-fx-hover-lift" role="status"
						 style="padding:20px;border-radius:var(--border-radius-lg);border-inline-start:4px solid ${k.color};cursor:default">
						<div class="d-flex align-items-center gap-3">
							<span class="${k.icon}" style="font-size:28px;color:${k.color}" aria-hidden="true"></span>
							<div>
								<div style="font-size:24px;font-weight:700;color:var(--text-color)">${k.value}</div>
								<div class="text-muted" style="font-size:13px">${k.label}</div>
							</div>
						</div>
					</div>
				</div>
			`).join('')}</div>
		</section>
	`);

	// ═══ Section 2: Quick Links Grid ═══
	const pages = [
		{ route: "component-browser",             icon: "ti ti-book-2",             label: __("Component Browser"), desc: __("Full API & demo reference") },
		{ route: "visual-playground",            icon: "ti ti-code",               label: __("Playground"),        desc: __("Test any component live") },
		{ route: "visual-templates-demo",        icon: "ti ti-template",           label: __("Templates"),         desc: __("8 page templates") },
		{ route: "data-viz-gallery",             icon: "ti ti-chart-dots-3",       label: __("Data Viz"),          desc: __("15 chart types") },
		{ route: "icon-explorer",                icon: "ti ti-icons",              label: __("Icons"),             desc: __("5,000+ Tabler icons") },
		{ route: "scene-engine-showcase",        icon: "ti ti-3d-cube-sphere",     label: __("Scene Engine"),      desc: __("Immersive SVG rooms") },
		{ route: "layout-showcase",              icon: "ti ti-layout-distribute-vertical", label: __("Layouts"),   desc: __("9 layout engines") },
		{ route: "animation-demo",               icon: "ti ti-sparkles",           label: __("Animations"),        desc: __("GSAP micro-animations") },
		{ route: "navigation-demo",              icon: "ti ti-navigation",         label: __("Navigation"),        desc: __("9 nav components") },
		{ route: "form-components-showcase",      icon: "ti ti-forms",             label: __("Form Controls"),     desc: __("30+ form widgets") },
		{ route: "visual-whiteboard",            icon: "ti ti-pencil",             label: __("Whiteboard"),        desc: __("SVG drawing canvas") },
		{ route: "workflow-designer",            icon: "ti ti-git-branch",         label: __("Workflow"),          desc: __("Visual flow builder") },
		{ route: "frappe-visual-onboarding",     icon: "ti ti-rocket",             label: __("Onboarding"),        desc: __("16-step walkthrough") },
	];

	$w.append(`
		<section class="fv-hub-pages mb-4" aria-label="${__("Pages")}">
			<h5 class="mb-3" style="font-weight:600"><span class="ti ti-apps" aria-hidden="true"></span> ${__("Visual Pages")}</h5>
			<div class="row">${pages.map(p => `
				<div class="col-lg-3 col-md-4 col-sm-6 mb-3">
					<a href="/app/${p.route}" class="fv-hub-page-card fv-fx-hover-lift fv-fx-glass text-decoration-none d-block"
					   style="padding:16px;border-radius:var(--border-radius-lg);color:var(--text-color)"
					   role="link" aria-label="${p.label}: ${p.desc}">
						<div class="d-flex align-items-center gap-2 mb-1">
							<span class="${p.icon}" style="font-size:20px;color:#6366F1" aria-hidden="true"></span>
							<strong style="font-size:14px">${p.label}</strong>
						</div>
						<div class="text-muted" style="font-size:12px">${p.desc}</div>
					</a>
				</div>
			`).join('')}</div>
		</section>
	`);

	// ═══ Section 3: Component Catalog (10 Tiers) ═══
	const tiers = [
		{ tier: 1, name: __("Core Engine"),       count: 6,   icon: "ti ti-engine",         components: "GraphEngine, LayoutManager, FloatingWindow, ContextMenu, Minimap, ThemeManager" },
		{ tier: 2, name: __("Business Views"),     count: 11,  icon: "ti ti-chart-treemap",  components: "AppMap, RelationshipExplorer, Storyboard, VisualDashboard, KanbanBoard, VisualCalendar, VisualGantt, TreeView, VisualMap, Gallery, FormDashboard" },
		{ tier: 3, name: __("Data Viz"),           count: 9,   icon: "ti ti-chart-bar",      components: "Heatmap, Sparkline, Radar, Funnel, Treemap, Donut, DataCard, Area, Sankey" },
		{ tier: 4, name: __("Layout Engines"),     count: 9,   icon: "ti ti-layout-grid",    components: "Masonry, Dock, GridStack, Bento, InfiniteScroll, Sortable, VirtualList, StackedLayout, Resizable" },
		{ tier: 5, name: __("Navigation"),         count: 9,   icon: "ti ti-compass",        components: "CommandBar, FloatingNav, PageTransition, BackToTop, NavRail, AnchorNav, TabBar, BottomNav, SpeedDial" },
		{ tier: 6, name: __("Feedback & Overlay"), count: 9,   icon: "ti ti-message-circle", components: "BottomSheet, Lightbox, ImageCompare, Popconfirm, CookieBanner, OnboardingTour, ContextPanel, PinchZoom, NotificationStack" },
		{ tier: 7, name: __("Productivity"),       count: 9,   icon: "ti ti-bolt",           components: "ShortcutManager, ClipboardManager, UndoRedo, FocusTrap, HotkeyHint, GlobalSearch, QuickAction, BulkActions, MultiSelectBar" },
		{ tier: 8, name: __("Scene Engine"),       count: 18,  icon: "ti ti-3d-cube-sphere", components: "SceneEngine, SceneRoom, SceneFrame, SceneDesk, SceneDocument, SceneShelf, SceneBoard, SceneWidget, SceneLighting, 5 Presets, DataBinder, Refresher, Navigator, Exporter" },
		{ tier: 9, name: __("Micro-Animation"),    count: 9,   icon: "ti ti-sparkles",       components: "Typewriter, Parallax, Confetti, Ripple, TextLoop, NumberTicker, GlowCard, MorphingText, DotPattern" },
		{ tier: 10, name: __("Form Enhancement"),  count: "60+", icon: "ti ti-forms",        components: "Waves 23-31: Advanced inputs, data tables, file managers, rich text, workflow builders, industry widgets" },
	];

	let tierCollapsed = true;
	$w.append(`
		<section class="fv-hub-catalog mb-4" aria-label="${__("Component Catalog")}">
			<div class="d-flex justify-content-between align-items-center mb-3">
				<h5 style="font-weight:600;margin:0"><span class="ti ti-puzzle" aria-hidden="true"></span> ${__("Component Catalog")} — 307+ ${__("Components")}</h5>
				<button class="btn btn-xs btn-default fv-tier-toggle" aria-expanded="false" aria-controls="fv-tier-grid">${__("Show All")}</button>
			</div>
			<div id="fv-tier-grid" class="row" style="max-height:0;overflow:hidden;transition:max-height 0.4s ease">
				${tiers.map(t => `
				<div class="col-lg-4 col-md-6 mb-3">
					<div class="fv-fx-glass" style="padding:14px;border-radius:var(--border-radius-lg)">
						<div class="d-flex align-items-center gap-2 mb-2">
							<span class="${t.icon}" style="font-size:18px;color:#6366F1" aria-hidden="true"></span>
							<strong>${__("Tier")} ${t.tier}: ${t.name}</strong>
							<span class="badge bg-light text-dark ms-auto">${t.count}</span>
						</div>
						<div class="text-muted" style="font-size:11px;line-height:1.5">${t.components}</div>
					</div>
				</div>
				`).join('')}
			</div>
		</section>
	`);

	$w.find(".fv-tier-toggle").on("click", function () {
		tierCollapsed = !tierCollapsed;
		const $grid = $w.find("#fv-tier-grid");
		if (tierCollapsed) {
			$grid.css("max-height", "0");
			$(this).text(__("Show All")).attr("aria-expanded", "false");
		} else {
			$grid.css("max-height", "2000px");
			$(this).text(__("Collapse")).attr("aria-expanded", "true");
		}
	});

	// ═══ Section 4: App Map Explorer ═══
	$w.append(`
		<section class="fv-hub-explorer mb-4" aria-label="${__("App Map Explorer")}">
			<h5 class="mb-3" style="font-weight:600"><span class="ti ti-hierarchy-3" aria-hidden="true"></span> ${__("App Map Explorer")}</h5>
			<div class="d-flex align-items-center gap-3 mb-3">
				<select id="fv-hub-app-select" class="form-select form-select-sm" style="max-width:280px"
						aria-label="${__("Select Application")}">
					<option value="">${__("Select an application…")}</option>
					${apps.map(a => `<option value="${a}">${a}</option>`).join('')}
				</select>
				<span class="text-muted" style="font-size:12px">${apps.length} ${__("apps installed")}</span>
			</div>
			<div id="fv-hub-map" style="width:100%;min-height:450px;border-radius:var(--border-radius-lg);background:var(--subtle-fg)"
				 role="img" aria-label="${__("Application relationship map")}">
				<div class="text-center text-muted p-5">
					<span class="ti ti-hierarchy-3" style="font-size:48px;opacity:.3" aria-hidden="true"></span>
					<p class="mt-2">${__("Select an application to visualize its structure")}</p>
				</div>
			</div>
		</section>
	`);

	let currentMap = null;
	$w.find("#fv-hub-app-select").on("change", async function () {
		const appName = $(this).val();
		if (!appName) return;
		if (currentMap && currentMap.destroy) currentMap.destroy();

		const $map = $w.find("#fv-hub-map");
		$map.html(`<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">${__("Loading…")}</span></div></div>`);

		try {
			const engine = await frappe.visual.engine();
			if (engine && engine.AppMap) {
				currentMap = await engine.AppMap.create("#fv-hub-map", appName);
			} else {
				currentMap = await frappe.visual.appMap("#fv-hub-map", { app_name: appName });
			}
		} catch (e) {
			$map.html(`<div class="text-center text-muted p-5"><span class="ti ti-alert-triangle" style="font-size:32px" aria-hidden="true"></span><p>${__("Failed to load map")}: ${e.message || e}</p></div>`);
		}
	});

	// ═══ Section 5: CSS Effects Showcase ═══
	const effects = [
		{ cls: "fv-fx-glass",              label: "Glass" },
		{ cls: "fv-fx-hover-lift",         label: "Hover Lift" },
		{ cls: "fv-fx-hover-shine",        label: "Hover Shine" },
		{ cls: "fv-fx-mouse-glow",         label: "Mouse Glow" },
		{ cls: "fv-fx-gradient-animated",  label: "Gradient" },
		{ cls: "fv-fx-gradient-text",      label: "Gradient Text" },
	];

	$w.append(`
		<section class="fv-hub-effects mb-4" aria-label="${__("CSS Effects")}">
			<h5 class="mb-3" style="font-weight:600"><span class="ti ti-wand" aria-hidden="true"></span> ${__("Premium CSS Effects")}</h5>
			<div class="d-flex flex-wrap gap-3">
				${effects.map(e => `
				<div class="${e.cls}" style="padding:20px 28px;border-radius:var(--border-radius-lg);
					 background:var(--subtle-fg);font-weight:600;font-size:13px;cursor:default"
					 role="presentation">
					.${e.cls.split(' ')[0]}
				</div>
				`).join('')}
			</div>
		</section>
	`);

	// ═══ Section 6: Footer with help link ═══
	$w.append(`
		<div class="text-center text-muted py-4" style="font-size:12px">
			<span class="ti ti-info-circle" aria-hidden="true"></span>
			${__("Frappe Visual")} v0.1.0 — 307+ ${__("components")} · 31 ${__("waves")} · 10 ${__("tiers")}
			· <a href="/app/component-browser">${__("Component Browser")}</a>
			· <a href="/app/frappe-visual-onboarding">${__("Onboarding")}</a>
			· <a href="/frappe-visual-about">${__("About")}</a>
		</div>
	`);
}
