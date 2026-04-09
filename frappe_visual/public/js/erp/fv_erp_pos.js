/**
 * FV ERP POS — Visual Point of Sale Dashboard
 * =============================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: POS Analytics, Cashier Performance, Payment Methods,
 * Shift Summary, Top Products Tracker.
 */

export class FVERPPOS {
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
		wrapper.className = "fv-erp-pos fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-pos__inner">
			<div class="fv-erp-pos__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🛒</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Point of Sale")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Sales Analytics & Cashier Performance")}</p>
					</div>
				</div>
				<div class="fv-erp-pos__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.set_route('point-of-sale')">
						${__("Open POS")} →
					</button>
					<button class="fv-btn fv-btn--sm fv-btn--outline" onclick="frappe.new_doc('POS Opening Entry')">
						${__("Open Shift")}
					</button>
				</div>
			</div>
			<div class="fv-erp-pos__kpis"></div>
			<div class="fv-erp-pos__grid">
				<div class="fv-erp-pos__recent-invoices fv-fx-glass"></div>
				<div class="fv-erp-pos__payment-methods fv-fx-glass"></div>
			</div>
			<div class="fv-erp-pos__grid">
				<div class="fv-erp-pos__top-items fv-fx-glass"></div>
				<div class="fv-erp-pos__profiles fv-fx-glass"></div>
			</div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-pos__kpis"));
		this._renderRecentInvoices(wrapper.querySelector(".fv-erp-pos__recent-invoices"));
		this._renderPaymentMethods(wrapper.querySelector(".fv-erp-pos__payment-methods"));
		this._renderTopItems(wrapper.querySelector(".fv-erp-pos__top-items"));
		this._renderProfiles(wrapper.querySelector(".fv-erp-pos__profiles"));
		return this;
	}

	async _loadData() {
		const company = this.opts.company;
		const today = frappe.datetime.get_today();
		const [totalToday, totalAll, recentInvoices, topItems, profiles, openShifts] = await Promise.all([
			frappe.xcall("frappe.client.get_count", {
				doctype: "POS Invoice",
				filters: { company, posting_date: today, docstatus: 1 },
			}).catch(() => 0),
			frappe.xcall("frappe.client.get_count", {
				doctype: "POS Invoice",
				filters: { company, docstatus: 1 },
			}).catch(() => 0),
			frappe.xcall("frappe.client.get_list", {
				doctype: "POS Invoice",
				filters: { company, docstatus: 1 },
				fields: ["name", "customer_name", "grand_total", "posting_date", "owner", "status"],
				order_by: "creation desc",
				limit_page_length: 12,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "POS Invoice Item",
				filters: { parenttype: "POS Invoice" },
				fields: ["item_name", "sum(qty) as total_qty", "sum(amount) as total_amount"],
				group_by: "item_code",
				order_by: "sum(amount) desc",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "POS Profile",
				filters: { company },
				fields: ["name", "warehouse", "write_off_account"],
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_count", {
				doctype: "POS Opening Entry",
				filters: { company, status: "Open", docstatus: 1 },
			}).catch(() => 0),
		]);
		const todayRevenue = recentInvoices
			.filter(i => i.posting_date === today)
			.reduce((s, i) => s + (i.grand_total || 0), 0);
		this.data = { totalToday, totalAll, recentInvoices, topItems, profiles, openShifts, todayRevenue };
	}

	_renderKPIs(el) {
		const d = this.data;
		const cur = this.opts.currency;
		const kpis = [
			{ label: __("Today's Sales"), value: d.totalToday || 0, icon: "📦", color: "#6366f1" },
			{ label: __("Today's Revenue"), value: frappe.format(d.todayRevenue || 0, { fieldtype: "Currency", options: cur }), icon: "💰", color: "#10b981" },
			{ label: __("Total Invoices"), value: d.totalAll || 0, icon: "🧾", color: "#3b82f6" },
			{ label: __("Open Shifts"), value: d.openShifts || 0, icon: "🔓", color: "#f59e0b" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${typeof k.value === "number" ? k.value.toLocaleString() : k.value}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderRecentInvoices(el) {
		const items = this.data.recentInvoices || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent POS Invoices")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Invoice")}</th><th>${__("Customer")}</th><th>${__("Amount")}</th><th>${__("Date")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/pos-invoice/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${frappe.utils.escape_html(i.customer_name || "—")}</td>
				<td>${frappe.format(i.grand_total || 0, { fieldtype: "Currency", options: cur })}</td>
				<td>${i.posting_date || ""}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No POS invoices found")}</p>`}`;
	}

	_renderPaymentMethods(el) {
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Payment Methods")}</h3>
		<p class="text-muted">${__("Payment method distribution for POS sales")}</p>
		<button class="fv-btn fv-btn--sm fv-btn--outline" onclick="frappe.set_route('query-report','POS Register')">
			${__("POS Register Report")} →
		</button>
		<button class="fv-btn fv-btn--sm fv-btn--outline" style="margin-inline-start:0.5rem" onclick="frappe.set_route('List','Mode of Payment')">
			${__("Payment Modes")} →
		</button>`;
	}

	_renderTopItems(el) {
		const items = this.data.topItems || [];
		const cur = this.opts.currency;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Top Selling Items")}</h3>
		${items.length ? `<div class="fv-erp-bar-list">${items.map(i => {
			const maxVal = Math.max(...items.map(x => x.total_amount || 0), 1);
			const pct = ((i.total_amount || 0) / maxVal * 100).toFixed(0);
			return `<div class="fv-erp-bar-item">
				<div class="fv-erp-bar-item__label">${frappe.utils.escape_html(i.item_name || __("Unknown"))}</div>
				<div class="fv-erp-bar-item__bar"><div class="fv-erp-bar-item__fill" style="width:${pct}%;background:#6366f1"></div></div>
				<div class="fv-erp-bar-item__value">${frappe.format(i.total_amount || 0, { fieldtype: "Currency", options: cur })}</div>
			</div>`;
		}).join("")}</div>` : `<p class="text-muted">${__("No sales data")}</p>`}`;
	}

	_renderProfiles(el) {
		const profiles = this.data.profiles || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("POS Profiles")}</h3>
		${profiles.length ? `<div class="fv-erp-card-list">${profiles.map(p => `
			<div class="fv-erp-mini-card fv-fx-hover-lift">
				<a href="/app/pos-profile/${encodeURIComponent(p.name)}">${frappe.utils.escape_html(p.name)}</a>
				<span class="text-muted">${frappe.utils.escape_html(p.warehouse || "")}</span>
			</div>`).join("")}</div>` : `<p class="text-muted">${__("No POS profiles configured")}</p>`}`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPPOS(container, opts);
		return inst.render();
	}
}
