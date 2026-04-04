// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — ScoreCard
 * ============================
 * Multi-metric scorecard panel showing KPIs with targets, RAG status
 * (Red/Amber/Green), gauges, comparison periods, and category grouping.
 * Think executive dashboards and balanced scorecards.
 *
 * Usage:
 *   frappe.visual.ScoreCard.create('#el', {
 *     title: 'Q1 Performance',
 *     categories: [
 *       { name: 'Financial', items: [
 *         { label: 'Revenue', value: 1200000, target: 1500000, unit: '$' },
 *         { label: 'Profit Margin', value: 18.5, target: 20, unit: '%' },
 *       ]},
 *       { name: 'Customer', items: [
 *         { label: 'NPS Score', value: 72, target: 80 },
 *         { label: 'Churn Rate', value: 2.1, target: 3, invertRAG: true },
 *       ]},
 *     ]
 *   })
 *
 * @module frappe_visual/components/score_card
 */

const RAG_COLORS = {
	green:  { bg: "rgba(16,185,129,0.08)",  border: "#10b981", text: "#059669", label: "On Track" },
	amber:  { bg: "rgba(245,158,11,0.08)",  border: "#f59e0b", text: "#d97706", label: "At Risk" },
	red:    { bg: "rgba(239,68,68,0.08)",    border: "#ef4444", text: "#dc2626", label: "Off Track" },
	grey:   { bg: "rgba(148,163,184,0.08)",  border: "#94a3b8", text: "#64748b", label: "No Target" },
};

export class ScoreCard {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("ScoreCard: container not found");

		this.opts = Object.assign({
			theme: "glass",
			title: "",
			subtitle: "",
			categories: [],
			showRAG: true,
			showProgress: true,
			showGauge: false,
			ragThresholds: { green: 90, amber: 70 },  // % of target
			period: "",
			comparePeriod: "",
			onItemClick: null,
		}, opts);

		this._init();
	}

	static create(container, opts = {}) { return new ScoreCard(container, opts); }

	_init() {
		this.container.classList.add("fv-sc", `fv-sc--${this.opts.theme}`);
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		// Header
		if (this.opts.title || this.opts.subtitle) {
			const header = document.createElement("div");
			header.className = "fv-sc-header";
			header.innerHTML = `
				<div>
					${this.opts.title ? `<h3 class="fv-sc-title">${this._esc(this.opts.title)}</h3>` : ""}
					${this.opts.subtitle ? `<span class="fv-sc-subtitle">${this._esc(this.opts.subtitle)}</span>` : ""}
				</div>
				${this.opts.period ? `<span class="fv-sc-period">${this._esc(this.opts.period)}</span>` : ""}`;
			this.container.appendChild(header);
		}

		// Summary bar
		this._renderSummaryBar();

		// Categories
		for (const cat of this.opts.categories) {
			this.container.appendChild(this._renderCategory(cat));
		}
	}

	_renderSummaryBar() {
		const allItems = this.opts.categories.flatMap(c => c.items || []);
		const counts = { green: 0, amber: 0, red: 0, grey: 0 };

		for (const item of allItems) {
			counts[this._getRAG(item)] += 1;
		}

		const bar = document.createElement("div");
		bar.className = "fv-sc-summary";
		bar.innerHTML = Object.entries(counts).map(([rag, count]) => {
			if (count === 0) return "";
			const cfg = RAG_COLORS[rag];
			return `<span class="fv-sc-summary-item" style="background:${cfg.bg};color:${cfg.text};border-color:${cfg.border}">
				● ${count} ${__(cfg.label)}
			</span>`;
		}).join("");

		this.container.appendChild(bar);
	}

	_renderCategory(cat) {
		const section = document.createElement("div");
		section.className = "fv-sc-cat";

		section.innerHTML = `<div class="fv-sc-cat-title">${this._esc(cat.name || "")}</div>`;

		const grid = document.createElement("div");
		grid.className = "fv-sc-items";

		for (const item of (cat.items || [])) {
			grid.appendChild(this._renderItem(item));
		}

		section.appendChild(grid);
		return section;
	}

	_renderItem(item) {
		const rag = this._getRAG(item);
		const cfg = RAG_COLORS[rag];
		const pct = item.target ? ((item.value / item.target) * 100) : null;

		const el = document.createElement("div");
		el.className = "fv-sc-item";
		el.style.borderInlineStartColor = cfg.border;

		const unit = item.unit || "";
		const valueStr = typeof item.value === "number" ? item.value.toLocaleString() : String(item.value);
		const targetStr = item.target != null ? (typeof item.target === "number" ? item.target.toLocaleString() : String(item.target)) : null;

		// Gauge mini-circle (optional)
		let gaugeHtml = "";
		if (this.opts.showGauge && pct !== null) {
			const r = 20, c = Math.PI * 2 * r;
			const dash = (Math.min(pct, 100) / 100) * c;
			gaugeHtml = `<svg class="fv-sc-gauge" viewBox="0 0 48 48" width="48" height="48">
				<circle cx="24" cy="24" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="4"/>
				<circle cx="24" cy="24" r="${r}" fill="none" stroke="${cfg.border}" stroke-width="4"
					stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}" stroke-linecap="round"
					transform="rotate(-90 24 24)"/>
				<text x="24" y="26" text-anchor="middle" font-size="11" font-weight="600" fill="${cfg.text}">${pct.toFixed(0)}%</text>
			</svg>`;
		}

		// Progress bar
		let progressHtml = "";
		if (this.opts.showProgress && pct !== null) {
			progressHtml = `<div class="fv-sc-progress">
				<div class="fv-sc-progress-bar"><div class="fv-sc-progress-fill" style="width:${Math.min(pct, 100).toFixed(0)}%;background:${cfg.border}"></div></div>
			</div>`;
		}

		// RAG badge
		let ragHtml = "";
		if (this.opts.showRAG) {
			ragHtml = `<span class="fv-sc-rag" style="background:${cfg.bg};color:${cfg.text}">● ${__(cfg.label)}</span>`;
		}

		el.innerHTML = `
			<div class="fv-sc-item-main">
				${gaugeHtml}
				<div class="fv-sc-item-info">
					<span class="fv-sc-item-label">${this._esc(item.label || "")}</span>
					<div class="fv-sc-item-values">
						<span class="fv-sc-item-value">${unit === "$" ? "$" : ""}${valueStr}${unit && unit !== "$" ? unit : ""}</span>
						${targetStr ? `<span class="fv-sc-item-target">/ ${unit === "$" ? "$" : ""}${targetStr}${unit && unit !== "$" ? unit : ""}</span>` : ""}
					</div>
					${progressHtml}
				</div>
			</div>
			${ragHtml}`;

		if (this.opts.onItemClick) {
			el.style.cursor = "pointer";
			el.addEventListener("click", () => this.opts.onItemClick(item));
		}

		return el;
	}

	_getRAG(item) {
		if (item.target == null || item.target === 0) return "grey";
		let pct = (item.value / item.target) * 100;
		if (item.invertRAG) pct = 200 - pct; // For metrics where lower is better (e.g., churn)
		if (pct >= this.opts.ragThresholds.green) return "green";
		if (pct >= this.opts.ragThresholds.amber) return "amber";
		return "red";
	}

	/* ── Public API ──────────────────────────────────────────── */
	setCategories(categories) { this.opts.categories = categories; this._render(); }
	getRAGSummary() {
		const all = this.opts.categories.flatMap(c => c.items || []);
		const counts = { green: 0, amber: 0, red: 0, grey: 0 };
		all.forEach(item => counts[this._getRAG(item)]++);
		return counts;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sc", `fv-sc--${this.opts.theme}`);
	}
}
