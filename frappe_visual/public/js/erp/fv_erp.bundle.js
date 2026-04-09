/**
 * FV ERP Bundle — Visual ERP Dashboard Collection
 * ==================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Bundles all ERPNext domain-specific visual dashboards.
 * Provides frappe.visual.erp.* namespace for domain dashboards.
 *
 * Usage:
 *   await frappe.visual.loadERP();
 *   await frappe.visual.erp.finance("#container", { company: "My Co" });
 */

import { FVERPFinance }       from "./fv_erp_finance";
import { FVERPStock }         from "./fv_erp_stock";
import { FVERPHR }            from "./fv_erp_hr";
import { FVERPSelling }       from "./fv_erp_selling";
import { FVERPBuying }        from "./fv_erp_buying";
import { FVERPManufacturing } from "./fv_erp_manufacturing";
import { FVERPProjects }      from "./fv_erp_projects";
import { FVERPCRM }           from "./fv_erp_crm";
import { FVERPAssets }        from "./fv_erp_assets";
import { FVERPQuality }       from "./fv_erp_quality";
import { FVERPSupport }       from "./fv_erp_support";
import { FVERPPayroll }       from "./fv_erp_payroll";
import { FVERPEducation }     from "./fv_erp_education";
import { FVERPPOS }           from "./fv_erp_pos";
import { FVERPLoans }         from "./fv_erp_loans";
import { FVERPWebsite }       from "./fv_erp_website";
import { FVRoleHub }          from "./fv_role_hub";

/* ── Register on frappe.visual.erp namespace ─────────────── */

if (!frappe.visual) frappe.visual = {};
if (!frappe.visual.erp) frappe.visual.erp = {};

// Class references — Core 8
frappe.visual.erp.Finance       = FVERPFinance;
frappe.visual.erp.Stock         = FVERPStock;
frappe.visual.erp.HR            = FVERPHR;
frappe.visual.erp.Selling       = FVERPSelling;
frappe.visual.erp.Buying        = FVERPBuying;
frappe.visual.erp.Manufacturing = FVERPManufacturing;
frappe.visual.erp.Projects      = FVERPProjects;
frappe.visual.erp.CRM           = FVERPCRM;

// Class references — Extended 8
frappe.visual.erp.Assets        = FVERPAssets;
frappe.visual.erp.Quality       = FVERPQuality;
frappe.visual.erp.Support       = FVERPSupport;
frappe.visual.erp.Payroll       = FVERPPayroll;
frappe.visual.erp.Education     = FVERPEducation;
frappe.visual.erp.POS           = FVERPPOS;
frappe.visual.erp.Loans         = FVERPLoans;
frappe.visual.erp.Website       = FVERPWebsite;

// Role-based workspace distribution
frappe.visual.erp.RoleHub       = FVRoleHub;

// Factory shortcuts — Core 8
frappe.visual.erp.finance = (container, opts) => FVERPFinance.create(container, opts);
frappe.visual.erp.stock   = (container, opts) => FVERPStock.create(container, opts);
frappe.visual.erp.hr      = (container, opts) => FVERPHR.create(container, opts);
frappe.visual.erp.selling = (container, opts) => FVERPSelling.create(container, opts);
frappe.visual.erp.buying  = (container, opts) => FVERPBuying.create(container, opts);
frappe.visual.erp.manufacturing = (container, opts) => FVERPManufacturing.create(container, opts);
frappe.visual.erp.projects = (container, opts) => FVERPProjects.create(container, opts);
frappe.visual.erp.crm      = (container, opts) => FVERPCRM.create(container, opts);

// Factory shortcuts — Extended 8
frappe.visual.erp.assets     = (container, opts) => FVERPAssets.create(container, opts);
frappe.visual.erp.quality    = (container, opts) => FVERPQuality.create(container, opts);
frappe.visual.erp.support    = (container, opts) => FVERPSupport.create(container, opts);
frappe.visual.erp.payroll    = (container, opts) => FVERPPayroll.create(container, opts);
frappe.visual.erp.education  = (container, opts) => FVERPEducation.create(container, opts);
frappe.visual.erp.pos        = (container, opts) => FVERPPOS.create(container, opts);
frappe.visual.erp.loans      = (container, opts) => FVERPLoans.create(container, opts);
frappe.visual.erp.website    = (container, opts) => FVERPWebsite.create(container, opts);

// Role Hub — dynamic role-based workspace
frappe.visual.erp.roleHub   = (container, opts) => FVRoleHub.create(container, opts);

// All-in-one dashboard creator
frappe.visual.erp.dashboard = async (container, module, opts) => {
	const modules = {
		finance: FVERPFinance,
		stock: FVERPStock,
		hr: FVERPHR,
		selling: FVERPSelling,
		buying: FVERPBuying,
		manufacturing: FVERPManufacturing,
		projects: FVERPProjects,
		crm: FVERPCRM,
		assets: FVERPAssets,
		quality: FVERPQuality,
		support: FVERPSupport,
		payroll: FVERPPayroll,
		education: FVERPEducation,
		pos: FVERPPOS,
		loans: FVERPLoans,
		website: FVERPWebsite,
	};
	const Module = modules[module];
	if (!Module) {
		throw new Error(`Unknown ERP module: ${module}. Available: ${Object.keys(modules).join(", ")}`);
	}
	return Module.create(container, opts);
};

// Mark as loaded
frappe.visual.erp._loaded = true;
frappe.visual.erp._version = "2.0.0";
frappe.visual.erp._modules = [
	"finance", "stock", "hr", "selling", "buying",
	"manufacturing", "projects", "crm",
	"assets", "quality", "support", "payroll",
	"education", "pos", "loans", "website",
];

console.log(
	"%c🏢 frappe.visual.erp loaded — 16 modules",
	"color:#6366f1;font-weight:bold"
);
