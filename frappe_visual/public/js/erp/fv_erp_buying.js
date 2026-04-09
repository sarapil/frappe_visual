/**
 * FV ERP Buying — Visual Procurement Dashboard
 * ==============================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Procurement Dashboard, Supplier Performance, PO Tracker,
 * Pending Receipts, Quick Actions.
 */

export class FVERPBuying {
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
		wrapper.className = "fv-erp-buying fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-buying__inner">
			<div class="fv-erp-buying__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🏪</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Procurement Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
			</div>
			<div class="fv-erp-buying__kpis"></div>
			<div class="fv-erp-buying__grid">
				<div class="fv-erp-buying__pending-orders fv-fx-glass"></div>
				<div class="fv-erp-buying__pending-receipts fv-fx-glass"></div>
			</div>
			<div class="fv-erp-buying__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
	}

	async _loadData() {
		try {
			const now = frappe.datetime.now_date();
			const d = new Date(now);
			const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

			const [totalSpend, openPOs, pendingReceipt, totalSuppliers, recentPOs, recentReceipts] = await Promise.all([
				this._getAggregate("Purchase Invoice", "grand_total", { docstatus: 1, posting_date: ["between", [monthStart, now]] }),
				this._getCount("Purchase Order", { docstatus: 1, status: ["in", ["To Receive and Bill", "To Bill", "To Receive"]] }),
				this._getCount("Purchase Receipt", { docstatus: 0 }),
				this._getCount("Supplier", { disabled: 0 }),
				this._getRecent("Purchase Order", ["name", "supplier_name", "grand_total", "status", "transaction_date"]),
				this._getRecent("Purchase Receipt", ["name", "supplier_name", "posting_date"]),
			]);

			this.data = { totalSpend, openPOs, pendingReceipt, totalSuppliers, recentPOs, recentReceipts };
			this._renderKPIs();
			this._renderPendingOrders();
			this._renderPendingReceipts();
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

	_fmtCurrency(val) {
		return frappe.format(val || 0, { fieldtype: "Currency" });
	}

	_renderKPIs() {
		const kpis = [
			{ label: __("Month Spend"), value: this._fmtCurrency(this.data.totalSpend), icon: "💸", color: "#ef4444" },
			{ label: __("Open POs"), value: this.data.openPOs, icon: "📋", color: "#f59e0b" },
			{ label: __("Pending Receipt"), value: this.data.pendingReceipt, icon: "📥", color: "#3b82f6" },
			{ label: __("Suppliers"), value: this.data.totalSuppliers, icon: "🏭", color: "#10b981" },
		];
		const el = this.container.querySelector(".fv-erp-buying__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderPendingOrders() {
		const el = this.container.querySelector(".fv-erp-buying__pending-orders");
		const rows = (this.data.recentPOs || []).map((o) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('purchase-order','${frappe.utils.escape_html(o.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(o.name)}</span></td>
				<td>${frappe.utils.escape_html(o.supplier_name || "")}</td>
				<td style="text-align:end">${this._fmtCurrency(o.grand_total)}</td>
				<td>${frappe.utils.escape_html(o.status || "")}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Purchase Orders")}</h3>
				<a href="/app/purchase-order" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("PO")}</th><th>${__("Supplier")}</th><th style="text-align:end">${__("Total")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No orders")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderPendingReceipts() {
		const el = this.container.querySelector(".fv-erp-buying__pending-receipts");
		const rows = (this.data.recentReceipts || []).map((r) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('purchase-receipt','${frappe.utils.escape_html(r.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(r.name)}</span></td>
				<td>${frappe.utils.escape_html(r.supplier_name || "")}</td>
				<td>${r.posting_date || ""}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Receipts")}</h3>
				<a href="/app/purchase-receipt" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Receipt")}</th><th>${__("Supplier")}</th><th>${__("Date")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No receipts")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Purchase Order"), icon: "📋", route: "/app/purchase-order/new" },
			{ label: __("New Purchase Receipt"), icon: "📥", route: "/app/purchase-receipt/new" },
			{ label: __("New Supplier"), icon: "🏭", route: "/app/supplier/new" },
			{ label: __("Purchase Analytics"), icon: "📊", route: "/app/query-report/Purchase Analytics" },
			{ label: __("Supplier Quotation"), icon: "💬", route: "/app/supplier-quotation/new" },
			{ label: __("Purchase Register"), icon: "📒", route: "/app/query-report/Purchase Register" },
		];
		const el = this.container.querySelector(".fv-erp-buying__actions");
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
		const el = this.container.querySelector(".fv-erp-buying__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("ERPNext Buying module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPBuying(container, opts);
		await instance.render();
		return instance;
	}
}
