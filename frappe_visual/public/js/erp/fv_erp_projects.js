/**
 * FV ERP Projects — Visual Projects Dashboard
 * ==============================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Projects Dashboard, Task Board, Timesheet Summary,
 * Resource Allocation, Gantt Overview, Quick Actions.
 */

export class FVERPProjects {
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
		wrapper.className = "fv-erp-projects fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-projects__inner">
			<div class="fv-erp-projects__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">📁</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Projects Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
			</div>
			<div class="fv-erp-projects__kpis"></div>
			<div class="fv-erp-projects__grid">
				<div class="fv-erp-projects__active fv-fx-glass"></div>
				<div class="fv-erp-projects__tasks fv-fx-glass"></div>
			</div>
			<div class="fv-erp-projects__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
	}

	async _loadData() {
		try {
			const [openProjects, completedProjects, openTasks, overdueTasks, recentProjects, recentTasks] = await Promise.all([
				this._getCount("Project", { status: "Open" }),
				this._getCount("Project", { status: "Completed" }),
				this._getCount("Task", { status: "Open" }),
				this._getCount("Task", { status: "Open", exp_end_date: ["<", frappe.datetime.now_date()] }),
				this._getRecent("Project", ["name", "project_name", "status", "percent_complete", "expected_end_date"]),
				this._getRecent("Task", ["name", "subject", "status", "priority", "exp_end_date", "project"]),
			]);

			this.data = { openProjects, completedProjects, openTasks, overdueTasks, recentProjects, recentTasks };
			this._renderKPIs();
			this._renderActiveProjects();
			this._renderTasks();
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
				doctype, fields, order_by: "creation desc", limit_page_length: 6,
			});
		} catch { return []; }
	}

	_renderKPIs() {
		const kpis = [
			{ label: __("Open Projects"), value: this.data.openProjects, icon: "📁", color: "#3b82f6" },
			{ label: __("Completed"), value: this.data.completedProjects, icon: "✅", color: "#10b981" },
			{ label: __("Open Tasks"), value: this.data.openTasks, icon: "📝", color: "#6366f1" },
			{ label: __("Overdue Tasks"), value: this.data.overdueTasks, icon: "⚠️", color: "#ef4444" },
		];
		const el = this.container.querySelector(".fv-erp-projects__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderActiveProjects() {
		const el = this.container.querySelector(".fv-erp-projects__active");
		const statusColors = { "Open": "#3b82f6", "Completed": "#10b981", "Cancelled": "#ef4444" };
		const cards = (this.data.recentProjects || []).map((p) => {
			const pct = Math.round(p.percent_complete || 0);
			const sc = statusColors[p.status] || "#94a3b8";
			return `
			<div class="fv-list-card fv-fx-hover-lift" onclick="frappe.set_route('project','${frappe.utils.escape_html(p.name)}')" style="padding:0.875rem">
				<div style="display:flex;justify-content:space-between;align-items:start;margin-block-end:0.5rem">
					<div class="fv-list-card__title">${frappe.utils.escape_html(p.project_name || p.name)}</div>
					<span style="color:${sc};font-weight:600;font-size:0.75rem">${frappe.utils.escape_html(p.status || "")}</span>
				</div>
				<div style="display:flex;align-items:center;gap:0.375rem;margin-block-end:0.375rem">
					<div style="flex:1;height:6px;background:var(--fv-border);border-radius:3px;overflow:hidden">
						<div style="width:${pct}%;height:100%;background:${sc};transition:width 0.5s"></div>
					</div>
					<span style="font-size:0.75rem;font-weight:600">${pct}%</span>
				</div>
				${p.expected_end_date ? `<div style="font-size:0.7rem;color:var(--fv-text-muted)">${__("Due")}: ${p.expected_end_date}</div>` : ""}
			</div>`;
		}).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.75rem">
				<h3 style="margin:0;font-size:1rem">${__("Active Projects")}</h3>
				<a href="/app/project" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<div class="fv-list-cards" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
				${cards || `<p style="grid-column:1/-1;text-align:center;color:var(--fv-text-muted)">${__("No projects")}</p>`}
			</div>`;
	}

	_renderTasks() {
		const el = this.container.querySelector(".fv-erp-projects__tasks");
		const priorityColors = { "Urgent": "#ef4444", "High": "#f59e0b", "Medium": "#3b82f6", "Low": "#10b981" };
		const rows = (this.data.recentTasks || []).map((t) => {
			const pc = priorityColors[t.priority] || "#94a3b8";
			return `
			<tr class="fv-list-table__row" onclick="frappe.set_route('task','${frappe.utils.escape_html(t.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(t.subject || t.name)}</span></td>
				<td>${frappe.utils.escape_html(t.project || "")}</td>
				<td><span style="color:${pc};font-weight:500;font-size:0.8rem">${frappe.utils.escape_html(t.priority || "")}</span></td>
				<td>${t.exp_end_date || ""}</td>
			</tr>`;
		}).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Tasks")}</h3>
				<a href="/app/task" class="fv-btn fv-btn--sm">${__("View All")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Task")}</th><th>${__("Project")}</th><th>${__("Priority")}</th><th>${__("Due")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="4" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No tasks")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Project"), icon: "📁", route: "/app/project/new" },
			{ label: __("New Task"), icon: "📝", route: "/app/task/new" },
			{ label: __("Timesheet"), icon: "⏱️", route: "/app/timesheet/new" },
			{ label: __("Gantt View"), icon: "📊", route: "/app/project?view=Gantt" },
			{ label: __("Project Billing"), icon: "💰", route: "/app/query-report/Project Billing Summary" },
			{ label: __("Daily Timesheet"), icon: "📋", route: "/app/query-report/Daily Timesheet Summary" },
		];
		const el = this.container.querySelector(".fv-erp-projects__actions");
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
		const el = this.container.querySelector(".fv-erp-projects__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("ERPNext Projects module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPProjects(container, opts);
		await instance.render();
		return instance;
	}
}
