// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Frappe Visual — 3D Bundle Entry (fv_3d)
 * =========================================
 * Lazy-loaded bundle for Three.js-based 3D visualization.
 * Covers Tier 11 (Core Engine), Tier 12 (Visual Components), Tier 14 (Render Pipeline).
 *
 * Usage: await frappe.require("fv_3d.bundle.js")
 * Then:  const engine = new frappe.visual.three.ThreeEngine(container)
 */

import * as THREE from "three";

// ── Tier 11: 3D Core Engine ──────────────────────────────────────
import { ThreeEngine } from "./three/core/three_engine";
import { ModelLoader } from "./three/core/model_loader";
import { SceneControls } from "./three/core/scene_controls";
import { ThreeExporter } from "./three/core/three_exporter";
import { SceneGraph3D } from "./three/core/scene_graph_3d";
import { LightingRig } from "./three/core/lighting_rig";
import { MaterialLibrary } from "./three/core/material_library";
import { GeometryUtils } from "./three/utils/geometry_utils";

// ── Tier 12: 3D Visual Components ────────────────────────────────
import { ModelViewer } from "./three/views/model_viewer";
import { SceneBuilder } from "./three/views/scene_builder";
import { FloorPlan3D } from "./three/views/floor_plan_3d";
import { ProductConfigurator } from "./three/views/product_configurator";
import { Annotation3D } from "./three/views/annotation_3d";
import { MeasureTool3D } from "./three/views/measure_tool_3d";
import { DataViz3D } from "./three/views/data_viz_3d";
import { ModelCompare } from "./three/views/model_compare";
import { PointCloud } from "./three/views/point_cloud";

// ── Tier 14: Render Pipeline ─────────────────────────────────────
import { RenderConfig } from "./three/render/render_config";
import { ClientRenderer } from "./three/render/client_renderer";
import { ExportManager } from "./three/render/export_manager";

// ── Domain Overlays ──────────────────────────────────────────────
import { ConstructionOverlay } from "./three/overlays/construction_overlay";
import { InteriorOverlay } from "./three/overlays/interior_overlay";
import { HospitalityOverlay } from "./three/overlays/hospitality_overlay";
import { CoworkingOverlay } from "./three/overlays/coworking_overlay";

// ── Register on frappe.visual.three namespace ────────────────────
frappe.provide("frappe.visual.three");

// Expose raw THREE for advanced usage
frappe.visual.three.THREE = THREE;

// Tier 11 — Core
frappe.visual.three.ThreeEngine = ThreeEngine;
frappe.visual.three.ModelLoader = ModelLoader;
frappe.visual.three.SceneControls = SceneControls;
frappe.visual.three.ThreeExporter = ThreeExporter;
frappe.visual.three.SceneGraph3D = SceneGraph3D;
frappe.visual.three.LightingRig = LightingRig;
frappe.visual.three.MaterialLibrary = MaterialLibrary;
frappe.visual.three.GeometryUtils = GeometryUtils;

// Tier 12 — Views
frappe.visual.three.ModelViewer = ModelViewer;
frappe.visual.three.SceneBuilder = SceneBuilder;
frappe.visual.three.FloorPlan3D = FloorPlan3D;
frappe.visual.three.ProductConfigurator = ProductConfigurator;
frappe.visual.three.Annotation3D = Annotation3D;
frappe.visual.three.MeasureTool3D = MeasureTool3D;
frappe.visual.three.DataViz3D = DataViz3D;
frappe.visual.three.ModelCompare = ModelCompare;
frappe.visual.three.PointCloud = PointCloud;

// Tier 14 — Render
frappe.visual.three.RenderConfig = RenderConfig;
frappe.visual.three.ClientRenderer = ClientRenderer;
frappe.visual.three.ExportManager = ExportManager;

// Domain Overlays
frappe.visual.three.ConstructionOverlay = ConstructionOverlay;
frappe.visual.three.InteriorOverlay = InteriorOverlay;
frappe.visual.three.HospitalityOverlay = HospitalityOverlay;
frappe.visual.three.CoworkingOverlay = CoworkingOverlay;

// ── Convenience Shorthands ───────────────────────────────────────

/**
 * Quick model viewer:
 *   await frappe.require("fv_3d.bundle.js");
 *   frappe.visual.three.viewer("#container", { src: "/path/model.glb" });
 */
frappe.visual.three.viewer = function (container, opts) {
	return new ModelViewer(container, opts).init();
};

/**
 * Quick scene builder:
 *   frappe.visual.three.builder("#container", { lighting: "studio" });
 */
frappe.visual.three.builder = function (container, opts) {
	return new SceneBuilder(container, opts).init();
};

/**
 * Quick floor plan 3D:
 *   frappe.visual.three.floorPlan3D("#container", { sceneData, wallHeight: 3 });
 */
frappe.visual.three.floorPlan3D = function (container, opts) {
	return new FloorPlan3D(container, opts).init();
};

/**
 * Quick product configurator:
 *   frappe.visual.three.configurator("#container", { productUrl, variants });
 */
frappe.visual.three.configurator = function (container, opts) {
	return new ProductConfigurator(container, opts).init();
};

/**
 * Quick 3D data visualization:
 *   frappe.visual.three.dataViz("#container", { type: "bar3d", data });
 */
frappe.visual.three.dataViz = function (container, opts) {
	return new DataViz3D(container, opts).init();
};

/**
 * Quick client render:
 *   frappe.visual.three.render(engine, { quality: "high", output: "png" });
 */
frappe.visual.three.render = async function (engine, opts) {
	const config = new RenderConfig(opts);
	const renderer = new ClientRenderer(engine, config);
	return renderer.render();
};

console.log(
	"%c⬡ Frappe Visual 3D%c ready — Three.js · ModelViewer · SceneBuilder · FloorPlan3D · Render Pipeline",
	"color:#6366f1;font-weight:bold",
	"color:#94a3b8"
);
