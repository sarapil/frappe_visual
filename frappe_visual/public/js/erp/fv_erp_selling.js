/**
 * FV ERP Selling — Visual Sales Dashboard
 * =========================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Sales Pipeline, Order Tracker, Customer Dashboard,
 * Top Products, Revenue Trends, Quick Actions.
 */

export class FVERPSelling {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			company: frappe.defaults.get_default("company"),
		}, opts);
		this.data = {};
	}

	async render() {
		this.container.innerHTML = "";
		const wrapper = document.createElement("div");
		wrapper.className = "fv-erp-selling fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-selling__inner">
			<div class="fv-erp-selling__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🛒</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Sales Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
				<div>
					<button class="fv-btn fv-btn--sm fv-btn--active" data-range="month">${__("Month")}</button>
					<button class="fv-btn fv-btn--sm" data-range="quarter">${__("Quarter")}</button>
					<button class="fv-btn fv-btn--sm" data-range="year">${__("Year")}</button>
				</div>
			</div>
			<div class="fv-erp-selling__kpis"></div>
			<div class="fv-erp-selling__grid">
				<div class="fv-erp-selling__pipeline fv-fx-glass"></div>
				<div class="fv-erp-selling__top-customers fv-fx-glass"></div>
			</div>
			<div class="fv-erp-selling__grid">
				<div class="fv-erp-selling__recent-orders fv-fx-glass"></div>
				<div class="fv-erp-selling__recent-quotations fv-fx-glass"></div>
			</div>
			<div class="fv-erp-selling__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);

		wrapper.querySelectorAll("[data-range]").forEach((btn) => {
			btn.addEventListener("click", async () => {
				wrapper.querySelectorAll("[data-range]").forEach((b) => b.classList.remove("fv-btn--active"));
				btn.classList.add("fv-btn--active");
				await this._loadData(btn.dataset.range);
			});
		});
		await this._loadData("month");
	}

	async _loadData(range) {
		const { fromDate, toDate } = this._getDateRange(range);
		try {
			const [totalSales, totalOrders, openQuotations, openOrders, recentOrders, recentQuotations] = await Promise.all([
				this._getAggregate("Sales Invoice", "grand_total", { docstatus: 1, posting_date: ["between", [fromDate, toDate]] }),
				this._getCount("Sales Order", { docstatus: 1, transaction_date: ["between", [fromDate, toDate]] }),
				this._getCount("Quotation", { docstatus: 0 }),
				this._getCount("Sales Order", { status: ["in", ["To Deliver and Bill", "To Bill", "To Deliver"]] }),
				this._getRecent("Sales Order", ["name", "customer_name", "grand_total", "status", "transaction_date"]),
				this._getRecent("Quotation", ["name", "party_name", "grand_total", "status", "transaction_date"]),
			]);

			this.data = { totalSales, totalOrders, openQuotations, openOrders, recentOrders, recentQuotations };
			this._renderKPIs();
			this._renderPipeline();
			this._renderTopCustomers();
			this._renderRecentOrders();
			this._renderRecentQuotations();
			this._renderQuickActions();
		} catch {
			this._renderEmptyState();
		}
	}

	async _getAggregate(doctype, field, filters) {
		try {
			const r = await frappe.xcall("frappe.client.get_list", {
				doctype, filters, fields: [`sum(${field}) as total`], limit_page_length: 0,
			});
			return r?.[0]?.total || 0;
		} catch { return 0; }
	}

	async _getCount(doctype, filters) {
		try { return await frappe.xcall("frappe.client.get_count", { doctype, filters }) || 0; }
		catch { return 0; }
	}

	async _getRecent(doctype, fields) {
		try {
			return await frappe.xcall("frappe.client.get_list", {
				doctype, fields, order_by: "creation desc", limit_page_length: 5,
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
			{ label: __("Total Sales"), value: this._fmtCurrency(this.data.totalSales), icon: "💰", color: "#10b981" },
			{ label: __("Orders"), value: this.data.totalOrders, icon: "📦", color: "#6366f1" },
			{ label: __("Open Quotations"), value: this.data.openQuotations, icon: "📝", color: "#f59e0b" },
			{ label: __("Active Orders"), value: this.data.openOrders, icon: "🚚", color: "#3b82f6" },
		];
		const el = this.container.querySelector(".fv-erp-selling__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderPipeline() {
		const el = this.container.querySelector(".fv-erp-selling__pipeline");
		const stages = [
			{ label: __("Lead"), color: "#94a3b8", count: "—" },
			{ label: __("Quotation"), color: "#f59e0b", count: this.data.openQuotations },
			{ label: __("Order"), color: "#3b82f6", count: this.data.openOrders },
			{ label: __("Invoice"), color: "#10b981", count: this.data.totalOrders },
		];
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Sales Pipeline")}</h3>
			<div style="display:flex;gap:0.375rem;align-items:end;padding:0.5rem">
				${stages.map((s, i) => {
					const h = 40 + (i * 25);
					return `<div style="flex:1;text-align:center">
						<div style="font-size:1.25rem;font-weight:700">${s.count}</div>
						<div style="background:${s.color};height:${h}px;border-radius:var(--fv-desk-radius-sm);margin:0.25rem 0"></div>
						<div style="font-size:0.75rem;color:var(--fv-text-muted)">${s.label}</div>
					</div>`;
				}).join("")}
			</div>`;
	}

	_renderTopCustomers() {
		const el = this.container.querySelector(".fv-erp-selling__top-customers");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Top Customers")}</h3>
			<div style="text-align:center;padding:1.5rem">
				<a href="/app/query-report/Customer Acquisition and Loyalty" class="fv-btn fv-btn--primary">${__("Customer Analysis")}</a>
				<p style="margin-block-start:0.75rem;font-size:0.8rem;color:var(--fv-text-muted)">${__("Revenue breakdown by customer")}</p>
			</div>`;
	}

	_renderRecentOrders() {
		const el = this.container.querySelector(".fv-erp-selling__recent-orders");
		const rows = (this.data.recentOrders || []).map((o) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('sales-order','${frappe.utils.escape_html(o.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(o.name)}</span></td>
				<td>${frappe.utils.escape_html(o.customer_name || "")}</td>
				<td style="text-align:end">${this._fmtCurrency(o.grand_total)}</td>
				<td>${frappe.utils.escape_html(o.status || "")}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Orders")}</h3>
				<a href="/app/sales-order" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Order")}</th><th>${__("Customer")}</th><th style="text-align:end">${__("Total")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No recent orders")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderRecentQuotations() {
		const el = this.container.querySelector(".fv-erp-selling__recent-quotations");
		const rows = (this.data.recentQuotations || []).map((q) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('quotation','${frappe.utils.escape_html(q.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(q.name)}</span></td>
				<td>${frappe.utils.escape_html(q.party_name || "")}</td>
				<td style="text-align:end">${this._fmtCurrency(q.grand_total)}</td>
				<td>${frappe.utils.escape_html(q.status || "")}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Quotations")}</h3>
				<a href="/app/quotation" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Quotation")}</th><th>${__("Party")}</th><th style="text-align:end">${__("Total")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No quotations")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Quotation"), icon: "📝", route: "/app/quotation/new" },
			{ label: __("New Sales Order"), icon: "📦", route: "/app/sales-order/new" },
			{ label: __("New Customer"), icon: "👤", route: "/app/customer/new" },
			{ label: __("Sales Analytics"), icon: "📊", route: "/app/query-report/Sales Analytics" },
			{ label: __("Item-wise Sales"), icon: "📈", route: "/app/query-report/Item-wise Sales History" },
			{ label: __("Sales Register"), icon: "📒", route: "/app/query-report/Sales Register" },
		];
		const el = this.container.querySelector(".fv-erp-selling__actions");
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
		const el = this.container.querySelector(".fv-erp-selling__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("ERPNext Selling module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPSelling(container, opts);
		await instance.render();
		return instance;
	}
}
