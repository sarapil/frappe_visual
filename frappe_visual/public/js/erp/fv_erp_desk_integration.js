/**
 * FV ERP Desk Integration — Toolbar & Navbar Enhancement
 * ========================================================
 * Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Adds Visual ERP quick-access buttons to the Frappe navbar:
 * - ERP Launchpad shortcut
 * - My Workspace (Role Hub)
 * - Module-specific quick search
 *
 * Auto-loads on desk boot. Injected via fv_bootstrap.js.
 */
(function () {
	"use strict";

	if (typeof frappe === "undefined") return;

	// Wait for desk page to be ready
	$(document).on("startup", () => {
		if (!frappe.boot || !frappe.session?.user) return;

		// Add navbar dropdown for Visual ERP
		_addERPNavItem();
	});

	function _addERPNavItem() {
		// Don't add if already present
		if (document.querySelector("#fv-erp-nav-item")) return;

		const navbar = document.querySelector(".navbar-nav.d-none.d-sm-flex");
		if (!navbar) return;

		const li = document.createElement("li");
		li.className = "nav-item dropdown";
		li.id = "fv-erp-nav-item";
		li.innerHTML = `
			<a class="nav-link" href="/app/fv-erp" title="${__("Visual ERP")}"
			   style="display:flex;align-items:center;gap:4px;opacity:0.8">
				<i class="ti ti-cube-3d-sphere" style="font-size:1.1rem"></i>
			</a>`;
		navbar.appendChild(li);
	}

	// ─── Command Palette Registration ─────────────────────────────
	// Register ERP modules in Frappe's Command Palette (Ctrl+K / Cmd+K)
	if (frappe.search) {
		const erp_commands = [
			{ label: __("ERP Launchpad"),          route: "fv-erp",           icon: "layout-dashboard" },
			{ label: __("My Workspace (Hub)"),     route: "fv-role-hub",      icon: "home" },
			{ label: __("Finance Dashboard"),      route: "fv-finance",       icon: "coin" },
			{ label: __("Inventory Dashboard"),    route: "fv-stock",         icon: "package" },
			{ label: __("HR Dashboard"),           route: "fv-hr",            icon: "users" },
			{ label: __("Sales Dashboard"),        route: "fv-selling",       icon: "chart-line" },
			{ label: __("Purchasing Dashboard"),   route: "fv-buying",        icon: "shopping-cart" },
			{ label: __("Manufacturing Dashboard"),route: "fv-manufacturing", icon: "building-factory" },
			{ label: __("Projects Dashboard"),     route: "fv-projects",      icon: "folders" },
			{ label: __("CRM Dashboard"),          route: "fv-crm",           icon: "address-book" },
			{ label: __("Asset Management"),       route: "fv-assets",        icon: "building-warehouse" },
			{ label: __("Quality Management"),     route: "fv-quality",       icon: "microscope" },
			{ label: __("Support Desk"),           route: "fv-support",       icon: "ticket" },
			{ label: __("Payroll Dashboard"),      route: "fv-payroll",       icon: "cash" },
			{ label: __("Education Dashboard"),    route: "fv-education",     icon: "school" },
			{ label: __("POS Dashboard"),          route: "fv-pos",           icon: "shopping-bag" },
			{ label: __("Loan Management"),        route: "fv-loans",         icon: "building-bank" },
			{ label: __("Website Dashboard"),      route: "fv-website",       icon: "world" },
		];

		// Add to global search handler
		frappe.provide("frappe.visual.erp_commands");
		frappe.visual.erp_commands = erp_commands;
	}
})();
