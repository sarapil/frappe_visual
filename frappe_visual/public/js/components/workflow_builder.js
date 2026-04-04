// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Workflow Builder (Drag-and-Drop)
 * ==================================================
 * Visual editor for creating and editing Frappe Workflow doctypes.
 * Users drag nodes onto a canvas, connect them with edges, set
 * conditions/actions, and save directly to the Workflow DocType.
 *
 * Features:
 *  - Drag-and-drop node palette (State, Action, Condition, Start, End)
 *  - SVG canvas with zoom/pan
 *  - Click-to-connect edges between nodes
 *  - Edge labels for transition names and conditions
 *  - Property panel for editing node/edge properties
 *  - Auto-layout (left-to-right / top-to-bottom)
 *  - Load from / Save to Frappe Workflow DocType
 *  - Undo/Redo stack
 *  - RTL / dark mode / GSAP animations
 *
 * API:
 *   frappe.visual.WorkflowBuilder.create('#container', opts)
 *   frappe.visual.WorkflowBuilder.fromWorkflow('#container', 'Sales Order')
 *
 * @module frappe_visual/components/workflow_builder
 */

const NODE_TYPES = {
	state:     { label: "State",     color: "#6366F1", shape: "rect",    w: 160, h: 50 },
	action:    { label: "Action",    color: "#8B5CF6", shape: "rect",    w: 160, h: 50 },
	condition: { label: "Condition", color: "#F59E0B", shape: "diamond", w: 130, h: 70 },
	start:     { label: "Start",    color: "#10B981", shape: "circle",  w: 50,  h: 50 },
	end:       { label: "End",      color: "#EF4444", shape: "circle",  w: 50,  h: 50 },
};

const EDGE_COLORS = ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

export class WorkflowBuilder {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("WorkflowBuilder: container not found");

		this.opts = Object.assign({
			theme: "glass",
			direction: "LR",      // LR or TB
			gridSize: 20,
			snapToGrid: true,
			workflow: null,        // Frappe Workflow name to load
			doctype: null,         // DocType the workflow is for
			onSave: null,
		}, opts);

		this.nodes = [];
		this.edges = [];
		this.selectedNode = null;
		this.selectedEdge = null;
		this.connectingFrom = null;
		this.nextId = 1;
		this.undoStack = [];
		this.redoStack = [];
		this.viewBox = { x: 0, y: 0, w: 1200, h: 600 };
		this.zoom = 1;
		this._dragging = null;
		this._panning = false;

		this._init();
	}

	static create(container, opts = {}) { return new WorkflowBuilder(container, opts); }

	static async fromWorkflow(container, doctype) {
		const builder = new WorkflowBuilder(container, { doctype });
		await builder.loadWorkflow(doctype);
		return builder;
	}

	/* ── Initialize ──────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-wb", `fv-wb--${this.opts.theme}`);
		this.container.innerHTML = "";

		// Palette sidebar
		this._renderPalette();

		// Canvas area
		this._renderCanvas();

		// Property panel
		this._renderPropertyPanel();

		// Toolbar
		this._renderToolbar();

		// Load workflow if specified
		if (this.opts.workflow || this.opts.doctype) {
			this.loadWorkflow(this.opts.doctype || this.opts.workflow);
		}
	}

	/* ── Palette ─────────────────────────────────────────────── */
	_renderPalette() {
		const palette = document.createElement("div");
		palette.className = "fv-wb-palette";
		palette.innerHTML = `<div class="fv-wb-palette-title">${__("Nodes")}</div>`;

		for (const [type, cfg] of Object.entries(NODE_TYPES)) {
			const item = document.createElement("div");
			item.className = "fv-wb-palette-item";
			item.setAttribute("draggable", "true");
			item.dataset.type = type;
			item.innerHTML = `
				<span class="fv-wb-palette-dot" style="background:${cfg.color}"></span>
				${__(cfg.label)}`;

			item.addEventListener("dragstart", (e) => {
				e.dataTransfer.setData("node-type", type);
				e.dataTransfer.effectAllowed = "copy";
			});
			palette.appendChild(item);
		}

		this.container.appendChild(palette);
	}

	/* ── Canvas ──────────────────────────────────────────────── */
	_renderCanvas() {
		const wrap = document.createElement("div");
		wrap.className = "fv-wb-canvas-wrap";

		wrap.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
		wrap.addEventListener("drop", (e) => this._onDrop(e));

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("class", "fv-wb-svg");
		svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);

		// Defs for arrows
		const defs = document.createElementNS(ns, "defs");
		defs.innerHTML = `
			<marker id="fv-wb-arrow" viewBox="0 0 10 10" refX="10" refY="5"
				markerWidth="8" markerHeight="8" orient="auto-start-reverse"
				fill="#6366F1">
				<path d="M 0 0 L 10 5 L 0 10 z"/>
			</marker>
			<pattern id="fv-wb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
				<path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>
			</pattern>`;
		svg.appendChild(defs);

		// Grid background
		const grid = document.createElementNS(ns, "rect");
		grid.setAttribute("width", "100%");
		grid.setAttribute("height", "100%");
		grid.setAttribute("fill", "url(#fv-wb-grid)");
		svg.appendChild(grid);

		// Layers
		this._edgeLayer = document.createElementNS(ns, "g");
		this._edgeLayer.setAttribute("class", "fv-wb-edge-layer");
		svg.appendChild(this._edgeLayer);

		this._nodeLayer = document.createElementNS(ns, "g");
		this._nodeLayer.setAttribute("class", "fv-wb-node-layer");
		svg.appendChild(this._nodeLayer);

		// Temp line for connecting
		this._tempLine = document.createElementNS(ns, "line");
		this._tempLine.setAttribute("class", "fv-wb-temp-line");
		this._tempLine.style.display = "none";
		svg.appendChild(this._tempLine);

		wrap.appendChild(svg);
		this.container.appendChild(wrap);
		this._svg = svg;
		this._canvasWrap = wrap;

		// Pan/zoom
		this._setupPanZoom();
	}

	/* ── Toolbar ─────────────────────────────────────────────── */
	_renderToolbar() {
		const toolbar = document.createElement("div");
		toolbar.className = "fv-wb-toolbar";

		const buttons = [
			{ icon: "layout-distribute-horizontal", tip: __("Auto Layout"), action: () => this.autoLayout() },
			{ icon: "arrow-back-up", tip: __("Undo"), action: () => this.undo() },
			{ icon: "arrow-forward-up", tip: __("Redo"), action: () => this.redo() },
			{ icon: "zoom-in", tip: __("Zoom In"), action: () => this._setZoom(this.zoom * 1.2) },
			{ icon: "zoom-out", tip: __("Zoom Out"), action: () => this._setZoom(this.zoom / 1.2) },
			{ icon: "arrows-maximize", tip: __("Fit"), action: () => this.fitView() },
			{ icon: "trash", tip: __("Delete"), action: () => this._deleteSelected() },
			{ icon: "device-floppy", tip: __("Save"), action: () => this.save() },
		];

		for (const b of buttons) {
			const btn = document.createElement("button");
			btn.className = "fv-wb-btn";
			btn.title = b.tip;
			btn.innerHTML = this._icon(b.icon);
			btn.addEventListener("click", b.action);
			toolbar.appendChild(btn);
		}

		this._canvasWrap.prepend(toolbar);
	}

	/* ── Property Panel ──────────────────────────────────────── */
	_renderPropertyPanel() {
		const panel = document.createElement("div");
		panel.className = "fv-wb-props";
		panel.innerHTML = `
			<div class="fv-wb-props-title">${__("Properties")}</div>
			<div class="fv-wb-props-body">
				<p class="fv-wb-props-empty">${__("Select a node or edge")}</p>
			</div>`;
		this.container.appendChild(panel);
		this._propsPanel = panel;
	}

	_updatePropertyPanel() {
		const body = this._propsPanel.querySelector(".fv-wb-props-body");
		if (this.selectedNode) {
			const n = this.selectedNode;
			body.innerHTML = `
				<div class="fv-wb-prop-group">
					<label>${__("Label")}</label>
					<input class="fv-wb-prop-input" data-field="label" value="${this._esc(n.label)}" />
				</div>
				<div class="fv-wb-prop-group">
					<label>${__("Type")}</label>
					<select class="fv-wb-prop-input" data-field="type">
						${Object.entries(NODE_TYPES).map(([k, v]) =>
							`<option value="${k}" ${k === n.type ? "selected" : ""}>${__(v.label)}</option>`
						).join("")}
					</select>
				</div>
				<div class="fv-wb-prop-group">
					<label>${__("Allowed Roles")}</label>
					<input class="fv-wb-prop-input" data-field="allowedRoles" value="${this._esc(n.allowedRoles || "")}"
						placeholder="Role 1, Role 2" />
				</div>
				<div class="fv-wb-prop-group">
					<label>${__("Doc Status")}</label>
					<select class="fv-wb-prop-input" data-field="docStatus">
						<option value="0" ${n.docStatus === 0 ? "selected" : ""}>${__("Draft")}</option>
						<option value="1" ${n.docStatus === 1 ? "selected" : ""}>${__("Submitted")}</option>
						<option value="2" ${n.docStatus === 2 ? "selected" : ""}>${__("Cancelled")}</option>
					</select>
				</div>`;

			body.querySelectorAll(".fv-wb-prop-input").forEach(inp => {
				inp.addEventListener("change", () => {
					const field = inp.dataset.field;
					const val = field === "docStatus" ? parseInt(inp.value) : inp.value;
					this._pushUndo();
					n[field] = val;
					if (field === "type") {
						const cfg = NODE_TYPES[val];
						n.color = cfg.color;
						n.shape = cfg.shape;
					}
					this._renderAllNodes();
				});
			});
		} else if (this.selectedEdge) {
			const e = this.selectedEdge;
			body.innerHTML = `
				<div class="fv-wb-prop-group">
					<label>${__("Transition Label")}</label>
					<input class="fv-wb-prop-input" data-field="label" value="${this._esc(e.label || "")}" />
				</div>
				<div class="fv-wb-prop-group">
					<label>${__("Condition")}</label>
					<input class="fv-wb-prop-input" data-field="condition" value="${this._esc(e.condition || "")}"
						placeholder="doc.status == 'Approved'" />
				</div>
				<div class="fv-wb-prop-group">
					<label>${__("Allowed Roles")}</label>
					<input class="fv-wb-prop-input" data-field="allowedRoles" value="${this._esc(e.allowedRoles || "")}" />
				</div>`;

			body.querySelectorAll(".fv-wb-prop-input").forEach(inp => {
				inp.addEventListener("change", () => {
					this._pushUndo();
					e[inp.dataset.field] = inp.value;
					this._renderAllEdges();
				});
			});
		} else {
			body.innerHTML = `<p class="fv-wb-props-empty">${__("Select a node or edge")}</p>`;
		}
	}

	/* ── Node Operations ─────────────────────────────────────── */
	addNode(type, x, y, label) {
		this._pushUndo();
		const cfg = NODE_TYPES[type] || NODE_TYPES.state;
		const node = {
			id: `n${this.nextId++}`,
			type, x, y,
			label: label || `${__(cfg.label)} ${this.nodes.length + 1}`,
			color: cfg.color,
			shape: cfg.shape,
			w: cfg.w, h: cfg.h,
			allowedRoles: "",
			docStatus: 0,
		};
		this.nodes.push(node);
		this._renderNode(node);
		return node;
	}

	_renderNode(node) {
		const ns = "http://www.w3.org/2000/svg";
		const g = document.createElementNS(ns, "g");
		g.setAttribute("class", "fv-wb-node");
		g.setAttribute("data-id", node.id);
		g.setAttribute("transform", `translate(${node.x}, ${node.y})`);

		let shape;
		if (node.shape === "circle") {
			shape = document.createElementNS(ns, "circle");
			shape.setAttribute("cx", node.w / 2);
			shape.setAttribute("cy", node.h / 2);
			shape.setAttribute("r", node.w / 2);
		} else if (node.shape === "diamond") {
			const hw = node.w / 2, hh = node.h / 2;
			shape = document.createElementNS(ns, "polygon");
			shape.setAttribute("points", `${hw},0 ${node.w},${hh} ${hw},${node.h} 0,${hh}`);
		} else {
			shape = document.createElementNS(ns, "rect");
			shape.setAttribute("width", node.w);
			shape.setAttribute("height", node.h);
			shape.setAttribute("rx", "8");
		}
		shape.setAttribute("fill", node.color);
		shape.setAttribute("stroke", "#fff");
		shape.setAttribute("stroke-width", "2");
		shape.setAttribute("class", "fv-wb-node-shape");
		g.appendChild(shape);

		const text = document.createElementNS(ns, "text");
		text.setAttribute("x", node.w / 2);
		text.setAttribute("y", node.h / 2 + 5);
		text.setAttribute("text-anchor", "middle");
		text.setAttribute("class", "fv-wb-node-label");
		text.setAttribute("fill", "#fff");
		text.setAttribute("font-size", "13");
		text.setAttribute("font-weight", "600");
		text.textContent = node.label;
		g.appendChild(text);

		// Connect port
		const port = document.createElementNS(ns, "circle");
		port.setAttribute("cx", node.w);
		port.setAttribute("cy", node.h / 2);
		port.setAttribute("r", "6");
		port.setAttribute("class", "fv-wb-port fv-wb-port-out");
		port.setAttribute("fill", "#fff");
		port.setAttribute("stroke", node.color);
		port.setAttribute("stroke-width", "2");
		g.appendChild(port);

		const portIn = document.createElementNS(ns, "circle");
		portIn.setAttribute("cx", "0");
		portIn.setAttribute("cy", node.h / 2);
		portIn.setAttribute("r", "6");
		portIn.setAttribute("class", "fv-wb-port fv-wb-port-in");
		portIn.setAttribute("fill", "#fff");
		portIn.setAttribute("stroke", node.color);
		portIn.setAttribute("stroke-width", "2");
		g.appendChild(portIn);

		// Events
		g.addEventListener("mousedown", (e) => this._onNodeMouseDown(e, node));
		port.addEventListener("mousedown", (e) => this._onPortMouseDown(e, node, "out"));
		portIn.addEventListener("mousedown", (e) => this._onPortMouseDown(e, node, "in"));
		g.addEventListener("click", (e) => {
			e.stopPropagation();
			this._selectNode(node);
		});

		this._nodeLayer.appendChild(g);
	}

	_renderAllNodes() {
		this._nodeLayer.innerHTML = "";
		for (const n of this.nodes) this._renderNode(n);
	}

	/* ── Edge Operations ─────────────────────────────────────── */
	addEdge(fromId, toId, label = "", condition = "") {
		if (fromId === toId) return;
		if (this.edges.find(e => e.from === fromId && e.to === toId)) return;
		this._pushUndo();
		const edge = {
			id: `e${this.nextId++}`,
			from: fromId, to: toId,
			label, condition,
			allowedRoles: "",
			color: EDGE_COLORS[this.edges.length % EDGE_COLORS.length],
		};
		this.edges.push(edge);
		this._renderEdge(edge);
		return edge;
	}

	_renderEdge(edge) {
		const ns = "http://www.w3.org/2000/svg";
		const fromNode = this.nodes.find(n => n.id === edge.from);
		const toNode = this.nodes.find(n => n.id === edge.to);
		if (!fromNode || !toNode) return;

		const x1 = fromNode.x + fromNode.w;
		const y1 = fromNode.y + fromNode.h / 2;
		const x2 = toNode.x;
		const y2 = toNode.y + toNode.h / 2;

		const mx = (x1 + x2) / 2;
		const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;

		const g = document.createElementNS(ns, "g");
		g.setAttribute("class", "fv-wb-edge");
		g.setAttribute("data-id", edge.id);

		const path = document.createElementNS(ns, "path");
		path.setAttribute("d", d);
		path.setAttribute("stroke", edge.color);
		path.setAttribute("stroke-width", "2.5");
		path.setAttribute("fill", "none");
		path.setAttribute("marker-end", "url(#fv-wb-arrow)");
		g.appendChild(path);

		// Hit area (wider invisible path)
		const hit = document.createElementNS(ns, "path");
		hit.setAttribute("d", d);
		hit.setAttribute("stroke", "transparent");
		hit.setAttribute("stroke-width", "14");
		hit.setAttribute("fill", "none");
		hit.style.cursor = "pointer";
		g.appendChild(hit);

		if (edge.label) {
			const lx = (x1 + x2) / 2;
			const ly = (y1 + y2) / 2 - 10;
			const text = document.createElementNS(ns, "text");
			text.setAttribute("x", lx);
			text.setAttribute("y", ly);
			text.setAttribute("text-anchor", "middle");
			text.setAttribute("class", "fv-wb-edge-label");
			text.setAttribute("font-size", "11");
			text.textContent = edge.label;
			g.appendChild(text);
		}

		hit.addEventListener("click", (e) => {
			e.stopPropagation();
			this._selectEdge(edge);
		});

		this._edgeLayer.appendChild(g);
	}

	_renderAllEdges() {
		this._edgeLayer.innerHTML = "";
		for (const e of this.edges) this._renderEdge(e);
	}

	/* ── Selection ───────────────────────────────────────────── */
	_selectNode(node) {
		this.selectedNode = node;
		this.selectedEdge = null;
		this._highlightSelection();
		this._updatePropertyPanel();
	}

	_selectEdge(edge) {
		this.selectedEdge = edge;
		this.selectedNode = null;
		this._highlightSelection();
		this._updatePropertyPanel();
	}

	_clearSelection() {
		this.selectedNode = null;
		this.selectedEdge = null;
		this._highlightSelection();
		this._updatePropertyPanel();
	}

	_highlightSelection() {
		this._nodeLayer.querySelectorAll(".fv-wb-node").forEach(g => {
			g.classList.toggle("fv-wb-node--selected", g.dataset.id === this.selectedNode?.id);
		});
		this._edgeLayer.querySelectorAll(".fv-wb-edge").forEach(g => {
			g.classList.toggle("fv-wb-edge--selected", g.dataset.id === this.selectedEdge?.id);
		});
	}

	_deleteSelected() {
		this._pushUndo();
		if (this.selectedNode) {
			const id = this.selectedNode.id;
			this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
			this.nodes = this.nodes.filter(n => n.id !== id);
		} else if (this.selectedEdge) {
			this.edges = this.edges.filter(e => e.id !== this.selectedEdge.id);
		}
		this._clearSelection();
		this._renderAllNodes();
		this._renderAllEdges();
	}

	/* ── Drag & Drop ─────────────────────────────────────────── */
	_onDrop(e) {
		e.preventDefault();
		const type = e.dataTransfer.getData("node-type");
		if (!type) return;

		const rect = this._svg.getBoundingClientRect();
		const scaleX = this.viewBox.w / rect.width;
		const scaleY = this.viewBox.h / rect.height;
		let x = (e.clientX - rect.left) * scaleX + this.viewBox.x;
		let y = (e.clientY - rect.top) * scaleY + this.viewBox.y;

		if (this.opts.snapToGrid) {
			x = Math.round(x / this.opts.gridSize) * this.opts.gridSize;
			y = Math.round(y / this.opts.gridSize) * this.opts.gridSize;
		}

		this.addNode(type, x, y);
	}

	_onNodeMouseDown(e, node) {
		if (e.target.classList.contains("fv-wb-port")) return;
		e.preventDefault();
		this._dragging = { node, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y };

		const onMove = (ev) => {
			const rect = this._svg.getBoundingClientRect();
			const dx = (ev.clientX - this._dragging.startX) * (this.viewBox.w / rect.width);
			const dy = (ev.clientY - this._dragging.startY) * (this.viewBox.h / rect.height);
			let nx = this._dragging.origX + dx;
			let ny = this._dragging.origY + dy;
			if (this.opts.snapToGrid) {
				nx = Math.round(nx / this.opts.gridSize) * this.opts.gridSize;
				ny = Math.round(ny / this.opts.gridSize) * this.opts.gridSize;
			}
			node.x = nx;
			node.y = ny;
			this._nodeLayer.querySelector(`[data-id="${node.id}"]`)
				?.setAttribute("transform", `translate(${nx}, ${ny})`);
			this._renderAllEdges();
		};

		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			this._dragging = null;
		};

		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	}

	_onPortMouseDown(e, node, portType) {
		e.preventDefault();
		e.stopPropagation();
		this.connectingFrom = portType === "out" ? node : null;
		const connectingTo = portType === "in" ? node : null;

		if (this.connectingFrom) {
			this._tempLine.style.display = "";
			const x1 = node.x + node.w;
			const y1 = node.y + node.h / 2;
			this._tempLine.setAttribute("x1", x1);
			this._tempLine.setAttribute("y1", y1);
			this._tempLine.setAttribute("x2", x1);
			this._tempLine.setAttribute("y2", y1);

			const onMove = (ev) => {
				const rect = this._svg.getBoundingClientRect();
				const mx = (ev.clientX - rect.left) * (this.viewBox.w / rect.width) + this.viewBox.x;
				const my = (ev.clientY - rect.top) * (this.viewBox.h / rect.height) + this.viewBox.y;
				this._tempLine.setAttribute("x2", mx);
				this._tempLine.setAttribute("y2", my);
			};

			const onUp = (ev) => {
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				this._tempLine.style.display = "none";

				// Find target node under cursor
				const target = this._findNodeAt(ev.clientX, ev.clientY);
				if (target && target.id !== this.connectingFrom.id) {
					this.addEdge(this.connectingFrom.id, target.id);
				}
				this.connectingFrom = null;
			};

			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
		}
	}

	_findNodeAt(clientX, clientY) {
		const rect = this._svg.getBoundingClientRect();
		const mx = (clientX - rect.left) * (this.viewBox.w / rect.width) + this.viewBox.x;
		const my = (clientY - rect.top) * (this.viewBox.h / rect.height) + this.viewBox.y;

		return this.nodes.find(n => mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h);
	}

	/* ── Pan/Zoom ────────────────────────────────────────────── */
	_setupPanZoom() {
		this._svg.addEventListener("wheel", (e) => {
			e.preventDefault();
			const factor = e.deltaY > 0 ? 1.1 : 0.9;
			this._setZoom(this.zoom * factor);
		});

		this._svg.addEventListener("mousedown", (e) => {
			if (e.target === this._svg || e.target.tagName === "rect" && e.target.getAttribute("fill")?.includes("url")) {
				this._panning = true;
				this._panStart = { x: e.clientX, y: e.clientY, vx: this.viewBox.x, vy: this.viewBox.y };
				this._clearSelection();
			}
		});

		document.addEventListener("mousemove", (e) => {
			if (!this._panning) return;
			const rect = this._svg.getBoundingClientRect();
			const dx = (e.clientX - this._panStart.x) * (this.viewBox.w / rect.width);
			const dy = (e.clientY - this._panStart.y) * (this.viewBox.h / rect.height);
			this.viewBox.x = this._panStart.vx - dx;
			this.viewBox.y = this._panStart.vy - dy;
			this._updateViewBox();
		});

		document.addEventListener("mouseup", () => { this._panning = false; });

		// Keyboard
		document.addEventListener("keydown", (e) => {
			if (!this.container.contains(document.activeElement) && document.activeElement !== document.body) return;
			if (e.key === "Delete" || e.key === "Backspace") this._deleteSelected();
			if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.shiftKey ? this.redo() : this.undo(); e.preventDefault(); }
		});
	}

	_setZoom(z) {
		this.zoom = Math.max(0.2, Math.min(5, z));
		const cx = this.viewBox.x + this.viewBox.w / 2;
		const cy = this.viewBox.y + this.viewBox.h / 2;
		this.viewBox.w = 1200 / this.zoom;
		this.viewBox.h = 600 / this.zoom;
		this.viewBox.x = cx - this.viewBox.w / 2;
		this.viewBox.y = cy - this.viewBox.h / 2;
		this._updateViewBox();
	}

	_updateViewBox() {
		this._svg.setAttribute("viewBox",
			`${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`);
	}

	fitView() {
		if (this.nodes.length === 0) return;
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const n of this.nodes) {
			minX = Math.min(minX, n.x);
			minY = Math.min(minY, n.y);
			maxX = Math.max(maxX, n.x + n.w);
			maxY = Math.max(maxY, n.y + n.h);
		}
		const pad = 60;
		this.viewBox.x = minX - pad;
		this.viewBox.y = minY - pad;
		this.viewBox.w = (maxX - minX) + pad * 2;
		this.viewBox.h = (maxY - minY) + pad * 2;
		this.zoom = 1200 / this.viewBox.w;
		this._updateViewBox();
	}

	/* ── Auto Layout ─────────────────────────────────────────── */
	autoLayout() {
		this._pushUndo();
		const isLR = this.opts.direction === "LR";
		const sorted = this._topoSort();
		const gapX = isLR ? 220 : 0;
		const gapY = isLR ? 0 : 120;
		const layerGap = isLR ? 200 : 150;

		// Assign layers by longest path from start
		const layers = {};
		for (let i = 0; i < sorted.length; i++) {
			layers[sorted[i]] = i;
		}

		// Simple layer-based positioning
		const layerNodes = {};
		for (const n of this.nodes) {
			const layer = layers[n.id] ?? 0;
			if (!layerNodes[layer]) layerNodes[layer] = [];
			layerNodes[layer].push(n);
		}

		const layerKeys = Object.keys(layerNodes).sort((a, b) => a - b);
		for (let li = 0; li < layerKeys.length; li++) {
			const nodes = layerNodes[layerKeys[li]];
			for (let ni = 0; ni < nodes.length; ni++) {
				if (isLR) {
					nodes[ni].x = 40 + li * layerGap;
					nodes[ni].y = 40 + ni * 100;
				} else {
					nodes[ni].x = 40 + ni * 200;
					nodes[ni].y = 40 + li * layerGap;
				}
			}
		}

		this._renderAllNodes();
		this._renderAllEdges();
		this.fitView();
	}

	_topoSort() {
		const visited = new Set();
		const result = [];
		const adj = {};
		for (const e of this.edges) {
			if (!adj[e.from]) adj[e.from] = [];
			adj[e.from].push(e.to);
		}

		const visit = (id) => {
			if (visited.has(id)) return;
			visited.add(id);
			for (const next of (adj[id] || [])) visit(next);
			result.unshift(id);
		};

		for (const n of this.nodes) visit(n.id);
		return result;
	}

	/* ── Undo / Redo ─────────────────────────────────────────── */
	_pushUndo() {
		this.undoStack.push(JSON.stringify({ nodes: this.nodes, edges: this.edges, nextId: this.nextId }));
		this.redoStack = [];
		if (this.undoStack.length > 50) this.undoStack.shift();
	}

	undo() {
		if (this.undoStack.length === 0) return;
		this.redoStack.push(JSON.stringify({ nodes: this.nodes, edges: this.edges, nextId: this.nextId }));
		const state = JSON.parse(this.undoStack.pop());
		this.nodes = state.nodes;
		this.edges = state.edges;
		this.nextId = state.nextId;
		this._clearSelection();
		this._renderAllNodes();
		this._renderAllEdges();
	}

	redo() {
		if (this.redoStack.length === 0) return;
		this.undoStack.push(JSON.stringify({ nodes: this.nodes, edges: this.edges, nextId: this.nextId }));
		const state = JSON.parse(this.redoStack.pop());
		this.nodes = state.nodes;
		this.edges = state.edges;
		this.nextId = state.nextId;
		this._clearSelection();
		this._renderAllNodes();
		this._renderAllEdges();
	}

	/* ── Load / Save Workflow ────────────────────────────────── */
	async loadWorkflow(doctype) {
		try {
			const workflows = await frappe.xcall("frappe.client.get_list", {
				doctype: "Workflow",
				filters: { document_type: doctype, is_active: 1 },
				fields: ["name"],
				limit: 1,
			});
			if (!workflows?.length) { frappe.show_alert(__("No active workflow found")); return; }

			const wf = await frappe.xcall("frappe.client.get", {
				doctype: "Workflow",
				name: workflows[0].name,
			});

			// Convert to builder format
			this.nodes = [];
			this.edges = [];
			this.nextId = 1;

			const stateMap = {};
			const states = wf.states || [];
			for (let i = 0; i < states.length; i++) {
				const s = states[i];
				const node = this.addNode("state",
					40 + (i % 4) * 220,
					40 + Math.floor(i / 4) * 120,
					s.state);
				node.docStatus = s.doc_status || 0;
				node.allowedRoles = s.allow_edit || "";
				stateMap[s.state] = node.id;
			}

			const transitions = wf.transitions || [];
			for (const t of transitions) {
				if (stateMap[t.state] && stateMap[t.next_state]) {
					this.addEdge(stateMap[t.state], stateMap[t.next_state], t.action, t.condition || "");
					const edge = this.edges[this.edges.length - 1];
					if (edge) edge.allowedRoles = t.allowed || "";
				}
			}

			this.autoLayout();
		} catch (e) {
			console.error("WorkflowBuilder: load error", e);
		}
	}

	async save() {
		if (!this.opts.doctype) {
			frappe.show_alert({ message: __("No DocType specified"), indicator: "orange" });
			return;
		}

		const states = this.nodes
			.filter(n => n.type === "state" || n.type === "action")
			.map(n => ({
				state: n.label,
				doc_status: n.docStatus || 0,
				allow_edit: n.allowedRoles || "",
			}));

		const transitions = this.edges.map(e => {
			const from = this.nodes.find(n => n.id === e.from);
			const to = this.nodes.find(n => n.id === e.to);
			return {
				state: from?.label || "",
				action: e.label || "Proceed",
				next_state: to?.label || "",
				allowed: e.allowedRoles || "",
				condition: e.condition || "",
			};
		});

		try {
			await frappe.xcall("frappe.client.save", {
				doc: {
					doctype: "Workflow",
					workflow_name: `${this.opts.doctype} Workflow`,
					document_type: this.opts.doctype,
					is_active: 1,
					states, transitions,
				}
			});
			frappe.show_alert({ message: __("Workflow saved"), indicator: "green" });
			if (this.opts.onSave) this.opts.onSave();
		} catch (e) {
			frappe.show_alert({ message: __("Save failed: ") + e.message, indicator: "red" });
		}
	}

	/* ── Export ───────────────────────────────────────────────── */
	toJSON() {
		return { nodes: this.nodes, edges: this.edges };
	}

	fromJSON(data) {
		this.nodes = data.nodes || [];
		this.edges = data.edges || [];
		this.nextId = Math.max(...this.nodes.map(n => parseInt(n.id.slice(1)) || 0), ...this.edges.map(e => parseInt(e.id.slice(1)) || 0)) + 1;
		this._renderAllNodes();
		this._renderAllEdges();
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_icon(name, size = 18) {
		if (frappe.visual?.icons?.render) return frappe.visual.icons.render(name, { size });
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
			stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-wb", `fv-wb--${this.opts.theme}`);
	}
}
