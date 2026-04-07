// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Frappe Visual — 2D CAD Bundle Entry (fv_cad)
 * ==============================================
 * Lazy-loaded bundle for 2D floor-plan / CAD editing.
 * Covers Tier 13 (Canvas 2D Engine, Drawing Tools, Snap Engine, Panels).
 * No Three.js dependency — pure HTML5 Canvas 2D.
 *
 * Usage: await frappe.require("fv_cad.bundle.js")
 * Then:  const editor = new frappe.visual.cad.FloorPlanEditor(container, opts)
 */

// ── Tier 13: 2D CAD Engine ───────────────────────────────────────
import { Canvas2DEngine } from "./cad/core/canvas_2d_engine";
import { SnapEngine } from "./cad/tools/snap_engine";
import { DrawingTools } from "./cad/tools/drawing_tools";
import { CatalogPanel } from "./cad/panels/catalog_panel";
import { PropertiesPanel } from "./cad/panels/properties_panel";
import { ToolbarPanel } from "./cad/panels/toolbar_panel";
import { FloorPlanEditor } from "./cad/floor_plan_editor";

// ── Register on frappe.visual.cad namespace ──────────────────────
frappe.provide("frappe.visual.cad");

// Core
frappe.visual.cad.Canvas2DEngine = Canvas2DEngine;
frappe.visual.cad.SnapEngine = SnapEngine;
frappe.visual.cad.DrawingTools = DrawingTools;

// Panels
frappe.visual.cad.CatalogPanel = CatalogPanel;
frappe.visual.cad.PropertiesPanel = PropertiesPanel;
frappe.visual.cad.ToolbarPanel = ToolbarPanel;

// Pre-assembled editor
frappe.visual.cad.FloorPlanEditor = FloorPlanEditor;

// ── Convenience Shorthands ───────────────────────────────────────

/**
 * Quick floor plan editor:
 *   await frappe.require("fv_cad.bundle.js");
 *   const editor = frappe.visual.cad.editor("#container", {
 *     catalog: [...],
 *     gridSize: 20,
 *     onSave: (data) => console.log(data)
 *   });
 */
frappe.visual.cad.editor = function (container, opts) {
	const ed = new FloorPlanEditor(container, opts);
	ed.init();
	return ed;
};

/**
 * Quick read-only canvas viewer (no tools, no panels):
 *   frappe.visual.cad.viewer("#container", { sceneData, gridSize: 20 });
 */
frappe.visual.cad.viewer = function (container, opts) {
	const el = typeof container === "string" ? document.querySelector(container) : container;
	const engine = new Canvas2DEngine(el, {
		gridSize: opts.gridSize || 20,
		width: opts.width || el.clientWidth,
		height: opts.height || el.clientHeight,
	});
	engine.init();
	if (opts.sceneData) {
		engine.loadScene(opts.sceneData);
	}
	return engine;
};

console.log(
	"%c⬡ Frappe Visual CAD%c ready — FloorPlanEditor · Canvas2D · DrawingTools · SnapEngine",
	"color:#10b981;font-weight:bold",
	"color:#94a3b8"
);
