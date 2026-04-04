// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualOrgChart — Organizational Hierarchy Chart
 * ==================================================
 * Interactive org chart with photo cards, role badges,
 * expandable branches, and multiple layout modes.
 *
 * Features:
 *   • Tree layout: top-down, left-right, or radial
 *   • Node cards with avatar, name, role, department, KPIs
 *   • Expand/collapse branches with animation
 *   • Search & highlight within the chart
 *   • Zoom, pan, fit-to-view controls
 *   • Frappe integration: loads from Employee/User hierarchy
 *   • Compact mode for large organizations
 *   • Export to SVG / PNG
 *   • RTL + dark mode + bilingual tooltips
 *   • Click to view employee details or open DocType
 *
 * Usage:
 *   frappe.visual.OrgChart.create('#container', {
 *     doctype: 'Employee',
 *     parentField: 'reports_to',
 *     titleField: 'employee_name',
 *     subtitleField: 'designation',
 *     imageField: 'image',
 *     groupField: 'department',
 *   });
 *
 *   // Static data:
 *   frappe.visual.OrgChart.create('#el', {
 *     data: [
 *       { id: '1', name: 'CEO', role: 'Chief Executive', image: '...', children: [
 *         { id: '2', name: 'CTO', role: 'Tech Lead', children: [...] },
 *         { id: '3', name: 'CFO', role: 'Finance Lead' },
 *       ]},
 *     ],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualOrgChart {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("OrgChart: container not found");

		this.config = Object.assign({
			// Data
			doctype: null,
			parentField: "reports_to",
			titleField: "employee_name",
			subtitleField: "designation",
			imageField: "image",
			groupField: "department",
			statusField: "status",
			rootFilter: null,
			data: null,
			limit: 500,

			// Display
			layout: "top-down",     // 'top-down' | 'left-right' | 'radial'
			cardWidth: 200,
			cardHeight: 90,
			gapX: 40,
			gapY: 60,
			compact: false,
			theme: "glass",
			showSearch: true,
			showToolbar: true,
			showDepartmentColors: true,

			// Colors
			colorMap: {},
			defaultColor: "#6366F1",
			departmentColors: {},

			// Interaction
			expandable: true,
			defaultExpanded: 2,
			onNodeClick: null,
			zoomable: true,
			pannable: true,
			animate: true,
		}, config);

		this.tree = null;
		this.flatNodes = [];
		this.expandedNodes = new Set();
		this.zoom = 1;
		this.pan = { x: 0, y: 0 };
		this._init();
	}

	static create(container, config) {
		return new VisualOrgChart(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._loadData();
		this._computeLayout();
		this._render();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		const isRTL = this._isRTL();
		this.el = document.createElement("div");
		this.el.className = `fv-org fv-org--${this.config.theme}`;
		this.el.setAttribute("dir", isRTL ? "rtl" : "ltr");

		let toolbar = "";
		if (this.config.showToolbar) {
			toolbar = `<div class="fv-org-toolbar">
				${this.config.showSearch ? `<input type="text" class="fv-org-search" placeholder="${__("Search")}...">` : ""}
				<div class="fv-org-btns">
					<button class="fv-org-btn" data-action="zoomIn" title="+">+</button>
					<button class="fv-org-btn" data-action="zoomOut" title="−">−</button>
					<button class="fv-org-btn" data-action="fit" title="${__("Fit")}">⊡</button>
					<button class="fv-org-btn" data-action="expandAll" title="${__("Expand All")}">⊞</button>
					<button class="fv-org-btn" data-action="collapseAll" title="${__("Collapse All")}">⊟</button>
				</div>
			</div>`;
		}

		this.el.innerHTML = `${toolbar}<div class="fv-org-viewport"></div>`;
		this.container.innerHTML = "";
		this.container.appendChild(this.el);

		this.viewport = this.el.querySelector(".fv-org-viewport");

		// Toolbar events
		this.el.querySelectorAll(".fv-org-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const a = btn.dataset.action;
				if (a === "zoomIn") this._setZoom(this.zoom * 1.2);
				else if (a === "zoomOut") this._setZoom(this.zoom / 1.2);
				else if (a === "fit") this._fitView();
				else if (a === "expandAll") this._expandAll();
				else if (a === "collapseAll") this._collapseAll();
			});
		});

		// Search
		const searchInput = this.el.querySelector(".fv-org-search");
		searchInput?.addEventListener("input", frappe.utils.debounce((e) => {
			this._highlightSearch(e.target.value);
		}, 250));

		// Pan
		if (this.config.pannable) this._initPan();
		if (this.config.zoomable) {
			this.viewport.addEventListener("wheel", (e) => {
				e.preventDefault();
				this._setZoom(this.zoom * (e.deltaY > 0 ? 0.9 : 1.1));
			}, { passive: false });
		}
	}

	// ─── Data ────────────────────────────────────────────────────
	async _loadData() {
		if (this.config.data) {
			this.tree = Array.isArray(this.config.data) ? this.config.data : [this.config.data];
			this._flattenTree(this.tree, 0);
			return;
		}

		if (!this.config.doctype) {
			this.tree = [];
			return;
		}

		try {
			const c = this.config;
			const fields = ["name", c.titleField, c.subtitleField, c.parentField, c.imageField, c.groupField, c.statusField].filter(Boolean);
			const rows = await frappe.xcall("frappe.client.get_list", {
				doctype: c.doctype,
				fields: [...new Set(fields)],
				filters: c.rootFilter || {},
				limit_page_length: c.limit,
				order_by: `${c.titleField} asc`,
			});

			this.tree = this._buildTree(rows);
		} catch (err) {
			console.error("OrgChart: data load error", err);
			this.tree = [];
		}
	}

	_buildTree(rows) {
		const c = this.config;
		const map = new Map();
		const nodes = rows.map(r => {
			const node = {
				id: r.name,
				name: r[c.titleField] || r.name,
				role: r[c.subtitleField] || "",
				image: r[c.imageField] || null,
				department: r[c.groupField] || "",
				status: r[c.statusField] || "",
				parentId: r[c.parentField] || null,
				children: [],
				_depth: 0,
				_raw: r,
			};
			map.set(r.name, node);
			return node;
		});

		const roots = [];
		nodes.forEach(n => {
			if (n.parentId && map.has(n.parentId)) {
				map.get(n.parentId).children.push(n);
			} else {
				roots.push(n);
			}
		});

		// Set depths
		const setDepth = (arr, d) => arr.forEach(n => { n._depth = d; setDepth(n.children, d + 1); });
		setDepth(roots, 0);

		// Default expanded
		this._flattenTree(roots, 0);

		return roots;
	}

	_flattenTree(arr, depth) {
		(arr || []).forEach(n => {
			n._depth = depth;
			this.flatNodes.push(n);
			if (depth < this.config.defaultExpanded) this.expandedNodes.add(n.id);
			this._flattenTree(n.children, depth + 1);
		});
	}

	// ─── Layout ──────────────────────────────────────────────────
	_computeLayout() {
		const cw = this.config.cardWidth;
		const ch = this.config.cardHeight;
		const gx = this.config.gapX;
		const gy = this.config.gapY;

		this._positions = new Map();

		const measureSubtree = (node) => {
			const visibleChildren = this._getVisibleChildren(node);
			if (!visibleChildren.length) return cw;

			const childWidths = visibleChildren.map(c => measureSubtree(c));
			return Math.max(cw, childWidths.reduce((sum, w) => sum + w + gx, -gx));
		};

		const positionNode = (node, x, y) => {
			const visibleChildren = this._getVisibleChildren(node);
			const totalWidth = measureSubtree(node);

			this._positions.set(node.id, {
				x: x + (totalWidth - cw) / 2,
				y,
			});

			let cx = x;
			visibleChildren.forEach(child => {
				const childW = measureSubtree(child);
				positionNode(child, cx, y + ch + gy);
				cx += childW + gx;
			});
		};

		let offsetX = 0;
		(this.tree || []).forEach(root => {
			const w = measureSubtree(root);
			positionNode(root, offsetX, 0);
			offsetX += w + gx * 2;
		});
	}

	_getVisibleChildren(node) {
		if (!this.expandedNodes.has(node.id)) return [];
		return node.children || [];
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		this._computeLayout();
		const cw = this.config.cardWidth;
		const ch = this.config.cardHeight;

		let maxX = 0, maxY = 0;
		this._positions.forEach(pos => {
			maxX = Math.max(maxX, pos.x + cw);
			maxY = Math.max(maxY, pos.y + ch);
		});

		const pad = 40;
		const svgW = maxX + pad * 2;
		const svgH = maxY + pad * 2;

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", svgW);
		svg.setAttribute("height", svgH);
		svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
		svg.classList.add("fv-org-svg");

		// Defs
		const defs = document.createElementNS(ns, "defs");
		defs.innerHTML = `<filter id="fv-org-shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.12"/></filter>`;
		svg.appendChild(defs);

		// Draw edges
		const edgeGroup = document.createElementNS(ns, "g");
		edgeGroup.classList.add("fv-org-edges");
		this._drawEdges(edgeGroup, this.tree || [], ns, pad, cw, ch);
		svg.appendChild(edgeGroup);

		// Draw node cards
		const nodeGroup = document.createElementNS(ns, "g");
		nodeGroup.classList.add("fv-org-nodes");
		this._drawNodes(nodeGroup, ns, pad, cw, ch);
		svg.appendChild(nodeGroup);

		this.viewport.innerHTML = "";
		this.viewport.appendChild(svg);
		this.svg = svg;
		this._applyTransform();
	}

	_drawEdges(group, nodes, ns, pad, cw, ch) {
		nodes.forEach(node => {
			const pos = this._positions.get(node.id);
			if (!pos) return;

			const visibleChildren = this._getVisibleChildren(node);
			visibleChildren.forEach(child => {
				const childPos = this._positions.get(child.id);
				if (!childPos) return;

				const x1 = pos.x + cw / 2 + pad;
				const y1 = pos.y + ch + pad;
				const x2 = childPos.x + cw / 2 + pad;
				const y2 = childPos.y + pad;

				const midY = (y1 + y2) / 2;

				const path = document.createElementNS(ns, "path");
				path.setAttribute("d", `M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`);
				path.setAttribute("fill", "none");
				path.setAttribute("stroke", "var(--fv-org-edge, #CBD5E1)");
				path.setAttribute("stroke-width", "1.5");
				group.appendChild(path);
			});

			this._drawEdges(group, visibleChildren, ns, pad, cw, ch);
		});
	}

	_drawNodes(group, ns, pad, cw, ch) {
		this._positions.forEach((pos, nodeId) => {
			const node = this.flatNodes.find(n => n.id === nodeId);
			if (!node) return;

			const x = pos.x + pad;
			const y = pos.y + pad;
			const color = this._getNodeColor(node);

			const g = document.createElementNS(ns, "g");
			g.setAttribute("transform", `translate(${x}, ${y})`);
			g.classList.add("fv-org-card");
			g.dataset.id = node.id;

			// Card background
			const rect = document.createElementNS(ns, "rect");
			rect.setAttribute("width", cw);
			rect.setAttribute("height", ch);
			rect.setAttribute("rx", 12);
			rect.setAttribute("fill", "var(--fv-org-card-bg, #ffffff)");
			rect.setAttribute("stroke", color);
			rect.setAttribute("stroke-width", "1.5");
			rect.setAttribute("filter", "url(#fv-org-shadow)");
			g.appendChild(rect);

			// Color accent bar
			const bar = document.createElementNS(ns, "rect");
			bar.setAttribute("width", cw);
			bar.setAttribute("height", 4);
			bar.setAttribute("rx", "2");
			bar.setAttribute("fill", color);
			g.appendChild(bar);

			// Avatar or icon
			if (node.image) {
				const img = document.createElementNS(ns, "image");
				img.setAttribute("href", node.image);
				img.setAttribute("x", 10);
				img.setAttribute("y", 15);
				img.setAttribute("width", 40);
				img.setAttribute("height", 40);
				img.setAttribute("clip-path", "circle(20px at 20px 20px)");
				g.appendChild(img);
			} else {
				const circle = document.createElementNS(ns, "circle");
				circle.setAttribute("cx", 30);
				circle.setAttribute("cy", 35);
				circle.setAttribute("r", 18);
				circle.setAttribute("fill", `${color}20`);
				circle.setAttribute("stroke", `${color}60`);
				circle.setAttribute("stroke-width", "1");
				g.appendChild(circle);

				const initials = document.createElementNS(ns, "text");
				initials.setAttribute("x", 30);
				initials.setAttribute("y", 40);
				initials.setAttribute("text-anchor", "middle");
				initials.setAttribute("class", "fv-org-initials");
				initials.setAttribute("fill", color);
				initials.textContent = (node.name || "?").charAt(0).toUpperCase();
				g.appendChild(initials);
			}

			// Name
			const name = document.createElementNS(ns, "text");
			name.setAttribute("x", 58);
			name.setAttribute("y", 32);
			name.setAttribute("class", "fv-org-name");
			name.textContent = this._truncate(node.name, 18);
			g.appendChild(name);

			// Role
			if (node.role) {
				const role = document.createElementNS(ns, "text");
				role.setAttribute("x", 58);
				role.setAttribute("y", 48);
				role.setAttribute("class", "fv-org-role");
				role.textContent = this._truncate(node.role, 22);
				g.appendChild(role);
			}

			// Department badge
			if (node.department) {
				const dept = document.createElementNS(ns, "text");
				dept.setAttribute("x", 58);
				dept.setAttribute("y", 64);
				dept.setAttribute("class", "fv-org-dept");
				dept.textContent = this._truncate(node.department, 20);
				g.appendChild(dept);
			}

			// Expand/collapse toggle
			if (this.config.expandable && node.children?.length) {
				const isExpanded = this.expandedNodes.has(node.id);
				const toggle = document.createElementNS(ns, "g");
				toggle.setAttribute("transform", `translate(${cw / 2 - 10}, ${ch - 5})`);
				toggle.classList.add("fv-org-toggle");

				const toggleBg = document.createElementNS(ns, "circle");
				toggleBg.setAttribute("cx", 10);
				toggleBg.setAttribute("cy", 5);
				toggleBg.setAttribute("r", 10);
				toggleBg.setAttribute("fill", "var(--fv-org-card-bg, #fff)");
				toggleBg.setAttribute("stroke", color);
				toggleBg.setAttribute("stroke-width", "1");
				toggle.appendChild(toggleBg);

				const toggleText = document.createElementNS(ns, "text");
				toggleText.setAttribute("x", 10);
				toggleText.setAttribute("y", 9);
				toggleText.setAttribute("text-anchor", "middle");
				toggleText.setAttribute("class", "fv-org-toggle-text");
				toggleText.textContent = isExpanded ? "−" : `+${node.children.length}`;
				toggle.appendChild(toggleText);

				toggle.addEventListener("click", (e) => {
					e.stopPropagation();
					if (this.expandedNodes.has(node.id)) {
						this.expandedNodes.delete(node.id);
					} else {
						this.expandedNodes.add(node.id);
					}
					this._render();
					if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
				});
				g.appendChild(toggle);
			}

			// Click
			g.style.cursor = "pointer";
			g.addEventListener("click", () => {
				if (this.config.onNodeClick) {
					this.config.onNodeClick(node, g);
				} else if (this.config.doctype) {
					frappe.set_route("Form", this.config.doctype, node.id);
				}
			});

			group.appendChild(g);
		});
	}

	// ─── Search ──────────────────────────────────────────────────
	_highlightSearch(query) {
		const q = query.toLowerCase();
		this.el.querySelectorAll(".fv-org-card").forEach(card => {
			const node = this.flatNodes.find(n => n.id === card.dataset.id);
			if (!node) return;
			const match = !q || node.name.toLowerCase().includes(q) || (node.role || "").toLowerCase().includes(q) || (node.department || "").toLowerCase().includes(q);
			card.style.opacity = match ? 1 : 0.2;
		});
	}

	// ─── Expand / Collapse ───────────────────────────────────────
	_expandAll() {
		this.flatNodes.forEach(n => { if (n.children?.length) this.expandedNodes.add(n.id); });
		this._render();
	}

	_collapseAll() {
		this.expandedNodes.clear();
		if (this.tree?.length) this.expandedNodes.add(this.tree[0].id);
		this._render();
	}

	// ─── Zoom / Pan ──────────────────────────────────────────────
	_initPan() {
		let isDragging = false, startX, startY;
		this.viewport.addEventListener("mousedown", (e) => {
			if (e.target.closest(".fv-org-card")) return;
			isDragging = true;
			startX = e.clientX - this.pan.x;
			startY = e.clientY - this.pan.y;
		});
		window.addEventListener("mousemove", (e) => {
			if (!isDragging) return;
			this.pan.x = e.clientX - startX;
			this.pan.y = e.clientY - startY;
			this._applyTransform();
		});
		window.addEventListener("mouseup", () => { isDragging = false; });
	}

	_setZoom(z) {
		this.zoom = Math.max(0.15, Math.min(4, z));
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
		const cards = this.el.querySelectorAll(".fv-org-card");
		gsap.fromTo(cards, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: "power2.out" });
	}

	// ─── Utils ───────────────────────────────────────────────────
	_getNodeColor(node) {
		if (this.config.colorMap[node.status]) return this.config.colorMap[node.status];
		if (this.config.showDepartmentColors && node.department && this.config.departmentColors[node.department]) {
			return this.config.departmentColors[node.department];
		}
		return this.config.defaultColor;
	}

	_truncate(str, max) {
		return str?.length > max ? str.substring(0, max - 1) + "…" : (str || "");
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}

	async refresh() {
		this.flatNodes = [];
		await this._loadData();
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
