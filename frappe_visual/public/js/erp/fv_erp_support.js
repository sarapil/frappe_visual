/**
 * FV ERP Support — Visual Help Desk Dashboard
 * ==============================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Ticket Dashboard, SLA Monitor, Issue Kanban,
 * Customer Satisfaction, Support Analytics.
 */

export class FVERPSupport {
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
		wrapper.className = "fv-erp-support fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-support__inner">
			<div class="fv-erp-support__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🎫</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Support Desk")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Tickets, SLA & Customer Satisfaction")}</p>
					</div>
				</div>
				<div class="fv-erp-support__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Issue')">
						+ ${__("New Ticket")}
					</button>
				</div>
			</div>
			<div class="fv-erp-support__kpis"></div>
			<div class="fv-erp-support__grid">
				<div class="fv-erp-support__by-priority fv-fx-glass"></div>
				<div class="fv-erp-support__by-status fv-fx-glass"></div>
			</div>
			<div class="fv-erp-support__grid">
				<div class="fv-erp-support__recent fv-fx-glass"></div>
				<div class="fv-erp-support__sla fv-fx-glass"></div>
			</div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-support__kpis"));
		this._renderByPriority(wrapper.querySelector(".fv-erp-support__by-priority"));
		this._renderByStatus(wrapper.querySelector(".fv-erp-support__by-status"));
		this._renderRecent(wrapper.querySelector(".fv-erp-support__recent"));
		this._renderSLA(wrapper.querySelector(".fv-erp-support__sla"));
		return this;
	}

	async _loadData() {
		const [total, open, replied, closed, onHold, priorities, recentIssues] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Issue", filters: {} }),
			frappe.xcall("frappe.client.get_count", { doctype: "Issue", filters: { status: "Open" } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Issue", filters: { status: "Replied" } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Issue", filters: { status: "Closed" } }),
			frappe.xcall("frappe.client.get_count", { doctype: "Issue", filters: { status: "On Hold" } }),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Issue",
				filters: { status: ["!=", "Closed"] },
				fields: ["priority", "count(name) as count"],
				group_by: "priority",
				limit_page_length: 10,
			}),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Issue",
				fields: ["name", "subject", "status", "priority", "customer", "creation", "opening_date"],
				order_by: "creation desc",
				limit_page_length: 15,
			}),
		]);
		this.data = { total, open, replied, closed, onHold, priorities, recentIssues };
	}

	_renderKPIs(el) {
		const d = this.data;
		const kpis = [
			{ label: __("Total Tickets"), value: d.total || 0, icon: "🎫", color: "#6366f1" },
			{ label: __("Open"), value: d.open || 0, icon: "🔴", color: "#ef4444" },
			{ label: __("Replied"), value: d.replied || 0, icon: "💬", color: "#3b82f6" },
			{ label: __("On Hold"), value: d.onHold || 0, icon: "⏸️", color: "#f59e0b" },
			{ label: __("Closed"), value: d.closed || 0, icon: "✅", color: "#10b981" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${k.value.toLocaleString()}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderByPriority(el) {
		const items = this.data.priorities || [];
		const colorMap = { Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Urgent: "#ef4444" };
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Open Tickets by Priority")}</h3>
		${items.length ? `<div class="fv-erp-bar-list">${items.map(i => {
			const maxVal = Math.max(...items.map(x => x.count || 0), 1);
			const pct = ((i.count || 0) / maxVal * 100).toFixed(0);
			const c = colorMap[i.priority] || "#94a3b8";
			return `<div class="fv-erp-bar-item">
				<div class="fv-erp-bar-item__label">${frappe.utils.escape_html(i.priority || __("None"))}</div>
				<div class="fv-erp-bar-item__bar"><div class="fv-erp-bar-item__fill" style="width:${pct}%;background:${c}"></div></div>
				<div class="fv-erp-bar-item__value">${i.count}</div>
			</div>`;
		}).join("")}</div>` : `<p class="text-muted">${__("No open tickets")}</p>`}`;
	}

	_renderByStatus(el) {
		const d = this.data;
		const statuses = [
			{ label: __("Open"), count: d.open || 0, color: "#ef4444" },
			{ label: __("Replied"), count: d.replied || 0, color: "#3b82f6" },
			{ label: __("On Hold"), count: d.onHold || 0, color: "#f59e0b" },
			{ label: __("Closed"), count: d.closed || 0, color: "#10b981" },
		];
		const total = statuses.reduce((s, x) => s + x.count, 0) || 1;
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Ticket Distribution")}</h3>
		<div class="fv-erp-progress-stack">
			${statuses.map(s => `<div class="fv-erp-progress-segment" style="width:${(s.count/total*100).toFixed(1)}%;background:${s.color}" title="${s.label}: ${s.count}"></div>`).join("")}
		</div>
		<div class="fv-erp-legend">${statuses.map(s => `
			<span class="fv-erp-legend__item"><span class="fv-status-dot" style="background:${s.color}"></span>${s.label} (${s.count})</span>
		`).join("")}</div>`;
	}

	_renderRecent(el) {
		const items = this.data.recentIssues || [];
		const pColor = { Low: "#10b981", Medium: "#f59e0b", High: "#f97316", Urgent: "#ef4444" };
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Tickets")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Ticket")}</th><th>${__("Subject")}</th><th>${__("Customer")}</th><th>${__("Priority")}</th><th>${__("Status")}</th>
			</tr></thead>
			<tbody>${items.map(i => `<tr>
				<td><a href="/app/issue/${encodeURIComponent(i.name)}">${frappe.utils.escape_html(i.name)}</a></td>
				<td>${frappe.utils.escape_html((i.subject || "").slice(0, 50))}${(i.subject || "").length > 50 ? "…" : ""}</td>
				<td>${frappe.utils.escape_html(i.customer || "—")}</td>
				<td><span class="fv-status-dot" style="background:${pColor[i.priority] || "#94a3b8"}"></span> ${i.priority || "—"}</td>
				<td>${frappe.utils.escape_html(i.status || "")}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No tickets found")}</p>`}`;
	}

	_renderSLA(el) {
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("SLA Performance")}</h3>
		<p class="text-muted">${__("Service Level Agreement compliance overview")}</p>
		<button class="fv-btn fv-btn--sm fv-btn--outline" onclick="frappe.set_route('query-report','First Response Time for Issues')">
			${__("View SLA Report")} →
		</button>
		<button class="fv-btn fv-btn--sm fv-btn--outline" style="margin-inline-start:0.5rem" onclick="frappe.set_route('List','Service Level Agreement')">
			${__("Manage SLAs")} →
		</button>`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPSupport(container, opts);
		return inst.render();
	}
}
