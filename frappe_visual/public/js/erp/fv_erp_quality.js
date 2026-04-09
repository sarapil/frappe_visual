/**
 * FV ERP Quality — Visual Quality Management Dashboard
 * ======================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Quality Inspection Dashboard, Non-Conformance Tracker,
 * Quality Goal Monitor, Procedure Library, Action Tracker.
 */

export class FVERPQuality {
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
		wrapper.className = "fv-erp-quality fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-quality__inner">
			<div class="fv-erp-quality__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🔬</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Quality Management")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Inspections, Goals & Procedures")}</p>
					</div>
				</div>
				<div class="fv-erp-quality__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Quality Inspection')">
						+ ${__("New Inspection")}
					</button>
				</div>
			</div>
			<div class="fv-erp-quality__kpis"></div>
			<div class="fv-erp-quality__grid">
				<div class="fv-erp-quality__inspections fv-fx-glass"></div>
				<div class="fv-erp-quality__goals fv-fx-glass"></div>
			</div>
			<div class="fv-erp-quality__grid">
				<div class="fv-erp-quality__actions-list fv-fx-glass"></div>
				<div class="fv-erp-quality__procedures fv-fx-glass"></div>
			</div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-quality__kpis"));
		this._renderInspections(wrapper.querySelector(".fv-erp-quality__inspections"));
		this._renderGoals(wrapper.querySelector(".fv-erp-quality__goals"));
		this._renderActions(wrapper.querySelector(".fv-erp-quality__actions-list"));
		this._renderProcedures(wrapper.querySelector(".fv-erp-quality__procedures"));
		return this;
	}

	async _loadData() {
		const [totalInspect, accepted, rejected, recentInspect, goals, actions, procedures] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Quality Inspection", filters: { docstatus: 1 } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Quality Inspection", filters: { docstatus: 1, status: "Accepted" } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Quality Inspection", filters: { docstatus: 1, status: "Rejected" } }),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Quality Inspection",
				fields: ["name", "item_code", "inspection_type", "status", "creation"],
				order_by: "creation desc",
				limit_page_length: 10,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Quality Goal",
				fields: ["name", "goal", "monitoring_frequency", "revision"],
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Quality Action",
				fields: ["name", "action", "status", "date", "corrective_preventive"],
				order_by: "date desc",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Quality Procedure",
				fields: ["name", "quality_procedure_name", "parent_quality_procedure"],
				limit_page_length: 20,
			}).catch(() => []),
		]);
		this.data = { totalInspect, accepted, rejected, recentInspect, goals, actions, procedures };
	}

	_renderKPIs(el) {
		const d = this.data;
		const rate = d.totalInspect ? ((d.accepted / d.totalInspect) * 100).toFixed(1) : 0;
		const kpis = [
			{ label: __("Total Inspections"), value: d.totalInspect || 0, icon: "🔍", color: "#6366f1" },
			{ label: __("Accepted"), value: d.accepted || 0, icon: "✅", color: "#10b981" },
			{ label: __("Rejected"), value: d.rejected || 0, icon: "❌", color: "#ef4444" },
			{ label: __("Acceptance Rate"), value: `${rate}%`, icon: "📊", color: "#3b82f6" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${typeof k.value === "number" ? k.value.toLocaleString() : k.value}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderInspections(el) {
		const items = this.data.recentInspect || [];
		const statusColor = { Accepted: "#10b981", Rejected: "#ef4444" };
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Inspections")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Inspection")}</th><th>${__("Item")}</th><th>${__("Type")}</th><th>${__("Status")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/quality-inspection/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${frappe.utils.escape_html(i.item_code || "")}</td>
				<td>${frappe.utils.escape_html(i.inspection_type || "")}</td>
				<td><span class="fv-status-dot" style="background:${statusColor[i.status] || "#94a3b8"}"></span> ${i.status}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No inspections found")}</p>`}`;
	}

	_renderGoals(el) {
		const goals = this.data.goals || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Quality Goals")}</h3>
		${goals.length ? `<div class="fv-erp-card-list">${goals.map(g => `
			<div class="fv-erp-mini-card fv-fx-hover-lift">
				<a href="/app/quality-goal/${encodeURIComponent(g.name)}">${frappe.utils.escape_html(g.goal || g.name)}</a>
				<span class="text-muted">${frappe.utils.escape_html(g.monitoring_frequency || "")}</span>
			</div>`).join("")}</div>` : `<p class="text-muted">${__("No quality goals defined")}</p>`}`;
	}

	_renderActions(el) {
		const actions = this.data.actions || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Quality Actions")}</h3>
		${actions.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Action")}</th><th>${__("Type")}</th><th>${__("Status")}</th><th>${__("Date")}</th>
			</tr></thead>
			<tbody>${actions.map(a => `<tr>
				<td><a href="/app/quality-action/${encodeURIComponent(a.name)}">${frappe.utils.escape_html(a.action || a.name)}</a></td>
				<td>${frappe.utils.escape_html(a.corrective_preventive || "")}</td>
				<td>${frappe.utils.escape_html(a.status || "")}</td>
				<td>${a.date || ""}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No actions found")}</p>`}`;
	}

	_renderProcedures(el) {
		const procs = this.data.procedures || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Quality Procedures")}</h3>
		${procs.length ? `<div class="fv-erp-card-list">${procs.map(p => `
			<div class="fv-erp-mini-card fv-fx-hover-lift">
				<a href="/app/quality-procedure/${encodeURIComponent(p.name)}">${frappe.utils.escape_html(p.quality_procedure_name || p.name)}</a>
				${p.parent_quality_procedure ? `<span class="text-muted">↳ ${frappe.utils.escape_html(p.parent_quality_procedure)}</span>` : ""}
			</div>`).join("")}</div>` : `<p class="text-muted">${__("No procedures defined")}</p>`}`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPQuality(container, opts);
		return inst.render();
	}
}
