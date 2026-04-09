/**
 * FV ERP Payroll — Visual Payroll Dashboard
 * ============================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Payroll Run Monitor, Salary Slip Tracker, Tax Summary,
 * Component Analysis, Bank Statement Generator.
 */

export class FVERPPayroll {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			company: frappe.defaults.get_default("company"),
			currency: frappe.boot.sysdefaults?.currency || "USD",
		}, opts);
		this.data = {};
	}

	async render() {
		this.container.innerHTML = "";
		const wrapper = document.createElement("div");
		wrapper.className = "fv-erp-payroll fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-payroll__inner">
			<div class="fv-erp-payroll__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">💵</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Payroll Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
				<div class="fv-erp-payroll__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Payroll Entry')">
						+ ${__("New Payroll Entry")}
					</button>
				</div>
			</div>
			<div class="fv-erp-payroll__kpis"></div>
			<div class="fv-erp-payroll__grid">
				<div class="fv-erp-payroll__recent-entries fv-fx-glass"></div>
				<div class="fv-erp-payroll__salary-summary fv-fx-glass"></div>
			</div>
			<div class="fv-erp-payroll__grid">
				<div class="fv-erp-payroll__by-department fv-fx-glass"></div>
				<div class="fv-erp-payroll__components fv-fx-glass"></div>
			</div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-payroll__kpis"));
		this._renderRecentEntries(wrapper.querySelector(".fv-erp-payroll__recent-entries"));
		this._renderSalarySummary(wrapper.querySelector(".fv-erp-payroll__salary-summary"));
		this._renderByDepartment(wrapper.querySelector(".fv-erp-payroll__by-department"));
		this._renderComponents(wrapper.querySelector(".fv-erp-payroll__components"));
		return this;
	}

	async _loadData() {
		const company = this.opts.company;
		const [totalSlips, draftSlips, submittedSlips, recentEntries, slipsByDept, recentSlips] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Salary Slip", filters: { company } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Salary Slip", filters: { company, docstatus: 0 } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Salary Slip", filters: { company, docstatus: 1 } }),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Payroll Entry",
				filters: { company },
				fields: ["name", "posting_date", "payroll_frequency", "number_of_employees", "status"],
				order_by: "posting_date desc",
				limit_page_length: 10,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Salary Slip",
				filters: { company, docstatus: 1 },
				fields: ["department", "count(name) as count", "sum(net_pay) as total"],
				group_by: "department",
				limit_page_length: 15,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Salary Slip",
				filters: { company },
				fields: ["name", "employee_name", "posting_date", "net_pay", "status", "docstatus"],
				order_by: "posting_date desc",
				limit_page_length: 10,
			}),
		]);
		this.data = { totalSlips, draftSlips, submittedSlips, recentEntries, slipsByDept, recentSlips };
	}

	_renderKPIs(el) {
		const d = this.data;
		const cur = this.opts.currency;
		const totalNet = (d.slipsByDept || []).reduce((s, x) => s + (x.total || 0), 0);
		const kpis = [
			{ label: __("Total Salary Slips"), value: d.totalSlips || 0, icon: "📄", color: "#6366f1" },
			{ label: __("Draft"), value: d.draftSlips || 0, icon: "📝", color: "#f59e0b" },
			{ label: __("Submitted"), value: d.submittedSlips || 0, icon: "✅", color: "#10b981" },
			{ label: __("Total Net Pay"), value: frappe.format(totalNet, { fieldtype: "Currency", options: cur }), icon: "💰", color: "#3b82f6" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${typeof k.value === "number" ? k.value.toLocaleString() : k.value}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderRecentEntries(el) {
		const items = this.data.recentEntries || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Payroll Entries")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Entry")}</th><th>${__("Date")}</th><th>${__("Frequency")}</th><th>${__("Employees")}</th><th>${__("Status")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/payroll-entry/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${i.posting_date || ""}</td>
				<td>${frappe.utils.escape_html(i.payroll_frequency || "")}</td>
				<td>${i.number_of_employees || 0}</td>
				<td>${frappe.utils.escape_html(i.status || "")}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No payroll entries found")}</p>`}`;
	}

	_renderSalarySummary(el) {
		const items = this.data.recentSlips || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Salary Slips")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Employee")}</th><th>${__("Date")}</th><th>${__("Net Pay")}</th><th>${__("Status")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/salary-slip/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.employee_name || i.name)}</a></td>
				<td>${i.posting_date || ""}</td>
				<td>${frappe.format(i.net_pay || 0, { fieldtype: "Currency", options: cur })}</td>
				<td>${i.docstatus === 1 ? "✅ " + __("Submitted") : "📝 " + __("Draft")}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No salary slips found")}</p>`}`;
	}

	_renderByDepartment(el) {
		const depts = this.data.slipsByDept || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Payroll by Department")}</h3>
		${depts.length ? `<div class="fv-erp-bar-list">${depts.map(d => {
			const maxVal = Math.max(...depts.map(x => x.total || 0), 1);
			const pct = ((d.total || 0) / maxVal * 100).toFixed(0);
			return `<div class="fv-erp-bar-item">
				<div class="fv-erp-bar-item__label">${frappe.utils.escape_html(d.department || __("Unknown"))}</div>
				<div class="fv-erp-bar-item__bar"><div class="fv-erp-bar-item__fill" style="width:${pct}%;background:#6366f1"></div></div>
				<div class="fv-erp-bar-item__value">${frappe.format(d.total || 0, { fieldtype: "Currency", options: cur })}</div>
			</div>`;
		}).join("")}</div>` : `<p class="text-muted">${__("No department data")}</p>`}`;
	}

	_renderComponents(el) {
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Salary Components")}</h3>
		<p class="text-muted">${__("Earnings and deductions breakdown")}</p>
		<button class="fv-btn fv-btn--sm fv-btn--outline" onclick="frappe.set_route('List','Salary Component')">
			${__("View Components")} →
		</button>
		<button class="fv-btn fv-btn--sm fv-btn--outline" style="margin-inline-start:0.5rem" onclick="frappe.set_route('List','Salary Structure')">
			${__("Salary Structures")} →
		</button>`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPPayroll(container, opts);
		return inst.render();
	}
}
