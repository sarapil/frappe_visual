// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

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
	// Guard: skip if frappe core not loaded (transient HTTP/2 proxy failures)
if (typeof frappe === "undefined" || typeof frappe.provide !== "function") { return; }
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
	 * Alias for engine() — ensures the bundle is loaded before use.
	 * Used by Wave 9+ component shorthands.
	 */
	frappe.visual._load = async function () {
		return frappe.visual.engine();
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

	// ── Collaboration & Productivity Suite Shorthands ─────────────

	/** Virtual Table — high-perf table with virtual scrolling for 100K+ rows */
	frappe.visual.virtualTable = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VirtualTable.create(container, opts);
	};

	/** Virtual Scroller — generic virtual list scroller */
	frappe.visual.virtualScroller = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VirtualScroller.create(container, opts);
	};

	/** Visual Table — enhanced table with sorting, filtering, grouping */
	frappe.visual.table = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.VisualTable.create(container, opts);
	};

	/** Rich Editor — WYSIWYG with slash commands, @mentions */
	frappe.visual.richEditor = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.RichEditor.create(container, opts);
	};

	/** Rich Text — full text editor with toolbar */
	frappe.visual.richText = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.RichText.create(container, opts);
	};

	/** File Manager — visual file browser with upload */
	frappe.visual.fileManager = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FileManager.create(container, opts);
	};

	/** Data Grid — spreadsheet-like grid with cell editing */
	frappe.visual.dataGrid = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.DataGrid.create(container, opts);
	};

	/** Whiteboard — infinite canvas with drawing tools */
	frappe.visual.whiteboard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Whiteboard.create(container, opts);
	};

	/** Tour Guide — step-by-step spotlight tours */
	frappe.visual.tour = async function (steps, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.TourGuide.create(steps, opts);
	};

	/** Filter Builder — visual AND/OR filter builder */
	frappe.visual.filterBuilder = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FilterBuilder.create(container, opts);
	};

	/** Activity Feed — social activity stream */
	frappe.visual.activityFeed = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ActivityFeed.create(container, opts);
	};

	/** Page Header — breadcrumbs + title + actions */
	frappe.visual.pageHeader = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.PageHeader.create(container, opts);
	};

	// ── Media & Content Suite Shorthands ──────────────────────────

	/** Calendar Scheduler — advanced calendar with resource scheduling */
	frappe.visual.calendarScheduler = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.CalendarScheduler.create(container, opts);
	};

	/** Code Editor — syntax-highlighted code editor */
	frappe.visual.codeEditor = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.CodeEditor.create(container, opts);
	};

	/** Color Picker — advanced color picker with palettes */
	frappe.visual.colorPicker = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ColorPicker.create(container, opts);
	};

	/** Image Annotator — image annotation with drawing tools */
	frappe.visual.imageAnnotator = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ImageAnnotator.create(container, opts);
	};

	/** Media Player — audio/video player with playlist */
	frappe.visual.mediaPlayer = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.MediaPlayer.create(container, opts);
	};

	/** PDF Viewer — in-browser PDF viewer with annotations */
	frappe.visual.pdfViewer = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.PDFViewer.create(container, opts);
	};

	// ── Spatial & Form Tools Shorthands ───────────────────────────

	/** Floor Plan Designer — interactive spatial layout editor */
	frappe.visual.floorPlan = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FloorPlanDesigner.create(container, opts);
	};

	/** Form Wizard — multi-step guided form with validation */
	frappe.visual.formWizard = async function (opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FormWizard.create(opts);
	};

	/** Data Exporter — export data to CSV/Excel/PDF */
	frappe.visual.dataExporter = async function (opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.DataExporter.create(opts);
	};

	// ── Enterprise Suite Shorthands (Wave 5) ─────────────────────

	/** CRM Pipeline — visual sales pipeline with draggable deal cards */
	frappe.visual.crmPipeline = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.CRMPipeline.create(container, opts);
	};

	/** Inventory Grid — warehouse bin grid with stock level visualization */
	frappe.visual.inventoryGrid = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.InventoryGrid.create(container, opts);
	};

	/** Form Builder — drag-drop form layout designer */
	frappe.visual.formBuilder = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.FormBuilder.create(container, opts);
	};

	/** Permission Matrix — roles × doctype permission grid */
	frappe.visual.permissionMatrix = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.PermissionMatrix.create(container, opts);
	};

	/** API Explorer — interactive API endpoint tester */
	frappe.visual.apiExplorer = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.APIExplorer.create(container, opts);
	};

	/** Schema Designer — DocType schema viewer/editor */
	frappe.visual.schemaDesigner = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.SchemaDesigner.create(container, opts);
	};

	/** Import Wizard — multi-step data import with mapping */
	frappe.visual.importWizard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ImportWizard.create(container, opts);
	};

	/** Audit Trail — visual version history timeline */
	frappe.visual.auditTrail = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.AuditTrail.create(container, opts);
	};

	/** Status Board — real-time multi-entity status monitor */
	frappe.visual.statusBoard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.StatusBoard.create(container, opts);
	};

	// ── Analytics & Metrics Suite Shorthands (Wave 6) ────────────

	/** Metric Card — KPI cards with sparklines, trends, and targets */
	frappe.visual.metricCard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.MetricCard.create(container, opts);
	};

	/** Score Card — multi-metric balanced scorecard with RAG status */
	frappe.visual.scoreCard = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ScoreCard.create(container, opts);
	};

	/** Gauge Chart — circular gauge/speedometer with zones */
	frappe.visual.gaugeChart = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.GaugeChart.create(container, opts);
	};

	/** Bullet Chart — Stephen Few bullet charts for KPI vs target */
	frappe.visual.bulletChart = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.BulletChart.create(container, opts);
	};

	/** Waterfall Chart — financial bridge/waterfall chart */
	frappe.visual.waterfallChart = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.WaterfallChart.create(container, opts);
	};

	/** Word Cloud — tag/word cloud with proportional sizing */
	frappe.visual.wordCloud = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.WordCloud.create(container, opts);
	};

	/** Sunburst — hierarchical ring chart with drill-down */
	frappe.visual.sunburst = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Sunburst.create(container, opts);
	};

	/** Network Graph — force-directed network visualization */
	frappe.visual.networkGraph = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.NetworkGraph.create(container, opts);
	};

	/** Progress Tracker — multi-step milestone progress indicator */
	frappe.visual.progressTracker = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ProgressTracker.create(container, opts);
	};

	// ── Form & Input Components Suite Shorthands (Wave 7) ────────────

	/** Tag Input — multi-tag input with autocomplete, paste-split, drag-reorder */
	frappe.visual.tagInput = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.TagInput.create(container, opts);
	};

	/** Date Range Picker — dual-calendar date range with presets */
	frappe.visual.dateRangePicker = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.DateRangePicker.create(container, opts);
	};

	/** Rating Widget — star/heart/emoji rating with half-value support */
	frappe.visual.ratingWidget = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.RatingWidget.create(container, opts);
	};

	/** Toggle Group — segmented control with sliding indicator */
	frappe.visual.toggleGroup = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.ToggleGroup.create(container, opts);
	};

	/** Slider Range — dual-handle range slider with histogram overlay */
	frappe.visual.sliderRange = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.SliderRange.create(container, opts);
	};

	/** Search Select — searchable dropdown with grouping and keyboard nav */
	frappe.visual.searchSelect = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.SearchSelect.create(container, opts);
	};

	/** OTP Input — one-time password per-digit cells with auto-advance */
	frappe.visual.otpInput = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.OTPInput.create(container, opts);
	};

	/** Signature Pad — canvas signature capture with Bézier smoothing */
	frappe.visual.signaturePad = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.SignaturePad.create(container, opts);
	};

	/** Cron Builder — visual cron expression builder with presets */
	frappe.visual.cronBuilder = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.CronBuilder.create(container, opts);
	};

	// ── Navigation & Layout Suite Shorthands (Wave 8) ──────────────

	/** Breadcrumb — hierarchical navigation with overflow collapse */
	frappe.visual.breadcrumb = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Breadcrumb.create(container, opts);
	};

	/** Stepper — multi-step progress indicator */
	frappe.visual.stepper = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Stepper.create(container, opts);
	};

	/** TabNav — animated tab navigation with sliding indicator */
	frappe.visual.tabNav = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.TabNav.create(container, opts);
	};

	/** Accordion — collapsible content panels with animation */
	frappe.visual.accordion = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Accordion.create(container, opts);
	};

	/** SplitPane — resizable split-panel layout with drag handles */
	frappe.visual.splitPane = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.SplitPane.create(container, opts);
	};

	/** CardStack — swipeable card stack with gesture support */
	frappe.visual.cardStack = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.CardStack.create(container, opts);
	};

	/** MasonryGrid — Pinterest-style masonry layout */
	frappe.visual.masonryGrid = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.MasonryGrid.create(container, opts);
	};

	/** Pagination — page navigation with size changer and jumper */
	frappe.visual.pagination = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Pagination.create(container, opts);
	};

	/** EmptyState — beautiful zero-state with illustrations and actions */
	frappe.visual.emptyState = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.EmptyState.create(container, opts);
	};

	/** Skeleton — content loading placeholder with shimmer */
	frappe.visual.skeleton = async function (container, opts = {}) {
		await frappe.visual.engine();
		return frappe.visual.Skeleton.create(container, opts);
	};

	// ── Communication & Feedback Suite (Wave 9) ─────────────
	frappe.visual.toast = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Toast.show(opts);
	};

	frappe.visual.alertBanner = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AlertBanner.create(opts);
	};

	frappe.visual.confirmDialog = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ConfirmDialog.confirm(opts);
	};

	frappe.visual.popover = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Popover.create(opts);
	};

	frappe.visual.drawer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Drawer.create(opts);
	};

	frappe.visual.chatBubble = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ChatBubble.create(opts);
	};

	frappe.visual.spotlight = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Spotlight.create(opts);
	};

	// ── Wave 10 — Data Display & Table Suite ─────────────────────
	frappe.visual.dataTable = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DataTable.create(opts);
	};

	frappe.visual.avatar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Avatar.create(opts);
	};

	frappe.visual.badge = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Badge.create(opts);
	};

	frappe.visual.statCard = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StatCard.create(opts);
	};

	frappe.visual.fileTree = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FileTree.create(opts);
	};

	frappe.visual.descriptionList = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DescriptionList.create(opts);
	};

	frappe.visual.imageGrid = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ImageGrid.create(opts);
	};

	frappe.visual.inlineEdit = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.InlineEdit.create(opts);
	};

	// ── Wave 11 — Utility & Advanced Interaction Suite ───────────
	frappe.visual.clipboard = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Clipboard.create(opts);
	};

	frappe.visual.countdown = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Countdown.create(opts);
	};

	frappe.visual.sortableList = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SortableList.create(opts);
	};

	frappe.visual.codeBlock = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CodeBlock.create(opts);
	};

	frappe.visual.diffViewer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DiffViewer.create(opts);
	};

	frappe.visual.marquee = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Marquee.create(opts);
	};

	frappe.visual.divider = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Divider.create(opts);
	};

	frappe.visual.scrollSpy = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScrollSpy.create(opts);
	};

	frappe.visual.passwordStrength = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PasswordStrength.create(opts);
	};

	// ── Wave 12 — Selection & Rich Input Suite ───────────────────
	frappe.visual.segmentedControl = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SegmentedControl.create(opts);
	};

	frappe.visual.transferList = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.TransferList.create(opts);
	};

	frappe.visual.pinInput = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PinInput.create(opts);
	};

	frappe.visual.creditCard = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CreditCard.create(opts);
	};

	frappe.visual.annotationLayer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AnnotationLayer.create(opts);
	};

	frappe.visual.combobox = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Combobox.create(opts);
	};

	frappe.visual.numberStepper = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.NumberStepper.create(opts);
	};

	frappe.visual.chipInput = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ChipInput.create(opts);
	};

	frappe.visual.currencyInput = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CurrencyInput.create(opts);
	};

	// Wave 13: Content & Layout Composition
	frappe.visual.carousel = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Carousel.create(opts);
	};

	frappe.visual.collapsible = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Collapsible.create(opts);
	};

	frappe.visual.highlight = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Highlight.create(opts);
	};

	frappe.visual.scrollArea = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScrollArea.create(opts);
	};

	frappe.visual.aspectRatio = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AspectRatio.create(opts);
	};

	frappe.visual.blockquote = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Blockquote.create(opts);
	};

	frappe.visual.kbd = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Kbd.create(opts);
	};

	frappe.visual.stickyHeader = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StickyHeader.create(opts);
	};

	frappe.visual.contentPlaceholder = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ContentPlaceholder.create(opts);
	};

	// Wave 14: Status & Feedback Display
	frappe.visual.progressRing = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ProgressRing.create(opts);
	};

	frappe.visual.statusDot = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StatusDot.create(opts);
	};

	frappe.visual.countUp = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CountUp.create(opts);
	};

	frappe.visual.callout = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Callout.create(opts);
	};

	frappe.visual.banner = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Banner.create(opts);
	};

	frappe.visual.stepIndicator = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StepIndicator.create(opts);
	};

	frappe.visual.comparison = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Comparison.create(opts);
	};

	frappe.visual.pricingTable = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PricingTable.create(opts);
	};

	frappe.visual.featureList = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FeatureList.create(opts);
	};

	// Wave 15 — Advanced Interaction & Micro-Animation
	frappe.visual.typewriter = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Typewriter.create(opts);
	};
	frappe.visual.parallaxScroll = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ParallaxScroll.create(opts);
	};
	frappe.visual.confetti = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Confetti.create(opts);
	};
	frappe.visual.ripple = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Ripple.create(opts);
	};
	frappe.visual.textLoop = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.TextLoop.create(opts);
	};
	frappe.visual.numberTicker = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.NumberTicker.create(opts);
	};
	frappe.visual.glowCard = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.GlowCard.create(opts);
	};
	frappe.visual.morphingText = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.MorphingText.create(opts);
	};
	frappe.visual.dotPattern = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DotPattern.create(opts);
	};

	// Wave 16 — Data Visualization & Chart Enhancement
	frappe.visual.radarChart = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.RadarChart.create(opts);
	};
	frappe.visual.funnelChart = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FunnelChart.create(opts);
	};
	frappe.visual.treemapChart = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.TreemapChart.create(opts);
	};
	frappe.visual.donutChart = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DonutChart.create(opts);
	};
	frappe.visual.dataCard = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DataCard.create(opts);
	};
	frappe.visual.areaChart = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AreaChart.create(opts);
	};
	frappe.visual.sankeyChart = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SankeyChart.create(opts);
	};

	// ── Wave 17 — Layout & Container Components ───────────────────
	frappe.visual.masonry = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Masonry.create(opts);
	};
	frappe.visual.dock = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Dock.create(opts);
	};
	frappe.visual.gridStack = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.GridStack.create(opts);
	};
	frappe.visual.bento = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Bento.create(opts);
	};
	frappe.visual.infiniteScroll = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.InfiniteScroll.create(opts);
	};
	frappe.visual.sortable = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Sortable.create(opts);
	};
	frappe.visual.virtualList = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.VirtualList.create(opts);
	};
	frappe.visual.stackedLayout = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StackedLayout.create(opts);
	};
	frappe.visual.resizable = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Resizable.create(opts);
	};

	// ── Wave 18 — Navigation & Wayfinding ─────────────────────────
	frappe.visual.commandBar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CommandBar.create(opts);
	};
	frappe.visual.floatingNav = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FloatingNav.create(opts);
	};
	frappe.visual.pageTransition = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PageTransition.create(opts);
	};
	frappe.visual.backToTop = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BackToTop.create(opts);
	};
	frappe.visual.navRail = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.NavRail.create(opts);
	};
	frappe.visual.anchorNav = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AnchorNav.create(opts);
	};
	frappe.visual.tabBar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.TabBar.create(opts);
	};
	frappe.visual.bottomNav = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BottomNav.create(opts);
	};
	frappe.visual.speedDial = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SpeedDial.create(opts);
	};

	// ── Wave 19 — Feedback & Overlay ──────────────────────────────
	frappe.visual.bottomSheet = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BottomSheet.create(opts);
	};
	frappe.visual.lightbox = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Lightbox.create(opts);
	};
	frappe.visual.imageCompare = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ImageCompare.create(opts);
	};
	frappe.visual.popconfirm = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Popconfirm.create(opts);
	};
	frappe.visual.cookieBanner = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CookieBanner.create(opts);
	};
	frappe.visual.onboardingTour = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.OnboardingTour.create(opts);
	};
	frappe.visual.contextPanel = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ContextPanel.create(opts);
	};
	frappe.visual.pinchZoom = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PinchZoom.create(opts);
	};
	frappe.visual.notificationStack = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.NotificationStack.create(opts);
	};

	// ── Wave 20 — Productivity & Power Tools ─────────────────────
	frappe.visual.shortcutManager = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ShortcutManager.create(opts);
	};
	frappe.visual.clipboardManager = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ClipboardManager.create(opts);
	};
	frappe.visual.undoRedo = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.UndoRedo.create(opts);
	};
	frappe.visual.focusTrap = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FocusTrap.create(opts);
	};
	frappe.visual.hotkeyHint = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.HotkeyHint.create(opts);
	};
	frappe.visual.globalSearch = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.GlobalSearch.create(opts);
	};
	frappe.visual.quickAction = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.QuickAction.create(opts);
	};
	frappe.visual.bulkActions = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BulkActions.create(opts);
	};
	frappe.visual.multiSelectBar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.MultiSelectBar.create(opts);
	};

	// ── Wave 21 — Immersive SVG Scene Engine ─────────────────────
	frappe.visual.sceneEngine = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SceneEngine.create(opts);
	};
	frappe.visual.sceneRoom = async function (svg, pal, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneRoom.render(svg, pal, eng);
	};
	frappe.visual.sceneFrame = async function (parent, opts, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneFrame.render(parent, opts, eng);
	};
	frappe.visual.sceneDesk = async function (svg, opts, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneDesk.render(svg, opts, eng);
	};
	frappe.visual.sceneDocument = async function (parent, opts, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneDocument.render(parent, opts, eng);
	};
	frappe.visual.sceneShelf = async function (svg, opts, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneShelf.render(svg, opts, eng);
	};
	frappe.visual.sceneBoard = async function (svg, opts, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneBoard.render(svg, opts, eng);
	};
	frappe.visual.sceneWidget = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SceneWidget.create(opts);
	};
	frappe.visual.sceneLighting = async function (svg, pal, eng) {
		await frappe.visual._load();
		return frappe.visual.SceneLighting.render(svg, pal, eng);
	};

	// ── Wave 22 — Scene Presets & Smart Data Binding ─────────────
	frappe.visual.scenePresetOffice = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScenePresetOffice.create(opts);
	};
	frappe.visual.scenePresetLibrary = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScenePresetLibrary.create(opts);
	};
	frappe.visual.scenePresetClinic = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScenePresetClinic.create(opts);
	};
	frappe.visual.scenePresetWorkshop = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScenePresetWorkshop.create(opts);
	};
	frappe.visual.scenePresetCafe = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScenePresetCafe.create(opts);
	};
	frappe.visual.sceneDataBinder = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SceneDataBinder.create(opts);
	};
	frappe.visual.sceneRefresher = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SceneRefresher.create(opts);
	};
	frappe.visual.sceneNavigator = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SceneNavigator.create(opts);
	};
	frappe.visual.sceneExporter = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SceneExporter.create(opts);
	};

	// ── Wave 23 — Accessibility & i18n Suite ─────────────────
	frappe.visual.screenReaderHelper = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ScreenReaderHelper.create(opts);
	};
	frappe.visual.reducedMotion = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ReducedMotion.create(opts);
	};
	frappe.visual.highContrastMode = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.HighContrastMode.create(opts);
	};
	frappe.visual.fontScaler = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FontScaler.create(opts);
	};
	frappe.visual.keyboardNavigator = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.KeyboardNavigator.create(opts);
	};
	frappe.visual.ariaLiveRegion = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AriaLiveRegion.create(opts);
	};
	frappe.visual.rtlAutoMirror = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.RTLAutoMirror.create(opts);
	};
	frappe.visual.langSwitcher = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.LangSwitcher.create(opts);
	};
	frappe.visual.a11yAudit = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.A11yAudit.create(opts);
	};

	// ── Wave 24 — Collaboration & Social Suite ───────────────────
	frappe.visual.presenceIndicator = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PresenceIndicator.create(opts);
	};
	frappe.visual.cursorShare = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CursorShare.create(opts);
	};
	frappe.visual.liveComments = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.LiveComments.create(opts);
	};
	frappe.visual.reactions = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Reactions.create(opts);
	};
	frappe.visual.mentionPopup = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.MentionPopup.create(opts);
	};
	frappe.visual.changeTracker = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ChangeTracker.create(opts);
	};
	frappe.visual.approvalFlow = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ApprovalFlow.create(opts);
	};
	frappe.visual.shareDialog = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ShareDialog.create(opts);
	};

	// ── Wave 25 — Form Enhancement & Smart Input Suite ───────────────
	frappe.visual.ratingStars = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.RatingStars.create(opts);
	};
	frappe.visual.fileDropZone = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FileDropZone.create(opts);
	};
	frappe.visual.inlineEditor = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.InlineEditor.create(opts);
	};
	frappe.visual.autoSave = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AutoSave.create(opts);
	};
	// ── Wave 26 — Notification & Alert Suite ─────────────────────────
	frappe.visual.toastStack = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ToastStack.create(opts);
	};
	frappe.visual.snackBar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SnackBar.create(opts);
	};
	frappe.visual.bannerAlert = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BannerAlert.create(opts);
	};
	frappe.visual.progressModal = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ProgressModal.create(opts);
	};
	frappe.visual.countdownTimer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CountdownTimer.create(opts);
	};
	frappe.visual.statusPulse = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StatusPulse.create(opts);
	};
	frappe.visual.notificationCenter = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.NotificationCenter.create(opts);
	};
	frappe.visual.badgeCounter = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BadgeCounter.create(opts);
	};

	// ── Wave 27 — Media & Content Suite ─────────────────────────────
	frappe.visual.imageCropper = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ImageCropper.create(opts);
	};
	frappe.visual.videoPlayer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.VideoPlayer.create(opts);
	};
	frappe.visual.audioWaveform = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AudioWaveform.create(opts);
	};
	frappe.visual.markdownRenderer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.MarkdownRenderer.create(opts);
	};
	frappe.visual.emojiPicker = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.EmojiPicker.create(opts);
	};
	frappe.visual.avatarGroup = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AvatarGroup.create(opts);
	};
	// ── Wave 28 — Table & Data Grid Suite ───────────────────────────
	frappe.visual.virtualScroll = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.VirtualScroll.create(opts);
	};
	frappe.visual.spreadsheetGrid = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SpreadsheetGrid.create(opts);
	};
	frappe.visual.columnResizer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ColumnResizer.create(opts);
	};
	frappe.visual.rowExpander = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.RowExpander.create(opts);
	};
	frappe.visual.cellEditor = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.CellEditor.create(opts);
	};
	frappe.visual.sortableHeaders = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.SortableHeaders.create(opts);
	};
	frappe.visual.filterBar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FilterBar.create(opts);
	};

	// ── Wave 29 — Navigation & Layout Suite ──────────────────────────
	frappe.visual.breadcrumbTrail = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.BreadcrumbTrail.create(opts);
	};
	frappe.visual.tabStrip = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.TabStrip.create(opts);
	};
	frappe.visual.accordionGroup = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.AccordionGroup.create(opts);
	};
	frappe.visual.resizablePanel = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ResizablePanel.create(opts);
	};
	frappe.visual.dockLayout = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DockLayout.create(opts);
	};
	frappe.visual.floatingToolbar = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FloatingToolbar.create(opts);
	};

	// ── Wave 30 — State & Logic Suite ──────────────────────────────
	frappe.visual.stateMachine = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.StateMachine.create(opts);
	};
	frappe.visual.createEventBus = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.EventBus.create(opts);
	};
	frappe.visual.dataStore = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DataStore.create(opts);
	};
	frappe.visual.computedBinding = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ComputedBinding.create(opts);
	};
	frappe.visual.formValidator = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FormValidator.create(opts);
	};
	frappe.visual.conditionalRenderer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ConditionalRenderer.create(opts);
	};
	frappe.visual.featureFlag = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.FeatureFlag.create(opts);
	};
	frappe.visual.debugOverlay = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.DebugOverlay.create(opts);
	};
	frappe.visual.performanceMonitor = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.PerformanceMonitor.create(opts);
	};

	// ── Wave 31: Loading & Skeleton Suite ─────────────────────────
	frappe.visual.shimmer = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Shimmer.create(opts);
	};
	frappe.visual.loadingDots = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.LoadingDots.create(opts);
	};
	frappe.visual.lazyImage = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.LazyImage.create(opts);
	};
	frappe.visual.placeholder = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Placeholder.create(opts);
	};
	frappe.visual.contentLoader = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.ContentLoader.create(opts);
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

	// ── Desk Workspace — VS Code-style split view + CMD+K ─────────

	/**
	 * Open the Detail Panel for a specific record.
	 * @param {string} doctype
	 * @param {string} docname
	 */
	frappe.visual.openDetail = async function (doctype, docname) {
		await frappe.visual._load();
		return frappe.visual.deskWorkspace?.openDetail(doctype, docname);
	};

	/**
	 * Close the detail panel.
	 */
	frappe.visual.closeDetail = function () {
		frappe.visual.deskWorkspace?.closeDetail();
	};

	/**
	 * Toggle the persistent navigation sidebar.
	 * The nav sidebar stays visible while navigating between pages.
	 */
	frappe.visual.toggleNavSidebar = function () {
		frappe.visual.deskWorkspace?.toggleNavSidebar();
	};

	/**
	 * Rebuild the Bento grid on the current workspace.
	 * Useful after workspace content changes.
	 */
	frappe.visual.rebuildBento = function () {
		frappe.visual.workspaceEnhancer?.rebuildBento?.();
	};

	// ── Tab Management ────────────────────────────────────────────

	/**
	 * Get all open tabs in the detail panel.
	 * @returns {Array} Tab objects with { id, doctype, docname }
	 */
	frappe.visual.getTabs = function () {
		return frappe.visual.deskWorkspace?.tabs || [];
	};

	/**
	 * Get the currently active tab ID.
	 * @returns {string|null}
	 */
	frappe.visual.getActiveTabId = function () {
		return frappe.visual.deskWorkspace?.activeTabId || null;
	};

	/**
	 * Switch to a specific tab by ID.
	 * @param {string} tabId
	 */
	frappe.visual.switchTab = function (tabId) {
		frappe.visual.deskWorkspace?.switchTab(tabId);
	};

	/**
	 * Close a specific tab by ID.
	 * @param {string} tabId
	 */
	frappe.visual.closeTab = function (tabId) {
		frappe.visual.deskWorkspace?.closeTab(tabId);
	};

	/**
	 * Check whether the detail panel is currently visible.
	 * @returns {boolean}
	 */
	frappe.visual.isDetailVisible = function () {
		return frappe.visual.deskWorkspace?.isDetailVisible || false;
	};

	/**
	 * Get the doctype/docname for the currently shown record.
	 * @returns {{ doctype: string, docname: string }|null}
	 */
	frappe.visual.getCurrentRecord = function () {
		return frappe.visual.deskWorkspace?.currentRecord || null;
	};

	// ── Recent Records ────────────────────────────────────────────

	/**
	 * Get the recent records list from the detail panel.
	 * @returns {Array}
	 */
	frappe.visual.getRecentRecords = function () {
		return frappe.visual.deskWorkspace?.recentRecords || [];
	};

	/**
	 * Clear all recent records.
	 */
	frappe.visual.clearRecentRecords = function () {
		frappe.visual.deskWorkspace?.clearRecent();
	};

	// ── Workspace Storytelling ─────────────────────────────────────

	/** Toggle data storytelling view on the current workspace. */
	frappe.visual.toggleStory = function () {
		frappe.visual.workspaceStorytelling?.toggle();
	};

	// ── Dock Coordinator ──────────────────────────────────────────

	/**
	 * Find a safe position for a floating window that avoids dock panels.
	 * @param {number} width
	 * @param {number} height
	 * @returns {{ x: number, y: number }}
	 */
	frappe.visual.findSafePosition = function (width, height) {
		return frappe.visual.dockCoordinator?.findSafePosition(width, height) || { x: 100, y: 100 };
	};

	// ── Notification Realtime ─────────────────────────────────────

	/** Mark a notification as read (syncs to server). */
	frappe.visual.markNotificationRead = async function (id) {
		await frappe.visual._load();
		return frappe.visual.notificationRealtime?.markRead(id);
	};

	/** Mark all notifications as read. */
	frappe.visual.markAllNotificationsRead = async function () {
		await frappe.visual._load();
		return frappe.visual.notificationRealtime?.markAllRead();
	};

	// ── Preferences Sync ─────────────────────────────────────────

	/** Force sync all UI preferences with server. */
	frappe.visual.syncPreferences = async function () {
		await frappe.visual._load();
		return frappe.visual.preferencesSync?.forceSync();
	};

	/** Reset all Frappe Visual preferences to defaults. */
	frappe.visual.resetPreferences = async function () {
		await frappe.visual._load();
		return frappe.visual.preferencesSync?.resetAll();
	};

	// ── Whiteboard DocType Linking ───────────────────────────────────

	/**
	 * Link a Frappe document to a whiteboard element.
	 * @param {string} elementId — The whiteboard element ID
	 * @param {string} doctype
	 * @param {string} docname
	 */
	frappe.visual.linkDocToWhiteboard = function (elementId, doctype, docname) {
		frappe.visual.whiteboardDocLink?.linkDocument?.(elementId, doctype, docname);
	};

	// ── Event Bus Shortcuts ──────────────────────────────────────────

	/** Emit an event on the global EventBus. Shorthand for frappe.visual.eventBus.emit() */
	frappe.visual.emit = function (event, data) {
		frappe.visual.eventBus?.emit?.(event, data);
	};

	/** Subscribe to a global EventBus event. Returns unsubscribe fn. */
	frappe.visual.on = function (event, handler) {
		return frappe.visual.eventBus?.on?.(event, handler);
	};

	// ── Responsive System ───────────────────────────────────────────

	/** Check if current viewport is mobile. */
	frappe.visual.isMobile = function () {
		return frappe.visual.responsive?.isMobile ?? window.innerWidth < 768;
	};

	/** Get current breakpoint name (xs/sm/md/lg/xl/xxl). */
	frappe.visual.breakpoint = function () {
		return frappe.visual.responsive?.current?.name ?? "md";
	};

	// ── Plugin System ───────────────────────────────────────────────

	/** Register a plugin manifest. */
	frappe.visual.registerPlugin = function (manifest) {
		return frappe.visual.plugins?.registerPlugin?.(manifest);
	};

	/** Create a registered component by name. */
	frappe.visual.createComponent = async function (name, container, config) {
		await frappe.visual._load();
		return frappe.visual.plugins?.create?.(name, container, config);
	};

	// ── Drag & Drop ─────────────────────────────────────────────────

	/** Make an element draggable. Returns cleanup fn. */
	frappe.visual.makeDraggable = function (el, opts) {
		return frappe.visual.drag?.makeDraggable?.(el, opts);
	};

	/** Make an element a drop zone. Returns cleanup fn. */
	frappe.visual.makeDropZone = function (el, opts) {
		return frappe.visual.drag?.makeDropZone?.(el, opts);
	};

	/** Make children of a container sortable. Returns cleanup fn. */
	frappe.visual.makeSortable = function (container, opts) {
		return frappe.visual.drag?.makeSortable?.(container, opts);
	};

	// ── Animation Timeline ─────────────────────────────────────────

	/** Create a named animation timeline. */
	/** Quick preset animation (fadeUp, scaleUp, spring, etc). */
	frappe.visual.animatePreset = function (target, preset, opts) {
		return frappe.visual.animate?.preset?.(target, preset, opts);
	};

	/** Animate elements on scroll into view. */
	frappe.visual.onScroll = function (target, fromVars, opts) {
		return frappe.visual.animate?.onScroll?.(target, fromVars, opts);
	};

	// ── Component Playground ────────────────────────────────────────

	/** Open the component playground explorer. */
	frappe.visual.openPlayground = function () {
		frappe.set_route("visual-playground");
	};

	// ── Export Engine ────────────────────────────────────────────────────

	/** Export element to PDF. */
	frappe.visual.exportPDF = async function (element, opts) {
		await frappe.visual._load();
		return frappe.visual.exporter?.pdf?.(element, opts);
	};

	/** Export element to PNG. */
	frappe.visual.exportPNG = async function (element, opts) {
		await frappe.visual._load();
		return frappe.visual.exporter?.png?.(element, opts);
	};

	/** Export element to SVG. */
	frappe.visual.exportSVG = async function (element, opts) {
		await frappe.visual._load();
		return frappe.visual.exporter?.svg?.(element, opts);
	};

	// ── Theme Builder ──────────────────────────────────────────────────

	/** Open the visual theme builder. */
	frappe.visual.openThemeBuilder = function () {
		frappe.visual.themeBuilder?.open?.();
	};

	/** Apply a named theme. */
	frappe.visual.applyTheme = function (name) {
		frappe.visual.themeBuilder?.apply?.(name);
	};

	// ── Faceted Search ─────────────────────────────────────────────────

	/** Create a faceted search panel for a doctype. */
	frappe.visual.createSearch = function (container, opts) {
		return frappe.visual.search?.create?.(container, opts);
	};

	// ── Performance Monitor ────────────────────────────────────────────

	/** Toggle performance HUD overlay. */
	frappe.visual.togglePerfHUD = function () {
		frappe.visual.perf?.toggleHUD?.();
	};

	// ── Reactive State ────────────────────────────────────────────────

	/** Create a reactive state store. */
	frappe.visual.createStore = function (initial, opts) {
		return frappe.visual.state?.create?.(initial, opts);
	};

	// ── Keyboard Shortcuts ────────────────────────────────────────────

	/** Register a keyboard shortcut. */
	frappe.visual.registerKey = function (combo, fn, opts) {
		return frappe.visual.keys?.register?.(combo, fn, opts);
	};

	/** Show keyboard shortcuts cheat sheet. */
	frappe.visual.showKeys = function () {
		frappe.visual.keys?.showCheatSheet?.();
	};

	// ── Undo / Redo ───────────────────────────────────────────────────

	/** Execute an undoable command. */
	frappe.visual.exec = function (cmd) {
		return frappe.visual.undo?.execute?.(cmd);
	};

	/** Undo last action. */
	frappe.visual.undoAction = function () {
		return frappe.visual.undo?.undo?.();
	};

	/** Redo last undone action. */
	frappe.visual.redoAction = function () {
		return frappe.visual.undo?.redo?.();
	};

	// ═══════════════════════════════════════════════════════════════════════
	// SKELETON LOADER UTILITY
	// Provides consistent loading states across all visual pages/components.
	// ═══════════════════════════════════════════════════════════════════════

	frappe.visual.skeleton = {
		/**
		 * Inject skeleton placeholders into a container.
		 * @param {HTMLElement|string} container - DOM element or selector
		 * @param {object} opts - { rows: 3, type: 'card'|'table'|'chart'|'list'|'text', cols: 3 }
		 */
		show(container, opts = {}) {
			const el = typeof container === "string" ? document.querySelector(container) : container;
			if (!el) return;
			const rows = opts.rows || 3;
			const cols = opts.cols || 3;
			const type = opts.type || "card";
			let html = '<div class="fv-skeleton-wrapper" role="status" aria-label="Loading...">';

			if (type === "card") {
				html += '<div class="fv-skeleton-grid" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:1rem;">';
				for (let i = 0; i < rows * cols; i++) {
					html += `<div class="fv-skeleton-card" style="background:var(--fg-color,#f8f9fa);border-radius:var(--border-radius-lg,12px);padding:1.5rem;min-height:120px;">
						<div class="fv-skeleton-line" style="width:60%;height:14px;background:var(--gray-200,#e5e7eb);border-radius:4px;margin-bottom:12px;animation:fv-skeleton-pulse 1.5s ease-in-out infinite;"></div>
						<div class="fv-skeleton-line" style="width:80%;height:10px;background:var(--gray-200,#e5e7eb);border-radius:4px;margin-bottom:8px;animation:fv-skeleton-pulse 1.5s ease-in-out 0.2s infinite;"></div>
						<div class="fv-skeleton-line" style="width:40%;height:10px;background:var(--gray-200,#e5e7eb);border-radius:4px;animation:fv-skeleton-pulse 1.5s ease-in-out 0.4s infinite;"></div>
					</div>`;
				}
				html += "</div>";
			} else if (type === "table") {
				html += '<div style="display:flex;flex-direction:column;gap:8px;">';
				for (let i = 0; i < rows; i++) {
					html += `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--gray-100,#f3f4f6);">
						<div class="fv-skeleton-line" style="width:20%;height:12px;background:var(--gray-200,#e5e7eb);border-radius:4px;animation:fv-skeleton-pulse 1.5s ease-in-out ${i * 0.1}s infinite;"></div>
						<div class="fv-skeleton-line" style="width:35%;height:12px;background:var(--gray-200,#e5e7eb);border-radius:4px;animation:fv-skeleton-pulse 1.5s ease-in-out ${i * 0.1 + 0.1}s infinite;"></div>
						<div class="fv-skeleton-line" style="width:25%;height:12px;background:var(--gray-200,#e5e7eb);border-radius:4px;animation:fv-skeleton-pulse 1.5s ease-in-out ${i * 0.1 + 0.2}s infinite;"></div>
					</div>`;
				}
				html += "</div>";
			} else if (type === "chart") {
				html += `<div style="background:var(--fg-color,#f8f9fa);border-radius:var(--border-radius-lg,12px);padding:1.5rem;min-height:250px;display:flex;align-items:flex-end;gap:8px;">`;
				for (let i = 0; i < 8; i++) {
					const h = 30 + Math.random() * 60;
					html += `<div style="flex:1;height:${h}%;background:var(--gray-200,#e5e7eb);border-radius:4px 4px 0 0;animation:fv-skeleton-pulse 1.5s ease-in-out ${i * 0.15}s infinite;"></div>`;
				}
				html += "</div>";
			} else {
				for (let i = 0; i < rows; i++) {
					const w = 50 + Math.random() * 40;
					html += `<div class="fv-skeleton-line" style="width:${w}%;height:12px;background:var(--gray-200,#e5e7eb);border-radius:4px;margin-bottom:10px;animation:fv-skeleton-pulse 1.5s ease-in-out ${i * 0.15}s infinite;"></div>`;
				}
			}

			html += '<span class="sr-only">' + __("Loading...") + "</span></div>";
			el.innerHTML = html;

			// Inject keyframes if not already present
			if (!document.getElementById("fv-skeleton-style")) {
				const style = document.createElement("style");
				style.id = "fv-skeleton-style";
				style.textContent = `@keyframes fv-skeleton-pulse{0%,100%{opacity:1}50%{opacity:.4}}`;
				document.head.appendChild(style);
			}
		},

		/** Remove skeleton placeholders from a container. */
		hide(container) {
			const el = typeof container === "string" ? document.querySelector(container) : container;
			if (!el) return;
			const wrapper = el.querySelector(".fv-skeleton-wrapper");
			if (wrapper) wrapper.remove();
		},
	};

	// ═══════════════════════════════════════════════════════════════════════
	// ACCESSIBILITY (a11y) HELPERS
	// ARIA attributes, focus management, screen reader announcements.
	// ═══════════════════════════════════════════════════════════════════════

	frappe.visual.a11y = {
		/**
		 * Announce a message to screen readers via a live region.
		 * @param {string} message - Text to announce
		 * @param {string} priority - 'polite' or 'assertive'
		 */
		announce(message, priority = "polite") {
			let region = document.getElementById("fv-a11y-live");
			if (!region) {
				region = document.createElement("div");
				region.id = "fv-a11y-live";
				region.setAttribute("aria-live", priority);
				region.setAttribute("aria-atomic", "true");
				region.className = "sr-only";
				region.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
				document.body.appendChild(region);
			}
			region.setAttribute("aria-live", priority);
			region.textContent = "";
			requestAnimationFrame(() => { region.textContent = message; });
		},

		/**
		 * Make a container a labeled ARIA region.
		 * @param {HTMLElement} el - Element to label
		 * @param {string} role - ARIA role (e.g. 'region', 'tabpanel', 'dialog')
		 * @param {string} label - Accessible label text
		 */
		label(el, role, label) {
			if (!el) return;
			if (role) el.setAttribute("role", role);
			if (label) el.setAttribute("aria-label", label);
		},

		/**
		 * Trap focus inside a container (for modals/dialogs).
		 * Returns a cleanup function to release the trap.
		 * @param {HTMLElement} container
		 * @returns {Function} release — call to remove the focus trap
		 */
		trapFocus(container) {
			const focusable = container.querySelectorAll(
				'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
			);
			if (!focusable.length) return () => {};
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			function handler(e) {
				if (e.key !== "Tab") return;
				if (e.shiftKey) {
					if (document.activeElement === first) { e.preventDefault(); last.focus(); }
				} else {
					if (document.activeElement === last) { e.preventDefault(); first.focus(); }
				}
			}
			container.addEventListener("keydown", handler);
			first.focus();
			return () => container.removeEventListener("keydown", handler);
		},

		/**
		 * Set up skip-link navigation for a page.
		 * @param {string} mainContentId - ID of the main content area
		 */
		skipLink(mainContentId) {
			if (document.getElementById("fv-skip-link")) return;
			const link = document.createElement("a");
			link.id = "fv-skip-link";
			link.href = "#" + mainContentId;
			link.className = "sr-only";
			link.textContent = __("Skip to main content");
			link.style.cssText = "position:absolute;top:-100px;left:0;z-index:10000;padding:8px 16px;background:var(--primary);color:#fff;";
			link.addEventListener("focus", () => { link.style.top = "0"; });
			link.addEventListener("blur", () => { link.style.top = "-100px"; });
			document.body.prepend(link);
		},
	};

	// ═══════════════════════════════════════════════════════════════════════
	// CSV / DATA EXPORT CLIENT HELPER
	// Client-side CSV generation + server-side export via ExportService.
	// ═══════════════════════════════════════════════════════════════════════

	frappe.visual.exportData = {
		/**
		 * Export data as a CSV file download (client-side).
		 * @param {Array<Array>} rows - 2D array (first row = headers)
		 * @param {string} filename - File name without extension
		 */
		toCSV(rows, filename = "export") {
			if (!rows || !rows.length) {
				frappe.show_alert({ message: __("No data to export"), indicator: "orange" });
				return;
			}
			const csv = rows.map(row =>
				row.map(cell => {
					const s = String(cell ?? "");
					return s.includes(",") || s.includes('"') || s.includes("\n")
						? '"' + s.replace(/"/g, '""') + '"' : s;
				}).join(",")
			).join("\n");

			const BOM = "\uFEFF"; // UTF-8 BOM for Excel Arabic support
			const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename + ".csv";
			a.click();
			URL.revokeObjectURL(url);
			frappe.show_alert({ message: __("Exported {0} rows", [rows.length - 1]), indicator: "green" });
		},

		/**
		 * Export chart/dashboard data via server-side ExportService.
		 * @param {object} opts - { doctype, fields, filters, format:'csv'|'xlsx' }
		 */
		async fromServer(opts = {}) {
			const { doctype, fields, filters } = opts;
			if (!doctype) return;
			try {
				const result = await frappe.xcall(
					"frappe_visual.api.v1.export.export_doctype_csv",
					{ doctype, fields: JSON.stringify(fields || []),
					  filters: JSON.stringify(filters || {}) }
				);
				if (result?.file_url) {
					window.open(result.file_url);
				}
			} catch (e) {
				frappe.msgprint({ title: __("Export Error"), message: e.message || __("Export failed"), indicator: "red" });
			}
		},
	};

	// ═══════════════════════════════════════════════════════════════════════
	// REALTIME COLLABORATION UTILITY
	// Wrapper around frappe.realtime for visual component live updates.
	// ═══════════════════════════════════════════════════════════════════════

	frappe.visual.realtime = {
		_handlers: {},

		/**
		 * Subscribe to a Frappe Visual realtime event.
		 * @param {string} event - Event name (will be prefixed with "fv_")
		 * @param {Function} callback
		 */
		on(event, callback) {
			const key = "fv_" + event;
			if (!frappe.visual.realtime._handlers[key]) {
				frappe.visual.realtime._handlers[key] = [];
			}
			frappe.visual.realtime._handlers[key].push(callback);
			frappe.realtime.on(key, callback);
		},

		/**
		 * Unsubscribe from a Frappe Visual realtime event.
		 * @param {string} event
		 * @param {Function} callback
		 */
		off(event, callback) {
			const key = "fv_" + event;
			frappe.realtime.off(key, callback);
			const handlers = frappe.visual.realtime._handlers[key];
			if (handlers) {
				const idx = handlers.indexOf(callback);
				if (idx > -1) handlers.splice(idx, 1);
			}
		},

		/**
		 * Emit a realtime event to other users viewing the same resource.
		 * @param {string} event - Event name
		 * @param {object} data - Payload
		 * @param {string} room - Room name (defaults to current page)
		 */
		emit(event, data = {}, room = null) {
			frappe.xcall("frappe_visual.api.v1.realtime.broadcast", {
				event: "fv_" + event,
				data: JSON.stringify(data),
				room: room || frappe.get_route_str(),
			}).catch(() => {});
		},

		/**
		 * Show presence indicators (who else is viewing this page).
		 * @param {HTMLElement} container - Where to show avatar chips
		 * @param {string} room - Room name
		 */
		showPresence(container, room) {
			const el = typeof container === "string" ? document.querySelector(container) : container;
			if (!el) return;

			frappe.visual.realtime.on("presence_update", (data) => {
				if (data.room !== (room || frappe.get_route_str())) return;
				const users = data.users || [];
				el.innerHTML = users.map(u =>
					`<span class="fv-presence-chip" title="${frappe.utils.escape_html(u.full_name)}" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:var(--gray-100);font-size:var(--text-xs);margin-inline-end:4px;">
						<span class="avatar avatar-xs"><img src="${u.user_image || '/assets/frappe/images/default-avatar.png'}" alt="${frappe.utils.escape_html(u.full_name)}"></span>
						${frappe.utils.escape_html(u.full_name.split(" ")[0])}
					</span>`
				).join("");
			});

			// Announce presence
			frappe.visual.realtime.emit("join", {
				user: frappe.session.user,
				room: room || frappe.get_route_str(),
			});
		},

		/** Clean up all subscriptions. */
		destroy() {
			for (const [key, handlers] of Object.entries(frappe.visual.realtime._handlers)) {
				for (const h of handlers) frappe.realtime.off(key, h);
			}
			frappe.visual.realtime._handlers = {};
		},
	};

	// ══════════════════════════════════════════════════════════════
	// 3D / CAD / XR — Lazy-loaded sub-bundles (Tiers 11-15)
	// ══════════════════════════════════════════════════════════════

	const THREE_D_BUNDLE = "fv_3d.bundle.js";
	const CAD_BUNDLE = "fv_cad.bundle.js";
	const XR_BUNDLE = "fv_xr.bundle.js";

	frappe.provide("frappe.visual.three");
	frappe.provide("frappe.visual.cad");
	frappe.provide("frappe.visual.xr");

	frappe.visual.three._loaded = false;
	frappe.visual.cad._loaded = false;
	frappe.visual.xr._loaded = false;

	/**
	 * Load the 3D engine bundle (Three.js + model viewer + render pipeline).
	 *   const three = await frappe.visual.load3D();
	 *   const viewer = three.viewer("#container", { src: "model.glb" });
	 */
	frappe.visual.load3D = async function () {
		if (!frappe.visual.three._loaded) {
			await frappe.require(THREE_D_BUNDLE);
			frappe.visual.three._loaded = true;
		}
		return frappe.visual.three;
	};

	/**
	 * Load the 2D CAD bundle (floor plan editor, drawing tools).
	 *   const cad = await frappe.visual.loadCAD();
	 *   const editor = cad.editor("#container", { catalog: [...] });
	 */
	frappe.visual.loadCAD = async function () {
		if (!frappe.visual.cad._loaded) {
			await frappe.require(CAD_BUNDLE);
			frappe.visual.cad._loaded = true;
		}
		return frappe.visual.cad;
	};

	/**
	 * Load the WebXR bundle (VR viewer, AR overlay, hand tracking).
	 * Also loads the 3D bundle as a dependency.
	 *   const xr = await frappe.visual.loadXR();
	 *   await xr.startVR(threeEngine);
	 */
	frappe.visual.loadXR = async function () {
		if (!frappe.visual.xr._loaded) {
			// XR depends on 3D engine
			await frappe.visual.load3D();
			await frappe.require(XR_BUNDLE);
			frappe.visual.xr._loaded = true;
		}
		return frappe.visual.xr;
	};

	// Quick shorthands that auto-load the right bundle
	frappe.visual.modelViewer = async function (container, opts = {}) {
		const three = await frappe.visual.load3D();
		return three.viewer(container, opts);
	};

	frappe.visual.sceneBuilder = async function (container, opts = {}) {
		const three = await frappe.visual.load3D();
		return three.builder(container, opts);
	};

	frappe.visual.floorPlan3D = async function (container, opts = {}) {
		const three = await frappe.visual.load3D();
		return three.floorPlan3D(container, opts);
	};

	frappe.visual.floorPlanEditor = async function (container, opts = {}) {
		const cad = await frappe.visual.loadCAD();
		return cad.editor(container, opts);
	};

	frappe.visual.startVR = async function (engine, opts = {}) {
		const xr = await frappe.visual.loadXR();
		return xr.startVR(engine, opts);
	};

	frappe.visual.startAR = async function (engine, opts = {}) {
		const xr = await frappe.visual.loadXR();
		return xr.startAR(engine, opts);
	};

	// ─── Desk Override Layer ──────────────────────────────────────────
	const DESK_BUNDLE = "fv_desk.bundle.js";

	frappe.visual.desk = { _loaded: false };

	/**
	 * Load the Desk override bundle (Page, FormView, ListView, Dialog, etc.).
	 *   const desk = await frappe.visual.loadDesk();
	 *   desk.ListView.create(container, opts);
	 */
	frappe.visual.loadDesk = async function () {
		if (!frappe.visual.desk._loaded) {
			await frappe.require(DESK_BUNDLE);
			frappe.visual.desk._loaded = true;
		}
		return frappe.visual.desk;
	};

	// Convenience shorthands — auto-load desk bundle on first call
	frappe.visual.dialog = async function (opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Dialog.show(opts);
	};
	frappe.visual.confirm = async function (message, onYes, onNo) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Dialog.confirm({ message, onYes, onNo });
	};
	frappe.visual.alert = async function (message, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Dialog.alert({ message, ...opts });
	};
	frappe.visual.prompt = async function (label, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Dialog.prompt({ label, ...opts });
	};
	frappe.visual.listView = async function (container, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.ListView.create(container, opts);
	};
	frappe.visual.formView = async function (frm, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.FormView.enhance(frm, opts);
	};
	frappe.visual.workspaceView = async function (container, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.WorkspaceView.create(container, opts);
	};
	frappe.visual.reportView = async function (container, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.ReportView.create(container, opts);
	};
	frappe.visual.renderField = async function (container, fieldDef, value) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.FieldRenderer.render(container, fieldDef, value);
	};
	frappe.visual.renderForm = async function (container, doctype, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.FieldRenderer.renderForm(container, doctype, opts);
	};
	frappe.visual.page = async function (container, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Page.create(container, opts);
	};
	frappe.visual.navbar = async function (container, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Navbar.create(container, opts);
	};
	frappe.visual.sidebar = async function (container, opts = {}) {
		await frappe.visual.loadDesk();
		return frappe.visual.desk.Sidebar.create(container, opts);
	};

	// ─── ERP Dashboard Layer ─────────────────────────────────────────
	const ERP_BUNDLE = "fv_erp.bundle.js";

	frappe.visual.erp = { _loaded: false };

	/**
	 * Load the ERP visual dashboard bundle (Finance, Stock, HR, etc.).
	 *   const erp = await frappe.visual.loadERP();
	 *   erp.finance("#container", { company: "My Co" });
	 */
	frappe.visual.loadERP = async function () {
		if (!frappe.visual.erp._loaded) {
			await frappe.require(ERP_BUNDLE);
		}
		return frappe.visual.erp;
	};

	// ERP convenience shorthands (auto-load bundle)
	frappe.visual.financeDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.finance(container, opts);
	};
	frappe.visual.stockDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.stock(container, opts);
	};
	frappe.visual.hrDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.hr(container, opts);
	};
	frappe.visual.sellingDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.selling(container, opts);
	};
	frappe.visual.buyingDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.buying(container, opts);
	};
	frappe.visual.manufacturingDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.manufacturing(container, opts);
	};
	frappe.visual.projectsDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.projects(container, opts);
	};
	frappe.visual.crmDashboard = async function (container, opts) {
		await frappe.visual.loadERP();
		return frappe.visual.erp.crm(container, opts);
	};

	if (frappe.boot?.developer_mode) {
		console.log(
			"%c⬡ Frappe Visual%c loaded — desk/erp/3D/CAD/XR bundles available",
			"color:#6366f1;font-weight:bold",
			"color:#94a3b8"
		);
	}
})();
