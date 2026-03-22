/**
 * GraphEngine — Core Cytoscape.js Wrapper for Frappe Visual
 * ===========================================================
 * Manages a Cytoscape instance with Frappe-integrated features:
 * - Auto-theming (dark/light/RTL)
 * - Compound nodes with expand/collapse
 * - Context menus per node type
 * - Minimap integration
 * - GSAP-powered edge animations (ant-line, pulse)
 * - Summary badges on collapsed groups
 * - Frappe data binding
 */

import { ColorSystem } from "../utils/color_system";
import { AnimationEngine } from "./animation_engine";
import { ThemeManager } from "./theme_manager";

const DEFAULT_STYLE = [
	// ── Base Node ──
	{
		selector: "node",
		style: {
			label: "data(label)",
			"text-valign": "center",
			"text-halign": "center",
			"text-wrap": "wrap",
			"text-max-width": "120px",
			"font-size": "12px",
			"font-family": "Inter, -apple-system, sans-serif",
			"background-color": "data(color)",
			"border-width": 2,
			"border-color": "data(borderColor)",
			color: "var(--fv-text-primary, #1e293b)",
			width: "data(width)",
			height: "data(height)",
			shape: "data(shape)",
			"overlay-opacity": 0,
			"transition-property":
				"background-color, border-color, width, height, opacity",
			"transition-duration": "0.3s",
		},
	},

	// ── Compound / Group Node ──
	{
		selector: "node:parent",
		style: {
			"background-opacity": 0.08,
			"background-color": "data(color)",
			"border-width": 2,
			"border-style": "dashed",
			"border-color": "data(borderColor)",
			"border-opacity": 0.6,
			"text-valign": "top",
			"text-halign": "center",
			"font-size": "14px",
			"font-weight": "bold",
			padding: "20px",
			shape: "roundrectangle",
		},
	},

	// ── Collapsed Group ──
	{
		selector: "node.fv-collapsed",
		style: {
			shape: "roundrectangle",
			"background-opacity": 0.15,
			"border-style": "solid",
			"border-width": 3,
			width: 180,
			height: 60,
			"font-size": "13px",
		},
	},

	// ── Edge Base ──
	{
		selector: "edge",
		style: {
			width: "data(width)",
			"line-color": "data(color)",
			"target-arrow-color": "data(color)",
			"target-arrow-shape": "triangle",
			"curve-style": "bezier",
			"arrow-scale": 0.8,
			opacity: 0.7,
			"transition-property": "line-color, opacity, width",
			"transition-duration": "0.3s",
		},
	},

	// ── Active / Highlighted ──
	{
		selector: "node:selected",
		style: {
			"border-width": 4,
			"border-color": "var(--fv-accent, #6366f1)",
			"box-shadow": "0 0 20px rgba(99,102,241,0.4)",
		},
	},
	{
		selector: "edge:selected",
		style: {
			width: 4,
			opacity: 1,
			"line-color": "var(--fv-accent, #6366f1)",
			"target-arrow-color": "var(--fv-accent, #6366f1)",
		},
	},

	// ── Hover ──
	{
		selector: "node.fv-hover",
		style: {
			"border-width": 3,
			"border-color": "var(--fv-accent, #6366f1)",
			"background-opacity": 0.9,
		},
	},
	{
		selector: "edge.fv-hover",
		style: {
			width: 3,
			opacity: 1,
		},
	},

	// ── Dimmed (during focus) ──
	{
		selector: ".fv-dimmed",
		style: {
			opacity: 0.15,
		},
	},

	// ── Ant-line Edge (VPN, sync, etc.) ──
	{
		selector: "edge.fv-ant-line",
		style: {
			"line-style": "dashed",
			"line-dash-pattern": [6, 3],
		},
	},

	// ── Pulse Node (status indicator) ──
	{
		selector: "node.fv-pulse",
		style: {
			"border-width": 3,
		},
	},

	// ── Status Colors ──
	{
		selector: "node.fv-status-active",
		style: { "border-color": "#10b981" },
	},
	{
		selector: "node.fv-status-warning",
		style: { "border-color": "#f59e0b" },
	},
	{
		selector: "node.fv-status-error",
		style: { "border-color": "#ef4444" },
	},
	{
		selector: "node.fv-status-disabled",
		style: { "border-color": "#94a3b8", opacity: 0.5 },
	},
];

export class GraphEngine {
	/**
	 * @param {Object} opts
	 * @param {string|HTMLElement} opts.container - CSS selector or element
	 * @param {Array} [opts.nodes] - Initial nodes
	 * @param {Array} [opts.edges] - Initial edges
	 * @param {string} [opts.layout] - Layout name (fcose|elk-layered|elk-mrtree|elk-stress|breadthfirst|circle|concentric|grid)
	 * @param {Object} [opts.layoutOptions] - Extra layout options
	 * @param {boolean} [opts.minimap] - Show minimap
	 * @param {boolean} [opts.contextMenu] - Enable context menus
	 * @param {boolean} [opts.expandCollapse] - Enable expand/collapse on compound nodes
	 * @param {boolean} [opts.animate] - Enable animations
	 * @param {boolean} [opts.antLines] - Enable ant-line animation on dashed edges
	 * @param {boolean} [opts.pulseNodes] - Enable pulse animation on status nodes
	 * @param {Function} [opts.onNodeClick] - Click handler
	 * @param {Function} [opts.onNodeDblClick] - Double-click handler
	 * @param {Function} [opts.onEdgeClick] - Edge click handler
	 * @param {Object} [opts.style] - Additional Cytoscape styles
	 * @param {Object} [opts.nodeTypes] - Custom node type definitions
	 */
	constructor(opts) {
		this.opts = Object.assign(
			{
				layout: "fcose",
				minimap: true,
				contextMenu: true,
				expandCollapse: true,
				animate: true,
				antLines: true,
				pulseNodes: true,
			},
			opts
		);

		this.container =
			typeof opts.container === "string"
				? document.querySelector(opts.container)
				: opts.container;

		if (!this.container) {
			throw new Error(
				`[Frappe Visual] Container not found: ${opts.container}`
			);
		}

		// Ensure container has proper sizing
		if (!this.container.style.height && !this.container.offsetHeight) {
			this.container.style.height = "600px";
		}
		this.container.classList.add("fv-graph-container");

		this._initCytoscape();
		this._setupInteractions();

		if (this.opts.minimap) this._initMinimap();
		if (this.opts.expandCollapse) this._initExpandCollapse();
		if (this.opts.animate) this._initAnimations();
	}

	// ── Cytoscape Initialization ─────────────────────────────────
	_initCytoscape() {
		const cytoscape = frappe.visual.cytoscape;

		// Merge default + custom styles
		const styles = [...DEFAULT_STYLE];
		if (this.opts.style) {
			styles.push(...(Array.isArray(this.opts.style) ? this.opts.style : [this.opts.style]));
		}

		// Build elements
		const elements = this._buildElements(
			this.opts.nodes || [],
			this.opts.edges || []
		);

		this.cy = cytoscape({
			container: this.container,
			elements: elements,
			style: styles,
			layout: { name: "preset" }, // We'll run layout after
			wheelSensitivity: 0.3,
			minZoom: 0.1,
			maxZoom: 4,
			boxSelectionEnabled: true,
			selectionType: "single",
		});

		// Store reference
		this.container._fvEngine = this;

		// Run initial layout
		if (elements.length > 0) {
			this.runLayout(this.opts.layout, this.opts.layoutOptions);
		}
	}

	// ── Element Builder ──────────────────────────────────────────
	_buildElements(nodes, edges) {
		const elements = [];

		for (const node of nodes) {
			const type = node.type || "default";
			const typeConfig = ColorSystem.getNodeType(type);

			elements.push({
				group: "nodes",
				data: {
					id: node.id,
					label: node.label || node.name || node.id,
					parent: node.parent || undefined,
					type: type,
					doctype: node.doctype || null,
					docname: node.docname || null,
					color: node.color || typeConfig.bg,
					borderColor: node.borderColor || typeConfig.border,
					width: node.width || typeConfig.width || 140,
					height: node.height || typeConfig.height || 50,
					shape: node.shape || typeConfig.shape || "roundrectangle",
					icon: node.icon || typeConfig.icon || null,
					badge: node.badge || null,
					status: node.status || null,
					meta: node.meta || {},
					childCount: node.childCount || 0,
					// For summary badges
					summary: node.summary || null,
				},
				classes: [
					`fv-type-${type}`,
					node.status ? `fv-status-${node.status}` : "",
					node.collapsed ? "fv-collapsed" : "",
					...(node.classes || []),
				]
					.filter(Boolean)
					.join(" "),
			});
		}

		for (const edge of edges) {
			const edgeType = edge.type || "default";
			const edgeConfig = ColorSystem.getEdgeType(edgeType);

			elements.push({
				group: "edges",
				data: {
					id: edge.id || `${edge.source}-${edge.target}`,
					source: edge.source,
					target: edge.target,
					label: edge.label || "",
					type: edgeType,
					color: edge.color || edgeConfig.color,
					width: edge.width || edgeConfig.width || 2,
					meta: edge.meta || {},
				},
				classes: [
					`fv-edge-${edgeType}`,
					edge.animated ? "fv-ant-line" : "",
					...(edge.classes || []),
				]
					.filter(Boolean)
					.join(" "),
			});
		}

		return elements;
	}

	// ── Interactions ─────────────────────────────────────────────
	_setupInteractions() {
		const cy = this.cy;

		// Hover effects
		cy.on("mouseover", "node", (evt) => {
			evt.target.addClass("fv-hover");
			this._highlightNeighborhood(evt.target);
		});

		cy.on("mouseout", "node", (evt) => {
			evt.target.removeClass("fv-hover");
			this._clearHighlight();
		});

		cy.on("mouseover", "edge", (evt) => evt.target.addClass("fv-hover"));
		cy.on("mouseout", "edge", (evt) => evt.target.removeClass("fv-hover"));

		// Click handlers
		if (this.opts.onNodeClick) {
			cy.on("tap", "node", (evt) => {
				this.opts.onNodeClick(evt.target.data(), evt);
			});
		}

		if (this.opts.onNodeDblClick) {
			cy.on("dbltap", "node", (evt) => {
				this.opts.onNodeDblClick(evt.target.data(), evt);
			});
		}

		if (this.opts.onEdgeClick) {
			cy.on("tap", "edge", (evt) => {
				this.opts.onEdgeClick(evt.target.data(), evt);
			});
		}

		// Default: double-click opens Frappe form
		if (!this.opts.onNodeDblClick) {
			cy.on("dbltap", "node", (evt) => {
				const data = evt.target.data();
				if (data.doctype && data.docname) {
					frappe.set_route("Form", data.doctype, data.docname);
				} else if (data.doctype) {
					frappe.set_route("List", data.doctype);
				}
			});
		}

		// Context menu (right-click)
		if (this.opts.contextMenu) {
			this._initContextMenu();
		}
	}

	// ── Neighborhood Highlight ───────────────────────────────────
	_highlightNeighborhood(node) {
		const neighborhood = node.closedNeighborhood();
		this.cy.elements().not(neighborhood).addClass("fv-dimmed");
	}

	_clearHighlight() {
		this.cy.elements().removeClass("fv-dimmed");
	}

	// ── Context Menu ─────────────────────────────────────────────
	_initContextMenu() {
		const engine = this;
		this.cy.cxtmenu({
			selector: "node",
			commands: [
				{
					content: '<span class="fv-ctx-icon">📋</span> Details',
					select: function (ele) {
						engine._showNodeDetails(ele);
					},
				},
				{
					content: '<span class="fv-ctx-icon">🔗</span> Connections',
					select: function (ele) {
						engine._focusNode(ele);
					},
				},
				{
					content: '<span class="fv-ctx-icon">📂</span> Open',
					select: function (ele) {
						const d = ele.data();
						if (d.doctype) {
							frappe.set_route(
								d.docname ? "Form" : "List",
								d.doctype,
								d.docname || ""
							);
						}
					},
				},
				{
					content: '<span class="fv-ctx-icon">🪟</span> Window',
					select: function (ele) {
						engine._openFloatingWindow(ele);
					},
				},
			],
			fillColor: "rgba(30, 41, 59, 0.92)",
			activeFillColor: "rgba(99, 102, 241, 0.9)",
			activePadding: 8,
			indicatorSize: 14,
			separatorWidth: 3,
			spotlightPadding: 6,
			adaptativeNodeSpotlightRadius: true,
			minSpotlightRadius: 18,
			maxSpotlightRadius: 38,
			itemTextShadowColor: "transparent",
			zIndex: 9999,
		});
	}

	// ── Node Details Panel ───────────────────────────────────────
	_showNodeDetails(ele) {
		const data = ele.data();
		const neighbors = ele.neighborhood("node");
		const edgesIn = ele.connectedEdges('[target = "' + data.id + '"]');
		const edgesOut = ele.connectedEdges('[source = "' + data.id + '"]');

		let html = `
			<div class="fv-detail-panel">
				<div class="fv-detail-header" style="border-left: 4px solid ${data.borderColor}">
					<h3>${data.label}</h3>
					<span class="fv-detail-type">${data.type}</span>
					${data.status ? `<span class="fv-badge fv-badge-${data.status}">${data.status}</span>` : ""}
				</div>
				<div class="fv-detail-body">
					${data.doctype ? `<div class="fv-detail-row"><strong>${__("DocType")}:</strong> ${data.doctype}</div>` : ""}
					${data.docname ? `<div class="fv-detail-row"><strong>${__("Name")}:</strong> ${data.docname}</div>` : ""}
					<div class="fv-detail-row"><strong>${__("Connections")}:</strong> ${neighbors.length}</div>
					<div class="fv-detail-row"><strong>${__("Incoming")}:</strong> ${edgesIn.length} · <strong>${__("Outgoing")}:</strong> ${edgesOut.length}</div>
				</div>
				${
					neighbors.length > 0
						? `<div class="fv-detail-neighbors">
						<h4>${__("Connected to")}</h4>
						<ul>${neighbors.map((n) => `<li style="border-left: 3px solid ${n.data("borderColor")}">${n.data("label")}</li>`).join("")}</ul>
					</div>`
						: ""
				}
			</div>
		`;

		frappe.msgprint({
			title: data.label,
			message: html,
			indicator: data.status === "active" ? "green" : data.status === "error" ? "red" : "blue",
			wide: true,
		});
	}

	// ── Floating Window ──────────────────────────────────────────
	_openFloatingWindow(ele) {
		if (frappe.visual.FloatingWindow) {
			new frappe.visual.FloatingWindow({
				title: ele.data("label"),
				color: ele.data("borderColor"),
				content: this._buildWindowContent(ele),
				width: 400,
				height: 300,
			});
		}
	}

	_buildWindowContent(ele) {
		const data = ele.data();
		const div = document.createElement("div");
		div.className = "fv-window-content";
		div.innerHTML = `
			<div class="fv-window-stat">
				<span class="fv-stat-label">${__("Type")}</span>
				<span class="fv-stat-value">${data.type}</span>
			</div>
			${data.summary ? Object.entries(data.summary).map(([k, v]) => `
				<div class="fv-window-stat">
					<span class="fv-stat-label">${k}</span>
					<span class="fv-stat-value">${v}</span>
				</div>
			`).join("") : ""}
			${data.doctype ? `<button class="btn btn-xs btn-primary-dark mt-2" onclick="frappe.set_route('List','${data.doctype}')">${__("Open List")}</button>` : ""}
		`;
		return div;
	}

	// ── Focus on a node ──────────────────────────────────────────
	_focusNode(ele) {
		const neighborhood = ele.closedNeighborhood();
		this.cy.elements().not(neighborhood).addClass("fv-dimmed");

		this.cy.animate({
			fit: { eles: neighborhood, padding: 50 },
			duration: 600,
			easing: "ease-out-cubic",
		});

		// Auto-clear after 5 seconds
		setTimeout(() => this._clearHighlight(), 5000);
	}

	// ── Minimap ──────────────────────────────────────────────────
	_initMinimap() {
		const navContainer = document.createElement("div");
		navContainer.className = "fv-minimap";
		this.container.appendChild(navContainer);

		try {
			this.navigator = this.cy.navigator({
				container: navContainer,
				viewLiveFramerate: 0,
				thumbnailEventFramerate: 15,
				thumbnailLiveFramerate: false,
				dblClickDelay: 200,
			});
		} catch (e) {
			console.warn("[FV] Minimap init failed:", e);
		}
	}

	// ── Expand / Collapse ────────────────────────────────────────
	_initExpandCollapse() {
		try {
			this.ecAPI = this.cy.expandCollapse({
				layoutBy: null,
				fisheye: true,
				animate: true,
				animationDuration: 400,
				undoable: false,
				cueEnabled: true,
				expandCollapseCuePosition: "top-left",
				expandCollapseCueSize: 14,
				expandCollapseCueLineSize: 14,
				expandCueImage: undefined,
				collapseCueImage: undefined,
				zIndex: 999,
			});
		} catch (e) {
			console.warn("[FV] Expand/Collapse init failed:", e);
		}
	}

	// ── Animations ───────────────────────────────────────────────
	_initAnimations() {
		this.animEngine = new AnimationEngine(this.cy, this.container);

		if (this.opts.antLines) {
			this.animEngine.startAntLines();
		}
		if (this.opts.pulseNodes) {
			this.animEngine.startPulse();
		}
	}

	// ── Layout ───────────────────────────────────────────────────
	runLayout(name, options = {}) {
		const layoutConfigs = {
			fcose: {
				name: "fcose",
				animate: true,
				animationDuration: 800,
				animationEasing: "ease-out",
				quality: "proof",
				randomize: true,
				nodeSeparation: 120,
				idealEdgeLength: 150,
				nodeRepulsion: 8500,
				edgeElasticity: 0.45,
				nestingFactor: 0.1,
				gravity: 0.25,
				gravityRange: 3.8,
				...options,
			},
			"elk-layered": {
				name: "elk",
				elk: {
					algorithm: "layered",
					"elk.direction": frappe.visual.isRTL() ? "LEFT" : "RIGHT",
					"elk.spacing.nodeNode": "80",
					"elk.layered.spacing.nodeNodeBetweenLayers": "100",
					...options,
				},
				animate: true,
				animationDuration: 800,
			},
			"elk-mrtree": {
				name: "elk",
				elk: {
					algorithm: "mrtree",
					"elk.direction": "DOWN",
					"elk.spacing.nodeNode": "60",
					...options,
				},
				animate: true,
				animationDuration: 800,
			},
			"elk-stress": {
				name: "elk",
				elk: {
					algorithm: "stress",
					"elk.stress.desiredEdgeLength": "150",
					...options,
				},
				animate: true,
				animationDuration: 800,
			},
			"elk-radial": {
				name: "elk",
				elk: {
					algorithm: "radial",
					"elk.radial.compactor": "WEDGE_COMPACTION",
					...options,
				},
				animate: true,
				animationDuration: 800,
			},
			breadthfirst: {
				name: "breadthfirst",
				directed: true,
				spacingFactor: 1.5,
				animate: true,
				animationDuration: 800,
				...options,
			},
			circle: {
				name: "circle",
				animate: true,
				animationDuration: 800,
				spacingFactor: 1.2,
				...options,
			},
			concentric: {
				name: "concentric",
				animate: true,
				animationDuration: 800,
				minNodeSpacing: 80,
				...options,
			},
			grid: {
				name: "grid",
				animate: true,
				animationDuration: 800,
				condense: true,
				...options,
			},
		};

		const config = layoutConfigs[name] || layoutConfigs.fcose;
		const layout = this.cy.layout(config);
		layout.run();
		return layout;
	}

	// ── Data Operations ──────────────────────────────────────────
	addNodes(nodes) {
		const elements = this._buildElements(nodes, []);
		this.cy.add(elements);
	}

	addEdges(edges) {
		const elements = this._buildElements([], edges);
		this.cy.add(elements);
	}

	removeNode(id) {
		const node = this.cy.getElementById(id);
		if (node.length) node.remove();
	}

	updateNodeData(id, data) {
		const node = this.cy.getElementById(id);
		if (node.length) {
			Object.entries(data).forEach(([k, v]) => node.data(k, v));
		}
	}

	getNode(id) {
		return this.cy.getElementById(id);
	}

	// ── Search & Filter ──────────────────────────────────────────
	search(query) {
		const q = query.toLowerCase();
		this.cy.elements().removeClass("fv-dimmed fv-hover");

		if (!q) return;

		const matches = this.cy.nodes().filter((node) => {
			const label = (node.data("label") || "").toLowerCase();
			const type = (node.data("type") || "").toLowerCase();
			return label.includes(q) || type.includes(q);
		});

		this.cy.elements().not(matches.closedNeighborhood()).addClass("fv-dimmed");

		if (matches.length > 0) {
			this.cy.animate({
				fit: { eles: matches, padding: 80 },
				duration: 500,
			});
		}
	}

	filterByType(type) {
		this.cy.elements().removeClass("fv-dimmed");
		if (!type) return;
		this.cy
			.nodes()
			.not(`[type = "${type}"]`)
			.addClass("fv-dimmed");
	}

	clearFilter() {
		this.cy.elements().removeClass("fv-dimmed");
	}

	// ── Export ────────────────────────────────────────────────────
	toSVG() {
		return this.cy.svg({ full: true, scale: 2, bg: "transparent" });
	}

	toPNG() {
		return this.cy.png({ full: true, scale: 2, bg: "white" });
	}

	toJSON() {
		return this.cy.json();
	}

	// ── Viewport ─────────────────────────────────────────────────
	fit(padding = 40) {
		this.cy.fit(undefined, padding);
	}

	center() {
		this.cy.center();
	}

	zoomIn() {
		this.cy.zoom(this.cy.zoom() * 1.2);
	}

	zoomOut() {
		this.cy.zoom(this.cy.zoom() / 1.2);
	}

	// ── Cleanup ──────────────────────────────────────────────────
	destroy() {
		if (this.animEngine) this.animEngine.destroy();
		if (this.navigator) this.navigator.destroy();
		if (this.cy) this.cy.destroy();
		this.container.classList.remove("fv-graph-container");
		delete this.container._fvEngine;
	}
}
