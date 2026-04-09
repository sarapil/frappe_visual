/**
 * FV ERP Education — Visual Education / LMS Dashboard
 * =====================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Student Dashboard, Course Manager, Fee Tracker,
 * Attendance Overview, Assessment Results, Schedule Calendar.
 */

export class FVERPEducation {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			company: frappe.defaults.get_default("company"),
			academicYear: null,
		}, opts);
		this.data = {};
	}

	async render() {
		this.container.innerHTML = "";
		const wrapper = document.createElement("div");
		wrapper.className = "fv-erp-education fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-education__inner">
			<div class="fv-erp-education__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🎓</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Education Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Students, Courses & Assessments")}</p>
					</div>
				</div>
				<div class="fv-erp-education__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Student')">
						+ ${__("New Student")}
					</button>
				</div>
			</div>
			<div class="fv-erp-education__kpis"></div>
			<div class="fv-erp-education__grid">
				<div class="fv-erp-education__programs fv-fx-glass"></div>
				<div class="fv-erp-education__courses fv-fx-glass"></div>
			</div>
			<div class="fv-erp-education__grid">
				<div class="fv-erp-education__recent-students fv-fx-glass"></div>
				<div class="fv-erp-education__fees fv-fx-glass"></div>
			</div>
			<div class="fv-erp-education__quick-links fv-fx-glass"></div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-education__kpis"));
		this._renderPrograms(wrapper.querySelector(".fv-erp-education__programs"));
		this._renderCourses(wrapper.querySelector(".fv-erp-education__courses"));
		this._renderRecentStudents(wrapper.querySelector(".fv-erp-education__recent-students"));
		this._renderFees(wrapper.querySelector(".fv-erp-education__fees"));
		this._renderQuickLinks(wrapper.querySelector(".fv-erp-education__quick-links"));
		return this;
	}

	async _loadData() {
		const [students, programs, courses, fees, recentStudents] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Student", filters: { enabled: 1 } }).catch(() => 0),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Program",
				fields: ["name", "program_name", "department"],
				limit_page_length: 15,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Course",
				fields: ["name", "course_name", "department"],
				limit_page_length: 15,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Fees",
				fields: ["name", "student_name", "program", "grand_total", "outstanding_amount", "docstatus"],
				order_by: "creation desc",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Student",
				fields: ["name", "student_name", "student_email_id", "joining_date", "enabled"],
				order_by: "creation desc",
				limit_page_length: 10,
			}).catch(() => []),
		]);
		this.data = { students, programs, courses, fees, recentStudents };
	}

	_renderKPIs(el) {
		const d = this.data;
		const totalFees = (d.fees || []).reduce((s, x) => s + (x.grand_total || 0), 0);
		const outFees = (d.fees || []).reduce((s, x) => s + (x.outstanding_amount || 0), 0);
		const kpis = [
			{ label: __("Students"), value: d.students || 0, icon: "👨‍🎓", color: "#6366f1" },
			{ label: __("Programs"), value: (d.programs || []).length, icon: "📚", color: "#3b82f6" },
			{ label: __("Courses"), value: (d.courses || []).length, icon: "📖", color: "#10b981" },
			{ label: __("Outstanding Fees"), value: frappe.format(outFees, { fieldtype: "Currency" }), icon: "💰", color: "#ef4444" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${typeof k.value === "number" ? k.value.toLocaleString() : k.value}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderPrograms(el) {
		const items = this.data.programs || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Programs")}</h3>
		${items.length ? `<div class="fv-erp-card-list">${items.map(p => `
			<div class="fv-erp-mini-card fv-fx-hover-lift">
				<a href="/app/program/${encodeURIComponent(p.name)}">${frappe.utils.escape_html(p.program_name || p.name)}</a>
				${p.department ? `<span class="text-muted">${frappe.utils.escape_html(p.department)}</span>` : ""}
			</div>`).join("")}</div>` : `<p class="text-muted">${__("No programs found")}</p>`}`;
	}

	_renderCourses(el) {
		const items = this.data.courses || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Courses")}</h3>
		${items.length ? `<div class="fv-erp-card-list">${items.map(c => `
			<div class="fv-erp-mini-card fv-fx-hover-lift">
				<a href="/app/course/${encodeURIComponent(c.name)}">${frappe.utils.escape_html(c.course_name || c.name)}</a>
				${c.department ? `<span class="text-muted">${frappe.utils.escape_html(c.department)}</span>` : ""}
			</div>`).join("")}</div>` : `<p class="text-muted">${__("No courses found")}</p>`}`;
	}

	_renderRecentStudents(el) {
		const items = this.data.recentStudents || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Students")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Student")}</th><th>${__("Email")}</th><th>${__("Joined")}</th><th>${__("Active")}</th>
			</tr></thead>
			<tbody>${items.map(s => `<tr>
				<td><a href="/app/student/${encodeURIComponent(s.name)}">${frappe.utils.escape_html(s.student_name || s.name)}</a></td>
				<td>${frappe.utils.escape_html(s.student_email_id || "—")}</td>
				<td>${s.joining_date || "—"}</td>
				<td>${s.enabled ? "✅" : "❌"}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No students found")}</p>`}`;
	}

	_renderFees(el) {
		const items = this.data.fees || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Fee Records")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Student")}</th><th>${__("Program")}</th><th>${__("Total")}</th><th>${__("Outstanding")}</th>
			</tr></thead>
			<tbody>${items.map(f => `<tr>
				<td><a href="/app/fees/${encodeURIComponent(f.name)}">${frappe.utils.escape_html(f.student_name || f.name)}</a></td>
				<td>${frappe.utils.escape_html(f.program || "")}</td>
				<td>${frappe.format(f.grand_total || 0, { fieldtype: "Currency" })}</td>
				<td style="color:${f.outstanding_amount > 0 ? "#ef4444" : "#10b981"}">${frappe.format(f.outstanding_amount || 0, { fieldtype: "Currency" })}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No fee records")}</p>`}`;
	}

	_renderQuickLinks(el) {
		const links = [
			{ label: __("Student Attendance"), route: "student-attendance-tool", icon: "📋" },
			{ label: __("Assessment Result"), route: "List/Assessment Result", icon: "📊" },
			{ label: __("Course Schedule"), route: "List/Course Schedule", icon: "📅" },
			{ label: __("Student Group"), route: "List/Student Group", icon: "👥" },
			{ label: __("Academic Term"), route: "List/Academic Term", icon: "🗓️" },
			{ label: __("Fee Schedule"), route: "List/Fee Schedule", icon: "💳" },
		];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Quick Links")}</h3>
		<div class="fv-erp-quick-links">${links.map(l => `
			<button class="fv-btn fv-btn--sm fv-btn--outline fv-fx-hover-lift" onclick="frappe.set_route('${l.route}')">
				${l.icon} ${l.label}
			</button>`).join("")}</div>`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPEducation(container, opts);
		return inst.render();
	}
}
