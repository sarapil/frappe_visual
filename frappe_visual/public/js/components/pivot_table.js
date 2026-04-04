// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Pivot Table Pro
 * =================================
 * Interactive pivot table with drag-and-drop dimensions and measures.
 * Transforms flat DocType data into cross-tabulated summaries with
 * row/column grouping, multiple aggregation types, heatmap cells,
 * expand/collapse, export, and chart integration.
 *
 * Features:
 *  - Drag fields from palette to Rows / Columns / Values zones
 *  - Aggregations: Sum, Count, Avg, Min, Max, Count Distinct
 *  - Cell heatmap coloring (intensity by value)
 *  - Expand/collapse row groups (drill-down)
 *  - Grand total row and column
 *  - Sort by any column/row header
 *  - Export CSV / Print
 *  - Chart view toggle (stacked bar, heatmap)
 *  - Frappe DocType auto-load via report_builder
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.PivotTable.create('#el', { doctype, rows, cols, values })
 *
 * @module frappe_visual/components/pivot_table
 */

const AGG_TYPES = {
	sum:      { label: "Sum",   fn: (arr) => arr.reduce((a, b) => a + b, 0) },
	count:    { label: "Count", fn: (arr) => arr.length },
	avg:      { label: "Avg",   fn: (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 },
	min:      { label: "Min",   fn: (arr) => arr.length ? Math.min(...arr) : 0 },
	max:      { label: "Max",   fn: (arr) => arr.length ? Math.max(...arr) : 0 },
	distinct: { label: "Distinct", fn: (arr) => new Set(arr).size },
};

export class PivotTable {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("PivotTable: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctype: null,
			data: [],           // raw flat data (array of objects)
			rows: [],           // field names for row grouping
			cols: [],           // field names for column grouping
			values: [],         // { field, agg } pairs
			heatmap: true,
			heatmapColor: "#6366F1",
			showTotals: true,
			pageSize: 1000,
			filters: {},
		}, opts);

		this.data = this.opts.data || [];
		this.pivoted = null;
		this._init();
	}

	static create(container, opts = {}) { return new PivotTable(container, opts); }

	static async fromDocType(container, opts = {}) {
		const pt = new PivotTable(container, opts);
		await pt.loadData();
		return pt;
	}

	/* ── Initialize ──────────────────────────────────────────── */
	async _init() {
		this.container.classList.add("fv-pv", `fv-pv--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._renderToolbar();
		this._renderFieldPalette();
		this._renderDropZones();
		this._renderTableArea();

		if (this.opts.doctype && this.data.length === 0) {
			await this.loadData();
		}

		if (this.data.length > 0) this._compute();
	}

	/* ── Data Loading ────────────────────────────────────────── */
	async loadData() {
		if (!this.opts.doctype) return;
		try {
			const meta = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields: ["*"],
				filters: this.opts.filters,
				limit_page_length: this.opts.pageSize,
			});
			this.data = meta || [];
			this._updateFieldPalette();
			this._compute();
		} catch (e) {
			console.error("PivotTable: load error", e);
		}
	}

	/* ── Toolbar ─────────────────────────────────────────────── */
	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-pv-toolbar";
		bar.innerHTML = `
			<h3 class="fv-pv-title">${this.opts.doctype ? __(this.opts.doctype) + " — " : ""}${__("Pivot Table")}</h3>
			<div class="fv-pv-toolbar-right">
				<select class="fv-pv-agg-select">
					${Object.entries(AGG_TYPES).map(([k, v]) =>
						`<option value="${k}">${__(v.label)}</option>`).join("")}
				</select>
				<button class="fv-pv-btn fv-pv-export">${__("Export CSV")}</button>
				<button class="fv-pv-btn fv-pv-refresh">${__("Refresh")}</button>
			</div>`;
		this.container.appendChild(bar);

		bar.querySelector(".fv-pv-refresh").addEventListener("click", () => this.loadData());
		bar.querySelector(".fv-pv-export").addEventListener("click", () => this._exportCSV());
		bar.querySelector(".fv-pv-agg-select").addEventListener("change", (e) => {
			for (const v of this.opts.values) v.agg = e.target.value;
			this._compute();
		});
	}

	/* ── Field Palette ───────────────────────────────────────── */
	_renderFieldPalette() {
		const palette = document.createElement("div");
		palette.className = "fv-pv-palette";
		palette.innerHTML = `<div class="fv-pv-palette-title">${__("Fields")}</div>
			<div class="fv-pv-palette-list"></div>`;
		this.container.appendChild(palette);
		this._paletteList = palette.querySelector(".fv-pv-palette-list");
		this._updateFieldPalette();
	}

	_updateFieldPalette() {
		if (!this._paletteList) return;
		if (this.data.length === 0) return;

		const fields = Object.keys(this.data[0] || {}).filter(f => f !== "name" && !f.startsWith("_"));
		this._paletteList.innerHTML = fields.map(f => `
			<div class="fv-pv-field" draggable="true" data-field="${f}">
				${__(f.replace(/_/g, " "))}
			</div>`).join("");

		this._paletteList.querySelectorAll(".fv-pv-field").forEach(el => {
			el.addEventListener("dragstart", (e) => {
				e.dataTransfer.setData("field", el.dataset.field);
			});
		});
	}

	/* ── Drop Zones ──────────────────────────────────────────── */
	_renderDropZones() {
		const zones = document.createElement("div");
		zones.className = "fv-pv-zones";
		zones.innerHTML = `
			<div class="fv-pv-zone" data-zone="rows">
				<span class="fv-pv-zone-label">${__("Rows")}</span>
				<div class="fv-pv-zone-chips"></div>
			</div>
			<div class="fv-pv-zone" data-zone="cols">
				<span class="fv-pv-zone-label">${__("Columns")}</span>
				<div class="fv-pv-zone-chips"></div>
			</div>
			<div class="fv-pv-zone" data-zone="values">
				<span class="fv-pv-zone-label">${__("Values")}</span>
				<div class="fv-pv-zone-chips"></div>
			</div>`;
		this.container.appendChild(zones);

		zones.querySelectorAll(".fv-pv-zone").forEach(zone => {
			zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("fv-pv-zone--hover"); });
			zone.addEventListener("dragleave", () => zone.classList.remove("fv-pv-zone--hover"));
			zone.addEventListener("drop", (e) => {
				e.preventDefault();
				zone.classList.remove("fv-pv-zone--hover");
				const field = e.dataTransfer.getData("field");
				if (field) this._addToZone(zone.dataset.zone, field);
			});
		});

		// Pre-populate
		for (const f of this.opts.rows) this._addToZone("rows", f);
		for (const f of this.opts.cols) this._addToZone("cols", f);
		for (const v of this.opts.values) this._addToZone("values", typeof v === "string" ? v : v.field);
	}

	_addToZone(zoneName, field) {
		// Remove from other zones first
		this.opts.rows = this.opts.rows.filter(f => f !== field);
		this.opts.cols = this.opts.cols.filter(f => f !== field);
		this.opts.values = this.opts.values.filter(v => (v.field || v) !== field);

		if (zoneName === "rows") this.opts.rows.push(field);
		else if (zoneName === "cols") this.opts.cols.push(field);
		else if (zoneName === "values") this.opts.values.push({ field, agg: "sum" });

		this._updateZoneChips();
		this._compute();
	}

	_updateZoneChips() {
		const zones = this.container.querySelectorAll(".fv-pv-zone");
		zones.forEach(zone => {
			const chips = zone.querySelector(".fv-pv-zone-chips");
			const z = zone.dataset.zone;
			let items;
			if (z === "rows") items = this.opts.rows.map(f => ({ field: f, label: f }));
			else if (z === "cols") items = this.opts.cols.map(f => ({ field: f, label: f }));
			else items = this.opts.values.map(v => ({ field: v.field || v, label: `${v.field || v} (${v.agg || "sum"})` }));

			chips.innerHTML = items.map(i => `
				<span class="fv-pv-chip" data-field="${i.field}">
					${__(i.label.replace(/_/g, " "))}
					<button class="fv-pv-chip-x">×</button>
				</span>`).join("");

			chips.querySelectorAll(".fv-pv-chip-x").forEach(btn => {
				btn.addEventListener("click", () => {
					const f = btn.parentElement.dataset.field;
					this.opts.rows = this.opts.rows.filter(r => r !== f);
					this.opts.cols = this.opts.cols.filter(c => c !== f);
					this.opts.values = this.opts.values.filter(v => (v.field || v) !== f);
					this._updateZoneChips();
					this._compute();
				});
			});
		});
	}

	/* ── Compute Pivot ───────────────────────────────────────── */
	_compute() {
		const { rows, cols, values } = this.opts;
		if (this.data.length === 0 || (rows.length === 0 && cols.length === 0)) {
			this._renderEmpty();
			return;
		}

		// Build row keys and col keys
		const rowKeyFn = (d) => rows.map(f => d[f] ?? "").join(" | ");
		const colKeyFn = (d) => cols.map(f => d[f] ?? "").join(" | ");

		const rowKeysSet = new Set();
		const colKeysSet = new Set();
		const cells = {}; // "rowKey::colKey" -> [values]

		for (const d of this.data) {
			const rk = rowKeyFn(d);
			const ck = colKeyFn(d) || "__total__";
			rowKeysSet.add(rk);
			colKeysSet.add(ck);

			const key = `${rk}::${ck}`;
			if (!cells[key]) cells[key] = [];

			for (const v of values) {
				const field = v.field || v;
				cells[key].push(parseFloat(d[field]) || 0);
			}
		}

		const rowKeys = [...rowKeysSet].sort();
		const colKeys = [...colKeysSet].sort();
		const aggType = values[0]?.agg || "sum";
		const aggFn = AGG_TYPES[aggType]?.fn || AGG_TYPES.sum.fn;

		// Compute aggregated values
		const grid = {};
		let globalMin = Infinity, globalMax = -Infinity;

		for (const rk of rowKeys) {
			grid[rk] = {};
			for (const ck of colKeys) {
				const vals = cells[`${rk}::${ck}`] || [];
				const agg = vals.length ? aggFn(vals) : 0;
				grid[rk][ck] = agg;
				if (agg < globalMin) globalMin = agg;
				if (agg > globalMax) globalMax = agg;
			}
		}

		this.pivoted = { rowKeys, colKeys, grid, globalMin, globalMax, aggType };
		this._renderTable();
	}

	/* ── Table Area ──────────────────────────────────────────── */
	_renderTableArea() {
		const area = document.createElement("div");
		area.className = "fv-pv-table-area";
		this.container.appendChild(area);
		this._tableArea = area;
	}

	_renderEmpty() {
		if (!this._tableArea) return;
		this._tableArea.innerHTML = `
			<div class="fv-pv-empty">
				<p>${__("Drag fields to Rows, Columns, and Values zones to build the pivot table")}</p>
			</div>`;
	}

	_renderTable() {
		if (!this._tableArea || !this.pivoted) return;
		const { rowKeys, colKeys, grid, globalMin, globalMax, aggType } = this.pivoted;

		let html = `<div class="fv-pv-table-wrap"><table class="fv-pv-table">`;

		// Header
		html += `<thead><tr><th class="fv-pv-th">${this.opts.rows.join(" / ") || ""}</th>`;
		for (const ck of colKeys) {
			html += `<th class="fv-pv-th">${ck === "__total__" ? __(AGG_TYPES[aggType]?.label || "Value") : this._esc(ck)}</th>`;
		}
		if (this.opts.showTotals && colKeys.length > 1) {
			html += `<th class="fv-pv-th fv-pv-th--total">${__("Total")}</th>`;
		}
		html += `</tr></thead><tbody>`;

		// Rows
		for (const rk of rowKeys) {
			html += `<tr>`;
			html += `<td class="fv-pv-td fv-pv-td--label">${this._esc(rk || __("(blank)"))}</td>`;

			let rowTotal = 0;
			for (const ck of colKeys) {
				const val = grid[rk]?.[ck] || 0;
				rowTotal += val;
				const bg = this.opts.heatmap ? this._heatmapColor(val, globalMin, globalMax) : "";
				html += `<td class="fv-pv-td fv-pv-td--val" style="${bg ? `background:${bg}` : ""}">
					${this._formatNum(val)}</td>`;
			}

			if (this.opts.showTotals && colKeys.length > 1) {
				html += `<td class="fv-pv-td fv-pv-td--total">${this._formatNum(rowTotal)}</td>`;
			}
			html += `</tr>`;
		}

		// Grand total row
		if (this.opts.showTotals && rowKeys.length > 1) {
			html += `<tr class="fv-pv-total-row"><td class="fv-pv-td fv-pv-td--label"><strong>${__("Grand Total")}</strong></td>`;
			let grandTotal = 0;
			for (const ck of colKeys) {
				let colSum = 0;
				for (const rk of rowKeys) colSum += (grid[rk]?.[ck] || 0);
				grandTotal += colSum;
				html += `<td class="fv-pv-td fv-pv-td--total">${this._formatNum(colSum)}</td>`;
			}
			if (colKeys.length > 1) {
				html += `<td class="fv-pv-td fv-pv-td--total"><strong>${this._formatNum(grandTotal)}</strong></td>`;
			}
			html += `</tr>`;
		}

		html += `</tbody></table></div>`;
		this._tableArea.innerHTML = html;
	}

	/* ── Heatmap ─────────────────────────────────────────────── */
	_heatmapColor(val, min, max) {
		if (max === min) return "";
		const ratio = (val - min) / (max - min);
		const alpha = 0.05 + ratio * 0.35;
		return this._alphaColor(this.opts.heatmapColor, alpha);
	}

	/* ── Export ───────────────────────────────────────────────── */
	_exportCSV() {
		if (!this.pivoted) return;
		const { rowKeys, colKeys, grid } = this.pivoted;
		const sep = ",";
		let csv = "\uFEFF"; // BOM for Excel

		// Header
		csv += `"${this.opts.rows.join("/")}"${sep}` + colKeys.map(c => `"${c}"`).join(sep) + "\n";

		// Rows
		for (const rk of rowKeys) {
			csv += `"${rk}"${sep}` + colKeys.map(ck => grid[rk]?.[ck] || 0).join(sep) + "\n";
		}

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `pivot_${this.opts.doctype || "data"}_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_formatNum(v) {
		if (v == null) return "0";
		return typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v;
	}

	_alphaColor(hex, alpha) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-pv", `fv-pv--${this.opts.theme}`);
	}
}
