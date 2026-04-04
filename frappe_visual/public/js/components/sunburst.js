/**
 * Frappe Visual — Sunburst
 * ==========================
 * Hierarchical sunburst / multi-ring donut chart for visualizing nested
 * data like account trees, department breakdowns, or category hierarchies.
 * SVG-based with zoom on click, breadcrumb navigation, and tooltips.
 *
 * Usage:
 *   frappe.visual.Sunburst.create('#el', {
 *     data: {
 *       name: 'Company',
 *       children: [
 *         { name: 'Sales', value: 300, children: [
 *           { name: 'Online', value: 180 },
 *           { name: 'Retail', value: 120 },
 *         ]},
 *         { name: 'Services', value: 200 },
 *       ]
 *     }
 *   })
 *
 * @module frappe_visual/components/sunburst
 */

const SUNBURST_PALETTE = [
	"#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
	"#f59e0b", "#10b981", "#14b8a6", "#0ea5e9", "#64748b",
	"#d946ef", "#f97316", "#84cc16", "#06b6d4",
];

export class Sunburst {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("Sunburst: container not found");

		this.opts = Object.assign({
			theme: "glass",
			data: null,              // tree: {name, value?, children?[]}
			size: 400,
			innerRadius: 0.25,       // fraction of total radius
			padAngle: 0.01,          // radians gap between slices
			colors: SUNBURST_PALETTE,
			showLabels: true,
			showBreadcrumb: true,
			showTooltip: true,
			animate: true,
			centerLabel: "",
			onClick: null,
		}, opts);

		this._colorMap = {};
		this._breadcrumb = [];
		this._init();
	}

	static create(container, opts = {}) { return new Sunburst(container, opts); }

	_init() {
		this.container.classList.add("fv-sun", `fv-sun--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (!this.opts.data) {
			this.container.innerHTML = `<div class="fv-sun-empty">${__("No data")}</div>`;
			return;
		}

		// Compute values bottom-up
		this._computeValues(this.opts.data);

		// Breadcrumb
		if (this.opts.showBreadcrumb) {
			this._breadcrumbEl = document.createElement("div");
			this._breadcrumbEl.className = "fv-sun-breadcrumb";
			this.container.appendChild(this._breadcrumbEl);
		}

		// SVG container
		const wrap = document.createElement("div");
		wrap.className = "fv-sun-chart";
		wrap.style.width = this.opts.size + "px";
		wrap.style.height = this.opts.size + "px";
		this.container.appendChild(wrap);
		this._chartEl = wrap;

		// Tooltip
		if (this.opts.showTooltip) {
			this._tooltipEl = document.createElement("div");
			this._tooltipEl.className = "fv-sun-tooltip";
			this._tooltipEl.style.display = "none";
			this.container.appendChild(this._tooltipEl);
		}

		this._renderSunburst(this.opts.data);
	}

	_computeValues(node) {
		if (!node.children || node.children.length === 0) {
			node._value = node.value || 0;
			return node._value;
		}
		node._value = node.children.reduce((sum, child) => sum + this._computeValues(child), 0);
		if (node.value && node.value > node._value) node._value = node.value;
		return node._value;
	}

	_renderSunburst(rootNode) {
		this._chartEl.innerHTML = "";

		const size = this.opts.size;
		const cx = size / 2, cy = size / 2;
		const maxR = size / 2 - 4;
		const innerR = maxR * this.opts.innerRadius;

		const svgNS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgNS, "svg");
		svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
		svg.setAttribute("width", size);
		svg.setAttribute("height", size);

		// Find max depth
		const maxDepth = this._getMaxDepth(rootNode);
		const ringWidth = (maxR - innerR) / maxDepth;

		// Recursively draw arcs
		this._drawNode(svg, rootNode, cx, cy, innerR, ringWidth, 0, Math.PI * 2, 0, maxDepth);

		// Center circle with label
		const centerCircle = document.createElementNS(svgNS, "circle");
		centerCircle.setAttribute("cx", cx);
		centerCircle.setAttribute("cy", cy);
		centerCircle.setAttribute("r", innerR - 2);
		centerCircle.setAttribute("fill", "var(--bg-color, white)");
		centerCircle.setAttribute("class", "fv-sun-center");
		svg.appendChild(centerCircle);

		if (this.opts.centerLabel || rootNode.name) {
			const centerText = document.createElementNS(svgNS, "text");
			centerText.setAttribute("x", cx);
			centerText.setAttribute("y", cy - 6);
			centerText.setAttribute("text-anchor", "middle");
			centerText.setAttribute("font-size", "13");
			centerText.setAttribute("font-weight", "600");
			centerText.setAttribute("fill", "var(--text-color, #1e293b)");
			centerText.textContent = this.opts.centerLabel || rootNode.name;
			svg.appendChild(centerText);

			const centerVal = document.createElementNS(svgNS, "text");
			centerVal.setAttribute("x", cx);
			centerVal.setAttribute("y", cy + 12);
			centerVal.setAttribute("text-anchor", "middle");
			centerVal.setAttribute("font-size", "11");
			centerVal.setAttribute("fill", "var(--text-muted, #64748b)");
			centerVal.textContent = rootNode._value?.toLocaleString() || "";
			svg.appendChild(centerVal);
		}

		this._chartEl.appendChild(svg);
	}

	_drawNode(svg, node, cx, cy, innerR, ringWidth, startAngle, endAngle, depth, maxDepth) {
		if (depth >= maxDepth || !node.children || node.children.length === 0) return;

		const svgNS = "http://www.w3.org/2000/svg";
		const r1 = innerR + depth * ringWidth;
		const r2 = r1 + ringWidth;
		const total = node._value || 1;
		let currentAngle = startAngle;

		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			const fraction = (child._value || 0) / total;
			const childStart = currentAngle + this.opts.padAngle;
			const childEnd = currentAngle + fraction * (endAngle - startAngle) - this.opts.padAngle;
			currentAngle += fraction * (endAngle - startAngle);

			if (childEnd - childStart < 0.005) continue; // Too small to render

			// Color
			const colorKey = depth === 0 ? i : (child.name || i);
			if (!this._colorMap[child.name]) {
				this._colorMap[child.name] = this.opts.colors[Object.keys(this._colorMap).length % this.opts.colors.length];
			}
			const color = child.color || this._colorMap[child.name];
			const opacity = 1 - depth * 0.15; // Fade deeper rings

			// Draw arc path
			const path = this._createArcPath(svgNS, cx, cy, r1, r2, childStart, childEnd);
			path.setAttribute("fill", color);
			path.setAttribute("fill-opacity", opacity);
			path.setAttribute("stroke", "var(--bg-color, white)");
			path.setAttribute("stroke-width", "1");
			path.style.cursor = "pointer";
			path.style.transition = "fill-opacity 0.2s";

			// Hover
			path.addEventListener("mouseenter", (e) => {
				path.setAttribute("fill-opacity", Math.min(1, opacity + 0.2));
				if (this._tooltipEl) {
					this._tooltipEl.style.display = "block";
					this._tooltipEl.innerHTML = `<strong>${this._esc(child.name || "")}</strong><br>${(child._value || 0).toLocaleString()}`;
					this._tooltipEl.style.left = (e.clientX + 12) + "px";
					this._tooltipEl.style.top = (e.clientY - 10) + "px";
				}
			});
			path.addEventListener("mouseleave", () => {
				path.setAttribute("fill-opacity", opacity);
				if (this._tooltipEl) this._tooltipEl.style.display = "none";
			});
			path.addEventListener("mousemove", (e) => {
				if (this._tooltipEl) {
					this._tooltipEl.style.left = (e.clientX + 12) + "px";
					this._tooltipEl.style.top = (e.clientY - 10) + "px";
				}
			});

			// Click — zoom into child
			path.addEventListener("click", () => {
				if (this.opts.onClick) this.opts.onClick(child);
				if (child.children && child.children.length > 0) {
					this._breadcrumb.push(node);
					this._renderSunburst(child);
					this._updateBreadcrumb(child);
				}
			});

			svg.appendChild(path);

			// Label for large enough arcs
			if (this.opts.showLabels && (childEnd - childStart) > 0.2) {
				const midAngle = (childStart + childEnd) / 2;
				const labelR = (r1 + r2) / 2;
				const lx = cx + labelR * Math.cos(midAngle);
				const ly = cy + labelR * Math.sin(midAngle);

				const txt = document.createElementNS(svgNS, "text");
				txt.setAttribute("x", lx);
				txt.setAttribute("y", ly);
				txt.setAttribute("text-anchor", "middle");
				txt.setAttribute("dominant-baseline", "central");
				txt.setAttribute("font-size", Math.max(9, 12 - depth * 2));
				txt.setAttribute("fill", "white");
				txt.setAttribute("pointer-events", "none");
				txt.textContent = this._truncate(child.name || "", 12);
				svg.appendChild(txt);
			}

			// Recurse
			this._drawNode(svg, child, cx, cy, innerR, ringWidth, childStart, childEnd, depth + 1, maxDepth);
		}
	}

	_createArcPath(svgNS, cx, cy, r1, r2, startAngle, endAngle) {
		const path = document.createElementNS(svgNS, "path");
		const x1o = cx + r2 * Math.cos(startAngle);
		const y1o = cy + r2 * Math.sin(startAngle);
		const x2o = cx + r2 * Math.cos(endAngle);
		const y2o = cy + r2 * Math.sin(endAngle);
		const x1i = cx + r1 * Math.cos(endAngle);
		const y1i = cy + r1 * Math.sin(endAngle);
		const x2i = cx + r1 * Math.cos(startAngle);
		const y2i = cy + r1 * Math.sin(startAngle);
		const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

		path.setAttribute("d",
			`M ${x1o} ${y1o} A ${r2} ${r2} 0 ${largeArc} 1 ${x2o} ${y2o}` +
			`L ${x1i} ${y1i} A ${r1} ${r1} 0 ${largeArc} 0 ${x2i} ${y2i} Z`);
		return path;
	}

	_getMaxDepth(node, depth = 0) {
		if (!node.children || node.children.length === 0) return depth;
		return Math.max(...node.children.map(c => this._getMaxDepth(c, depth + 1)));
	}

	_updateBreadcrumb(currentNode) {
		if (!this._breadcrumbEl) return;
		const crumbs = [...this._breadcrumb.map(n => n.name), currentNode.name];
		this._breadcrumbEl.innerHTML = crumbs.map((name, i) => {
			if (i < crumbs.length - 1) {
				return `<span class="fv-sun-crumb" data-idx="${i}">${this._esc(name)}</span><span class="fv-sun-crumb-sep">›</span>`;
			}
			return `<span class="fv-sun-crumb fv-sun-crumb--current">${this._esc(name)}</span>`;
		}).join("");

		this._breadcrumbEl.querySelectorAll(".fv-sun-crumb[data-idx]").forEach(el => {
			el.addEventListener("click", () => {
				const idx = parseInt(el.dataset.idx);
				const target = this._breadcrumb[idx];
				this._breadcrumb = this._breadcrumb.slice(0, idx);
				this._renderSunburst(target);
				this._updateBreadcrumb(target);
			});
		});
	}

	/* ── Public API ──────────────────────────────────────────── */
	setData(data) { this.opts.data = data; this._colorMap = {}; this._breadcrumb = []; this._init(); }
	zoomToRoot() { this._breadcrumb = []; this._renderSunburst(this.opts.data); if (this._breadcrumbEl) this._breadcrumbEl.innerHTML = ""; }

	_truncate(s, len) { return s.length > len ? s.slice(0, len) + "…" : s; }
	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sun", `fv-sun--${this.opts.theme}`);
	}
}
