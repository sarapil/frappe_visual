/**
 * FV ERP Loans — Visual Loan Management Dashboard
 * ==================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Loan Portfolio, Disbursement Tracker, Repayment Schedule,
 * Interest Calculator, Loan Security Monitor.
 */

export class FVERPLoans {
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
		wrapper.className = "fv-erp-loans fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-loans__inner">
			<div class="fv-erp-loans__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🏦</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Loan Management")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Portfolio, Disbursements & Repayments")}</p>
					</div>
				</div>
				<div class="fv-erp-loans__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Loan')">
						+ ${__("New Loan")}
					</button>
				</div>
			</div>
			<div class="fv-erp-loans__kpis"></div>
			<div class="fv-erp-loans__grid">
				<div class="fv-erp-loans__active fv-fx-glass"></div>
				<div class="fv-erp-loans__by-type fv-fx-glass"></div>
			</div>
			<div class="fv-erp-loans__grid">
				<div class="fv-erp-loans__repayments fv-fx-glass"></div>
				<div class="fv-erp-loans__disbursements fv-fx-glass"></div>
			</div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-loans__kpis"));
		this._renderActive(wrapper.querySelector(".fv-erp-loans__active"));
		this._renderByType(wrapper.querySelector(".fv-erp-loans__by-type"));
		this._renderRepayments(wrapper.querySelector(".fv-erp-loans__repayments"));
		this._renderDisbursements(wrapper.querySelector(".fv-erp-loans__disbursements"));
		return this;
	}

	async _loadData() {
		const company = this.opts.company;
		const [totalLoans, sanctioned, disbursed, closed, activeLoans, loanTypes, repayments, disbursements] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Loan", filters: { company, docstatus: 1 } }).catch(() => 0),
			frappe.xcall("frappe.client.get_count", { doctype: "Loan", filters: { company, docstatus: 1, status: "Sanctioned" } }).catch(() => 0),
			frappe.xcall("frappe.client.get_count", { doctype: "Loan", filters: { company, docstatus: 1, status: "Disbursed" } }).catch(() => 0),
			frappe.xcall("frappe.client.get_count", { doctype: "Loan", filters: { company, docstatus: 1, status: "Closed" } }).catch(() => 0),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Loan",
				filters: { company, docstatus: 1, status: ["!=", "Closed"] },
				fields: ["name", "applicant_name", "loan_type", "loan_amount", "status", "disbursement_date"],
				order_by: "creation desc",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Loan",
				filters: { company, docstatus: 1 },
				fields: ["loan_type", "count(name) as count", "sum(loan_amount) as total"],
				group_by: "loan_type",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Loan Repayment",
				filters: { company, docstatus: 1 },
				fields: ["name", "against_loan", "posting_date", "amount_paid", "applicant_name"],
				order_by: "posting_date desc",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Loan Disbursement",
				filters: { company, docstatus: 1 },
				fields: ["name", "against_loan", "posting_date", "disbursed_amount", "applicant_name"],
				order_by: "posting_date desc",
				limit_page_length: 10,
			}).catch(() => []),
		]);
		this.data = { totalLoans, sanctioned, disbursed, closed, activeLoans, loanTypes, repayments, disbursements };
	}

	_renderKPIs(el) {
		const d = this.data;
		const totalAmount = (d.loanTypes || []).reduce((s, x) => s + (x.total || 0), 0);
		const cur = this.opts.currency;
		const kpis = [
			{ label: __("Total Loans"), value: d.totalLoans || 0, icon: "📋", color: "#6366f1" },
			{ label: __("Sanctioned"), value: d.sanctioned || 0, icon: "📄", color: "#3b82f6" },
			{ label: __("Disbursed"), value: d.disbursed || 0, icon: "💸", color: "#f59e0b" },
			{ label: __("Portfolio Value"), value: frappe.format(totalAmount, { fieldtype: "Currency", options: cur }), icon: "🏦", color: "#10b981" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${typeof k.value === "number" ? k.value.toLocaleString() : k.value}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderActive(el) {
		const items = this.data.activeLoans || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Active Loans")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Loan")}</th><th>${__("Applicant")}</th><th>${__("Amount")}</th><th>${__("Status")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/loan/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${frappe.utils.escape_html(i.applicant_name || "—")}</td>
				<td>${frappe.format(i.loan_amount || 0, { fieldtype: "Currency", options: cur })}</td>
				<td>${frappe.utils.escape_html(i.status || "")}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No active loans")}</p>`}`;
	}

	_renderByType(el) {
		const types = this.data.loanTypes || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Loans by Type")}</h3>
		${types.length ? `<div class="fv-erp-bar-list">${types.map(t => {
			const maxVal = Math.max(...types.map(x => x.total || 0), 1);
			const pct = ((t.total || 0) / maxVal * 100).toFixed(0);
			return `<div class="fv-erp-bar-item">
				<div class="fv-erp-bar-item__label">${frappe.utils.escape_html(t.loan_type || __("Unknown"))}</div>
				<div class="fv-erp-bar-item__bar"><div class="fv-erp-bar-item__fill" style="width:${pct}%;background:#6366f1"></div></div>
				<div class="fv-erp-bar-item__value">${frappe.format(t.total || 0, { fieldtype: "Currency", options: cur })}</div>
			</div>`;
		}).join("")}</div>` : `<p class="text-muted">${__("No loan data")}</p>`}`;
	}

	_renderRepayments(el) {
		const items = this.data.repayments || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Repayments")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Repayment")}</th><th>${__("Applicant")}</th><th>${__("Amount")}</th><th>${__("Date")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/loan-repayment/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${frappe.utils.escape_html(i.applicant_name || "—")}</td>
				<td>${frappe.format(i.amount_paid || 0, { fieldtype: "Currency", options: cur })}</td>
				<td>${i.posting_date || ""}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No repayments found")}</p>`}`;
	}

	_renderDisbursements(el) {
		const items = this.data.disbursements || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Disbursements")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Disbursement")}</th><th>${__("Applicant")}</th><th>${__("Amount")}</th><th>${__("Date")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/loan-disbursement/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${frappe.utils.escape_html(i.applicant_name || "—")}</td>
				<td>${frappe.format(i.disbursed_amount || 0, { fieldtype: "Currency", options: cur })}</td>
				<td>${i.posting_date || ""}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No disbursements found")}</p>`}`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPLoans(container, opts);
		return inst.render();
	}
}
