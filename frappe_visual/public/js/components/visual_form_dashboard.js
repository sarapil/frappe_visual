// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualFormDashboard — Enhanced Form Dashboard
 * ===============================================
 * Replaces the standard form dashboard section with a rich
 * visual display: GraphEngine relationship mini-graph, stat cards,
 * connection badges, and quick navigation links.
 *
 * Usage:
 *   frappe.visual.formDashboard('#container', {
 *     doctype: 'Sales Order',
 *     docname: 'SO-00001',
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class VisualFormDashboard {
	static create(container, opts) {
		return new VisualFormDashboard(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign(
			{
				doctype: null,
				docname: null,
				maxDepth: 1,
				showGraph: true,
				showStats: true,
				compact: false,
				animate: true,
				onNodeClick: null,
			},
			opts
		);

		this._data = { nodes: [], edges: [], stats: {} };
		this._gsap = null;
		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		this._build();
		if (this.opts.doctype && this.opts.docname) {
			await this._fetchData();
		}
		this._render();
	}

	/* ── DOM Structure ─────────────────────────────────────────── */
	_build() {
		this.container.classList.add("fv-form-dash", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Main layout: stats + graph side by side
		this._statsEl = this._el("div", "fv-fdash-stats");
		this._graphEl = this._el("div", "fv-fdash-graph");
		this._linksEl = this._el("div", "fv-fdash-links");

		const main = this._el("div", "fv-fdash-main");
		if (this.opts.showStats) main.appendChild(this._statsEl);
		if (this.opts.showGraph) main.appendChild(this._graphEl);
		this.container.appendChild(main);
		this.container.appendChild(this._linksEl);
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	/* ── Data ──────────────────────────────────────────────────── */
	async _fetchData() {
		try {
			this._data = await frappe.xcall(
				"frappe_visual.api.get_form_dashboard_data",
				{
					doctype: this.opts.doctype,
					docname: this.opts.docname,
					depth: this.opts.maxDepth,
				}
			);
		} catch (e) {
			console.error("VisualFormDashboard: fetch failed", e);
			// Fallback: try the relationship explorer
			try {
				const rel = await frappe.xcall(
					"frappe_visual.api.get_doctype_relationships",
					{ doctype: this.opts.doctype, depth: 1 }
				);
				this._data = { ...rel, stats: {} };
			} catch (e2) {
				this._data = { nodes: [], edges: [], stats: {} };
			}
		}
	}

	/* ── Render ────────────────────────────────────────────────── */
	_render() {
		this._renderStats();
		this._renderGraph();
		this._renderLinks();

		// GSAP entrance
		if (this._gsap && this.opts.animate) {
			const cards = this.container.querySelectorAll(".fv-fdash-stat-card, .fv-fdash-link-item");
			if (cards.length) {
				this._gsap.from(cards, {
					opacity: 0, y: 12, scale: 0.96,
					duration: 0.35, stagger: 0.04, ease: "power2.out",
				});
			}
		}
	}

	_renderStats() {
		if (!this.opts.showStats) return;
		const stats = this._data.stats || {};
		const entries = Object.entries(stats);

		if (!entries.length) {
			// Show connection count from edges
			const incoming = this._data.edges?.filter((e) => e.target?.includes(this.opts.doctype)).length || 0;
			const outgoing = this._data.edges?.filter((e) => e.source?.includes(this.opts.doctype)).length || 0;
			entries.push(
				[__("Connections"), (this._data.edges || []).length],
				[__("Linked Types"), (this._data.nodes || []).length],
				[__("Incoming"), incoming],
				[__("Outgoing"), outgoing]
			);
		}

		let html = '<div class="fv-fdash-stat-grid">';
		entries.forEach(([label, value]) => {
			const color = ColorSystem.autoColor(String(label)).border;
			html += `
				<div class="fv-fdash-stat-card fv-fx-hover-lift fv-fx-glass" style="--fv-stat-color:${color}">
					<div class="fv-fdash-stat-value fv-fx-counter">${this._formatNum(value)}</div>
					<div class="fv-fdash-stat-label">${frappe.utils.escape_html(String(label))}</div>
					<div class="fv-fdash-stat-bar" style="background:${color}"></div>
				</div>`;
		});
		html += "</div>";
		this._statsEl.innerHTML = html;
	}

	_renderGraph() {
		if (!this.opts.showGraph || !this._data.nodes?.length) {
			this._graphEl.innerHTML = "";
			return;
		}

		const nodes = this._data.nodes.slice(0, 15); // limit for mini view
		const centerDt = this.opts.doctype;

		let html = '<div class="fv-fdash-mini-graph">';

		// Simple radial visualization (no Cytoscape dependency for form dashboard)
		const radius = 90;
		const cx = 120, cy = 110;
		const angleStep = (2 * Math.PI) / Math.max(nodes.length - 1, 1);

		html += `<svg class="fv-fdash-graph-svg" viewBox="0 0 240 220" width="240" height="220">`;

		// Edges
		let nonCenterIdx = 0;
		nodes.forEach((node) => {
			if (node.label === centerDt || node.doctype === centerDt) return;
			const angle = angleStep * nonCenterIdx - Math.PI / 2;
			const nx = cx + radius * Math.cos(angle);
			const ny = cy + radius * Math.sin(angle);
			html += `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="var(--fv-border-secondary, #cbd5e1)" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>`;
			nonCenterIdx++;
		});

		// Center node
		const centerColor = ColorSystem.autoColor(centerDt).border;
		html += `<circle cx="${cx}" cy="${cy}" r="22" fill="${centerColor}" opacity="0.15"/>`;
		html += `<circle cx="${cx}" cy="${cy}" r="18" fill="${centerColor}" opacity="0.25"/>`;
		html += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" font-weight="600" fill="var(--fv-text-primary, #1e293b)">${this._truncate(centerDt, 12)}</text>`;

		// Outer nodes
		nonCenterIdx = 0;
		nodes.forEach((node) => {
			if (node.label === centerDt || node.doctype === centerDt) return;
			const angle = angleStep * nonCenterIdx - Math.PI / 2;
			const nx = cx + radius * Math.cos(angle);
			const ny = cy + radius * Math.sin(angle);
			const nColor = ColorSystem.autoColor(node.label || node.doctype || "").border;

			html += `<circle cx="${nx}" cy="${ny}" r="14" fill="${nColor}" opacity="0.15" class="fv-fdash-node-circle"/>`;
			html += `<circle cx="${nx}" cy="${ny}" r="10" fill="${nColor}" opacity="0.3"/>`;
			html += `<text x="${nx}" y="${ny + 3}" text-anchor="middle" font-size="7" fill="var(--fv-text-secondary, #64748b)">${this._truncate(node.label || node.doctype || "", 10)}</text>`;
			nonCenterIdx++;
		});

		html += "</svg></div>";
		this._graphEl.innerHTML = html;
	}

	_renderLinks() {
		const nodes = (this._data.nodes || []).filter(
			(n) => n.label !== this.opts.doctype && n.doctype !== this.opts.doctype
		);

		if (!nodes.length) {
			this._linksEl.innerHTML = "";
			return;
		}

		let html = '<div class="fv-fdash-links-grid">';
		nodes.slice(0, 12).forEach((node) => {
			const label = node.label || node.doctype || node.id;
			const color = ColorSystem.autoColor(label).border;
			const dtype = node.doctype || node.label;
			const edgeType = this._data.edges?.find(
				(e) => e.target?.includes(label) || e.source?.includes(label)
			);
			const relLabel = edgeType?.label || edgeType?.type || "";

			html += `
				<a class="fv-fdash-link-item fv-fx-hover-lift fv-fx-hover-shine" href="/app/${dtype.toLowerCase().replace(/ /g, "-")}" style="--fv-link-color:${color}">
					<span class="fv-fdash-link-dot" style="background:${color}"></span>
					<span class="fv-fdash-link-name">${frappe.utils.escape_html(label)}</span>
					${relLabel ? `<span class="fv-fdash-link-rel">${frappe.utils.escape_html(relLabel)}</span>` : ""}
				</a>`;
		});
		html += "</div>";
		this._linksEl.innerHTML = html;
	}

	/* ── Helpers ───────────────────────────────────────────────── */
	_formatNum(n) {
		n = parseInt(n) || 0;
		if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
		if (n >= 1000) return (n / 1000).toFixed(1) + "K";
		return String(n);
	}

	_truncate(s, max) {
		return s.length > max ? s.slice(0, max - 1) + "…" : s;
	}

	/* ── Public API ────────────────────────────────────────────── */
	setData(data) { this._data = data; this._render(); }
	refresh() { this._fetchData().then(() => this._render()); }
	destroy() { this.container.innerHTML = ""; this.container.classList.remove("fv-form-dash"); }
}
