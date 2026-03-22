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

// Expose libraries for advanced usage
frappe.visual.cytoscape = cytoscape;
frappe.visual.ELK = ELK;
frappe.visual.gsap = gsap;
frappe.visual.Draggable = Draggable;
frappe.visual.lottie = lottie;

// ── Initialize Theme ─────────────────────────────────────────────
ThemeManager.init();

console.log(
	"%c⬡ Frappe Visual Engine%c ready — Cytoscape + ELK + GSAP",
	"color:#6366f1;font-weight:bold",
	"color:#94a3b8"
);
