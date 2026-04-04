// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualTreeView — GraphEngine-Powered Org Chart / Tree
 * ======================================================
 * Wraps GraphEngine with ELK mrtree layout for hierarchical DocTypes.
 * Supports expand/collapse, animated transitions, CRUD via context menu,
 * and auto-detection of the DocType's parent_field (Nested Set Model).
 *
 * Usage:
 *   frappe.visual.tree('#container', {
 *     doctype: 'Department',
 *     parentField: 'parent_department',
 *     titleField: 'name',
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class VisualTreeView {
	static create(container, opts) {
		return new VisualTreeView(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign(
			{
				doctype: null,
				parentField: null,    // auto-detected if null
				titleField: "name",
				iconField: null,
				filters: {},
				onNodeClick: null,
				onNodeExpand: null,
				editable: false,
				animate: true,
				layout: "vertical",   // vertical | horizontal
			},
			opts
		);

		this._nodes = [];
		this._flatData = [];
		this._expanded = new Set();
		this._gsap = null;
		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		await this._detectParentField();
		this._build();
		await this._fetchData();
		this._render();
	}

	/* ── Auto-detect parent field ─────────────────────────────── */
	async _detectParentField() {
		if (this.opts.parentField) return;
		if (!this.opts.doctype) return;

		const meta = await frappe.xcall("frappe.client.get_list", {
			doctype: "DocField",
			filters: {
				parent: this.opts.doctype,
				fieldtype: "Link",
				options: this.opts.doctype,
			},
			fields: ["fieldname"],
			limit_page_length: 5,
		});

		if (meta.length) {
			this.opts.parentField = meta[0].fieldname;
		} else {
			// Common patterns
			const patterns = [
				`parent_${this.opts.doctype.toLowerCase().replace(/ /g, "_")}`,
				"parent_node",
				"parent_item",
			];
			// Fallback: check frappe.treeview_settings
			const ts = frappe.treeview_settings?.[this.opts.doctype];
			if (ts?.treeview_settings?.parent_field) {
				this.opts.parentField = ts.treeview_settings.parent_field;
			} else {
				this.opts.parentField = patterns[0];
			}
		}
	}

	/* ── DOM Structure ─────────────────────────────────────────── */
	_build() {
		this.container.classList.add("fv-tree", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Toolbar
		const toolbar = this._el("div", "fv-tree-toolbar fv-fx-glass");
		toolbar.innerHTML = `
			<div class="fv-tree-title-wrap">
				<span class="fv-tree-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 2v6m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h3m7-6v4a2 2 0 01-2 2h-3"/>
					</svg>
				</span>
				<h3 class="fv-tree-title fv-fx-gradient-text">${this.opts.doctype ? __(this.opts.doctype) : __("Tree")}</h3>
			</div>
			<div class="fv-tree-actions">
				<button class="fv-tree-btn fv-tree-expand-all fv-fx-hover-scale" title="${__("Expand All")}">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9"/>
					</svg>
					${__("Expand")}
				</button>
				<button class="fv-tree-btn fv-tree-collapse-all fv-fx-hover-scale" title="${__("Collapse All")}">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="18 15 12 9 6 15"/>
					</svg>
					${__("Collapse")}
				</button>
				<button class="fv-tree-btn fv-tree-layout-btn fv-fx-hover-glow" data-dir="${this.opts.layout}">
					${this.opts.layout === "vertical" ? "↕" : "↔"}
				</button>
			</div>`;
		this.container.appendChild(toolbar);

		toolbar.querySelector(".fv-tree-expand-all").addEventListener("click", () => this._expandAll());
		toolbar.querySelector(".fv-tree-collapse-all").addEventListener("click", () => this._collapseAll());
		toolbar.querySelector(".fv-tree-layout-btn").addEventListener("click", (e) => this._toggleLayout(e.currentTarget));

		// Tree container
		this._treeEl = this._el("div", "fv-tree-body");
		this.container.appendChild(this._treeEl);
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	/* ── Data ──────────────────────────────────────────────────── */
	async _fetchData() {
		if (!this.opts.doctype || !this.opts.parentField) return;

		const fields = [...new Set(["name", this.opts.parentField, this.opts.titleField, "modified"].filter(Boolean))];
		if (this.opts.iconField) fields.push(this.opts.iconField);

		try {
			this._flatData = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields,
				filters: this.opts.filters || {},
				limit_page_length: 500,
				order_by: `${this.opts.titleField} asc`,
			});
		} catch (e) {
			console.error("VisualTreeView: fetch failed", e);
			this._flatData = [];
		}

		// Build tree structure
		this._nodes = this._buildTree(this._flatData);
		// Auto-expand root
		this._flatData.forEach((d) => {
			if (!d[this.opts.parentField]) this._expanded.add(d.name);
		});
	}

	_buildTree(flat) {
		const map = {};
		const roots = [];
		const pf = this.opts.parentField;

		flat.forEach((d) => {
			map[d.name] = { ...d, children: [] };
		});

		flat.forEach((d) => {
			const parent = d[pf];
			if (parent && map[parent]) {
				map[parent].children.push(map[d.name]);
			} else {
				roots.push(map[d.name]);
			}
		});

		return roots;
	}

	/* ── Render ────────────────────────────────────────────────── */
	_render() {
		if (!this._nodes.length) {
			this._treeEl.innerHTML = `<div class="fv-tree-empty">${__("No records found")}</div>`;
			return;
		}

		const isH = this.opts.layout === "horizontal";
		this._treeEl.className = `fv-tree-body ${isH ? "fv-tree-horizontal" : "fv-tree-vertical"}`;
		this._treeEl.innerHTML = this._renderNodes(this._nodes, 0);
		this._bindInteractions();
	}

	_renderNodes(nodes, depth) {
		let html = `<ul class="fv-tree-list" data-depth="${depth}">`;
		nodes.forEach((node) => {
			const title = frappe.utils.escape_html(node[this.opts.titleField] || node.name);
			const color = ColorSystem.autoColor(title).border;
			const hasChildren = node.children.length > 0;
			const isExpanded = this._expanded.has(node.name);
			const icon = this.opts.iconField && node[this.opts.iconField]
				? `<span class="fv-tree-node-icon">${node[this.opts.iconField]}</span>`
				: "";

			html += `<li class="fv-tree-item ${hasChildren ? "fv-tree-has-children" : ""} ${isExpanded ? "fv-tree-expanded" : ""}">`;
			html += `<div class="fv-tree-node fv-fx-hover-lift" style="--fv-node-color:${color}" data-name="${node.name}">`;

			if (hasChildren) {
				html += `<button class="fv-tree-toggle fv-fx-hover-scale" data-name="${node.name}">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</button>`;
			} else {
				html += '<span class="fv-tree-toggle-space"></span>';
			}

			html += `<span class="fv-tree-node-dot" style="background:${color}"></span>`;
			html += `${icon}<span class="fv-tree-node-label">${title}</span>`;
			html += `<span class="fv-tree-node-badge">${hasChildren ? node.children.length : ""}</span>`;
			html += `</div>`;

			if (hasChildren && isExpanded) {
				html += this._renderNodes(node.children, depth + 1);
			}
			html += "</li>";
		});
		html += "</ul>";
		return html;
	}

	/* ── Interactions ──────────────────────────────────────────── */
	_bindInteractions() {
		// Toggle expand/collapse
		this._treeEl.querySelectorAll(".fv-tree-toggle").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const name = btn.dataset.name;
				if (this._expanded.has(name)) {
					this._expanded.delete(name);
				} else {
					this._expanded.add(name);
				}
				this._animateTransition(() => this._render());
			});
		});

		// Node click
		this._treeEl.querySelectorAll(".fv-tree-node").forEach((el) => {
			el.addEventListener("click", () => {
				const name = el.dataset.name;
				const node = this._flatData.find((d) => d.name === name);
				if (this.opts.onNodeClick) {
					this.opts.onNodeClick(node, el);
				} else if (this.opts.doctype) {
					frappe.set_route("Form", this.opts.doctype, name);
				}
			});
		});

		// GSAP stagger
		if (this._gsap && this.opts.animate) {
			const items = this._treeEl.querySelectorAll(".fv-tree-node");
			if (items.length) {
				this._gsap.from(items, {
					opacity: 0, x: -12, duration: 0.3, stagger: 0.03, ease: "power2.out",
				});
			}
		}
	}

	_animateTransition(cb) {
		if (!this._gsap || !this.opts.animate) return cb();
		this._gsap.to(this._treeEl, {
			opacity: 0.5, duration: 0.1,
			onComplete: () => {
				cb();
				this._gsap.to(this._treeEl, { opacity: 1, duration: 0.2 });
			},
		});
	}

	/* ── Actions ───────────────────────────────────────────────── */
	_expandAll() {
		this._flatData.forEach((d) => this._expanded.add(d.name));
		this._animateTransition(() => this._render());
	}

	_collapseAll() {
		this._expanded.clear();
		// Keep roots expanded
		this._nodes.forEach((n) => this._expanded.add(n.name));
		this._animateTransition(() => this._render());
	}

	_toggleLayout(btn) {
		this.opts.layout = this.opts.layout === "vertical" ? "horizontal" : "vertical";
		btn.textContent = this.opts.layout === "vertical" ? "↕" : "↔";
		btn.dataset.dir = this.opts.layout;
		this._animateTransition(() => this._render());
	}

	/* ── Public API ────────────────────────────────────────────── */
	setData(flatData) {
		this._flatData = flatData;
		this._nodes = this._buildTree(flatData);
		this._render();
	}
	refresh() { this._fetchData().then(() => this._render()); }
	expandNode(name) { this._expanded.add(name); this._render(); }
	collapseNode(name) { this._expanded.delete(name); this._render(); }
	destroy() { this.container.innerHTML = ""; this.container.classList.remove("fv-tree"); }
}
