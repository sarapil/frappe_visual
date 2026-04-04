// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — InventoryGrid
 * ===============================
 * Visual warehouse bin grid showing stock levels with color-coded cells,
 * capacity bars, alerts, search/filter, and real-time updates.
 *
 * Usage:
 *   frappe.visual.InventoryGrid.create('#el', {
 *     bins: [{ id, label, location, qty, maxQty, uom, item, status }],
 *     layout: 'grid',  // grid | list | heatmap
 *     onBinClick: (bin) => {},
 *   })
 *
 * @module frappe_visual/components/inventory_grid
 */

const BIN_STATUS = {
	full:     { color: "#10b981", label: "Full",      threshold: 0.9 },
	normal:   { color: "#6366f1", label: "Normal",    threshold: 0.3 },
	low:      { color: "#f59e0b", label: "Low Stock", threshold: 0.1 },
	critical: { color: "#ef4444", label: "Critical",  threshold: 0 },
	empty:    { color: "#94a3b8", label: "Empty",     threshold: -1 },
};

export class InventoryGrid {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("InventoryGrid: container not found");

		this.opts = Object.assign({
			theme: "glass",
			bins: [],
			layout: "grid",        // grid | list | heatmap
			columns: 0,            // auto = sqrt(bins.length)
			showSearch: true,
			showFilters: true,
			showStats: true,
			showCapacityBar: true,
			enableTooltips: true,
			onBinClick: null,
			onTransfer: null,
			groupBy: null,         // e.g. "location" or "item"
		}, opts);

		this._bins = JSON.parse(JSON.stringify(this.opts.bins));
		this._filter = "";
		this._statusFilter = null;
		this._init();
	}

	static create(container, opts = {}) { return new InventoryGrid(container, opts); }

	_init() {
		this.container.classList.add("fv-inv", `fv-inv--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (this.opts.showStats) this._renderStats();
		if (this.opts.showSearch || this.opts.showFilters) this._renderToolbar();
		this._renderGrid();
	}

	_renderStats() {
		const stats = document.createElement("div");
		stats.className = "fv-inv-stats";

		const totalBins = this._bins.length;
		const totalQty = this._bins.reduce((s, b) => s + (b.qty || 0), 0);
		const critBins = this._bins.filter(b => this._getStatus(b) === "critical" || this._getStatus(b) === "empty").length;
		const avgUtil = totalBins > 0
			? (this._bins.reduce((s, b) => s + (b.maxQty > 0 ? b.qty / b.maxQty : 0), 0) / totalBins * 100).toFixed(0)
			: 0;

		stats.innerHTML = `
			<div class="fv-inv-stat"><span class="fv-inv-stat-val">${totalBins}</span><span class="fv-inv-stat-lbl">${__("Bins")}</span></div>
			<div class="fv-inv-stat"><span class="fv-inv-stat-val">${totalQty.toLocaleString()}</span><span class="fv-inv-stat-lbl">${__("Total Qty")}</span></div>
			<div class="fv-inv-stat"><span class="fv-inv-stat-val">${avgUtil}%</span><span class="fv-inv-stat-lbl">${__("Avg Utilization")}</span></div>
			<div class="fv-inv-stat fv-inv-stat--warn"><span class="fv-inv-stat-val">${critBins}</span><span class="fv-inv-stat-lbl">${__("Critical")}</span></div>`;

		this.container.appendChild(stats);
		this._statsEl = stats;
	}

	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-inv-toolbar";

		if (this.opts.showSearch) {
			const search = document.createElement("input");
			search.className = "fv-inv-search";
			search.type = "text";
			search.placeholder = __("Search bins...");
			search.addEventListener("input", () => {
				this._filter = search.value.toLowerCase();
				this._renderGrid();
			});
			bar.appendChild(search);
		}

		if (this.opts.showFilters) {
			const filters = document.createElement("div");
			filters.className = "fv-inv-filters";
			filters.innerHTML = `<button class="fv-inv-filter-btn active" data-status="">${__("All")}</button>` +
				Object.entries(BIN_STATUS).map(([k, v]) =>
					`<button class="fv-inv-filter-btn" data-status="${k}">
						<span class="fv-inv-fdot" style="background:${v.color}"></span>${__(v.label)}
					</button>`).join("");
			filters.querySelectorAll(".fv-inv-filter-btn").forEach(btn => {
				btn.addEventListener("click", () => {
					filters.querySelectorAll(".fv-inv-filter-btn").forEach(b => b.classList.remove("active"));
					btn.classList.add("active");
					this._statusFilter = btn.dataset.status || null;
					this._renderGrid();
				});
			});
			bar.appendChild(filters);
		}

		// Layout toggle
		const toggle = document.createElement("div");
		toggle.className = "fv-inv-layout-toggle";
		["grid", "list", "heatmap"].forEach(l => {
			const btn = document.createElement("button");
			btn.className = `fv-inv-layout-btn ${l === this.opts.layout ? "active" : ""}`;
			btn.textContent = l === "grid" ? "▦" : l === "list" ? "☰" : "▥";
			btn.title = __(l.charAt(0).toUpperCase() + l.slice(1));
			btn.addEventListener("click", () => {
				toggle.querySelectorAll(".fv-inv-layout-btn").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this.opts.layout = l;
				this._renderGrid();
			});
			toggle.appendChild(btn);
		});
		bar.appendChild(toggle);

		this.container.appendChild(bar);
	}

	_renderGrid() {
		if (this._gridEl) this._gridEl.remove();
		const grid = document.createElement("div");
		grid.className = `fv-inv-grid fv-inv-grid--${this.opts.layout}`;
		this.container.appendChild(grid);
		this._gridEl = grid;

		let bins = this._bins;
		if (this._filter) {
			bins = bins.filter(b =>
				(b.label || "").toLowerCase().includes(this._filter) ||
				(b.item || "").toLowerCase().includes(this._filter) ||
				(b.location || "").toLowerCase().includes(this._filter));
		}
		if (this._statusFilter) {
			bins = bins.filter(b => this._getStatus(b) === this._statusFilter);
		}

		if (this.opts.layout === "grid") {
			const cols = this.opts.columns || Math.max(3, Math.ceil(Math.sqrt(bins.length)));
			grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
		}

		for (const bin of bins) {
			grid.appendChild(this._renderBin(bin));
		}

		if (bins.length === 0) {
			grid.innerHTML = `<div class="fv-inv-empty">${__("No bins match your filter")}</div>`;
		}
	}

	_renderBin(bin) {
		const status = this._getStatus(bin);
		const st = BIN_STATUS[status];
		const util = bin.maxQty > 0 ? (bin.qty / bin.maxQty * 100).toFixed(0) : 0;

		const el = document.createElement("div");
		el.className = `fv-inv-bin fv-inv-bin--${status}`;
		el.dataset.binId = bin.id;

		if (this.opts.layout === "heatmap") {
			el.style.background = st.color;
			el.style.opacity = Math.max(0.2, bin.maxQty > 0 ? bin.qty / bin.maxQty : 0.1);
			el.title = `${bin.label}: ${bin.qty}/${bin.maxQty} ${bin.uom || ""}`;
			el.innerHTML = `<span class="fv-inv-bin-heat-lbl">${this._esc(bin.label || bin.id)}</span>`;
		} else {
			el.innerHTML = `
				<div class="fv-inv-bin-header">
					<span class="fv-inv-bin-name">${this._esc(bin.label || bin.id)}</span>
					<span class="fv-inv-bin-badge" style="background:${st.color}">${__(st.label)}</span>
				</div>
				${bin.item ? `<div class="fv-inv-bin-item">${this._esc(bin.item)}</div>` : ""}
				<div class="fv-inv-bin-qty">${bin.qty?.toLocaleString() ?? 0} <small>${this._esc(bin.uom || "")}</small></div>
				${this.opts.showCapacityBar && bin.maxQty > 0 ? `
				<div class="fv-inv-cap-bar">
					<div class="fv-inv-cap-fill" style="width:${Math.min(100, util)}%;background:${st.color}"></div>
				</div>
				<div class="fv-inv-cap-text">${util}% ${__("of")} ${bin.maxQty?.toLocaleString()}</div>` : ""}
				${bin.location ? `<div class="fv-inv-bin-loc">${this._esc(bin.location)}</div>` : ""}`;
		}

		el.addEventListener("click", () => {
			if (this.opts.onBinClick) this.opts.onBinClick(bin);
		});

		return el;
	}

	_getStatus(bin) {
		if (!bin.qty || bin.qty <= 0) return "empty";
		if (!bin.maxQty || bin.maxQty <= 0) return "normal";
		const ratio = bin.qty / bin.maxQty;
		if (ratio >= BIN_STATUS.full.threshold) return "full";
		if (ratio >= BIN_STATUS.normal.threshold) return "normal";
		if (ratio >= BIN_STATUS.low.threshold) return "low";
		return "critical";
	}

	/* ── Public API ──────────────────────────────────────────── */
	setBins(bins) { this._bins = JSON.parse(JSON.stringify(bins)); this._renderGrid(); }
	updateBin(id, updates) {
		const bin = this._bins.find(b => b.id === id);
		if (bin) { Object.assign(bin, updates); this._renderGrid(); }
	}
	getBins() { return JSON.parse(JSON.stringify(this._bins)); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-inv", `fv-inv--${this.opts.theme}`);
	}
}
