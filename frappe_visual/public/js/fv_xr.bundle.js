// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Frappe Visual — WebXR Bundle Entry (fv_xr)
 * =============================================
 * Lazy-loaded bundle for VR/AR immersive experiences.
 * Covers Tier 15 (VR Viewer, AR Overlay, Hand Tracking, Teleport Nav, Spatial UI).
 * Requires fv_3d.bundle.js to be loaded first (depends on ThreeEngine).
 *
 * Usage:
 *   await frappe.require("fv_3d.bundle.js");
 *   await frappe.require("fv_xr.bundle.js");
 *   const vr = new frappe.visual.xr.VRViewer(threeEngine);
 */

// ── Tier 15: WebXR & Immersive ───────────────────────────────────
import { VRViewer } from "./xr/vr_viewer";
import { AROverlay } from "./xr/ar_overlay";
import { HandTracking } from "./xr/hand_tracking";
import { TeleportNav } from "./xr/teleport_nav";
import { SpatialUI } from "./xr/spatial_ui";

// ── Register on frappe.visual.xr namespace ───────────────────────
frappe.provide("frappe.visual.xr");

frappe.visual.xr.VRViewer = VRViewer;
frappe.visual.xr.AROverlay = AROverlay;
frappe.visual.xr.HandTracking = HandTracking;
frappe.visual.xr.TeleportNav = TeleportNav;
frappe.visual.xr.SpatialUI = SpatialUI;

// ── Feature Detection ────────────────────────────────────────────

/**
 * Check WebXR support
 */
frappe.visual.xr.isSupported = async function () {
	if (!navigator.xr) return { vr: false, ar: false };
	const [vr, ar] = await Promise.all([
		navigator.xr.isSessionSupported("immersive-vr").catch(() => false),
		navigator.xr.isSessionSupported("immersive-ar").catch(() => false),
	]);
	return { vr, ar };
};

// ── Convenience Shorthands ───────────────────────────────────────

/**
 * Quick VR walkthrough:
 *   await frappe.require("fv_3d.bundle.js");
 *   await frappe.require("fv_xr.bundle.js");
 *   frappe.visual.xr.startVR(threeEngine, { teleport: true, controllers: true });
 */
frappe.visual.xr.startVR = async function (engine, opts = {}) {
	const support = await frappe.visual.xr.isSupported();
	if (!support.vr) {
		frappe.msgprint(__("WebXR VR is not supported on this device/browser."));
		return null;
	}
	const viewer = new VRViewer(engine, opts);
	await viewer.enterVR();
	return viewer;
};

/**
 * Quick AR placement:
 *   frappe.visual.xr.startAR(threeEngine, { modelUrl: "/path/model.glb" });
 */
frappe.visual.xr.startAR = async function (engine, opts = {}) {
	const support = await frappe.visual.xr.isSupported();
	if (!support.ar) {
		frappe.msgprint(__("WebXR AR is not supported on this device/browser."));
		return null;
	}
	const overlay = new AROverlay(engine, opts);
	await overlay.enterAR();
	return overlay;
};

console.log(
	"%c⬡ Frappe Visual XR%c ready — VRViewer · AROverlay · HandTracking · TeleportNav · SpatialUI",
	"color:#ec4899;font-weight:bold",
	"color:#94a3b8"
);
