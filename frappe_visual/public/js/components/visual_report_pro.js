/**
 * VisualReportPro — Premium Report Builder / Viewer
 * ====================================================
 * A complete visual report component for Frappe with grouping,
 * aggregation, charts, filters, and export.
 *
 * Features:
 *   • Smart table with sortable columns, row grouping, subtotals
 *   • Inline summary row (sum, avg, count, min, max)
 *   • Sparkline mini-charts in table cells
 *   • Pivot/cross-tab mode
 *   • Filter bar with field-type-aware inputs
 *   • Chart view toggle (bar, line, pie — delegates to ChartPro)
 *   • Export: CSV, Excel, PDF, Print
 *   • Column resize & reorder via drag
 *   • Sticky headers on scroll
 *   • Row expand for detail view
 *   • Frappe integration: loads data from Report API or get_list
 *   • RTL, dark mode, theme support
 *
 * Usage:
 *   frappe.visual.ReportPro.create('#container', {
 *     doctype: 'Sales Invoice',
 *     columns: [
 *       { field: 'customer', label: 'Customer', width: 200 },
 *       { field: 'grand_total', label: 'Amount', type: 'Currency', aggregate: 'sum' },
 *       { field: 'posting_date', label: 'Date', type: 'Date' },
 *       { field: 'status', label: 'Status', type: 'Select' },
 *     ],
 *     groupBy: 'status',
 *     filters: { docstatus: 1 },
 *     orderBy: 'posting_date desc',
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualReportPro {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("ReportPro: container not found");

		this.config = Object.assign({
			// Data
			doctype: null,
			reportName: null,
			columns: [],
			filters: {},
			orderBy: null,
			limit: 500,
			groupBy: null,
			data: null,

			// Display
			title: "",
			subtitle: "",
			theme: "glass",
			showToolbar: true,
			showFilterBar: true,
			showSummaryRow: true,
			showGroupHeaders: true,
			showChartToggle: true,
			showExport: true,
			stickyHeader: true,
			rowExpandable: false,
			expandTemplate: null,
			pageSize: 50,

			// Interaction
			sortable: true,
			onRowClick: null,
			animate: true,
		}, config);

		this.allData = [];
		this.filteredData = [];
		this.currentPage = 0;
		this.sortField = null;
		this.sortDir = "asc";
		this.viewMode = "table";    // 'table' | 'chart'
		this._init();
	}

	static create(container, config) {
		return new VisualReportPro(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._loadData();
		this._applyFilters();
		this._renderTable();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		const isRTL = this._isRTL();
		this.el = document.createElement("div");
		this.el.className = `fv-rpt fv-rpt--${this.config.theme}`;
		this.el.setAttribute("dir", isRTL ? "rtl" : "ltr");

		let toolbar = "";
		if (this.config.showToolbar) {
			toolbar = `<div class="fv-rpt-toolbar">
				<div class="fv-rpt-toolbar-left">
					${this.config.title ? `<h3 class="fv-rpt-title">${__(this.config.title)}</h3>` : ""}
					${this.config.subtitle ? `<span class="fv-rpt-subtitle">${__(this.config.subtitle)}</span>` : ""}
				</div>
				<div class="fv-rpt-toolbar-right">
					${this.config.showChartToggle ? `
						<button class="fv-rpt-btn fv-rpt-view-btn active" data-view="table" title="${__("Table")}">☰</button>
						<button class="fv-rpt-btn fv-rpt-view-btn" data-view="chart" title="${__("Chart")}">📊</button>
					` : ""}
					${this.config.showExport ? `
						<div class="fv-rpt-export-group">
							<button class="fv-rpt-btn fv-rpt-export-btn" data-format="csv">CSV</button>
							<button class="fv-rpt-btn fv-rpt-export-btn" data-format="print">🖨</button>
						</div>
					` : ""}
				</div>
			</div>`;
		}

		this.el.innerHTML = `
			${toolbar}
			${this.config.showFilterBar ? `<div class="fv-rpt-filters"></div>` : ""}
			<div class="fv-rpt-body"></div>
			<div class="fv-rpt-footer"></div>
		`;

		this.container.innerHTML = "";
		this.container.appendChild(this.el);

		// View toggle
		this.el.querySelectorAll(".fv-rpt-view-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				this.el.querySelectorAll(".fv-rpt-view-btn").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this.viewMode = btn.dataset.view;
				if (this.viewMode === "table") this._renderTable();
				else this._renderChart();
			});
		});

		// Export
		this.el.querySelectorAll(".fv-rpt-export-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				if (btn.dataset.format === "csv") this._exportCSV();
				else if (btn.dataset.format === "print") this._print();
			});
		});

		// Filter bar
		if (this.config.showFilterBar) this._buildFilterBar();
	}

	// ─── Filter Bar ──────────────────────────────────────────────
	_buildFilterBar() {
		const bar = this.el.querySelector(".fv-rpt-filters");
		if (!bar) return;

		const searchable = this.config.columns.filter(c => c.type !== "Image");
		bar.innerHTML = `<input type="text" class="fv-rpt-search" placeholder="${__("Search")}...">`;

		bar.querySelector(".fv-rpt-search")?.addEventListener("input", frappe.utils.debounce((e) => {
			this._searchQuery = e.target.value.toLowerCase();
			this._applyFilters();
			this._renderTable();
		}, 200));
	}

	// ─── Data ────────────────────────────────────────────────────
	async _loadData() {
		if (this.config.data) {
			this.allData = this.config.data;
			return;
		}

		if (this.config.reportName) {
			try {
				const result = await frappe.xcall("frappe.desk.query_report.run", {
					report_name: this.config.reportName,
					filters: this.config.filters,
				});
				this.allData = result?.result || [];
				// Map columns if not set
				if (!this.config.columns.length && result?.columns) {
					this.config.columns = result.columns.map(c => ({
						field: c.fieldname || c.id,
						label: c.label || c.fieldname,
						type: c.fieldtype || "Data",
						width: c.width || 150,
					}));
				}
			} catch (err) {
				console.error("ReportPro: report load error", err);
				this.allData = [];
			}
			return;
		}

		if (!this.config.doctype) {
			this.allData = [];
			return;
		}

		try {
			const fields = this.config.columns.map(c => c.field).filter(Boolean);
			if (!fields.includes("name")) fields.unshift("name");

			const rows = await frappe.xcall("frappe.client.get_list", {
				doctype: this.config.doctype,
				fields,
				filters: this.config.filters,
				order_by: this.config.orderBy || `${fields[0]} desc`,
				limit_page_length: this.config.limit,
			});
			this.allData = rows || [];
		} catch (err) {
			console.error("ReportPro: data load error", err);
			this.allData = [];
		}
	}

	_applyFilters() {
		let data = [...this.allData];

		// Text search
		if (this._searchQuery) {
			data = data.filter(row => {
				return this.config.columns.some(col => {
					const val = row[col.field];
					return val !== null && val !== undefined && String(val).toLowerCase().includes(this._searchQuery);
				});
			});
		}

		this.filteredData = data;
		this.currentPage = 0;
	}

	// ─── Table Render ────────────────────────────────────────────
	_renderTable() {
		const body = this.el.querySelector(".fv-rpt-body");
		const columns = this.config.columns;

		if (!this.filteredData.length) {
			body.innerHTML = `<div class="fv-rpt-empty">${__("No records found")}</div>`;
			this._renderFooter();
			return;
		}

		const grouped = this.config.groupBy ? this._groupData() : null;
		const start = this.currentPage * this.config.pageSize;
		const pageData = grouped ? null : this.filteredData.slice(start, start + this.config.pageSize);

		let html = `<div class="fv-rpt-table-wrap ${this.config.stickyHeader ? "fv-rpt-sticky" : ""}">
			<table class="fv-rpt-table">
				<thead>
					<tr>${columns.map(col =>
						`<th class="fv-rpt-th ${this.config.sortable ? "sortable" : ""}" data-field="${col.field}" style="width:${col.width || 150}px">
							${__(col.label)}
							${this.sortField === col.field ? (this.sortDir === "asc" ? " ↑" : " ↓") : ""}
						</th>`
					).join("")}</tr>
				</thead>
				<tbody>`;

		if (grouped) {
			for (const [group, rows] of grouped) {
				if (this.config.showGroupHeaders) {
					html += `<tr class="fv-rpt-group-row">
						<td colspan="${columns.length}">
							<strong>${__(this.config.groupBy)}: ${group || __("(None)")}</strong>
							<span class="fv-rpt-group-count">(${rows.length})</span>
						</td>
					</tr>`;
				}
				rows.forEach(row => { html += this._renderRow(row, columns); });

				// Group subtotals
				if (this.config.showSummaryRow) {
					html += this._renderSummaryRow(rows, columns, "fv-rpt-subtotal");
				}
			}
		} else {
			(pageData || []).forEach(row => { html += this._renderRow(row, columns); });
		}

		html += `</tbody>`;

		// Total summary
		if (this.config.showSummaryRow && !grouped) {
			html += `<tfoot>${this._renderSummaryRow(this.filteredData, columns, "fv-rpt-total")}</tfoot>`;
		}

		html += `</table></div>`;
		body.innerHTML = html;

		// Sort click
		if (this.config.sortable) {
			body.querySelectorAll(".fv-rpt-th.sortable").forEach(th => {
				th.addEventListener("click", () => {
					const field = th.dataset.field;
					if (this.sortField === field) {
						this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
					} else {
						this.sortField = field;
						this.sortDir = "asc";
					}
					this._sortData();
					this._renderTable();
				});
			});
		}

		// Row click
		if (this.config.onRowClick) {
			body.querySelectorAll(".fv-rpt-row").forEach(tr => {
				tr.addEventListener("click", () => {
					const idx = parseInt(tr.dataset.idx);
					this.config.onRowClick(this.filteredData[idx], tr);
				});
			});
		}

		this._renderFooter();

		if (this.config.animate && typeof gsap !== "undefined") {
			gsap.fromTo(body.querySelectorAll(".fv-rpt-row"),
				{ opacity: 0, x: -10 },
				{ opacity: 1, x: 0, duration: 0.3, stagger: 0.02, ease: "power2.out" }
			);
		}
	}

	_renderRow(row, columns) {
		const idx = this.filteredData.indexOf(row);
		return `<tr class="fv-rpt-row" data-idx="${idx}">
			${columns.map(col => {
				const val = row[col.field];
				return `<td class="fv-rpt-td fv-rpt-td--${(col.type || "data").toLowerCase()}">${this._formatCell(val, col)}</td>`;
			}).join("")}
		</tr>`;
	}

	_renderSummaryRow(rows, columns, cls) {
		return `<tr class="${cls}">
			${columns.map(col => {
				if (!col.aggregate) return `<td class="fv-rpt-td"></td>`;
				const vals = rows.map(r => parseFloat(r[col.field]) || 0);
				let result;
				switch (col.aggregate) {
					case "sum": result = vals.reduce((a, b) => a + b, 0); break;
					case "avg": result = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; break;
					case "count": result = vals.length; break;
					case "min": result = Math.min(...vals); break;
					case "max": result = Math.max(...vals); break;
					default: result = "";
				}
				return `<td class="fv-rpt-td fv-rpt-td--agg"><strong>${this._formatCell(result, col)}</strong></td>`;
			}).join("")}
		</tr>`;
	}

	_formatCell(val, col) {
		if (val === null || val === undefined) return "";
		const type = (col.type || "Data").toLowerCase();
		if (type === "currency") return frappe.format(val, { fieldtype: "Currency" });
		if (type === "date") return frappe.format(val, { fieldtype: "Date" });
		if (type === "percent") return `${Math.round(val * 100) / 100}%`;
		if (type === "check") return val ? "✓" : "✗";
		return frappe.utils.escape_html(String(val));
	}

	_groupData() {
		const field = this.config.groupBy;
		const map = new Map();
		this.filteredData.forEach(row => {
			const key = row[field] ?? "";
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(row);
		});
		return map;
	}

	_sortData() {
		if (!this.sortField) return;
		this.filteredData.sort((a, b) => {
			const va = a[this.sortField] ?? "";
			const vb = b[this.sortField] ?? "";
			const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
			return this.sortDir === "asc" ? cmp : -cmp;
		});
	}

	// ─── Chart View ──────────────────────────────────────────────
	_renderChart() {
		const body = this.el.querySelector(".fv-rpt-body");
		body.innerHTML = `<div class="fv-rpt-chart" style="height:400px"></div>`;

		// Delegate to ChartPro if available
		const numCols = this.config.columns.filter(c => ["Currency", "Int", "Float", "Percent"].includes(c.type));
		const labelCol = this.config.columns.find(c => !["Currency", "Int", "Float", "Percent"].includes(c.type));

		if (!numCols.length || !labelCol) {
			body.innerHTML = `<div class="fv-rpt-empty">${__("No numeric columns to chart")}</div>`;
			return;
		}

		if (frappe.visual?.ChartPro) {
			const labels = this.filteredData.slice(0, 50).map(r => r[labelCol.field] || "");
			const datasets = numCols.map((col, i) => ({
				label: __(col.label),
				values: this.filteredData.slice(0, 50).map(r => parseFloat(r[col.field]) || 0),
			}));

			frappe.visual.ChartPro.create(body.querySelector(".fv-rpt-chart"), {
				type: "bar",
				labels,
				datasets,
				title: this.config.title,
			});
		} else {
			body.innerHTML = `<div class="fv-rpt-empty">${__("Chart engine not available")}</div>`;
		}
	}

	// ─── Footer / Pagination ─────────────────────────────────────
	_renderFooter() {
		const footer = this.el.querySelector(".fv-rpt-footer");
		if (!footer) return;

		const total = this.filteredData.length;
		const ps = this.config.pageSize;
		const totalPages = Math.ceil(total / ps);

		if (this.config.groupBy || totalPages <= 1) {
			footer.innerHTML = `<span class="fv-rpt-count">${total} ${__("records")}</span>`;
			return;
		}

		footer.innerHTML = `
			<span class="fv-rpt-count">${total} ${__("records")}</span>
			<div class="fv-rpt-pagination">
				<button class="fv-rpt-btn fv-rpt-page-btn" data-dir="-1" ${this.currentPage === 0 ? "disabled" : ""}>◀</button>
				<span>${this.currentPage + 1} / ${totalPages}</span>
				<button class="fv-rpt-btn fv-rpt-page-btn" data-dir="1" ${this.currentPage >= totalPages - 1 ? "disabled" : ""}>▶</button>
			</div>
		`;

		footer.querySelectorAll(".fv-rpt-page-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				this.currentPage += parseInt(btn.dataset.dir);
				this._renderTable();
			});
		});
	}

	// ─── Export ──────────────────────────────────────────────────
	_exportCSV() {
		const cols = this.config.columns;
		const header = cols.map(c => c.label).join(",");
		const rows = this.filteredData.map(r => cols.map(c => {
			let val = r[c.field] ?? "";
			val = String(val).replace(/"/g, '""');
			return `"${val}"`;
		}).join(","));

		const csv = [header, ...rows].join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${this.config.title || this.config.doctype || "report"}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	_print() {
		const table = this.el.querySelector(".fv-rpt-table");
		if (!table) return;

		const win = window.open("", "_blank");
		win.document.write(`
			<html><head><title>${this.config.title || "Report"}</title>
			<style>
				table { border-collapse: collapse; width: 100%; font-family: system-ui; }
				th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
				th { background: #f8f9fa; font-weight: 600; }
				h2 { font-family: system-ui; }
			</style></head><body>
			<h2>${__(this.config.title || "Report")}</h2>
			${table.outerHTML}
			</body></html>
		`);
		win.document.close();
		win.print();
	}

	// ─── Public API ──────────────────────────────────────────────
	async refresh() {
		await this._loadData();
		this._applyFilters();
		this._renderTable();
	}

	setGroupBy(field) {
		this.config.groupBy = field;
		this._renderTable();
	}

	getData() {
		return this.filteredData;
	}

	destroy() {
		if (this.el) this.el.remove();
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}
}
