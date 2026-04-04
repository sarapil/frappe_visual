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

	frappe.visual.timeline = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Timeline.create(opts);
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
	frappe.visual.heatmap = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Heatmap.create(opts);
	};
	frappe.visual.sparkline = async function (opts = {}) {
		await frappe.visual._load();
		return frappe.visual.Sparkline.create(opts);
	};
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
