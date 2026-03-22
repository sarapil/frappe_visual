/**
 * AppMap — Visual Application Map Component
 * ============================================
 * The flagship visual: a full interactive map of a Frappe application
 * showing modules, doctypes, relationships, reports, and more.
 *
 * Features:
 * - Compound nodes: modules contain doctypes
 * - Colored by semantic type (master, transaction, settings, etc.)
 * - Expand/collapse module groups with summary badges
 * - Edge types: link, child-table, reference, dependency
 * - Animated ant-lines on data flow edges
 * - Context menu: Open, Details, Floating Window
 * - Layout switching (hierarchical, force, radial)
 * - Search + type filter
 * - Minimap, zoom controls
 * - Responsive + dark mode + RTL
 */

import { GraphEngine } from "../core/graph_engine";
import { LayoutManager } from "../core/layout_manager";
import { DataAdapter } from "../utils/data_adapter";
import { SVGGenerator } from "../utils/svg_generator";
import { ColorSystem } from "../utils/color_system";

export class AppMap {
	/**
	 * Create an App Map visualization.
	 * @param {string|HTMLElement} container
	 * @param {string} appName - Frappe app name
	 * @param {Object} [opts]
	 */
	static async create(container, appName, opts = {}) {
		const instance = new AppMap(container, appName, opts);
		await instance.init();
		return instance;
	}

	constructor(container, appName, opts) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		this.appName = appName;
		this.opts = opts;
		this.engine = null;
	}

	async init() {
		// Build wrapper structure
		this.container.innerHTML = "";
		this.container.classList.add("fv-app-map", "fv-fullpage");

		// Header
		this.header = document.createElement("div");
		this.header.className = "fv-app-map-header fv-animate-enter";
		this.container.appendChild(this.header);

		// Body (graph container)
		this.body = document.createElement("div");
		this.body.className = "fv-app-map-body";
		this.container.appendChild(this.body);

		// Graph canvas
		this.graphEl = document.createElement("div");
		this.graphEl.className = "fv-graph-container";
		this.graphEl.style.height = "100%";
		this.body.appendChild(this.graphEl);

		// Show loading
		this._showLoading();

		try {
			// Fetch data
			let data;
			if (this.opts.data) {
				data = this.opts.data;
			} else {
				data = await DataAdapter.fetchAppMap(this.appName);
			}

			// Create engine
			this.engine = new GraphEngine({
				container: this.graphEl,
				nodes: data.nodes,
				edges: data.edges,
				layout: this.opts.layout || "fcose",
				minimap: true,
				contextMenu: true,
				expandCollapse: true,
				animate: true,
				antLines: true,
				pulseNodes: true,
				onNodeClick: (nodeData) => this._onNodeClick(nodeData),
				...this.opts,
			});

			// Build toolbar
			const nodeTypes = [...new Set(data.nodes.map((n) => n.type))];
			this._buildHeader(nodeTypes);

			// Animate entrance
			if (this.engine.animEngine) {
				this.engine.animEngine.startAmbient();
			}
		} catch (err) {
			this._showError(err);
		}
	}

	_buildHeader(nodeTypes) {
		this.header.innerHTML = "";

		// Left: title + search
		const left = document.createElement("div");
		left.style.cssText = "display:flex;align-items:center;gap:12px;flex:1;flex-wrap:wrap;";

		const title = document.createElement("h3");
		title.style.cssText = "margin:0;font-size:16px;font-weight:700;color:var(--fv-text-primary);";
		title.textContent = `🗺️ ${this.appName}`;
		left.appendChild(title);

		this.header.appendChild(left);

		// Search bar
		LayoutManager.createSearchBar(left, this.engine, nodeTypes);

		// Right: layout toolbar
		const right = document.createElement("div");
		LayoutManager.createToolbar(right, this.engine, this.opts.layout || "fcose");
		this.header.appendChild(right);

		// View controls on graph
		LayoutManager.createViewControls(this.graphEl, this.engine);
	}

	_onNodeClick(nodeData) {
		if (this.opts.onNodeClick) {
			this.opts.onNodeClick(nodeData);
		}
	}

	_showLoading() {
		this.graphEl.innerHTML = `
			<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--fv-text-tertiary);">
				<div class="fv-spinner"></div>
				<span>${__("Loading application map...")}</span>
			</div>
		`;
	}

	_showError(err) {
		console.error("[AppMap] Error:", err);
		this.graphEl.innerHTML = "";
		const empty = SVGGenerator.emptyState(__("Failed to load app map"));
		const wrap = document.createElement("div");
		wrap.style.cssText =
			"display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;";
		wrap.appendChild(empty);

		const msg = document.createElement("p");
		msg.style.cssText = "color:var(--fv-text-tertiary);font-size:13px;margin:0;";
		msg.textContent = err.message || String(err);
		wrap.appendChild(msg);

		this.graphEl.appendChild(wrap);
	}

	/**
	 * Add nodes dynamically (e.g., load more).
	 */
	addNodes(nodes, edges = []) {
		if (!this.engine) return;
		this.engine.addNodes(nodes);
		if (edges.length) this.engine.addEdges(edges);
		this.engine.runLayout(this.opts.layout || "fcose");
	}

	/**
	 * Destroy and cleanup.
	 */
	destroy() {
		if (this.engine) this.engine.destroy();
		this.container.innerHTML = "";
		this.container.classList.remove("fv-app-map", "fv-fullpage");
	}
}
