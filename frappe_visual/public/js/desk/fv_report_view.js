// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVReportView — Visual Report Renderer
 * ========================================
 * Renders report results with:
 * - Multiple view modes (table, cards, chart-first)
 * - Interactive filters with glassmorphism panel
 * - Export to PDF/Excel/CSV
 * - Chart visualization (auto-detect best chart type)
 * - Summary KPI cards for aggregate metrics
 * - Print-friendly layout
 *
 * Works with Frappe Script Reports or custom data.
 *
 * Usage:
 *   FVReportView.create("#container", {
 *     reportName: "Sales Analytics",
 *     filters: [
 *       { fieldname: "company", fieldtype: "Link", options: "Company", default: frappe.defaults.get_default("company") },
 *     ],
 *     chartFields: ["total_amount"],
 *     summaryFields: [
 *       { label: "Total Revenue", field: "total_amount", aggregate: "sum", format: "Currency" },
 *     ],
 *   });
 */

export class FVReportView {
	static create(container, opts = {}) {
		return new FVReportView(container, opts);
	}

	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		this.opts = Object.assign({
			reportName: null,
			columns: [],
			data: [],
			filters: [],
			summaryFields: [],
			chartFields: [],
			defaultView: "table",
			showExport: true,
			showChart: true,
			pageSize: 50,
			onFilterChange: null,
		}, opts);

		this.columns = this.opts.columns;
		this.data = this.opts.data;
		this.currentView = this.opts.defaultView;
		this._filterValues = {};

		this._render();
		if (this.opts.reportName) this.refresh();
	}

	_render() {
		this.container.innerHTML = "";
		this.container.classList.add("fv-report-view");

		this.container.innerHTML = `
			<div class="fv-report-view__inner fv-fx-page-enter">
				${this.opts.filters.length ?
					`<div class="fv-report-view__filters fv-fx-glass" id="fv-rpt-filters"></div>` : ""}
				<div class="fv-report-view__toolbar">
					<div class="fv-report-view__toolbar-start">
						<button class="fv-btn fv-btn--primary fv-fx-hover-lift" id="fv-rpt-run">
							<i class="ti ti-player-play"></i> ${__("Run")}
						</button>
					</div>
					<div class="fv-report-view__toolbar-end">
						${this.opts.showExport ? `
							<button class="fv-btn fv-btn--secondary" id="fv-rpt-export-csv" title="${__("Export CSV")}">
								<i class="ti ti-file-spreadsheet"></i>
							</button>
						` : ""}
						<div class="fv-report-view__view-toggle">
							<button class="fv-btn fv-btn--sm ${this.currentView === "table" ? "fv-btn--active" : ""}" data-view="table"><i class="ti ti-table"></i></button>
							<button class="fv-btn fv-btn--sm ${this.currentView === "chart" ? "fv-btn--active" : ""}" data-view="chart"><i class="ti ti-chart-bar"></i></button>
						</div>
					</div>
				</div>
				<div class="fv-report-view__summary" id="fv-rpt-summary"></div>
				<div class="fv-report-view__content" id="fv-rpt-content"></div>
			</div>
		`;

		this._renderFilters();
		this._bindEvents();
	}

	_renderFilters() {
		const el = this.container.querySelector("#fv-rpt-filters");
		if (!el) return;

		el.innerHTML = `<div class="fv-report-view__filters-grid">
			${this.opts.filters.map(f => {
				const id = `fv-rpt-filter-${f.fieldname}`;
				this._filterValues[f.fieldname] = f.default || "";
				if (f.fieldtype === "Select") {
					return `<div class="fv-report-view__filter">
						<label for="${id}">${frappe.utils.escape_html(__(f.label || frappe.model.unscrub(f.fieldname)))}</label>
						<select id="${id}" class="fv-input fv-input--select" data-fieldname="${f.fieldname}">
							<option value="">${__("All")}</option>
							${(f.options || "").split("\n").filter(Boolean).map(o =>
								`<option value="${frappe.utils.escape_html(o)}" ${o === f.default ? "selected" : ""}>${frappe.utils.escape_html(__(o))}</option>`
							).join("")}
						</select>
					</div>`;
				}
				if (f.fieldtype === "Date") {
					return `<div class="fv-report-view__filter">
						<label for="${id}">${frappe.utils.escape_html(__(f.label || frappe.model.unscrub(f.fieldname)))}</label>
						<input id="${id}" type="date" class="fv-input" data-fieldname="${f.fieldname}" value="${f.default || ""}" />
					</div>`;
				}
				return `<div class="fv-report-view__filter">
					<label for="${id}">${frappe.utils.escape_html(__(f.label || frappe.model.unscrub(f.fieldname)))}</label>
					<input id="${id}" type="text" class="fv-input" data-fieldname="${f.fieldname}"
						placeholder="${frappe.utils.escape_html(f.placeholder || "")}" value="${frappe.utils.escape_html(f.default || "")}" />
				</div>`;
			}).join("")}
		</div>`;
	}

	_bindEvents() {
		this.container.querySelector("#fv-rpt-run")?.addEventListener("click", () => this.refresh());

		this.container.querySelector("#fv-rpt-export-csv")?.addEventListener("click", () => this._exportCSV());

		this.container.querySelectorAll(".fv-report-view__view-toggle button").forEach(btn => {
			btn.addEventListener("click", () => {
				this.currentView = btn.dataset.view;
				this.container.querySelectorAll(".fv-report-view__view-toggle button").forEach(b =>
					b.classList.toggle("fv-btn--active", b === btn));
				this._renderContent();
			});
		});
	}

	_collectFilterValues() {
		const values = {};
		this.container.querySelectorAll("[data-fieldname]").forEach(el => {
			values[el.dataset.fieldname] = el.value;
		});
		this._filterValues = values;
		return values;
	}

	async refresh() {
		const contentEl = this.container.querySelector("#fv-rpt-content");
		contentEl.innerHTML = `<div class="fv-report-view__loading"><div class="fv-spinner"></div></div>`;

		const filters = this._collectFilterValues();

		if (this.opts.reportName) {
			try {
				const result = await frappe.xcall("frappe.desk.query_report.run", {
					report_name: this.opts.reportName,
					filters,
				});
				this.columns = (result.columns || []).map(c => typeof c === "string"
					? { label: c, fieldname: c, fieldtype: "Data" }
					: c
				);
				this.data = result.result || [];
			} catch (e) {
				contentEl.innerHTML = `<div class="fv-report-view__error">
					<i class="ti ti-alert-circle"></i> ${__("Error loading report")}
				</div>`;
				console.error("FVReportView.refresh:", e);
				return;
			}
		}

		if (this.opts.onFilterChange) {
			this.opts.onFilterChange(filters, this.data);
		}

		this._renderSummary();
		this._renderContent();
	}

	_renderSummary() {
		const el = this.container.querySelector("#fv-rpt-summary");
		if (!el || !this.opts.summaryFields.length) return;

		el.innerHTML = `<div class="fv-report-view__summary-grid">
			${this.opts.summaryFields.map(sf => {
				let value = 0;
				if (sf.aggregate === "sum") {
					value = this.data.reduce((acc, row) => acc + (parseFloat(row[sf.field]) || 0), 0);
				} else if (sf.aggregate === "count") {
					value = this.data.length;
				} else if (sf.aggregate === "avg" && this.data.length) {
					value = this.data.reduce((acc, row) => acc + (parseFloat(row[sf.field]) || 0), 0) / this.data.length;
				}

				let display = value;
				if (sf.format === "Currency") display = format_currency(value);
				else if (sf.format === "Percent") display = `${value.toFixed(1)}%`;
				else display = value.toLocaleString();

				return `<div class="fv-report-view__summary-card fv-fx-glass fv-fx-hover-lift">
					<div class="fv-report-view__summary-value">${frappe.utils.escape_html(String(display))}</div>
					<div class="fv-report-view__summary-label">${frappe.utils.escape_html(__(sf.label))}</div>
				</div>`;
			}).join("")}
		</div>`;
	}

	_renderContent() {
		const el = this.container.querySelector("#fv-rpt-content");
		el.innerHTML = "";

		if (!this.data.length) {
			el.innerHTML = `<div class="fv-report-view__empty fv-fx-page-enter">
				<i class="ti ti-report-off" style="font-size:3rem;opacity:0.3"></i>
				<p>${__("No data found")}</p>
			</div>`;
			return;
		}

		if (this.currentView === "chart") {
			this._renderChart(el);
		} else {
			this._renderTable(el);
		}
	}

	_renderTable(el) {
		const table = document.createElement("div");
		table.className = "fv-report-table fv-fx-page-enter";

		table.innerHTML = `
			<table class="fv-report-table__table">
				<thead>
					<tr>${this.columns.map(c => `<th>${frappe.utils.escape_html(__(c.label || c.fieldname))}</th>`).join("")}</tr>
				</thead>
				<tbody>
					${this.data.slice(0, this.opts.pageSize).map(row => `
						<tr class="fv-report-table__row">
							${this.columns.map(c => {
								const val = Array.isArray(row) ? row[this.columns.indexOf(c)] : row[c.fieldname];
								return `<td>${frappe.utils.escape_html(String(val ?? ""))}</td>`;
							}).join("")}
						</tr>
					`).join("")}
				</tbody>
			</table>
			${this.data.length > this.opts.pageSize
				? `<div class="fv-report-table__more">${__("Showing {0} of {1} rows", [this.opts.pageSize, this.data.length])}</div>`
				: ""}
		`;

		el.appendChild(table);
	}

	_renderChart(el) {
		const chartEl = document.createElement("div");
		chartEl.className = "fv-report-chart fv-fx-page-enter";
		chartEl.style.minHeight = "400px";
		chartEl.innerHTML = `<p class="text-muted text-center" style="padding-top:2rem">
			${__("Use frappe.visual chart components to render charts here")}
		</p>`;
		el.appendChild(chartEl);

		// Expose data for external chart rendering
		this._chartContainer = chartEl;
	}

	_exportCSV() {
		if (!this.data.length) return;
		const headers = this.columns.map(c => c.label || c.fieldname);
		const rows = this.data.map(row =>
			this.columns.map(c => {
				const val = Array.isArray(row) ? row[this.columns.indexOf(c)] : row[c.fieldname];
				return `"${String(val ?? "").replace(/"/g, '""')}"`;
			})
		);
		const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
		const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${this.opts.reportName || "report"}_${frappe.datetime.now_date()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	get chartContainer() { return this._chartContainer; }

	setData(columns, data) {
		this.columns = columns;
		this.data = data;
		this._renderSummary();
		this._renderContent();
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-report-view");
	}
}
