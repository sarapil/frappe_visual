/**
 * FV ERP Stock — Visual Inventory Dashboard
 * ===========================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Inventory Dashboard, Stock Levels, Warehouse Overview,
 * Low Stock Alerts, Recent Stock Entries, Quick Actions.
 */

export class FVERPStock {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			company: frappe.defaults.get_default("company"),
			warehouse: null,
		}, opts);
		this.data = {};
	}

	async render() {
		this.container.innerHTML = "";
		const wrapper = document.createElement("div");
		wrapper.className = "fv-erp-stock fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-stock__inner">
			<div class="fv-erp-stock__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">📦</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Inventory Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
			</div>
			<div class="fv-erp-stock__kpis"></div>
			<div class="fv-erp-stock__grid">
				<div class="fv-erp-stock__warehouses fv-fx-glass"></div>
				<div class="fv-erp-stock__low-stock fv-fx-glass"></div>
			</div>
			<div class="fv-erp-stock__grid">
				<div class="fv-erp-stock__recent-entries fv-fx-glass"></div>
				<div class="fv-erp-stock__top-items fv-fx-glass"></div>
			</div>
			<div class="fv-erp-stock__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
	}

	async _loadData() {
		try {
			const [totalItems, totalWarehouses, recentEntries, lowStock, warehouses] = await Promise.all([
				this._getCount("Item", { disabled: 0 }),
				this._getCount("Warehouse", { disabled: 0, is_group: 0 }),
				this._getRecent("Stock Entry", ["name", "stock_entry_type", "posting_date", "total_amount"]),
				this._getLowStock(),
				this._getWarehouseList(),
			]);

			this.data = { totalItems, totalWarehouses, recentEntries, lowStock, warehouses };
			this._renderKPIs();
			this._renderWarehouses();
			this._renderLowStock();
			this._renderRecentEntries();
			this._renderTopItems();
			this._renderQuickActions();
		} catch {
			this._renderEmptyState();
		}
	}

	async _getCount(doctype, filters) {
		try {
			const r = await frappe.xcall("frappe.client.get_count", { doctype, filters });
			return r || 0;
		} catch { return 0; }
	}

	async _getRecent(doctype, fields) {
		try {
			return await frappe.xcall("frappe.client.get_list", {
				doctype, fields,
				order_by: "creation desc",
				limit_page_length: 5,
			});
		} catch { return []; }
	}

	async _getLowStock() {
		try {
			return await frappe.xcall("frappe.client.get_list", {
				doctype: "Bin",
				fields: ["item_code", "warehouse", "actual_qty", "reserved_qty"],
				filters: { actual_qty: ["<", 10] },
				order_by: "actual_qty asc",
				limit_page_length: 10,
			});
		} catch { return []; }
	}

	async _getWarehouseList() {
		try {
			return await frappe.xcall("frappe.client.get_list", {
				doctype: "Warehouse",
				fields: ["name", "warehouse_name"],
				filters: { disabled: 0, is_group: 0 },
				limit_page_length: 10,
			});
		} catch { return []; }
	}

	_renderKPIs() {
		const kpis = [
			{ label: __("Active Items"), value: this.data.totalItems, icon: "📋", color: "#6366f1" },
			{ label: __("Warehouses"), value: this.data.totalWarehouses, icon: "🏭", color: "#10b981" },
			{ label: __("Low Stock Items"), value: this.data.lowStock?.length || 0, icon: "⚠️", color: "#f59e0b" },
			{ label: __("Recent Entries"), value: this.data.recentEntries?.length || 0, icon: "📝", color: "#3b82f6" },
		];
		const el = this.container.querySelector(".fv-erp-stock__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderWarehouses() {
		const el = this.container.querySelector(".fv-erp-stock__warehouses");
		const items = (this.data.warehouses || []).map((w) => `
			<a href="/app/warehouse/${encodeURIComponent(w.name)}" class="fv-workspace-shortcut fv-fx-hover-lift" style="padding:0.625rem">
				<span>🏭</span>
				<div>
					<div class="fv-workspace-shortcut__label">${frappe.utils.escape_html(w.warehouse_name || w.name)}</div>
				</div>
			</a>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.75rem">
				<h3 style="margin:0;font-size:1rem">${__("Warehouses")}</h3>
				<a href="/app/warehouse" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<div class="fv-erp-stock__warehouses-list">${items || `<p style="color:var(--fv-text-muted)">${__("No warehouses found")}</p>`}</div>`;
	}

	_renderLowStock() {
		const el = this.container.querySelector(".fv-erp-stock__low-stock");
		const rows = (this.data.lowStock || []).map((b) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('item','${frappe.utils.escape_html(b.item_code)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(b.item_code)}</span></td>
				<td>${frappe.utils.escape_html(b.warehouse || "")}</td>
				<td style="text-align:end;color:${b.actual_qty < 5 ? '#ef4444' : '#f59e0b'}">${b.actual_qty}</td>
			</tr>`).join("");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">⚠️ ${__("Low Stock Alert")}</h3>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Item")}</th><th>${__("Warehouse")}</th><th style="text-align:end">${__("Qty")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("All items stocked")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderRecentEntries() {
		const el = this.container.querySelector(".fv-erp-stock__recent-entries");
		const rows = (this.data.recentEntries || []).map((e) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('stock-entry','${frappe.utils.escape_html(e.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(e.name)}</span></td>
				<td>${frappe.utils.escape_html(e.stock_entry_type || "")}</td>
				<td>${e.posting_date || ""}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Stock Entries")}</h3>
				<a href="/app/stock-entry" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Entry")}</th><th>${__("Type")}</th><th>${__("Date")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No entries")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderTopItems() {
		const el = this.container.querySelector(".fv-erp-stock__top-items");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Stock Summary")}</h3>
			<div style="text-align:center;padding:1.5rem">
				<a href="/app/query-report/Stock Balance" class="fv-btn fv-btn--primary">${__("View Stock Balance Report")}</a>
				<p style="margin-block-start:0.75rem;font-size:0.8rem;color:var(--fv-text-muted)">${__("Detailed item-wise stock levels")}</p>
			</div>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("Material Receipt"), icon: "📥", route: "/app/stock-entry/new?stock_entry_type=Material Receipt" },
			{ label: __("Material Issue"), icon: "📤", route: "/app/stock-entry/new?stock_entry_type=Material Issue" },
			{ label: __("Stock Transfer"), icon: "🔄", route: "/app/stock-entry/new?stock_entry_type=Material Transfer" },
			{ label: __("New Item"), icon: "📦", route: "/app/item/new" },
			{ label: __("Stock Ledger"), icon: "📊", route: "/app/query-report/Stock Ledger" },
			{ label: __("Stock Reconciliation"), icon: "📝", route: "/app/stock-reconciliation/new" },
		];
		const el = this.container.querySelector(".fv-erp-stock__actions");
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
		const el = this.container.querySelector(".fv-erp-stock__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("ERPNext Stock module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPStock(container, opts);
		await instance.render();
		return instance;
	}
}
