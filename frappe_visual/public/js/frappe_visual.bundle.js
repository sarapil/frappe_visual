/**
 * Frappe Visual — Main Bundle Entry
 * ==================================
 * This file is the esbuild entry point. It imports all core modules,
 * registers them under the frappe.visual namespace, and initializes
 * the global theming system.
 *
 * Build: bench build --app frappe_visual
 * Lazy-load: await frappe.require("frappe_visual.bundle.js")
 */

// ── Core Libraries ───────────────────────────────────────────────
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import elk from "cytoscape-elk";
import cxtmenu from "cytoscape-cxtmenu";
import expandCollapse from "cytoscape-expand-collapse";
import navigator from "cytoscape-navigator";
import nodeHtmlLabel from "cytoscape-node-html-label";
import ELK from "elkjs/lib/elk.bundled.js";
import { gsap, Draggable } from "gsap/all";
import lottie from "lottie-web";

// ── Register Cytoscape Extensions ────────────────────────────────
cytoscape.use(fcose);
cytoscape.use(elk);
cytoscape.use(cxtmenu);
cytoscape.use(expandCollapse);
cytoscape.use(navigator);
cytoscape.use(nodeHtmlLabel);

// ── Framework Modules ────────────────────────────────────────────
import { GraphEngine } from "./core/graph_engine";
import { LayoutManager } from "./core/layout_manager";
import { AnimationEngine } from "./core/animation_engine";
import { ThemeManager } from "./core/theme_manager";
import { ContextMenu } from "./core/context_menu";
import { Minimap } from "./core/minimap";
import { FloatingWindow } from "./core/floating_window";
import { ColorSystem } from "./utils/color_system";
import { DataAdapter } from "./utils/data_adapter";
import { SVGGenerator } from "./utils/svg_generator";

// ── Components ───────────────────────────────────────────────────
import { AppMap } from "./components/app_map";
import { RelationshipExplorer } from "./components/relationship_explorer";
import { Storyboard } from "./components/storyboard_wizard";
import { VisualDashboard } from "./components/visual_dashboard";
import { ComboGroup } from "./components/combo_group";
import { SummaryBadge } from "./components/summary_badge";
import { KanbanBoard } from "./components/kanban_board";
import { VisualCalendar } from "./components/visual_calendar";
import { VisualGantt } from "./components/visual_gantt";
import { VisualTreeView } from "./components/visual_tree";
import { VisualMap } from "./components/visual_map";
import { VisualGallery } from "./components/visual_gallery";
import { VisualFormDashboard } from "./components/visual_form_dashboard";

// ── Pro Enhancement Components ───────────────────────────────────
import { VisualMapPro } from "./components/visual_map_pro";
import { VisualChartPro } from "./components/visual_chart_pro";
import { AppShell } from "./components/app_shell";
import { VisualFormPro } from "./components/visual_form_pro";
import { VisualListPro } from "./components/visual_list_pro";
import { VisualDashboardPro } from "./components/visual_dashboard_pro";
import { VisualWorkspacePro } from "./components/visual_workspace_pro";

// ── Data Visualization Suite ─────────────────────────────────────
import { VisualTimelinePro } from "./components/visual_timeline_pro";
import { VisualFlowPro } from "./components/visual_flow_pro";
import { VisualOrgChart } from "./components/visual_org_chart";
import { VisualSankey } from "./components/visual_sankey";
import { VisualTreemap } from "./components/visual_treemap";
import { VisualHeatmapCalendar } from "./components/visual_heatmap_calendar";
import { VisualFunnel } from "./components/visual_funnel";
import { VisualRadar } from "./components/visual_radar";
import { VisualReportPro } from "./components/visual_report_pro";

// ── Utility Modules (auto-init) ──────────────────────────────────
import "./utils/bilingual_tooltip";
import "./utils/visual_page_templates";
import "./utils/app_page_generator";
import "./utils/doctype_visualizer";
import "./utils/form_enhancer";
import "./utils/list_enhancer";
import "./utils/workspace_enhancer";

// ── Register on frappe.visual namespace ──────────────────────────
frappe.provide("frappe.visual");

// Core
frappe.visual.GraphEngine = GraphEngine;
frappe.visual.LayoutManager = LayoutManager;
frappe.visual.AnimationEngine = AnimationEngine;
frappe.visual.ThemeManager = ThemeManager;
frappe.visual.ContextMenu = ContextMenu;
frappe.visual.Minimap = Minimap;
frappe.visual.FloatingWindow = FloatingWindow;

// Utils
frappe.visual.ColorSystem = ColorSystem;
frappe.visual.DataAdapter = DataAdapter;
frappe.visual.SVGGenerator = SVGGenerator;

// Components
frappe.visual.AppMap = AppMap;
frappe.visual.RelationshipExplorer = RelationshipExplorer;
frappe.visual.Storyboard = Storyboard;
frappe.visual.VisualDashboard = VisualDashboard;
frappe.visual.ComboGroup = ComboGroup;
frappe.visual.SummaryBadge = SummaryBadge;
frappe.visual.KanbanBoard = KanbanBoard;
frappe.visual.VisualCalendar = VisualCalendar;
frappe.visual.VisualGantt = VisualGantt;
frappe.visual.VisualTreeView = VisualTreeView;
frappe.visual.VisualMap = VisualMap;
frappe.visual.VisualGallery = VisualGallery;
frappe.visual.VisualFormDashboard = VisualFormDashboard;

// Pro Enhancements
frappe.visual.MapPro = VisualMapPro;
frappe.visual.ChartPro = VisualChartPro;
frappe.visual.AppShell = AppShell;
frappe.visual.FormPro = VisualFormPro;
frappe.visual.ListPro = VisualListPro;
frappe.visual.DashboardPro = VisualDashboardPro;
frappe.visual.WorkspacePro = VisualWorkspacePro;

// Data Viz Suite
frappe.visual.TimelinePro = VisualTimelinePro;
frappe.visual.FlowPro = VisualFlowPro;
frappe.visual.OrgChart = VisualOrgChart;
frappe.visual.Sankey = VisualSankey;
frappe.visual.Treemap = VisualTreemap;
frappe.visual.HeatmapCalendar = VisualHeatmapCalendar;
frappe.visual.Funnel = VisualFunnel;
frappe.visual.Radar = VisualRadar;
frappe.visual.ReportPro = VisualReportPro;

// Expose libraries for advanced usage
frappe.visual.cytoscape = cytoscape;
frappe.visual.ELK = ELK;
frappe.visual.gsap = gsap;
frappe.visual.Draggable = Draggable;
frappe.visual.lottie = lottie;

// ── Initialize Theme ─────────────────────────────────────────────
ThemeManager.init();

console.log(
	"%c⬡ Frappe Visual Engine%c ready — 30+ components · Cytoscape · ELK · ECharts · GSAP · Leaflet",
	"color:#6366f1;font-weight:bold",
	"color:#94a3b8"
);
