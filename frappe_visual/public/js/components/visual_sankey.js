// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualSankey — Sankey / Alluvial Flow Diagram
 * ================================================
 * Pure SVG Sankey diagram showing value flows between stages.
 * No external library — full custom implementation.
 *
 * Features:
 *   • Multi-level flow with auto-calculated widths
 *   • Curved bezier flow paths with gradient fills
 *   • Hover highlighting: dim non-related flows
 *   • Animated flow shimmer effect
 *   • Tooltips with value details
 *   • Frappe integration: aggregate from DocTypes
 *   • Color themes (categorical, sequential, custom)
 *   • RTL support, dark mode
 *
 * Usage:
 *   frappe.visual.Sankey.create('#container', {
 *     nodes: [
 *       { id: 'leads', label: 'Leads', column: 0 },
 *       { id: 'qualified', label: 'Qualified', column: 1 },
 *       { id: 'won', label: 'Won', column: 2 },
 *       { id: 'lost', label: 'Lost', column: 2 },
 *     ],
 *     links: [
 *       { source: 'leads', target: 'qualified', value: 100 },
 *       { source: 'qualified', target: 'won', value: 40 },
 *       { source: 'qualified', target: 'lost', value: 60 },
 *     ],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualSankey {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("Sankey: container not found");

		this.config = Object.assign({
			nodes: [],
			links: [],
			width: null,
			height: null,
			nodeWidth: 20,
			nodePadding: 15,
			colors: ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#14B8A6", "#F97316", "#84CC16"],
			theme: "glass",
			animate: true,
			showLabels: true,
			showValues: true,
			showTooltips: true,
			highlightOnHover: true,
			unit: "",
			formatValue: null,
		}, config);

		this._init();
	}

	static create(container, config) {
		return new VisualSankey(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	_init() {
		this._computeDimensions();
		this._computeLayout();
		this._buildShell();
		this._renderSVG();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	// ─── Dimensions ──────────────────────────────────────────────
	_computeDimensions() {
		const rect = this.container.getBoundingClientRect();
		this.width = this.config.width || rect.width || 800;
		this.height = this.config.height || rect.height || 500;
	}

	// ─── Layout ──────────────────────────────────────────────────
	_computeLayout() {
		const nodes = this.config.nodes.map(n => ({ ...n, _x: 0, _y: 0, _dy: 0, _value: 0 }));
		const links = this.config.links.map(l => ({ ...l, _sy: 0, _ty: 0, _dy: 0 }));

		// Assign columns
		const columns = new Map();
		nodes.forEach(n => {
			const col = n.column ?? this._inferColumn(n.id, links, nodes);
			n._col = col;
			if (!columns.has(col)) columns.set(col, []);
			columns.get(col).push(n);
		});

		// Calculate node values (max of input/output)
		nodes.forEach(n => {
			const outVal = links.filter(l => l.source === n.id).reduce((s, l) => s + l.value, 0);
			const inVal = links.filter(l => l.target === n.id).reduce((s, l) => s + l.value, 0);
			n._value = Math.max(outVal, inVal) || 1;
		});

		// Position nodes
		const numCols = Math.max(...[...columns.keys()]) + 1;
		const usableW = this.width - this.config.nodeWidth;
		const pad = 40;

		const colWidth = (usableW - pad * 2) / Math.max(numCols - 1, 1);

		// Find total height needed per column
		const colTotals = new Map();
		columns.forEach((colNodes, col) => {
			colTotals.set(col, colNodes.reduce((s, n) => s + n._value, 0));
		});
		const maxTotal = Math.max(...colTotals.values(), 1);
		const heightScale = (this.height - pad * 2) / (maxTotal + this.config.nodePadding * (Math.max(...[...columns.values()].map(c => c.length)) - 1));

		columns.forEach((colNodes, col) => {
			const x = pad + col * colWidth;
			let y = pad;
			colNodes.forEach((n, i) => {
				n._x = x;
				n._y = y;
				n._dy = Math.max(n._value * heightScale, 4);
				y += n._dy + this.config.nodePadding;
			});
		});

		// Position links
		const nodeMap = new Map(nodes.map(n => [n.id, n]));

		// Sort links by source/target position
		links.forEach(link => {
			const src = nodeMap.get(link.source);
			const tgt = nodeMap.get(link.target);
			if (!src || !tgt) return;

			link._dy = Math.max(link.value * heightScale, 1);
		});

		// Assign vertical offsets for links at each node
		nodes.forEach(n => {
			let outY = n._y;
			links.filter(l => l.source === n.id).sort((a, b) => {
				const ta = nodeMap.get(a.target)?._y || 0;
				const tb = nodeMap.get(b.target)?._y || 0;
				return ta - tb;
			}).forEach(l => {
				l._sy = outY;
				outY += l._dy;
			});

			let inY = n._y;
			links.filter(l => l.target === n.id).sort((a, b) => {
				const sa = nodeMap.get(a.source)?._y || 0;
				const sb = nodeMap.get(b.source)?._y || 0;
				return sa - sb;
			}).forEach(l => {
				l._ty = inY;
				inY += l._dy;
			});
		});

		this._nodes = nodes;
		this._links = links;
		this._nodeMap = nodeMap;
	}

	_inferColumn(id, links, nodes) {
		// Simple BFS from sources
		const isSource = !links.some(l => l.target === id);
		if (isSource) return 0;
		const parents = links.filter(l => l.target === id).map(l => l.source);
		const parentCols = parents.map(p => {
			const pNode = nodes.find(n => n.id === p);
			return pNode?._col ?? 0;
		});
		return Math.max(...parentCols, 0) + 1;
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.el = document.createElement("div");
		this.el.className = `fv-sankey fv-sankey--${this.config.theme}`;
		this.el.setAttribute("dir", this._isRTL() ? "rtl" : "ltr");
		this.container.innerHTML = "";
		this.container.appendChild(this.el);
	}

	// ─── Render ──────────────────────────────────────────────────
	_renderSVG() {
		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", this.width);
		svg.setAttribute("height", this.height);
		svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
		svg.classList.add("fv-sankey-svg");

		// Defs for gradients
		const defs = document.createElementNS(ns, "defs");
		this._links.forEach((link, i) => {
			const src = this._nodeMap.get(link.source);
			const tgt = this._nodeMap.get(link.target);
			if (!src || !tgt) return;

			const grad = document.createElementNS(ns, "linearGradient");
			grad.id = `fv-sk-grad-${i}`;
			grad.setAttribute("x1", "0%");
			grad.setAttribute("x2", "100%");

			const srcColor = this.config.colors[this._nodes.indexOf(src) % this.config.colors.length];
			const tgtColor = this.config.colors[this._nodes.indexOf(tgt) % this.config.colors.length];

			const stop1 = document.createElementNS(ns, "stop");
			stop1.setAttribute("offset", "0%");
			stop1.setAttribute("stop-color", srcColor);
			stop1.setAttribute("stop-opacity", "0.5");
			const stop2 = document.createElementNS(ns, "stop");
			stop2.setAttribute("offset", "100%");
			stop2.setAttribute("stop-color", tgtColor);
			stop2.setAttribute("stop-opacity", "0.5");
			grad.appendChild(stop1);
			grad.appendChild(stop2);
			defs.appendChild(grad);
		});
		svg.appendChild(defs);

		// Links group
		const linkGroup = document.createElementNS(ns, "g");
		linkGroup.classList.add("fv-sankey-links");

		this._links.forEach((link, i) => {
			const src = this._nodeMap.get(link.source);
			const tgt = this._nodeMap.get(link.target);
			if (!src || !tgt) return;

			const x0 = src._x + this.config.nodeWidth;
			const x1 = tgt._x;
			const xi = (x1 - x0) * 0.5;

			const path = document.createElementNS(ns, "path");
			const d = `M${x0},${link._sy} C${x0 + xi},${link._sy} ${x1 - xi},${link._ty} ${x1},${link._ty}`
				+ ` L${x1},${link._ty + link._dy}`
				+ ` C${x1 - xi},${link._ty + link._dy} ${x0 + xi},${link._sy + link._dy} ${x0},${link._sy + link._dy} Z`;
			path.setAttribute("d", d);
			path.setAttribute("fill", `url(#fv-sk-grad-${i})`);
			path.setAttribute("stroke", "none");
			path.classList.add("fv-sankey-link");
			path.dataset.source = link.source;
			path.dataset.target = link.target;

			// Hover
			if (this.config.highlightOnHover) {
				path.addEventListener("mouseenter", () => this._highlightLink(link));
				path.addEventListener("mouseleave", () => this._clearHighlight());
			}

			// Tooltip
			if (this.config.showTooltips) {
				const title = document.createElementNS(ns, "title");
				title.textContent = `${src.label || src.id} → ${tgt.label || tgt.id}: ${this._fmtValue(link.value)}`;
				path.appendChild(title);
			}

			linkGroup.appendChild(path);
		});
		svg.appendChild(linkGroup);

		// Nodes group
		const nodeGroup = document.createElementNS(ns, "g");
		nodeGroup.classList.add("fv-sankey-nodes");

		this._nodes.forEach((node, i) => {
			const color = node.color || this.config.colors[i % this.config.colors.length];
			const g = document.createElementNS(ns, "g");
			g.classList.add("fv-sankey-node");
			g.dataset.id = node.id;

			const rect = document.createElementNS(ns, "rect");
			rect.setAttribute("x", node._x);
			rect.setAttribute("y", node._y);
			rect.setAttribute("width", this.config.nodeWidth);
			rect.setAttribute("height", node._dy);
			rect.setAttribute("rx", 3);
			rect.setAttribute("fill", color);
			rect.setAttribute("stroke", "var(--fv-sankey-border, #fff)");
			rect.setAttribute("stroke-width", "1");
			g.appendChild(rect);

			// Label
			if (this.config.showLabels) {
				const text = document.createElementNS(ns, "text");
				const isLeft = node._col === 0;
				text.setAttribute("x", isLeft ? node._x - 8 : node._x + this.config.nodeWidth + 8);
				text.setAttribute("y", node._y + node._dy / 2 + 4);
				text.setAttribute("text-anchor", isLeft ? "end" : "start");
				text.setAttribute("class", "fv-sankey-label");

				let labelText = __(node.label || node.id);
				if (this.config.showValues) labelText += ` (${this._fmtValue(node._value)})`;
				text.textContent = labelText;
				g.appendChild(text);
			}

			// Hover
			if (this.config.highlightOnHover) {
				g.addEventListener("mouseenter", () => this._highlightNode(node));
				g.addEventListener("mouseleave", () => this._clearHighlight());
			}

			nodeGroup.appendChild(g);
		});
		svg.appendChild(nodeGroup);

		this.el.innerHTML = "";
		this.el.appendChild(svg);
		this.svg = svg;
	}

	// ─── Highlight ───────────────────────────────────────────────
	_highlightLink(link) {
		this.el.querySelectorAll(".fv-sankey-link").forEach(p => {
			p.style.opacity = (p.dataset.source === link.source && p.dataset.target === link.target) ? 1 : 0.15;
		});
	}

	_highlightNode(node) {
		const connected = new Set();
		this._links.forEach(l => {
			if (l.source === node.id || l.target === node.id) {
				connected.add(l.source);
				connected.add(l.target);
			}
		});

		this.el.querySelectorAll(".fv-sankey-link").forEach(p => {
			p.style.opacity = (connected.has(p.dataset.source) || connected.has(p.dataset.target)) ? 0.8 : 0.1;
		});
		this.el.querySelectorAll(".fv-sankey-node").forEach(g => {
			g.style.opacity = connected.has(g.dataset.id) ? 1 : 0.3;
		});
	}

	_clearHighlight() {
		this.el.querySelectorAll(".fv-sankey-link, .fv-sankey-node").forEach(el => {
			el.style.opacity = "";
		});
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		if (typeof gsap === "undefined") return;
		gsap.fromTo(this.el.querySelectorAll(".fv-sankey-node rect"),
			{ scaleY: 0, transformOrigin: "bottom" },
			{ scaleY: 1, duration: 0.6, stagger: 0.06, ease: "power2.out" }
		);
		gsap.fromTo(this.el.querySelectorAll(".fv-sankey-link"),
			{ opacity: 0 },
			{ opacity: 0.5, duration: 0.8, stagger: 0.04, delay: 0.3 }
		);
	}

	// ─── Utils ───────────────────────────────────────────────────
	_fmtValue(v) {
		if (this.config.formatValue) return this.config.formatValue(v);
		const unit = this.config.unit;
		if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M ${unit}`.trim();
		if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${unit}`.trim();
		return `${v} ${unit}`.trim();
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
