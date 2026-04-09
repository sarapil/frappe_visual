/**
 * FV ERP Finance — Visual Financial Dashboard
 * =============================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Finance Dashboard, Invoice Tracker, Payment Processor,
 * GL Explorer, Bank Reconciliation, Tax Summary.
 */

export class FVERPFinance {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			currency: frappe.boot.sysdefaults?.currency || "USD",
			fiscalYear: null,
			company: frappe.defaults.get_default("company"),
		}, opts);
		this.data = {};
	}

	async render() {
		this.container.innerHTML = "";
		const wrapper = document.createElement("div");
		wrapper.className = "fv-erp-finance fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-finance__inner">
			<div class="fv-erp-finance__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">💰</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Finance Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
				<div class="fv-erp-finance__period-select">
					<button class="fv-btn fv-btn--sm fv-btn--active" data-range="month">${__("This Month")}</button>
					<button class="fv-btn fv-btn--sm" data-range="quarter">${__("Quarter")}</button>
					<button class="fv-btn fv-btn--sm" data-range="year">${__("Year")}</button>
				</div>
			</div>
			<div class="fv-erp-finance__kpis"></div>
			<div class="fv-erp-finance__grid">
				<div class="fv-erp-finance__receivables fv-fx-glass"></div>
				<div class="fv-erp-finance__payables fv-fx-glass"></div>
			</div>
			<div class="fv-erp-finance__grid">
				<div class="fv-erp-finance__recent-invoices fv-fx-glass"></div>
				<div class="fv-erp-finance__recent-payments fv-fx-glass"></div>
			</div>
			<div class="fv-erp-finance__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);

		this._bindPeriodSelect(wrapper);
		await this._loadData("month");
	}

	_bindPeriodSelect(wrapper) {
		wrapper.querySelectorAll("[data-range]").forEach((btn) => {
			btn.addEventListener("click", async () => {
				wrapper.querySelectorAll("[data-range]").forEach((b) => b.classList.remove("fv-btn--active"));
				btn.classList.add("fv-btn--active");
				await this._loadData(btn.dataset.range);
			});
		});
	}

	async _loadData(range) {
		const { fromDate, toDate } = this._getDateRange(range);
		try {
			const [revenue, expenses, receivable, payable, invoices, payments] = await Promise.all([
				this._getAggregate("Sales Invoice", "grand_total", { docstatus: 1, posting_date: ["between", [fromDate, toDate]] }),
				this._getAggregate("Purchase Invoice", "grand_total", { docstatus: 1, posting_date: ["between", [fromDate, toDate]] }),
				this._getAggregate("Sales Invoice", "outstanding_amount", { docstatus: 1, outstanding_amount: [">", 0] }),
				this._getAggregate("Purchase Invoice", "outstanding_amount", { docstatus: 1, outstanding_amount: [">", 0] }),
				this._getRecent("Sales Invoice", ["name", "customer_name", "grand_total", "status", "posting_date"]),
				this._getRecent("Payment Entry", ["name", "party_name", "paid_amount", "payment_type", "posting_date"]),
			]);

			this.data = { revenue, expenses, receivable, payable, invoices, payments };
			this._renderKPIs();
			this._renderReceivables();
			this._renderPayables();
			this._renderRecentInvoices();
			this._renderRecentPayments();
			this._renderQuickActions();
		} catch {
			// Silently handle — modules may not be installed
			this._renderEmptyState();
		}
	}

	async _getAggregate(doctype, field, filters) {
		try {
			const r = await frappe.xcall("frappe.client.get_list", {
				doctype,
				filters,
				fields: [`sum(${field}) as total`],
				limit_page_length: 0,
			});
			return r?.[0]?.total || 0;
		} catch { return 0; }
	}

	async _getRecent(doctype, fields) {
		try {
			return await frappe.xcall("frappe.client.get_list", {
				doctype,
				fields,
				order_by: "creation desc",
				limit_page_length: 5,
			});
		} catch { return []; }
	}

	_getDateRange(range) {
		const now = frappe.datetime.now_date();
		const d = new Date(now);
		let fromDate;
		if (range === "month") {
			fromDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
		} else if (range === "quarter") {
			const qm = Math.floor(d.getMonth() / 3) * 3;
			fromDate = `${d.getFullYear()}-${String(qm + 1).padStart(2, "0")}-01`;
		} else {
			fromDate = `${d.getFullYear()}-01-01`;
		}
		return { fromDate, toDate: now };
	}

	_fmtCurrency(val) {
		return frappe.format(val || 0, { fieldtype: "Currency" });
	}

	_renderKPIs() {
		const kpis = [
			{ label: __("Revenue"), value: this._fmtCurrency(this.data.revenue), icon: "📈", color: "#10b981" },
			{ label: __("Expenses"), value: this._fmtCurrency(this.data.expenses), icon: "📉", color: "#ef4444" },
			{ label: __("Net"), value: this._fmtCurrency(this.data.revenue - this.data.expenses), icon: "💎", color: "#6366f1" },
			{ label: __("Receivable"), value: this._fmtCurrency(this.data.receivable), icon: "📥", color: "#f59e0b" },
			{ label: __("Payable"), value: this._fmtCurrency(this.data.payable), icon: "📤", color: "#ef4444" },
		];
		const el = this.container.querySelector(".fv-erp-finance__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">
					${k.icon}
				</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderReceivables() {
		const el = this.container.querySelector(".fv-erp-finance__receivables");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Accounts Receivable")}</h3>
			<div style="text-align:center;padding:1rem">
				<div style="font-size:2rem;font-weight:700;color:#f59e0b">${this._fmtCurrency(this.data.receivable)}</div>
				<p style="color:var(--fv-text-muted);font-size:0.85rem">${__("Outstanding from customers")}</p>
				<a href="/app/sales-invoice?status=Unpaid" class="fv-btn fv-btn--sm" style="margin-block-start:0.5rem">${__("View Unpaid")}</a>
			</div>`;
	}

	_renderPayables() {
		const el = this.container.querySelector(".fv-erp-finance__payables");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Accounts Payable")}</h3>
			<div style="text-align:center;padding:1rem">
				<div style="font-size:2rem;font-weight:700;color:#ef4444">${this._fmtCurrency(this.data.payable)}</div>
				<p style="color:var(--fv-text-muted);font-size:0.85rem">${__("Outstanding to suppliers")}</p>
				<a href="/app/purchase-invoice?status=Unpaid" class="fv-btn fv-btn--sm" style="margin-block-start:0.5rem">${__("View Unpaid")}</a>
			</div>`;
	}

	_renderRecentInvoices() {
		const el = this.container.querySelector(".fv-erp-finance__recent-invoices");
		const rows = (this.data.invoices || []).map((inv) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('sales-invoice','${frappe.utils.escape_html(inv.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(inv.name)}</span></td>
				<td>${frappe.utils.escape_html(inv.customer_name || "")}</td>
				<td style="text-align:end">${this._fmtCurrency(inv.grand_total)}</td>
				<td>${frappe.utils.escape_html(inv.status || "")}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Sales Invoices")}</h3>
				<a href="/app/sales-invoice" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Invoice")}</th><th>${__("Customer")}</th><th style="text-align:end">${__("Amount")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;color:var(--fv-text-muted);padding:1rem">${__("No recent invoices")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderRecentPayments() {
		const el = this.container.querySelector(".fv-erp-finance__recent-payments");
		const rows = (this.data.payments || []).map((p) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('payment-entry','${frappe.utils.escape_html(p.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(p.name)}</span></td>
				<td>${frappe.utils.escape_html(p.party_name || "")}</td>
				<td style="text-align:end">${this._fmtCurrency(p.paid_amount)}</td>
				<td>${frappe.utils.escape_html(p.payment_type || "")}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Payments")}</h3>
				<a href="/app/payment-entry" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Payment")}</th><th>${__("Party")}</th><th style="text-align:end">${__("Amount")}</th><th>${__("Type")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;color:var(--fv-text-muted);padding:1rem">${__("No recent payments")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Sales Invoice"), icon: "📄", route: "/app/sales-invoice/new" },
			{ label: __("New Payment Entry"), icon: "💳", route: "/app/payment-entry/new" },
			{ label: __("New Journal Entry"), icon: "📒", route: "/app/journal-entry/new" },
			{ label: __("Bank Reconciliation"), icon: "🏦", route: "/app/bank-reconciliation-tool" },
			{ label: __("General Ledger"), icon: "📊", route: "/app/query-report/General Ledger" },
			{ label: __("Trial Balance"), icon: "⚖️", route: "/app/query-report/Trial Balance" },
		];
		const el = this.container.querySelector(".fv-erp-finance__actions");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Quick Actions")}</h3>
			<div class="fv-erp-finance__actions-grid">
				${actions.map((a) => `
					<a href="${a.route}" class="fv-workspace-shortcut fv-fx-hover-lift">
						<span style="font-size:1.5rem">${a.icon}</span>
						<span class="fv-workspace-shortcut__label">${a.label}</span>
					</a>`).join("")}
			</div>`;
	}

	_renderEmptyState() {
		const el = this.container.querySelector(".fv-erp-finance__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("ERPNext Accounts module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPFinance(container, opts);
		await instance.render();
		return instance;
	}
}
