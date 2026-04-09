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

/* ── Register on frappe.visual.erp namespace ─────────────── */

if (!frappe.visual) frappe.visual = {};
if (!frappe.visual.erp) frappe.visual.erp = {};

// Class references
frappe.visual.erp.Finance       = FVERPFinance;
frappe.visual.erp.Stock         = FVERPStock;
frappe.visual.erp.HR            = FVERPHR;
frappe.visual.erp.Selling       = FVERPSelling;
frappe.visual.erp.Buying        = FVERPBuying;
frappe.visual.erp.Manufacturing = FVERPManufacturing;
frappe.visual.erp.Projects      = FVERPProjects;
frappe.visual.erp.CRM           = FVERPCRM;

// Factory shortcuts — each returns a Promise
frappe.visual.erp.finance = (container, opts) => FVERPFinance.create(container, opts);
frappe.visual.erp.stock   = (container, opts) => FVERPStock.create(container, opts);
frappe.visual.erp.hr      = (container, opts) => FVERPHR.create(container, opts);
frappe.visual.erp.selling = (container, opts) => FVERPSelling.create(container, opts);
frappe.visual.erp.buying  = (container, opts) => FVERPBuying.create(container, opts);
frappe.visual.erp.manufacturing = (container, opts) => FVERPManufacturing.create(container, opts);
frappe.visual.erp.projects = (container, opts) => FVERPProjects.create(container, opts);
frappe.visual.erp.crm      = (container, opts) => FVERPCRM.create(container, opts);

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
	};
	const Module = modules[module];
	if (!Module) {
		throw new Error(`Unknown ERP module: ${module}. Available: ${Object.keys(modules).join(", ")}`);
	}
	return Module.create(container, opts);
};

// Mark as loaded
frappe.visual.erp._loaded = true;
frappe.visual.erp._version = "1.0.0";
frappe.visual.erp._modules = [
	"finance", "stock", "hr", "selling", "buying",
	"manufacturing", "projects", "crm",
];

console.log(
	"%c🏢 frappe.visual.erp loaded — 8 modules",
	"color:#6366f1;font-weight:bold"
);
