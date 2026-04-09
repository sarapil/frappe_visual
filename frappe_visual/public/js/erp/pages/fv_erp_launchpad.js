/**
 * FV ERP Launchpad — Module Selection Grid
 * ==========================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * A visual grid of all 16 ERP modules the current user can access.
 * Respects Frappe permissions — only shows modules
 * whose primary DocType the user has read access to.
 *
 * Route: /app/fv-erp
 */
frappe.pages["fv-erp"] = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("ERP Modules"),
		single_column: true,
	});

	const modules = [
		{ key: "finance",       route: "/app/fv-finance",       icon: "💰", title: __("Finance"),       color: "#10b981", doctype: "GL Entry" },
		{ key: "stock",         route: "/app/fv-stock",         icon: "📦", title: __("Inventory"),     color: "#f59e0b", doctype: "Warehouse" },
		{ key: "hr",            route: "/app/fv-hr",            icon: "👥", title: __("HR"),            color: "#6366f1", doctype: "Employee" },
		{ key: "selling",       route: "/app/fv-selling",       icon: "📈", title: __("Sales"),         color: "#3b82f6", doctype: "Sales Order" },
		{ key: "buying",        route: "/app/fv-buying",        icon: "🛒", title: __("Purchasing"),    color: "#8b5cf6", doctype: "Purchase Order" },
		{ key: "manufacturing", route: "/app/fv-manufacturing", icon: "🏭", title: __("Manufacturing"), color: "#ec4899", doctype: "Work Order" },
		{ key: "projects",      route: "/app/fv-projects",      icon: "🗂️", title: __("Projects"),      color: "#14b8a6", doctype: "Project" },
		{ key: "crm",           route: "/app/fv-crm",           icon: "🤝", title: __("CRM"),           color: "#f97316", doctype: "Lead" },
		{ key: "assets",        route: "/app/fv-assets",        icon: "🏗️", title: __("Assets"),        color: "#64748b", doctype: "Asset" },
		{ key: "quality",       route: "/app/fv-quality",       icon: "🔬", title: __("Quality"),       color: "#06b6d4", doctype: "Quality Inspection" },
		{ key: "support",       route: "/app/fv-support",       icon: "🎫", title: __("Support"),       color: "#ef4444", doctype: "Issue" },
		{ key: "payroll",       route: "/app/fv-payroll",       icon: "💵", title: __("Payroll"),       color: "#22c55e", doctype: "Salary Slip" },
		{ key: "education",     route: "/app/fv-education",     icon: "🎓", title: __("Education"),     color: "#a855f7", doctype: "Student" },
		{ key: "pos",           route: "/app/fv-pos",           icon: "🛍️", title: __("POS"),           color: "#eab308", doctype: "POS Invoice" },
		{ key: "loans",         route: "/app/fv-loans",         icon: "🏦", title: __("Loans"),         color: "#0ea5e9", doctype: "Loan" },
		{ key: "website",       route: "/app/fv-website",       icon: "🌐", title: __("Website"),       color: "#84cc16", doctype: "Web Page" },
	];

	// Check permissions and render grid
	const root = $(`<div class="fv-erp-launchpad" style="padding:1rem"></div>`).appendTo(page.main);

	root.html(`<div style="padding:3rem;text-align:center">
		<span class="fv-erp-spinner"></span>
		<p style="margin-top:1rem;color:var(--text-muted)">${__("Loading modules...")}</p>
	</div>`);

	// Filter by user permissions
	frappe.xcall("frappe.client.get_list", {
		doctype: "Has Role",
		filters: { parent: frappe.session.user, parenttype: "User" },
		fields: ["role"],
		limit_page_length: 0,
	}).then(() => {
		// Show modules whose primary DocType the user can access
		const available = modules.filter(m => {
			try {
				return frappe.perm.has_perm(m.doctype, 0, "read");
			} catch {
				return false;
			}
		});

		if (!available.length) {
			root.html(`<div style="padding:3rem;text-align:center">
				<p class="text-muted">${__("No ERP modules available for your role.")}</p>
			</div>`);
			return;
		}

		root.html("");

		// Role Hub shortcut at top
		const hubBtn = $(`<div class="fv-launchpad-hub-link" style="margin-bottom:1.5rem">
			<a href="/app/fv-role-hub" class="btn btn-primary-light" style="border-radius:8px;padding:0.5rem 1.5rem">
				🏠 ${__("My Workspace")} — ${__("Role-Based Dashboard")}
			</a>
		</div>`);
		root.append(hubBtn);

		const grid = $(`<div class="fv-launchpad-grid"></div>`);
		root.append(grid);

		available.forEach(m => {
			const card = $(`
				<a href="${m.route}" class="fv-launchpad-card" style="--card-accent:${m.color}">
					<span class="fv-launchpad-icon">${m.icon}</span>
					<span class="fv-launchpad-title">${m.title}</span>
				</a>
			`);
			grid.append(card);
		});
	}).catch(() => {
		// Fallback: show all modules
		root.html("");
		const grid = $(`<div class="fv-launchpad-grid"></div>`);
		root.append(grid);
		modules.forEach(m => {
			grid.append(`
				<a href="${m.route}" class="fv-launchpad-card" style="--card-accent:${m.color}">
					<span class="fv-launchpad-icon">${m.icon}</span>
					<span class="fv-launchpad-title">${m.title}</span>
				</a>
			`);
		});
	});
};
