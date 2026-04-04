/**
 * Frappe Visual — NetworkGraph
 * ==============================
 * Force-directed network graph visualization for social networks,
 * dependency maps, communication patterns, and link analysis.
 * Pure SVG with d3-like force simulation (no external deps).
 *
 * Usage:
 *   frappe.visual.NetworkGraph.create('#el', {
 *     nodes: [
 *       { id: 'a', label: 'Alice', group: 'team1', size: 20 },
 *       { id: 'b', label: 'Bob', group: 'team2' },
 *     ],
 *     edges: [
 *       { source: 'a', target: 'b', label: '5 msgs', weight: 5 },
 *     ]
 *   })
 *
 * @module frappe_visual/components/network_graph
 */

const GROUP_COLORS = [
	"#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
	"#ec4899", "#0ea5e9", "#14b8a6", "#f97316", "#64748b",
];

export class NetworkGraph {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("NetworkGraph: container not found");

		this.opts = Object.assign({
			theme: "glass",
			nodes: [],
			edges: [],
			width: 0,                // 0 = auto from container
			height: 500,
			nodeSize: 12,
			edgeWidth: 1.5,
			labelSize: 11,
			showLabels: true,
			showEdgeLabels: false,
			colors: GROUP_COLORS,
			chargeStrength: -200,
			linkDistance: 100,
			iterations: 300,
			animate: true,
			draggable: true,
			zoomable: true,
			onClick: null,
			onEdgeClick: null,
		}, opts);

		this._nodes = [];
		this._edges = [];
		this._zoom = 1;
		this._panX = 0;
		this._panY = 0;
		this._dragging = null;
		this._init();
	}

	static create(container, opts = {}) { return new NetworkGraph(container, opts); }

	_init() {
		this.container.classList.add("fv-ng", `fv-ng--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._prepareData();

		const w = this.opts.width || this.container.clientWidth || 600;
		const h = this.opts.height;
		this._width = w;
		this._height = h;

		// Run force simulation
		this._simulate();

		// Render SVG
		this._renderSVG();
	}

	_prepareData() {
		// Build node map
		const nodeMap = {};
		const groupMap = {};
		let groupIdx = 0;

		this._nodes = this.opts.nodes.map(n => {
			const node = { ...n, x: 0, y: 0, vx: 0, vy: 0 };
			nodeMap[n.id] = node;
			if (n.group && !groupMap[n.group]) {
				groupMap[n.group] = this.opts.colors[groupIdx % this.opts.colors.length];
				groupIdx++;
			}
			node._color = n.color || groupMap[n.group] || this.opts.colors[0];
			node._size = n.size || this.opts.nodeSize;
			return node;
		});

		this._edges = this.opts.edges.map(e => ({
			...e,
			_source: nodeMap[e.source],
			_target: nodeMap[e.target],
		})).filter(e => e._source && e._target);

		this._groupMap = groupMap;
	}

	_simulate() {
		const w = this._width, h = this._height;
		const nodes = this._nodes;
		const edges = this._edges;
		const { chargeStrength, linkDistance, iterations } = this.opts;

		// Random initial positions
		for (const n of nodes) {
			n.x = w / 2 + (Math.random() - 0.5) * w * 0.5;
			n.y = h / 2 + (Math.random() - 0.5) * h * 0.5;
		}

		// Simple force simulation
		for (let iter = 0; iter < iterations; iter++) {
			const alpha = 1 - iter / iterations;
			const cooling = alpha * 0.1;

			// Repulsion (charge)
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[j].x - nodes[i].x;
					const dy = nodes[j].y - nodes[i].y;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;
					const force = chargeStrength / (dist * dist);
					const fx = (dx / dist) * force * cooling;
					const fy = (dy / dist) * force * cooling;
					nodes[i].vx -= fx;
					nodes[i].vy -= fy;
					nodes[j].vx += fx;
					nodes[j].vy += fy;
				}
			}

			// Attraction (links)
			for (const e of edges) {
				const dx = e._target.x - e._source.x;
				const dy = e._target.y - e._source.y;
				const dist = Math.sqrt(dx * dx + dy * dy) || 1;
				const force = (dist - linkDistance) * 0.01 * cooling;
				const weight = e.weight || 1;
				const fx = (dx / dist) * force * weight;
				const fy = (dy / dist) * force * weight;
				e._source.vx += fx;
				e._source.vy += fy;
				e._target.vx -= fx;
				e._target.vy -= fy;
			}

			// Center gravity
			for (const n of nodes) {
				n.vx += (w / 2 - n.x) * 0.001 * cooling;
				n.vy += (h / 2 - n.y) * 0.001 * cooling;
			}

			// Apply velocities with damping
			for (const n of nodes) {
				n.vx *= 0.85;
				n.vy *= 0.85;
				n.x += n.vx;
				n.y += n.vy;
				// Bound
				n.x = Math.max(n._size + 10, Math.min(w - n._size - 10, n.x));
				n.y = Math.max(n._size + 10, Math.min(h - n._size - 10, n.y));
			}
		}
	}

	_renderSVG() {
		const w = this._width, h = this._height;
		const svgNS = "http://www.w3.org/2000/svg";

		const svg = document.createElementNS(svgNS, "svg");
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", h);
		svg.style.overflow = "visible";

		const g = document.createElementNS(svgNS, "g");
		g.setAttribute("class", "fv-ng-scene");
		svg.appendChild(g);
		this._sceneEl = g;

		// Edges
		for (const e of this._edges) {
			const line = document.createElementNS(svgNS, "line");
			line.setAttribute("x1", e._source.x);
			line.setAttribute("y1", e._source.y);
			line.setAttribute("x2", e._target.x);
			line.setAttribute("y2", e._target.y);
			line.setAttribute("stroke", e.color || "#cbd5e1");
			line.setAttribute("stroke-width", e.weight ? Math.min(e.weight * 0.5, 6) : this.opts.edgeWidth);
			line.setAttribute("stroke-opacity", "0.5");
			line.setAttribute("class", "fv-ng-edge");

			if (this.opts.onEdgeClick) {
				line.style.cursor = "pointer";
				line.addEventListener("click", () => this.opts.onEdgeClick(e));
			}

			g.appendChild(line);

			// Edge label
			if (this.opts.showEdgeLabels && e.label) {
				const mx = (e._source.x + e._target.x) / 2;
				const my = (e._source.y + e._target.y) / 2;
				const txt = document.createElementNS(svgNS, "text");
				txt.setAttribute("x", mx);
				txt.setAttribute("y", my - 4);
				txt.setAttribute("text-anchor", "middle");
				txt.setAttribute("font-size", "9");
				txt.setAttribute("fill", "#94a3b8");
				txt.setAttribute("pointer-events", "none");
				txt.textContent = e.label;
				g.appendChild(txt);
			}
		}

		// Nodes
		for (const n of this._nodes) {
			const nodeG = document.createElementNS(svgNS, "g");
			nodeG.setAttribute("class", "fv-ng-node");
			nodeG.setAttribute("transform", `translate(${n.x},${n.y})`);

			// Circle
			const circle = document.createElementNS(svgNS, "circle");
			circle.setAttribute("r", n._size);
			circle.setAttribute("fill", n._color);
			circle.setAttribute("stroke", "white");
			circle.setAttribute("stroke-width", "2");
			circle.style.cursor = "pointer";
			circle.style.transition = "r 0.2s";

			circle.addEventListener("mouseenter", () => circle.setAttribute("r", n._size * 1.3));
			circle.addEventListener("mouseleave", () => circle.setAttribute("r", n._size));

			if (this.opts.onClick) {
				circle.addEventListener("click", (e) => { e.stopPropagation(); this.opts.onClick(n); });
			}

			nodeG.appendChild(circle);

			// Avatar text (first letter)
			if (!n.image) {
				const initials = document.createElementNS(svgNS, "text");
				initials.setAttribute("text-anchor", "middle");
				initials.setAttribute("dominant-baseline", "central");
				initials.setAttribute("font-size", Math.max(8, n._size * 0.8));
				initials.setAttribute("font-weight", "600");
				initials.setAttribute("fill", "white");
				initials.setAttribute("pointer-events", "none");
				initials.textContent = (n.label || n.id || "?")[0].toUpperCase();
				nodeG.appendChild(initials);
			}

			// Label
			if (this.opts.showLabels) {
				const label = document.createElementNS(svgNS, "text");
				label.setAttribute("x", 0);
				label.setAttribute("y", n._size + 14);
				label.setAttribute("text-anchor", "middle");
				label.setAttribute("font-size", this.opts.labelSize);
				label.setAttribute("fill", "var(--text-color, #1e293b)");
				label.setAttribute("pointer-events", "none");
				label.textContent = n.label || n.id;
				nodeG.appendChild(label);
			}

			// Drag
			if (this.opts.draggable) {
				this._setupDrag(nodeG, n);
			}

			g.appendChild(nodeG);
		}

		// Zoom/pan
		if (this.opts.zoomable) {
			svg.addEventListener("wheel", (e) => {
				e.preventDefault();
				const delta = e.deltaY > 0 ? 0.9 : 1.1;
				this._zoom *= delta;
				this._zoom = Math.max(0.2, Math.min(5, this._zoom));
				this._applyTransform();
			});

			let isPanning = false, lastX = 0, lastY = 0;
			svg.addEventListener("mousedown", (e) => {
				if (e.target === svg || e.target.classList.contains("fv-ng-edge")) {
					isPanning = true;
					lastX = e.clientX;
					lastY = e.clientY;
				}
			});
			svg.addEventListener("mousemove", (e) => {
				if (isPanning) {
					this._panX += e.clientX - lastX;
					this._panY += e.clientY - lastY;
					lastX = e.clientX;
					lastY = e.clientY;
					this._applyTransform();
				}
			});
			svg.addEventListener("mouseup", () => { isPanning = false; });
			svg.addEventListener("mouseleave", () => { isPanning = false; });
		}

		// Legend
		if (Object.keys(this._groupMap).length > 0) {
			const legend = document.createElement("div");
			legend.className = "fv-ng-legend";
			legend.innerHTML = Object.entries(this._groupMap).map(([group, color]) =>
				`<span class="fv-ng-legend-item"><span class="fv-ng-legend-dot" style="background:${color}"></span>${this._esc(group)}</span>`
			).join("");
			this.container.appendChild(legend);
		}

		this.container.appendChild(svg);
		this._svgEl = svg;
	}

	_setupDrag(nodeG, nodeData) {
		let isDragging = false, startX, startY;

		nodeG.addEventListener("mousedown", (e) => {
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			e.stopPropagation();
		});

		document.addEventListener("mousemove", (e) => {
			if (!isDragging) return;
			const dx = (e.clientX - startX) / this._zoom;
			const dy = (e.clientY - startY) / this._zoom;
			nodeData.x += dx;
			nodeData.y += dy;
			startX = e.clientX;
			startY = e.clientY;

			nodeG.setAttribute("transform", `translate(${nodeData.x},${nodeData.y})`);

			// Update connected edges
			this._sceneEl.querySelectorAll(".fv-ng-edge").forEach((line, i) => {
				const edge = this._edges[i];
				if (edge) {
					line.setAttribute("x1", edge._source.x);
					line.setAttribute("y1", edge._source.y);
					line.setAttribute("x2", edge._target.x);
					line.setAttribute("y2", edge._target.y);
				}
			});
		});

		document.addEventListener("mouseup", () => { isDragging = false; });
	}

	_applyTransform() {
		if (this._sceneEl) {
			this._sceneEl.setAttribute("transform", `translate(${this._panX},${this._panY}) scale(${this._zoom})`);
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	setData(nodes, edges) { this.opts.nodes = nodes; this.opts.edges = edges; this._init(); }
	getNodes() { return this._nodes.map(n => ({ id: n.id, x: n.x, y: n.y, label: n.label, group: n.group })); }
	resetView() { this._zoom = 1; this._panX = 0; this._panY = 0; this._applyTransform(); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ng", `fv-ng--${this.opts.theme}`);
	}
}
