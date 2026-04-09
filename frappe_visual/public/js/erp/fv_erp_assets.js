/**
 * FV ERP Assets — Visual Fixed Asset Dashboard
 * ================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Asset Register, Depreciation Tracker, Asset Movement,
 * Asset Maintenance, Asset Value Analytics.
 */

export class FVERPAssets {
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
		wrapper.className = "fv-erp-assets fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-assets__inner">
			<div class="fv-erp-assets__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🏗️</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Asset Management")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
				<div class="fv-erp-assets__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Asset')">
						+ ${__("New Asset")}
					</button>
				</div>
			</div>
			<div class="fv-erp-assets__kpis"></div>
			<div class="fv-erp-assets__grid">
				<div class="fv-erp-assets__by-category fv-fx-glass"></div>
				<div class="fv-erp-assets__by-location fv-fx-glass"></div>
			</div>
			<div class="fv-erp-assets__grid">
				<div class="fv-erp-assets__depreciation fv-fx-glass"></div>
				<div class="fv-erp-assets__maintenance fv-fx-glass"></div>
			</div>
			<div class="fv-erp-assets__movements fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-assets__kpis"));
		this._renderByCategory(wrapper.querySelector(".fv-erp-assets__by-category"));
		this._renderByLocation(wrapper.querySelector(".fv-erp-assets__by-location"));
		this._renderDepreciation(wrapper.querySelector(".fv-erp-assets__depreciation"));
		this._renderMaintenance(wrapper.querySelector(".fv-erp-assets__maintenance"));
		this._renderMovements(wrapper.querySelector(".fv-erp-assets__movements"));
		return this;
	}

	async _loadData() {
		const company = this.opts.company;
		const [totalAssets, submitted, draft, scrapped, categories, locations, movements, maintenance] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Asset", filters: { company, docstatus: 1 } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Asset", filters: { company, docstatus: 1, status: "Submitted" } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Asset", filters: { company, docstatus: 0 } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Asset", filters: { company, docstatus: 1, status: "Scrapped" } }),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Asset",
				filters: { company, docstatus: 1 },
				fields: ["asset_category", "count(name) as count", "sum(gross_purchase_amount) as value"],
				group_by: "asset_category",
				limit_page_length: 20,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Asset",
				filters: { company, docstatus: 1 },
				fields: ["location", "count(name) as count"],
				group_by: "location",
				limit_page_length: 20,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Asset Movement",
				filters: { company, docstatus: 1 },
				fields: ["name", "asset_name", "purpose", "transaction_date", "source_location", "target_location"],
				order_by: "transaction_date desc",
				limit_page_length: 10,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Asset Maintenance Log",
				filters: {},
				fields: ["name", "asset_name", "task", "completion_date", "maintenance_status"],
				order_by: "completion_date desc",
				limit_page_length: 10,
			}).catch(() => [])
		]);
		this.data = { totalAssets, submitted, draft, scrapped, categories, locations, movements, maintenance };
	}

	_renderKPIs(el) {
		const d = this.data;
		const kpis = [
			{ label: __("Total Assets"), value: d.totalAssets || 0, icon: "📦", color: "#6366f1" },
			{ label: __("Active"), value: d.submitted || 0, icon: "✅", color: "#10b981" },
			{ label: __("Draft"), value: d.draft || 0, icon: "📝", color: "#f59e0b" },
			{ label: __("Scrapped"), value: d.scrapped || 0, icon: "🗑️", color: "#ef4444" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${k.value.toLocaleString()}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderByCategory(el) {
		const cats = this.data.categories || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Assets by Category")}</h3>
		${cats.length ? `<div class="fv-erp-bar-list">${cats.map(c => {
			const maxVal = Math.max(...cats.map(x => x.count || 0), 1);
			const pct = ((c.count || 0) / maxVal * 100).toFixed(0);
			return `<div class="fv-erp-bar-item">
				<div class="fv-erp-bar-item__label">${c.asset_category || __("Uncategorized")}</div>
				<div class="fv-erp-bar-item__bar"><div class="fv-erp-bar-item__fill" style="width:${pct}%;background:#6366f1"></div></div>
				<div class="fv-erp-bar-item__value">${c.count}</div>
			</div>`;
		}).join("")}</div>` : `<p class="text-muted">${__("No assets found")}</p>`}`;
	}

	_renderByLocation(el) {
		const locs = this.data.locations || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Assets by Location")}</h3>
		${locs.length ? `<div class="fv-erp-bar-list">${locs.map(l => {
			const maxVal = Math.max(...locs.map(x => x.count || 0), 1);
			const pct = ((l.count || 0) / maxVal * 100).toFixed(0);
			return `<div class="fv-erp-bar-item">
				<div class="fv-erp-bar-item__label">${l.location || __("Unassigned")}</div>
				<div class="fv-erp-bar-item__bar"><div class="fv-erp-bar-item__fill" style="width:${pct}%;background:#10b981"></div></div>
				<div class="fv-erp-bar-item__value">${l.count}</div>
			</div>`;
		}).join("")}</div>` : `<p class="text-muted">${__("No locations found")}</p>`}`;
	}

	_renderDepreciation(el) {
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Depreciation Schedule")}</h3>
		<p class="text-muted">${__("Upcoming depreciation entries for active assets")}</p>
		<button class="fv-btn fv-btn--sm fv-btn--outline" onclick="frappe.set_route('query-report','Fixed Asset Register')">
			${__("View Full Report")} →
		</button>`;
	}

	_renderMaintenance(el) {
		const items = this.data.maintenance || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Maintenance")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Asset")}</th><th>${__("Task")}</th><th>${__("Date")}</th><th>${__("Status")}</th>
			</tr></thead>
			<tbody>${items.map(m => `<tr>
				<td><a href="/app/asset/${encodeURIComponent(m.asset_name)}">${frappe.utils.escape_html(m.asset_name || "")}</a></td>
				<td>${frappe.utils.escape_html(m.task || "")}</td>
				<td>${m.completion_date || ""}</td>
				<td><span class="fv-status-badge fv-status-badge--${(m.maintenance_status || "").toLowerCase()}">${m.maintenance_status || ""}</span></td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No maintenance records")}</p>`}`;
	}

	_renderMovements(el) {
		const items = this.data.movements || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Asset Movements")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Asset")}</th><th>${__("Purpose")}</th><th>${__("From")}</th><th>${__("To")}</th><th>${__("Date")}</th>
			</tr></thead>
			<tbody>${items.map(m => `<tr>
				<td><a href="/app/asset-movement/${encodeURIComponent(m.name)}">${frappe.utils.escape_html(m.asset_name || m.name)}</a></td>
				<td>${frappe.utils.escape_html(m.purpose || "")}</td>
				<td>${frappe.utils.escape_html(m.source_location || "—")}</td>
				<td>${frappe.utils.escape_html(m.target_location || "—")}</td>
				<td>${m.transaction_date || ""}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No movements found")}</p>`}`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPAssets(container, opts);
		return inst.render();
	}
}
