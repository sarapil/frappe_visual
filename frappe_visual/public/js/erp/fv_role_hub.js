/**
 * FV Role Hub — Role-Based Workspace Distribution System
 * ========================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Dynamically builds a customized dashboard based on the current
 * user's roles and permissions. Maps Frappe/ERPNext roles to the
 * appropriate ERP module dashboards.
 *
 * Usage:
 *   await frappe.visual.loadERP();
 *   frappe.visual.erp.roleHub("#container");
 */

export class FVRoleHub {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			company: frappe.defaults.get_default("company"),
			maxModules: 6,
		}, opts);
		this.userRoles = (frappe.user_roles || []);
	}

	/** Role → ERP module mapping */
	static ROLE_MODULE_MAP = {
		// Finance / Accounting
		"Accounts Manager": ["finance", "payroll"],
		"Accounts User": ["finance"],
		"Auditor": ["finance"],

		// Sales
		"Sales Manager": ["selling", "crm"],
		"Sales User": ["selling"],
		"Sales Master Manager": ["selling"],

		// Purchase / Buying
		"Purchase Manager": ["buying"],
		"Purchase User": ["buying"],

		// Stock / Inventory
		"Stock Manager": ["stock"],
		"Stock User": ["stock"],
		"Warehouse Manager": ["stock"],

		// Manufacturing
		"Manufacturing Manager": ["manufacturing"],
		"Manufacturing User": ["manufacturing"],

		// Project
		"Projects Manager": ["projects"],
		"Projects User": ["projects"],

		// HR
		"HR Manager": ["hr", "payroll"],
		"HR User": ["hr"],
		"Leave Approver": ["hr"],
		"Expense Approver": ["hr"],

		// CRM
		"Sales Manager": ["selling", "crm"],

		// Quality
		"Quality Manager": ["quality"],

		// Support / Help Desk
		"Support Team": ["support"],

		// Education
		"Education Manager": ["education"],
		"Instructor": ["education"],
		"Student": ["education"],

		// Website
		"Website Manager": ["website"],
		"Blogger": ["website"],

		// Assets
		"Asset Manager": ["assets"],

		// Loan
		"Loan Manager": ["loans"],

		// POS
		"POS User": ["pos"],
		"Cashier": ["pos"],

		// System
		"System Manager": ["finance", "selling", "buying", "stock", "hr", "projects"],
		"Administrator": ["finance", "selling", "buying", "stock", "hr", "manufacturing", "projects", "crm", "assets", "quality", "support", "payroll", "education", "pos", "loans", "website"],
	};

	/** Module metadata for cards */
	static MODULE_META = {
		finance:       { icon: "💰", title: "Finance",       color: "#10b981", description: "Accounts, Invoices, Payments, GL" },
		stock:         { icon: "📦", title: "Inventory",     color: "#6366f1", description: "Stock, Warehouses, Material Requests" },
		hr:            { icon: "👥", title: "HR",            color: "#3b82f6", description: "Employees, Attendance, Leave" },
		selling:       { icon: "📈", title: "Sales",         color: "#f59e0b", description: "Quotations, Sales Orders, Delivery" },
		buying:        { icon: "🛒", title: "Purchasing",    color: "#8b5cf6", description: "Purchase Orders, Suppliers, RFQ" },
		manufacturing: { icon: "🏭", title: "Manufacturing", color: "#ef4444", description: "BOM, Work Orders, Production" },
		projects:      { icon: "🗂️", title: "Projects",      color: "#14b8a6", description: "Projects, Tasks, Timesheets" },
		crm:           { icon: "🤝", title: "CRM",           color: "#ec4899", description: "Leads, Opportunities, Pipeline" },
		assets:        { icon: "🏗️", title: "Assets",        color: "#f97316", description: "Fixed Assets, Depreciation, Maintenance" },
		quality:       { icon: "🔬", title: "Quality",       color: "#06b6d4", description: "Inspections, Goals, Procedures" },
		support:       { icon: "🎫", title: "Support",       color: "#a855f7", description: "Tickets, SLA, Customer Satisfaction" },
		payroll:       { icon: "💵", title: "Payroll",       color: "#22c55e", description: "Salary Slips, Payroll Entries" },
		education:     { icon: "🎓", title: "Education",     color: "#0ea5e9", description: "Students, Courses, Assessments" },
		pos:           { icon: "🛒", title: "POS",           color: "#d946ef", description: "Point of Sale, Shifts, Receipts" },
		loans:         { icon: "🏦", title: "Loans",         color: "#64748b", description: "Loan Management, Repayments" },
		website:       { icon: "🌐", title: "Website",       color: "#0891b2", description: "Web Pages, Blog, Portal" },
	};

	_getUserModules() {
		const moduleSet = new Set();
		for (const role of this.userRoles) {
			const modules = FVRoleHub.ROLE_MODULE_MAP[role] || [];
			modules.forEach(m => moduleSet.add(m));
		}
		// If user is System Manager or Administrator, they get everything
		if (moduleSet.size === 0 && this.userRoles.includes("System Manager")) {
			return Object.keys(FVRoleHub.MODULE_META);
		}
		return Array.from(moduleSet).slice(0, this.opts.maxModules > 0 ? this.opts.maxModules : 999);
	}

	async render() {
		this.container.innerHTML = "";
		const modules = this._getUserModules();

		const wrapper = document.createElement("div");
		wrapper.className = "fv-role-hub fv-fx-page-enter";

		const fullName = frappe.session.user_fullname || frappe.session.user;
		const greeting = this._getGreeting();

		wrapper.innerHTML = `
		<div class="fv-role-hub__inner">
			<div class="fv-role-hub__header fv-fx-glass">
				<div>
					<h2 style="margin:0;font-size:1.5rem">${greeting}, ${frappe.utils.escape_html(fullName)}</h2>
					<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Your personalized workspace — %s modules available", [modules.length])}</p>
				</div>
				<div class="fv-role-hub__meta">
					<span class="fv-role-hub__date">${frappe.datetime.str_to_user(frappe.datetime.get_today())}</span>
				</div>
			</div>
			<div class="fv-role-hub__modules"></div>
			<div class="fv-role-hub__active-dashboard"></div>
		</div>`;

		this.container.appendChild(wrapper);
		const modulesEl = wrapper.querySelector(".fv-role-hub__modules");
		const dashboardEl = wrapper.querySelector(".fv-role-hub__active-dashboard");

		if (modules.length === 0) {
			modulesEl.innerHTML = `<p class="text-muted" style="padding:2rem">${__("No modules available for your role. Contact your administrator.")}</p>`;
			return this;
		}

		// Render module cards
		modulesEl.innerHTML = `<div class="fv-role-hub__grid">${modules.map(mod => {
			const meta = FVRoleHub.MODULE_META[mod] || {};
			return `
			<div class="fv-role-hub__card fv-fx-glass fv-fx-hover-lift" data-module="${mod}" style="--card-accent:${meta.color || "#6366f1"}">
				<div class="fv-role-hub__card-icon">${meta.icon || "📊"}</div>
				<div class="fv-role-hub__card-title">${__(meta.title || mod)}</div>
				<div class="fv-role-hub__card-desc">${__(meta.description || "")}</div>
			</div>`;
		}).join("")}</div>`;

		// Click handler — load module dashboard
		modulesEl.querySelectorAll(".fv-role-hub__card").forEach(card => {
			card.addEventListener("click", async () => {
				const mod = card.dataset.module;
				// Highlight active
				modulesEl.querySelectorAll(".fv-role-hub__card").forEach(c => c.classList.remove("fv-role-hub__card--active"));
				card.classList.add("fv-role-hub__card--active");
				// Load dashboard
				dashboardEl.innerHTML = `<div style="padding:2rem;text-align:center"><span class="fv-erp-spinner"></span> ${__("Loading %s...", [__(FVRoleHub.MODULE_META[mod]?.title || mod)])}</div>`;
				try {
					if (frappe.visual.erp[mod]) {
						await frappe.visual.erp[mod](dashboardEl, this.opts);
					} else {
						dashboardEl.innerHTML = `<p class="text-muted" style="padding:2rem">${__("Module '%s' is not available.", [mod])}</p>`;
					}
				} catch (e) {
					console.error(`FVRoleHub: Error loading ${mod}`, e);
					dashboardEl.innerHTML = `<p class="text-muted" style="padding:2rem">${__("Error loading module. Please try again.")}</p>`;
				}
			});
		});

		// Auto-open first module
		const firstCard = modulesEl.querySelector(".fv-role-hub__card");
		if (firstCard) firstCard.click();

		return this;
	}

	_getGreeting() {
		const hour = new Date().getHours();
		if (hour < 12) return __("Good morning");
		if (hour < 17) return __("Good afternoon");
		return __("Good evening");
	}

	static async create(container, opts = {}) {
		const inst = new FVRoleHub(container, opts);
		return inst.render();
	}
}
