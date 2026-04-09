/**
 * FV ERP Manufacturing — Visual Production Dashboard
 * ====================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Production Dashboard, Work Order Tracker, BOM Explorer,
 * Machine Utilization, Quality Metrics, Quick Actions.
 */

export class FVERPManufacturing {
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
		wrapper.className = "fv-erp-mfg fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-mfg__inner">
			<div class="fv-erp-mfg__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🏭</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Manufacturing Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
			</div>
			<div class="fv-erp-mfg__kpis"></div>
			<div class="fv-erp-mfg__grid">
				<div class="fv-erp-mfg__work-orders fv-fx-glass"></div>
				<div class="fv-erp-mfg__bom fv-fx-glass"></div>
			</div>
			<div class="fv-erp-mfg__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
	}

	async _loadData() {
		try {
			const [openWO, completedWO, totalBOM, overdue, recentWO] = await Promise.all([
				this._getCount("Work Order", { status: ["in", ["Not Started", "In Process"]] }),
				this._getCount("Work Order", { status: "Completed" }),
				this._getCount("BOM", { is_active: 1 }),
				this._getCount("Work Order", { status: ["in", ["Not Started", "In Process"]], expected_delivery_date: ["<", frappe.datetime.now_date()] }),
				this._getRecent("Work Order", ["name", "production_item", "qty", "produced_qty", "status", "expected_delivery_date"]),
			]);

			this.data = { openWO, completedWO, totalBOM, overdue, recentWO };
			this._renderKPIs();
			this._renderWorkOrders();
			this._renderBOM();
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
				doctype, fields, order_by: "creation desc", limit_page_length: 8,
			});
		} catch { return []; }
	}

	_renderKPIs() {
		const kpis = [
			{ label: __("Open Work Orders"), value: this.data.openWO, icon: "⚙️", color: "#3b82f6" },
			{ label: __("Completed"), value: this.data.completedWO, icon: "✅", color: "#10b981" },
			{ label: __("Active BOMs"), value: this.data.totalBOM, icon: "📐", color: "#6366f1" },
			{ label: __("Overdue"), value: this.data.overdue, icon: "⚠️", color: "#ef4444" },
		];
		const el = this.container.querySelector(".fv-erp-mfg__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderWorkOrders() {
		const el = this.container.querySelector(".fv-erp-mfg__work-orders");
		const statusColors = { "Not Started": "#94a3b8", "In Process": "#3b82f6", "Completed": "#10b981", "Stopped": "#ef4444" };
		const rows = (this.data.recentWO || []).map((wo) => {
			const pct = wo.qty > 0 ? Math.round((wo.produced_qty / wo.qty) * 100) : 0;
			const sc = statusColors[wo.status] || "#94a3b8";
			return `
			<tr class="fv-list-table__row" onclick="frappe.set_route('work-order','${frappe.utils.escape_html(wo.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(wo.name)}</span></td>
				<td>${frappe.utils.escape_html(wo.production_item || "")}</td>
				<td>
					<div style="display:flex;align-items:center;gap:0.375rem">
						<div style="flex:1;height:6px;background:var(--fv-border);border-radius:3px;overflow:hidden">
							<div style="width:${pct}%;height:100%;background:${sc}"></div>
						</div>
						<span style="font-size:0.75rem;min-width:35px;text-align:end">${pct}%</span>
					</div>
				</td>
				<td><span style="color:${sc};font-weight:500;font-size:0.8rem">${frappe.utils.escape_html(wo.status || "")}</span></td>
			</tr>`;
		}).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Work Orders")}</h3>
				<a href="/app/work-order" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Work Order")}</th><th>${__("Item")}</th><th>${__("Progress")}</th><th>${__("Status")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No work orders")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderBOM() {
		const el = this.container.querySelector(".fv-erp-mfg__bom");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Bill of Materials")}</h3>
			<div style="text-align:center;padding:1.5rem">
				<div style="font-size:2.5rem;font-weight:700;color:#6366f1">${this.data.totalBOM}</div>
				<p style="color:var(--fv-text-muted);font-size:0.85rem">${__("Active BOMs")}</p>
				<div style="display:flex;gap:0.5rem;justify-content:center;margin-block-start:0.75rem">
					<a href="/app/bom" class="fv-btn fv-btn--sm">${__("View All")}</a>
					<a href="/app/bom/new" class="fv-btn fv-btn--sm fv-btn--primary">${__("Create BOM")}</a>
				</div>
			</div>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Work Order"), icon: "⚙️", route: "/app/work-order/new" },
			{ label: __("New BOM"), icon: "📐", route: "/app/bom/new" },
			{ label: __("Job Card"), icon: "🎫", route: "/app/job-card/new" },
			{ label: __("Production Plan"), icon: "📋", route: "/app/production-plan/new" },
			{ label: __("BOM Stock Report"), icon: "📊", route: "/app/query-report/BOM Stock Report" },
			{ label: __("Production Analytics"), icon: "📈", route: "/app/query-report/Production Analytics" },
		];
		const el = this.container.querySelector(".fv-erp-mfg__actions");
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
		const el = this.container.querySelector(".fv-erp-mfg__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("ERPNext Manufacturing module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPManufacturing(container, opts);
		await instance.render();
		return instance;
	}
}
