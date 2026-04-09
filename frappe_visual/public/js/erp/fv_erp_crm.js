/**
 * FV ERP CRM — Visual CRM Dashboard
 * ====================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: CRM Dashboard, Lead Pipeline, Opportunity Tracker,
 * Customer Analysis, Activity Log, Quick Actions.
 */

export class FVERPCRM {
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
		wrapper.className = "fv-erp-crm fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-crm__inner">
			<div class="fv-erp-crm__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🤝</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("CRM Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
			</div>
			<div class="fv-erp-crm__kpis"></div>
			<div class="fv-erp-crm__grid">
				<div class="fv-erp-crm__pipeline fv-fx-glass"></div>
				<div class="fv-erp-crm__opportunities fv-fx-glass"></div>
			</div>
			<div class="fv-erp-crm__grid">
				<div class="fv-erp-crm__recent-leads fv-fx-glass"></div>
				<div class="fv-erp-crm__recent-opportunities fv-fx-glass"></div>
			</div>
			<div class="fv-erp-crm__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
	}

	async _loadData() {
		try {
			const [openLeads, convertedLeads, openOpps, wonOpps, recentLeads, recentOpps] = await Promise.all([
				this._getCount("Lead", { status: "Open" }),
				this._getCount("Lead", { status: "Converted" }),
				this._getCount("Opportunity", { status: "Open" }),
				this._getCount("Opportunity", { status: "Won" }),
				this._getRecent("Lead", ["name", "lead_name", "source", "status", "creation"]),
				this._getRecent("Opportunity", ["name", "customer_name", "opportunity_amount", "status", "expected_closing"]),
			]);

			this.data = { openLeads, convertedLeads, openOpps, wonOpps, recentLeads, recentOpps };
			this._renderKPIs();
			this._renderPipeline();
			this._renderOpportunities();
			this._renderRecentLeads();
			this._renderRecentOpportunities();
			this._renderQuickActions();
		} catch {
			this._renderEmptyState();
		}
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
		const total = this.data.openLeads + this.data.convertedLeads;
		const convRate = total > 0 ? Math.round((this.data.convertedLeads / total) * 100) : 0;
		const kpis = [
			{ label: __("Open Leads"), value: this.data.openLeads, icon: "🎯", color: "#3b82f6" },
			{ label: __("Converted"), value: this.data.convertedLeads, icon: "✅", color: "#10b981" },
			{ label: __("Conversion Rate"), value: `${convRate}%`, icon: "📈", color: "#6366f1" },
			{ label: __("Open Opportunities"), value: this.data.openOpps, icon: "💼", color: "#f59e0b" },
			{ label: __("Won"), value: this.data.wonOpps, icon: "🏆", color: "#10b981" },
		];
		const el = this.container.querySelector(".fv-erp-crm__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderPipeline() {
		const el = this.container.querySelector(".fv-erp-crm__pipeline");
		const stages = [
			{ label: __("New"), value: this.data.openLeads, color: "#94a3b8" },
			{ label: __("Working"), value: "—", color: "#3b82f6" },
			{ label: __("Qualified"), value: this.data.openOpps, color: "#f59e0b" },
			{ label: __("Won"), value: this.data.wonOpps, color: "#10b981" },
		];
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Lead Pipeline")}</h3>
			<div style="display:flex;gap:0.5rem;align-items:center">
				${stages.map((s) => `
					<div style="flex:1;text-align:center;padding:0.75rem;background:${s.color}15;border-radius:var(--fv-desk-radius-sm)">
						<div style="font-size:1.25rem;font-weight:700;color:${s.color}">${s.value}</div>
						<div style="font-size:0.75rem;color:var(--fv-text-muted)">${s.label}</div>
					</div>`).join(`<span style="color:var(--fv-text-muted)">→</span>`)}
			</div>`;
	}

	_renderOpportunities() {
		const el = this.container.querySelector(".fv-erp-crm__opportunities");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Opportunity Summary")}</h3>
			<div style="text-align:center;padding:1rem">
				<div style="display:flex;justify-content:center;gap:2rem">
					<div>
						<div style="font-size:2rem;font-weight:700;color:#f59e0b">${this.data.openOpps}</div>
						<div style="font-size:0.8rem;color:var(--fv-text-muted)">${__("Open")}</div>
					</div>
					<div>
						<div style="font-size:2rem;font-weight:700;color:#10b981">${this.data.wonOpps}</div>
						<div style="font-size:0.8rem;color:var(--fv-text-muted)">${__("Won")}</div>
					</div>
				</div>
				<a href="/app/opportunity" class="fv-btn fv-btn--sm" style="margin-block-start:0.75rem">${__("View All")}</a>
			</div>`;
	}

	_renderRecentLeads() {
		const el = this.container.querySelector(".fv-erp-crm__recent-leads");
		const statusColors = { "Open": "#3b82f6", "Replied": "#f59e0b", "Converted": "#10b981", "Do Not Contact": "#ef4444" };
		const rows = (this.data.recentLeads || []).map((l) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('lead','${frappe.utils.escape_html(l.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(l.lead_name || l.name)}</span></td>
				<td>${frappe.utils.escape_html(l.source || "")}</td>
				<td><span style="color:${statusColors[l.status] || '#94a3b8'};font-weight:500;font-size:0.8rem">${frappe.utils.escape_html(l.status || "")}</span></td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Leads")}</h3>
				<a href="/app/lead" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Lead")}</th><th>${__("Source")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No leads")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderRecentOpportunities() {
		const el = this.container.querySelector(".fv-erp-crm__recent-opportunities");
		const rows = (this.data.recentOpps || []).map((o) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('opportunity','${frappe.utils.escape_html(o.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(o.customer_name || o.name)}</span></td>
				<td style="text-align:end">${this._fmtCurrency(o.opportunity_amount)}</td>
				<td>${frappe.utils.escape_html(o.status || "")}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Opportunities")}</h3>
				<a href="/app/opportunity" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Customer")}</th><th style="text-align:end">${__("Amount")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No opportunities")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Lead"), icon: "🎯", route: "/app/lead/new" },
			{ label: __("New Opportunity"), icon: "💼", route: "/app/opportunity/new" },
			{ label: __("New Customer"), icon: "👤", route: "/app/customer/new" },
			{ label: __("Campaign"), icon: "📢", route: "/app/campaign/new" },
			{ label: __("Lead Source"), icon: "📊", route: "/app/query-report/Lead Details" },
			{ label: __("Sales Funnel"), icon: "📈", route: "/app/query-report/Sales Funnel" },
		];
		const el = this.container.querySelector(".fv-erp-crm__actions");
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
		const el = this.container.querySelector(".fv-erp-crm__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("CRM module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPCRM(container, opts);
		await instance.render();
		return instance;
	}
}
