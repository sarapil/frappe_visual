/**
 * FV ERP Pages — Frappe Workspace Page Wrappers
 * ================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides ready-made Frappe pages for every ERP module.
 * Any app can register these routes in hooks.py to expose
 * visual dashboards for Finance, HR, Stock, etc.
 *
 * Usage in hooks.py:
 *   page_js = {
 *     "fv-finance": "frappe_visual/public/js/erp/pages/fv_erp_pages.js",
 *     "fv-hr": "frappe_visual/public/js/erp/pages/fv_erp_pages.js",
 *   }
 *
 * Routes: /app/fv-{module} — e.g., /app/fv-finance, /app/fv-hr
 */

// Auto-register pages for all ERP modules when script loads
(function () {
	"use strict";

	const MODULE_PAGES = {
		"fv-finance":       { module: "finance",       title: "Finance Dashboard",       icon: "💰" },
		"fv-stock":         { module: "stock",         title: "Inventory Dashboard",     icon: "📦" },
		"fv-hr":            { module: "hr",            title: "HR Dashboard",            icon: "👥" },
		"fv-selling":       { module: "selling",       title: "Sales Dashboard",         icon: "📈" },
		"fv-buying":        { module: "buying",        title: "Purchasing Dashboard",    icon: "🛒" },
		"fv-manufacturing": { module: "manufacturing", title: "Manufacturing Dashboard", icon: "🏭" },
		"fv-projects":      { module: "projects",      title: "Projects Dashboard",      icon: "🗂️" },
		"fv-crm":           { module: "crm",           title: "CRM Dashboard",           icon: "🤝" },
		"fv-assets":        { module: "assets",        title: "Asset Management",        icon: "🏗️" },
		"fv-quality":       { module: "quality",       title: "Quality Management",      icon: "🔬" },
		"fv-support":       { module: "support",       title: "Support Desk",            icon: "🎫" },
		"fv-payroll":       { module: "payroll",       title: "Payroll Dashboard",       icon: "💵" },
		"fv-education":     { module: "education",     title: "Education Dashboard",     icon: "🎓" },
		"fv-pos":           { module: "pos",           title: "POS Dashboard",           icon: "🛒" },
		"fv-loans":         { module: "loans",         title: "Loan Management",         icon: "🏦" },
		"fv-website":       { module: "website",       title: "Website Dashboard",       icon: "🌐" },
		"fv-role-hub":      { module: "roleHub",       title: "My Workspace",            icon: "🏠" },
	};

	// Register all pages
	for (const [route, config] of Object.entries(MODULE_PAGES)) {
		frappe.pages[route] = function (wrapper) {
			const page = frappe.ui.make_app_page({
				parent: wrapper,
				title: __(config.title),
				single_column: true,
			});

			page.main.innerHTML = `
				<div id="fv-erp-page-root" style="padding:0.5rem">
					<div style="padding:3rem;text-align:center">
						<span class="fv-erp-spinner"></span>
						<p style="margin-top:1rem;color:var(--text-muted)">${__("Loading %s...", [__(config.title)])}</p>
					</div>
				</div>`;

			frappe.require("fv_erp.bundle.js", async () => {
				const container = page.main.querySelector("#fv-erp-page-root");
				try {
					if (config.module === "roleHub") {
						await frappe.visual.erp.roleHub(container, {});
					} else {
						await frappe.visual.erp.dashboard(container, config.module, {});
					}
				} catch (e) {
					console.error(`FV ERP Page: Error loading ${config.module}`, e);
					container.innerHTML = `<div style="padding:2rem;text-align:center">
						<p class="text-danger">${__("Error loading dashboard. Please refresh.")}</p>
					</div>`;
				}
			});
		};
	}
})();
