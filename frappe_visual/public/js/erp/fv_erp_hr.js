/**
 * FV ERP HR — Visual HR Dashboard
 * =================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: HR Dashboard, Employee Directory, Attendance Tracker,
 * Leave Calendar, Org Chart, Quick Actions.
 */

export class FVERPHR {
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
		wrapper.className = "fv-erp-hr fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-hr__inner">
			<div class="fv-erp-hr__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">👥</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("HR Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${this.opts.company || ""}</p>
					</div>
				</div>
			</div>
			<div class="fv-erp-hr__kpis"></div>
			<div class="fv-erp-hr__grid">
				<div class="fv-erp-hr__attendance fv-fx-glass"></div>
				<div class="fv-erp-hr__leave fv-fx-glass"></div>
			</div>
			<div class="fv-erp-hr__grid">
				<div class="fv-erp-hr__birthdays fv-fx-glass"></div>
				<div class="fv-erp-hr__recent fv-fx-glass"></div>
			</div>
			<div class="fv-erp-hr__actions fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
	}

	async _loadData() {
		try {
			const today = frappe.datetime.now_date();
			const [totalEmps, activeEmps, onLeave, pendingLeaves, birthdays, recentHires] = await Promise.all([
				this._getCount("Employee", {}),
				this._getCount("Employee", { status: "Active" }),
				this._getCount("Attendance", { attendance_date: today, status: "On Leave" }),
				this._getCount("Leave Application", { status: "Open" }),
				this._getBirthdays(),
				this._getRecent("Employee", ["name", "employee_name", "department", "date_of_joining", "image"]),
			]);

			this.data = { totalEmps, activeEmps, onLeave, pendingLeaves, birthdays, recentHires };
			this._renderKPIs();
			this._renderAttendance();
			this._renderLeave();
			this._renderBirthdays();
			this._renderRecentHires();
			this._renderQuickActions();
		} catch {
			this._renderEmptyState();
		}
	}

	async _getCount(doctype, filters) {
		try {
			return await frappe.xcall("frappe.client.get_count", { doctype, filters }) || 0;
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

	async _getBirthdays() {
		try {
			const today = frappe.datetime.now_date();
			const m = today.slice(5, 7);
			const d = today.slice(8, 10);
			return await frappe.xcall("frappe.client.get_list", {
				doctype: "Employee",
				fields: ["name", "employee_name", "date_of_birth", "image"],
				filters: { status: "Active", date_of_birth: ["like", `%-${m}-${d}`] },
				limit_page_length: 10,
			});
		} catch { return []; }
	}

	_renderKPIs() {
		const kpis = [
			{ label: __("Total Employees"), value: this.data.totalEmps, icon: "👥", color: "#6366f1" },
			{ label: __("Active"), value: this.data.activeEmps, icon: "✅", color: "#10b981" },
			{ label: __("On Leave Today"), value: this.data.onLeave, icon: "🏖️", color: "#f59e0b" },
			{ label: __("Pending Leaves"), value: this.data.pendingLeaves, icon: "⏳", color: "#ef4444" },
		];
		const el = this.container.querySelector(".fv-erp-hr__kpis");
		el.innerHTML = kpis.map((k, i) => `
			<div class="fv-workspace-kpi fv-fx-hover-lift" style="animation-delay:${i * 60}ms">
				<div class="fv-workspace-kpi__icon" style="background:${k.color}15;color:${k.color}">${k.icon}</div>
				<div class="fv-workspace-kpi__value">${k.value}</div>
				<div class="fv-workspace-kpi__label">${k.label}</div>
			</div>`).join("");
	}

	_renderAttendance() {
		const el = this.container.querySelector(".fv-erp-hr__attendance");
		const present = this.data.activeEmps - this.data.onLeave;
		const pct = this.data.activeEmps > 0 ? Math.round((present / this.data.activeEmps) * 100) : 0;
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Today's Attendance")}</h3>
			<div style="text-align:center;padding:1rem">
				<div style="font-size:2.5rem;font-weight:700;color:${pct > 80 ? '#10b981' : '#f59e0b'}">${pct}%</div>
				<p style="color:var(--fv-text-muted);font-size:0.85rem">${__("{0} present out of {1}", [present, this.data.activeEmps])}</p>
				<a href="/app/attendance?attendance_date=${frappe.datetime.now_date()}" class="fv-btn fv-btn--sm" style="margin-block-start:0.5rem">${__("View Details")}</a>
			</div>`;
	}

	_renderLeave() {
		const el = this.container.querySelector(".fv-erp-hr__leave");
		el.innerHTML = `
			<h3 style="margin:0 0 0.75rem;font-size:1rem">${__("Leave Requests")}</h3>
			<div style="text-align:center;padding:1rem">
				<div style="font-size:2.5rem;font-weight:700;color:${this.data.pendingLeaves > 0 ? '#ef4444' : '#10b981'}">${this.data.pendingLeaves}</div>
				<p style="color:var(--fv-text-muted);font-size:0.85rem">${__("Pending approval")}</p>
				<a href="/app/leave-application?status=Open" class="fv-btn fv-btn--sm" style="margin-block-start:0.5rem">${__("Review")}</a>
			</div>`;
	}

	_renderBirthdays() {
		const el = this.container.querySelector(".fv-erp-hr__birthdays");
		const bdays = this.data.birthdays || [];
		if (bdays.length === 0) {
			el.innerHTML = `
				<h3 style="margin:0 0 0.75rem;font-size:1rem">🎂 ${__("Birthdays Today")}</h3>
				<p style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No birthdays today")}</p>`;
		} else {
			const items = bdays.map((b) => `
				<div class="fv-list-card" style="display:flex;align-items:center;gap:0.75rem;padding:0.625rem"
					 onclick="frappe.set_route('employee','${frappe.utils.escape_html(b.name)}')">
					<div style="font-size:1.5rem">🎂</div>
					<div>
						<div style="font-weight:600;font-size:0.9rem">${frappe.utils.escape_html(b.employee_name)}</div>
					</div>
				</div>`).join("");
			el.innerHTML = `
				<h3 style="margin:0 0 0.75rem;font-size:1rem">🎂 ${__("Birthdays Today")}</h3>
				${items}`;
		}
	}

	_renderRecentHires() {
		const el = this.container.querySelector(".fv-erp-hr__recent");
		const rows = (this.data.recentHires || []).map((e) => `
			<tr class="fv-list-table__row" onclick="frappe.set_route('employee','${frappe.utils.escape_html(e.name)}')">
				<td><span class="fv-list-table__link">${frappe.utils.escape_html(e.employee_name || e.name)}</span></td>
				<td>${frappe.utils.escape_html(e.department || "")}</td>
				<td>${e.date_of_joining || ""}</td>
			</tr>`).join("");
		el.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:0.5rem">
				<h3 style="margin:0;font-size:1rem">${__("Recent Hires")}</h3>
				<a href="/app/employee" class="fv-btn fv-btn--sm">${__("All Employees")}</a>
			</div>
			<table class="fv-list-table__table">
				<thead><tr><th>${__("Name")}</th><th>${__("Department")}</th><th>${__("Joined")}</th></tr></thead>
				<tbody>${rows || `<tr><td colspan="3" style="text-align:center;padding:1rem;color:var(--fv-text-muted)">${__("No recent hires")}</td></tr>`}</tbody>
			</table>`;
	}

	_renderQuickActions() {
		const actions = [
			{ label: __("New Employee"), icon: "👤", route: "/app/employee/new" },
			{ label: __("Mark Attendance"), icon: "✅", route: "/app/attendance/new" },
			{ label: __("Leave Application"), icon: "🏖️", route: "/app/leave-application/new" },
			{ label: __("Expense Claim"), icon: "🧾", route: "/app/expense-claim/new" },
			{ label: __("Monthly Attendance"), icon: "📅", route: "/app/query-report/Monthly Attendance Sheet" },
			{ label: __("Employee Information"), icon: "📋", route: "/app/query-report/Employee Information" },
		];
		const el = this.container.querySelector(".fv-erp-hr__actions");
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
		const el = this.container.querySelector(".fv-erp-hr__kpis");
		if (el) {
			el.innerHTML = `<div class="fv-list-view__empty"><p>${__("HRMS module not available")}</p></div>`;
		}
	}

	static async create(container, opts = {}) {
		const instance = new FVERPHR(container, opts);
		await instance.render();
		return instance;
	}
}
