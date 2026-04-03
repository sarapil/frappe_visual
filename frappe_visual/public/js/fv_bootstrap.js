/**
 * Frappe Visual — Bootstrap Loader
 * ================================
 * Lightweight global loader included on every desk page.
 * Provides the `frappe.visual` namespace and lazy-load helpers.
 * The heavy libraries (Cytoscape, ELK, GSAP) are loaded on-demand only.
 *
 * Usage:
 *   const engine = await frappe.visual.engine();
 *   engine.create({ container: '#my-graph', ... });
 */

(function () {
	"use strict";

	// ── Namespace ────────────────────────────────────────────────
	frappe.provide("frappe.visual");
	frappe.provide("frappe.visual._cache");

	const BUNDLE = "frappe_visual.bundle.js";
	const CSS_BUNDLE = "frappe_visual.bundle.css";

	/** Check if the main bundle is already loaded */
	frappe.visual._loaded = false;

	/**
	 * Lazily load the full visual engine bundle.
	 * Returns a Promise that resolves to the frappe.visual.GraphEngine class.
	 */
	frappe.visual.engine = async function () {
		if (!frappe.visual._loaded) {
			await frappe.require(BUNDLE);
			frappe.visual._loaded = true;
		}
		return frappe.visual.GraphEngine;
	};

	/**
	 * Shorthand: create a graph immediately.
	 * @param {Object} opts - { container, nodes, edges, layout, theme, ... }
	 */
	frappe.visual.create = async function (opts) {
		const Engine = await frappe.visual.engine();
		return new Engine(opts);
	};

	/**
	 * Shorthand: create an App Map for the given Frappe app.
	 * @param {string} container - CSS selector
	 * @param {string} appName - e.g. "arrowz"
	 */
	frappe.visual.appMap = async function (container, appName, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.AppMap.create(container, appName, opts);
	};

	/**
	 * Shorthand: create a Storyboard wizard.
	 * @param {string} container - CSS selector
	 * @param {Array} steps - wizard step definitions
	 */
	frappe.visual.storyboard = async function (container, steps, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Storyboard.create(container, steps, opts);
	};

	/**
	 * Shorthand: create a Kanban Board.
	 * @param {string} container - CSS selector
	 * @param {Object} opts - { doctype, fieldname, columns, ... }
	 */
	frappe.visual.kanban = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.KanbanBoard.create(container, opts);
	};

	/**
	 * Shorthand: create a Visual Calendar.
	 */
	frappe.visual.calendar = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualCalendar.create(container, opts);
	};

	/**
	 * Shorthand: create a Visual Gantt chart.
	 */
	frappe.visual.gantt = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualGantt.create(container, opts);
	};

	/**
	 * Shorthand: create a Visual Tree View.
	 */
	frappe.visual.tree = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualTreeView.create(container, opts);
	};

	/**
	 * Shorthand: create a Visual Map.
	 */
	frappe.visual.map = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualMap.create(container, opts);
	};

	/**
	 * Shorthand: create a Visual Gallery.
	 */
	frappe.visual.gallery = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualGallery.create(container, opts);
	};

	/**
	 * Shorthand: create a Visual Form Dashboard.
	 */
	frappe.visual.formDashboard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualFormDashboard.create(container, opts);
	};

	// ── Pro Enhancement Shorthands ────────────────────────────────

	/** Map Pro — multi-provider maps (OSM/Google/Mapbox) */
	frappe.visual.mapPro = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.MapPro.create(container, opts);
	};

	/** Chart Pro — 18 chart types via ECharts */
	frappe.visual.chartPro = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ChartPro.create(container, opts);
	};

	/** App Shell — visual facades for complex apps */
	frappe.visual.appShell = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.AppShell.create(container, opts);
	};

	/** Form Pro — enhanced form with glass theme, stats, quick actions */
	frappe.visual.formPro = async function (frm, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FormPro.enhance(frm, opts);
	};

	/** List Pro — 7 view modes (card/table/kanban/timeline/gallery/map/board) */
	frappe.visual.listPro = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ListPro.create(container, opts);
	};

	/** Dashboard Pro — widget grid with KPI, charts, lists */
	frappe.visual.dashboardPro = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.DashboardPro.create(container, opts);
	};

	/** Workspace Pro — hero banner, glassmorphism cards, live counts */
	frappe.visual.workspacePro = async function (opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.WorkspacePro.enhance(opts);
	};

	// ── Data Viz Suite Shorthands ─────────────────────────────────

	/** Timeline Pro — horizontal/vertical event timelines */
	frappe.visual.timeline = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.TimelinePro.create(container, opts);
	};

	/** Flow Pro — process/workflow flow diagrams */
	frappe.visual.flow = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FlowPro.create(container, opts);
	};

	/** Org Chart — organizational hierarchy from Employee */
	frappe.visual.orgChart = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.OrgChart.create(container, opts);
	};

	/** Sankey — alluvial/Sankey flow diagrams */
	frappe.visual.sankey = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Sankey.create(container, opts);
	};

	/** Treemap — squarified treemap with drill-down */
	frappe.visual.treemap = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Treemap.create(container, opts);
	};

	/** Heatmap Calendar — GitHub-style activity heatmap */
	frappe.visual.heatmap = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.HeatmapCalendar.create(container, opts);
	};

	/** Funnel — conversion funnel chart */
	frappe.visual.funnel = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Funnel.create(container, opts);
	};

	/** Radar — spider/radar chart */
	frappe.visual.radar = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Radar.create(container, opts);
	};

	/** Report Pro — premium report builder/viewer */
	frappe.visual.report = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ReportPro.create(container, opts);
	};

	// ── UX Power Suite Shorthands ─────────────────────────────────

	/** Command Palette — Cmd+K spotlight search */
	frappe.visual.commandPalette = async function (opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.CommandPalette.create(opts);
	};

	/** Workflow Builder — visual drag-drop workflow editor */
	frappe.visual.workflowBuilder = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.WorkflowBuilder.create(container, opts);
	};

	/** Sparkline — inline micro-charts */
	frappe.visual.sparkline = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.SparklineEngine.create(container, opts);
	};

	/** Notification Center — premium notification panel */
	frappe.visual.notifications = async function (opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.NotificationCenter.create(opts);
	};

	/** Pivot Table — interactive pivot with drag-drop zones */
	frappe.visual.pivotTable = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.PivotTable.create(container, opts);
	};

	/** Data Storytelling — scrollytelling with animated data reveals */
	frappe.visual.storytelling = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.DataStorytelling.create(container, opts);
	};

	/** Visual Diff — side-by-side document comparison */
	frappe.visual.diff = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualDiff.create(container, opts);
	};

	/** Wizard Pro — multi-step form wizard with validation */
	frappe.visual.wizard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.WizardPro.create(container, opts);
	};

	/** AI Chat Widget — AI assistant chat panel */
	frappe.visual.aiChat = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.AIChatWidget.create(container, opts);
	};

	/**
	 * Quick-detect the current theme mode.
	 */
	frappe.visual.isDarkMode = function () {
		return (
			document.documentElement.getAttribute("data-theme") === "dark" ||
			document.body.classList.contains("dark") ||
			window.matchMedia("(prefers-color-scheme: dark)").matches
		);
	};

	/**
	 * Quick-detect RTL direction.
	 */
	frappe.visual.isRTL = function () {
		return (
			document.documentElement.dir === "rtl" ||
			document.documentElement.getAttribute("lang") === "ar"
		);
	};

	console.log(
		"%c⬡ Frappe Visual%c v0.1.0 loaded",
		"color:#6366f1;font-weight:bold",
		"color:#94a3b8"
	);
})();
