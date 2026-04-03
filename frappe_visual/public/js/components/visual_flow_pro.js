/**
 * VisualFlowPro — Process & Workflow Flow Diagrams
 * ===================================================
 * Renders interactive process flows, workflow diagrams, and swimlane charts.
 * Pure SVG rendering with GSAP animations — no external graph library needed.
 *
 * Features:
 *   • Auto-layout: horizontal (LR) or vertical (TB) with smart edge routing
 *   • Swimlanes for multi-role/department workflows
 *   • Animated data flow particles along edges
 *   • Node types: start, end, process, decision, subprocess, delay, data, manual
 *   • Edge types: solid, dashed, animated
 *   • Frappe Workflow integration: loads from Workflow DocType
 *   • Interactive: click nodes, hover tooltips, zoom/pan
 *   • Status highlighting: color nodes by completion/active state
 *   • Export to SVG / PNG
 *   • RTL + dark mode support
 *
 * Usage:
 *   frappe.visual.FlowPro.create('#container', {
 *     nodes: [
 *       { id: 'start', type: 'start', label: 'Begin' },
 *       { id: 'review', type: 'process', label: 'Review', lane: 'Manager' },
 *       { id: 'decide', type: 'decision', label: 'Approved?', lane: 'Manager' },
 *       { id: 'done', type: 'end', label: 'Complete' },
 *     ],
 *     edges: [
 *       { from: 'start', to: 'review' },
 *       { from: 'review', to: 'decide' },
 *       { from: 'decide', to: 'done', label: 'Yes' },
 *     ],
 *   });
 *
 *   // Auto-load from Frappe Workflow:
 *   frappe.visual.FlowPro.fromWorkflow('#container', 'Sales Order');
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualFlowPro {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("FlowPro: container not found");

		this.config = Object.assign({
			nodes: [],
			edges: [],
			direction: "LR",         // 'LR' | 'TB'
			swimlanes: true,
			nodeWidth: 160,
			nodeHeight: 60,
			gapX: 80,
			gapY: 60,
			laneGap: 40,
			theme: "glass",
			animate: true,
			animateFlow: true,
			zoomable: true,
			pannable: true,
			showTooltips: true,
			colorMap: {},
			defaultNodeColor: "#6366F1",
			activeNodeId: null,
			onNodeClick: null,
			onEdgeClick: null,
		}, config);

		this.zoom = 1;
		this.pan = { x: 0, y: 0 };
		this._nodePositions = new Map();
		this._init();
	}

	static create(container, config) {
		return new VisualFlowPro(container, config);
	}

	/**
	 * Load from Frappe Workflow DocType
	 */
	static async fromWorkflow(container, doctype, config = {}) {
		try {
			const wf = await frappe.xcall("frappe.client.get_list", {
				doctype: "Workflow",
				filters: { document_type: doctype, is_active: 1 },
				fields: ["name"],
				limit: 1,
			});

			if (!wf?.length) {
				return new VisualFlowPro(container, { ...config, nodes: [{ id: "none", type: "process", label: __("No workflow found") }], edges: [] });
			}

			const doc = await frappe.xcall("frappe.client.get", { doctype: "Workflow", name: wf[0].name });
			const nodes = [];
			const edges = [];
			const stateMap = new Map();

			// Build nodes from states
			(doc.states || []).forEach((st, i) => {
				const id = st.state.replace(/\s+/g, "_").toLowerCase();
				stateMap.set(st.state, id);
				nodes.push({
					id,
					type: i === 0 ? "start" : (st.doc_status === 2 ? "end" : "process"),
					label: st.state,
					lane: st.allow_edit || "",
					color: st.style ? VisualFlowPro._parseStyle(st.style) : null,
				});
			});

			// Build edges from transitions
			(doc.transitions || []).forEach(tr => {
				const from = stateMap.get(tr.state);
				const to = stateMap.get(tr.next_state);
				if (from && to) {
					edges.push({
						from, to,
						label: tr.action,
						condition: tr.condition || "",
					});
				}
			});

			return new VisualFlowPro(container, { ...config, nodes, edges });
		} catch (err) {
			console.error("FlowPro: workflow load error", err);
			return new VisualFlowPro(container, { ...config, nodes: [], edges: [] });
		}
	}

	static _parseStyle(style) {
		const map = { Primary: "#6366F1", Success: "#10B981", Warning: "#F59E0B", Danger: "#EF4444", Info: "#3B82F6", Inverse: "#374151" };
		return map[style] || null;
	}

	// ─── Init ────────────────────────────────────────────────────
	_init() {
		this._buildShell();
		this._computeLayout();
		this._renderSVG();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		const isRTL = this._isRTL();
		this.el = document.createElement("div");
		this.el.className = `fv-flow fv-flow--${this.config.theme}`;
		this.el.setAttribute("dir", isRTL ? "rtl" : "ltr");
		this.el.innerHTML = `
			<div class="fv-flow-toolbar">
				<button class="fv-flow-btn" data-action="zoomIn" title="${__("Zoom In")}">+</button>
				<button class="fv-flow-btn" data-action="zoomOut" title="${__("Zoom Out")}">−</button>
				<button class="fv-flow-btn" data-action="fit" title="${__("Fit")}">⊡</button>
				<button class="fv-flow-btn" data-action="dir" title="${__("Toggle Direction")}">⇄</button>
			</div>
			<div class="fv-flow-viewport"></div>
		`;

		this.container.innerHTML = "";
		this.container.appendChild(this.el);

		this.viewport = this.el.querySelector(".fv-flow-viewport");

		// Toolbar actions
		this.el.querySelectorAll(".fv-flow-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const action = btn.dataset.action;
				if (action === "zoomIn") this._setZoom(this.zoom * 1.2);
				else if (action === "zoomOut") this._setZoom(this.zoom / 1.2);
				else if (action === "fit") this._fitView();
				else if (action === "dir") {
					this.config.direction = this.config.direction === "LR" ? "TB" : "LR";
					this._computeLayout();
					this._renderSVG();
				}
			});
		});

		// Pan & zoom
		if (this.config.pannable) this._initPan();
		if (this.config.zoomable) {
			this.viewport.addEventListener("wheel", (e) => {
				e.preventDefault();
				const delta = e.deltaY > 0 ? 0.9 : 1.1;
				this._setZoom(this.zoom * delta);
			}, { passive: false });
		}
	}

	// ─── Layout Computation ──────────────────────────────────────
	_computeLayout() {
		this._nodePositions.clear();
		const nodes = this.config.nodes;
		const edges = this.config.edges;
		const isLR = this.config.direction === "LR";

		// Topological sort for layering
		const adj = new Map();
		const inDeg = new Map();
		nodes.forEach(n => { adj.set(n.id, []); inDeg.set(n.id, 0); });
		edges.forEach(e => {
			adj.get(e.from)?.push(e.to);
			inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
		});

		const layers = [];
		const queue = [];
		const layerMap = new Map();
		nodes.forEach(n => { if ((inDeg.get(n.id) || 0) === 0) queue.push(n.id); });

		while (queue.length) {
			const layer = [...queue];
			layers.push(layer);
			layer.forEach(id => layerMap.set(id, layers.length - 1));
			queue.length = 0;
			layer.forEach(id => {
				(adj.get(id) || []).forEach(to => {
					inDeg.set(to, inDeg.get(to) - 1);
					if (inDeg.get(to) === 0) queue.push(to);
				});
			});
		}

		// Assign unvisited nodes
		nodes.forEach(n => {
			if (!layerMap.has(n.id)) {
				layerMap.set(n.id, layers.length);
				layers.push([n.id]);
			}
		});

		// Swimlane grouping
		const lanes = [];
		if (this.config.swimlanes) {
			const laneSet = new Set(nodes.map(n => n.lane || "").filter(Boolean));
			lanes.push(...laneSet);
		}

		const nw = this.config.nodeWidth;
		const nh = this.config.nodeHeight;
		const gx = this.config.gapX;
		const gy = this.config.gapY;

		layers.forEach((layer, li) => {
			layer.forEach((nodeId, ni) => {
				const x = isLR ? li * (nw + gx) : ni * (nw + gx);
				const y = isLR ? ni * (nh + gy) : li * (nh + gy);
				this._nodePositions.set(nodeId, { x, y });
			});
		});
	}

	// ─── SVG Render ──────────────────────────────────────────────
	_renderSVG() {
		const nw = this.config.nodeWidth;
		const nh = this.config.nodeHeight;

		// Calculate SVG dimensions
		let maxX = 0, maxY = 0;
		this._nodePositions.forEach(pos => {
			maxX = Math.max(maxX, pos.x + nw);
			maxY = Math.max(maxY, pos.y + nh);
		});

		const pad = 60;
		const svgW = maxX + pad * 2;
		const svgH = maxY + pad * 2;

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", svgW);
		svg.setAttribute("height", svgH);
		svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
		svg.classList.add("fv-flow-svg");

		// Defs
		const defs = document.createElementNS(ns, "defs");
		defs.innerHTML = `
			<marker id="fv-flow-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
				<polygon points="0 0, 10 3.5, 0 7" fill="var(--fv-flow-edge, #94a3b8)"/>
			</marker>
			<filter id="fv-flow-shadow">
				<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
			</filter>
			<linearGradient id="fv-flow-active-glow" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#6366F1" stop-opacity="0.3"/>
				<stop offset="100%" stop-color="#6366F1" stop-opacity="0"/>
			</linearGradient>
		`;
		svg.appendChild(defs);

		// Edges
		const edgeGroup = document.createElementNS(ns, "g");
		edgeGroup.classList.add("fv-flow-edges");
		this.config.edges.forEach(edge => {
			const fromPos = this._nodePositions.get(edge.from);
			const toPos = this._nodePositions.get(edge.to);
			if (!fromPos || !toPos) return;

			const x1 = fromPos.x + nw + pad;
			const y1 = fromPos.y + nh / 2 + pad;
			const x2 = toPos.x + pad;
			const y2 = toPos.y + nh / 2 + pad;

			// Bezier curve
			const cx1 = x1 + (x2 - x1) * 0.4;
			const cx2 = x1 + (x2 - x1) * 0.6;

			const path = document.createElementNS(ns, "path");
			path.setAttribute("d", `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`);
			path.setAttribute("fill", "none");
			path.setAttribute("stroke", "var(--fv-flow-edge, #94a3b8)");
			path.setAttribute("stroke-width", "2");
			path.setAttribute("marker-end", "url(#fv-flow-arrow)");
			if (edge.style === "dashed") path.setAttribute("stroke-dasharray", "6,4");
			edgeGroup.appendChild(path);

			// Edge label
			if (edge.label) {
				const lx = (x1 + x2) / 2;
				const ly = (y1 + y2) / 2 - 10;
				const text = document.createElementNS(ns, "text");
				text.setAttribute("x", lx);
				text.setAttribute("y", ly);
				text.setAttribute("text-anchor", "middle");
				text.setAttribute("class", "fv-flow-edge-label");
				text.textContent = __(edge.label);
				edgeGroup.appendChild(text);
			}

			// Animated flow particle
			if (this.config.animateFlow) {
				const particle = document.createElementNS(ns, "circle");
				particle.setAttribute("r", "4");
				particle.setAttribute("fill", "#6366F1");
				particle.setAttribute("opacity", "0.8");
				const anim = document.createElementNS(ns, "animateMotion");
				anim.setAttribute("dur", "3s");
				anim.setAttribute("repeatCount", "indefinite");
				anim.setAttribute("path", `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`);
				particle.appendChild(anim);
				edgeGroup.appendChild(particle);
			}
		});
		svg.appendChild(edgeGroup);

		// Nodes
		const nodeGroup = document.createElementNS(ns, "g");
		nodeGroup.classList.add("fv-flow-nodes");

		this.config.nodes.forEach(node => {
			const pos = this._nodePositions.get(node.id);
			if (!pos) return;

			const x = pos.x + pad;
			const y = pos.y + pad;
			const color = node.color || this.config.colorMap[node.status] || this.config.defaultNodeColor;
			const isActive = node.id === this.config.activeNodeId;

			const g = document.createElementNS(ns, "g");
			g.setAttribute("transform", `translate(${x}, ${y})`);
			g.classList.add("fv-flow-node");
			g.dataset.id = node.id;

			// Node shape
			const shape = this._createNodeShape(ns, node.type, nw, nh, color, isActive);
			g.appendChild(shape);

			// Label
			const text = document.createElementNS(ns, "text");
			text.setAttribute("x", nw / 2);
			text.setAttribute("y", nh / 2 + 5);
			text.setAttribute("text-anchor", "middle");
			text.setAttribute("class", "fv-flow-node-label");
			text.textContent = __(node.label || node.id);
			g.appendChild(text);

			// Click handler
			g.addEventListener("click", () => {
				if (this.config.onNodeClick) this.config.onNodeClick(node, g);
			});

			// Tooltip
			if (this.config.showTooltips && node.description) {
				const title = document.createElementNS(ns, "title");
				title.textContent = node.description;
				g.appendChild(title);
			}

			nodeGroup.appendChild(g);
		});
		svg.appendChild(nodeGroup);

		this.viewport.innerHTML = "";
		this.viewport.appendChild(svg);
		this.svg = svg;
	}

	_createNodeShape(ns, type, w, h, color, isActive) {
		let shape;
		const strokeW = isActive ? 3 : 1.5;
		const shadow = "url(#fv-flow-shadow)";

		switch (type) {
			case "start":
				shape = document.createElementNS(ns, "ellipse");
				shape.setAttribute("cx", w / 2);
				shape.setAttribute("cy", h / 2);
				shape.setAttribute("rx", Math.min(w, h) / 2.5);
				shape.setAttribute("ry", Math.min(w, h) / 2.5);
				shape.setAttribute("fill", color);
				shape.setAttribute("stroke", "none");
				break;

			case "end":
				shape = document.createElementNS(ns, "ellipse");
				shape.setAttribute("cx", w / 2);
				shape.setAttribute("cy", h / 2);
				shape.setAttribute("rx", Math.min(w, h) / 2.5);
				shape.setAttribute("ry", Math.min(w, h) / 2.5);
				shape.setAttribute("fill", "none");
				shape.setAttribute("stroke", color);
				shape.setAttribute("stroke-width", 4);
				break;

			case "decision":
				shape = document.createElementNS(ns, "polygon");
				const cx = w / 2, cy = h / 2, dx = w / 2.2, dy = h / 2.2;
				shape.setAttribute("points", `${cx},${cy - dy} ${cx + dx},${cy} ${cx},${cy + dy} ${cx - dx},${cy}`);
				shape.setAttribute("fill", `${color}15`);
				shape.setAttribute("stroke", color);
				shape.setAttribute("stroke-width", strokeW);
				break;

			case "subprocess":
				shape = document.createElementNS(ns, "rect");
				shape.setAttribute("x", 0);
				shape.setAttribute("y", 0);
				shape.setAttribute("width", w);
				shape.setAttribute("height", h);
				shape.setAttribute("rx", 8);
				shape.setAttribute("fill", `${color}10`);
				shape.setAttribute("stroke", color);
				shape.setAttribute("stroke-width", strokeW);
				shape.setAttribute("stroke-dasharray", "4,3");
				break;

			default: // 'process', 'data', 'manual', 'delay'
				shape = document.createElementNS(ns, "rect");
				shape.setAttribute("x", 0);
				shape.setAttribute("y", 0);
				shape.setAttribute("width", w);
				shape.setAttribute("height", h);
				shape.setAttribute("rx", 10);
				shape.setAttribute("fill", `${color}10`);
				shape.setAttribute("stroke", color);
				shape.setAttribute("stroke-width", strokeW);
				break;
		}

		shape.setAttribute("filter", shadow);
		if (isActive) shape.setAttribute("stroke", "#FBBF24");
		return shape;
	}

	// ─── Pan & Zoom ──────────────────────────────────────────────
	_initPan() {
		let isDragging = false;
		let startX, startY;

		this.viewport.addEventListener("mousedown", (e) => {
			if (e.target.closest(".fv-flow-node")) return;
			isDragging = true;
			startX = e.clientX - this.pan.x;
			startY = e.clientY - this.pan.y;
			this.viewport.style.cursor = "grabbing";
		});

		window.addEventListener("mousemove", (e) => {
			if (!isDragging) return;
			this.pan.x = e.clientX - startX;
			this.pan.y = e.clientY - startY;
			this._applyTransform();
		});

		window.addEventListener("mouseup", () => {
			isDragging = false;
			this.viewport.style.cursor = "grab";
		});
	}

	_setZoom(z) {
		this.zoom = Math.max(0.2, Math.min(3, z));
		this._applyTransform();
	}

	_applyTransform() {
		if (this.svg) {
			this.svg.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
			this.svg.style.transformOrigin = "0 0";
		}
	}

	_fitView() {
		this.zoom = 1;
		this.pan = { x: 0, y: 0 };
		this._applyTransform();
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		if (typeof gsap === "undefined") return;
		const nodes = this.el.querySelectorAll(".fv-flow-node");
		gsap.fromTo(nodes, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.4)" });
	}

	// ─── Public API ──────────────────────────────────────────────
	setActiveNode(nodeId) {
		this.config.activeNodeId = nodeId;
		this._renderSVG();
	}

	highlightPath(nodeIds) {
		this.el.querySelectorAll(".fv-flow-node").forEach(g => {
			const id = g.dataset.id;
			g.style.opacity = nodeIds.includes(id) ? 1 : 0.3;
		});
	}

	exportSVG() {
		const serializer = new XMLSerializer();
		return serializer.serializeToString(this.svg);
	}

	destroy() {
		if (this.el) this.el.remove();
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}
}
