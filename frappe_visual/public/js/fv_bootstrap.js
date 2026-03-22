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
