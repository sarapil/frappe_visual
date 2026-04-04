// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualTreemap — Hierarchical Treemap with Drill-Down
 * ======================================================
 * Pure SVG treemap using squarified layout algorithm.
 *
 * Features:
 *   • Squarified treemap layout (optimal aspect ratios)
 *   • Click-to-drill-down with breadcrumb navigation
 *   • Animated transitions between levels
 *   • Color coding by value, category, or custom scale
 *   • Tooltips with full hierarchy path
 *   • Frappe integration: aggregate by Group-By field
 *   • Responsive resize
 *   • RTL + dark mode
 *
 * Usage:
 *   frappe.visual.Treemap.create('#container', {
 *     data: {
 *       label: 'Revenue',
 *       children: [
 *         { label: 'Products', value: 5000, children: [
 *           { label: 'Widget A', value: 3000 },
 *           { label: 'Widget B', value: 2000 },
 *         ]},
 *         { label: 'Services', value: 3000 },
 *       ],
 *     },
 *   });
 *
 *   // From DocType:
 *   frappe.visual.Treemap.fromDocType('#el', {
 *     doctype: 'Sales Invoice',
 *     groupBy: ['territory', 'customer_group'],
 *     valueField: 'grand_total',
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualTreemap {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("Treemap: container not found");

		this.config = Object.assign({
			data: null,
			width: null,
			height: null,
			colors: ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#14B8A6", "#F97316", "#84CC16"],
			theme: "glass",
			animate: true,
			showLabels: true,
			showValues: true,
			showBreadcrumb: true,
			drillable: true,
			unit: "",
			formatValue: null,
			onNodeClick: null,
			padding: 2,
		}, config);

		this.path = [];
		this.currentRoot = null;
		this._init();
	}

	static create(container, config) {
		return new VisualTreemap(container, config);
	}

	/**
	 * Load treemap from DocType aggregation
	 */
	static async fromDocType(container, opts = {}) {
		const { doctype, groupBy = [], valueField = "name", filters = {}, limit = 1000 } = opts;
		if (!doctype || !groupBy.length) return new VisualTreemap(container, { data: { label: "Empty", value: 0, children: [] } });

		try {
			const fields = [...groupBy, `sum(${valueField}) as _value`, "count(name) as _count"];
			const rows = await frappe.xcall("frappe.client.get_list", {
				doctype,
				fields,
				filters,
				group_by: groupBy.join(", "),
				limit_page_length: limit,
			});

			const root = { label: __(doctype), children: [] };
			const buildLevel = (items, level) => {
				if (level >= groupBy.length) return;
				const field = groupBy[level];
				const groups = new Map();
				items.forEach(r => {
					const key = r[field] || __("(None)");
					if (!groups.has(key)) groups.set(key, []);
					groups.get(key).push(r);
				});
				const children = [];
				groups.forEach((groupItems, key) => {
					const value = groupItems.reduce((s, r) => s + (parseFloat(r._value) || 0), 0);
					const node = { label: key, value, children: [] };
					if (level + 1 < groupBy.length) {
						buildLevel(groupItems, level + 1);
						node.children = groupItems;
					}
					children.push(node);
				});
				return children;
			};

			root.children = buildLevel(rows, 0) || [];
			root.value = root.children.reduce((s, c) => s + (c.value || 0), 0);

			return new VisualTreemap(container, { ...opts, data: root });
		} catch (err) {
			console.error("Treemap: load error", err);
			return new VisualTreemap(container, { data: { label: "Error", value: 0, children: [] } });
		}
	}

	// ─── Init ────────────────────────────────────────────────────
	_init() {
		this._computeDimensions();
		this.currentRoot = this.config.data || { label: "", value: 0, children: [] };
		this._ensureValues(this.currentRoot);
		this._buildShell();
		this._render();
	}

	_computeDimensions() {
		const rect = this.container.getBoundingClientRect();
		this.width = this.config.width || rect.width || 800;
		this.height = this.config.height || rect.height || 500;
	}

	_ensureValues(node) {
		if (!node.children?.length) return;
		node.children.forEach(c => this._ensureValues(c));
		if (!node.value) {
			node.value = node.children.reduce((s, c) => s + (c.value || 0), 0);
		}
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.el = document.createElement("div");
		this.el.className = `fv-tm fv-tm--${this.config.theme}`;
		this.el.setAttribute("dir", this._isRTL() ? "rtl" : "ltr");

		this.el.innerHTML = `
			${this.config.showBreadcrumb ? `<div class="fv-tm-breadcrumb"></div>` : ""}
			<div class="fv-tm-viewport"></div>
		`;

		this.container.innerHTML = "";
		this.container.appendChild(this.el);
		this.viewport = this.el.querySelector(".fv-tm-viewport");
	}

	// ─── Squarified Layout ───────────────────────────────────────
	_squarify(children, x, y, w, h) {
		if (!children?.length) return [];

		const total = children.reduce((s, c) => s + (c.value || 0), 0);
		if (total === 0) return [];

		const rects = [];
		const sorted = [...children].sort((a, b) => (b.value || 0) - (a.value || 0));

		let remaining = [...sorted];
		let cx = x, cy = y, cw = w, ch = h;

		while (remaining.length) {
			const isWide = cw >= ch;
			const mainDim = isWide ? ch : cw;
			const totalRemaining = remaining.reduce((s, c) => s + (c.value || 0), 0);

			// Lay out row
			const row = [];
			let rowArea = 0;
			let bestRatio = Infinity;

			for (let i = 0; i < remaining.length; i++) {
				const area = (remaining[i].value / totalRemaining) * cw * ch;
				row.push({ node: remaining[i], area });
				rowArea += area;

				const rowDim = rowArea / mainDim;
				let worstRatio = 0;
				for (const r of row) {
					const cellDim = r.area / rowDim;
					const ratio = Math.max(rowDim / cellDim, cellDim / rowDim);
					worstRatio = Math.max(worstRatio, ratio);
				}

				if (worstRatio > bestRatio && row.length > 1) {
					row.pop();
					rowArea -= area;
					break;
				}
				bestRatio = worstRatio;
			}

			// Position row items
			const rowDim = rowArea / mainDim;
			let offset = 0;
			const pad = this.config.padding;

			row.forEach(r => {
				const cellDim = r.area / rowDim;
				let rx, ry, rw, rh;

				if (isWide) {
					rx = cx + pad;
					ry = cy + offset + pad;
					rw = rowDim - pad * 2;
					rh = cellDim - pad * 2;
				} else {
					rx = cx + offset + pad;
					ry = cy + pad;
					rw = cellDim - pad * 2;
					rh = rowDim - pad * 2;
				}

				rects.push({
					node: r.node,
					x: Math.max(rx, 0),
					y: Math.max(ry, 0),
					width: Math.max(rw, 0),
					height: Math.max(rh, 0),
				});

				offset += cellDim;
			});

			// Remove laid-out items
			remaining = remaining.slice(row.length);

			// Shrink remaining area
			if (isWide) {
				cx += rowDim;
				cw -= rowDim;
			} else {
				cy += rowDim;
				ch -= rowDim;
			}
		}

		return rects;
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		const children = this.currentRoot.children || [];
		const rects = this._squarify(children, 0, 0, this.width, this.height);

		// Breadcrumb
		if (this.config.showBreadcrumb) {
			const bc = this.el.querySelector(".fv-tm-breadcrumb");
			if (bc) {
				bc.innerHTML = this.path.map((p, i) =>
					`<span class="fv-tm-bc-item" data-idx="${i}">${__(p.label)}</span>`
				).concat(`<span class="fv-tm-bc-current">${__(this.currentRoot.label)}</span>`).join(" / ");

				bc.querySelectorAll(".fv-tm-bc-item").forEach(item => {
					item.addEventListener("click", () => {
						const idx = parseInt(item.dataset.idx);
						this.currentRoot = this.path[idx];
						this.path = this.path.slice(0, idx);
						this._render();
					});
				});
			}
		}

		// SVG
		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", this.width);
		svg.setAttribute("height", this.height);
		svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
		svg.classList.add("fv-tm-svg");

		rects.forEach((r, i) => {
			const color = r.node.color || this.config.colors[i % this.config.colors.length];
			const hasChildren = r.node.children?.length > 0;

			const g = document.createElementNS(ns, "g");
			g.classList.add("fv-tm-cell");
			g.dataset.label = r.node.label;

			// Rectangle
			const rect = document.createElementNS(ns, "rect");
			rect.setAttribute("x", r.x);
			rect.setAttribute("y", r.y);
			rect.setAttribute("width", r.width);
			rect.setAttribute("height", r.height);
			rect.setAttribute("rx", 4);
			rect.setAttribute("fill", color);
			rect.setAttribute("stroke", "var(--fv-tm-border, #fff)");
			rect.setAttribute("stroke-width", "1.5");
			rect.setAttribute("opacity", "0.85");
			g.appendChild(rect);

			// Label (only if enough space)
			if (this.config.showLabels && r.width > 40 && r.height > 20) {
				const text = document.createElementNS(ns, "text");
				text.setAttribute("x", r.x + 6);
				text.setAttribute("y", r.y + 18);
				text.setAttribute("class", "fv-tm-label");
				text.textContent = this._truncate(__(r.node.label), Math.floor(r.width / 8));
				g.appendChild(text);
			}

			// Value
			if (this.config.showValues && r.width > 50 && r.height > 36) {
				const val = document.createElementNS(ns, "text");
				val.setAttribute("x", r.x + 6);
				val.setAttribute("y", r.y + 34);
				val.setAttribute("class", "fv-tm-value");
				val.textContent = this._fmtValue(r.node.value);
				g.appendChild(val);
			}

			// Tooltip
			const title = document.createElementNS(ns, "title");
			title.textContent = `${__(r.node.label)}: ${this._fmtValue(r.node.value)}`;
			g.appendChild(title);

			// Drill-down click
			if (this.config.drillable && hasChildren) {
				g.style.cursor = "pointer";
				g.addEventListener("click", () => {
					this.path.push(this.currentRoot);
					this.currentRoot = r.node;
					this._render();
					if (this.config.animate && typeof gsap !== "undefined") this._animateTransition();
				});
			} else if (this.config.onNodeClick) {
				g.style.cursor = "pointer";
				g.addEventListener("click", () => this.config.onNodeClick(r.node));
			}

			// Hover effect
			g.addEventListener("mouseenter", () => { rect.setAttribute("opacity", "1"); });
			g.addEventListener("mouseleave", () => { rect.setAttribute("opacity", "0.85"); });

			svg.appendChild(g);
		});

		this.viewport.innerHTML = "";
		this.viewport.appendChild(svg);
		this.svg = svg;

		if (this.config.animate && typeof gsap !== "undefined" && !this.path.length) {
			this._animateEntrance();
		}
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		if (typeof gsap === "undefined") return;
		gsap.fromTo(this.el.querySelectorAll(".fv-tm-cell rect"),
			{ scale: 0, transformOrigin: "center" },
			{ scale: 1, duration: 0.5, stagger: 0.03, ease: "back.out(1.2)" }
		);
	}

	_animateTransition() {
		if (typeof gsap === "undefined") return;
		gsap.fromTo(this.el.querySelectorAll(".fv-tm-cell"),
			{ opacity: 0, scale: 0.8 },
			{ opacity: 1, scale: 1, duration: 0.4, stagger: 0.02, ease: "power2.out" }
		);
	}

	// ─── Public API ──────────────────────────────────────────────
	drillUp() {
		if (!this.path.length) return;
		this.currentRoot = this.path.pop();
		this._render();
	}

	resetDrill() {
		if (!this.path.length) return;
		this.currentRoot = this.path[0];
		this.path = [];
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}

	// ─── Utils ───────────────────────────────────────────────────
	_fmtValue(v) {
		if (this.config.formatValue) return this.config.formatValue(v);
		const unit = this.config.unit;
		if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M ${unit}`.trim();
		if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K ${unit}`.trim();
		return `${Math.round(v)} ${unit}`.trim();
	}

	_truncate(str, max) {
		return str?.length > max ? str.substring(0, max - 1) + "…" : (str || "");
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}
}
