// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVDesk Bundle — Complete Desk Override System
 * ===============================================
 * Exports all desk components as a single bundle.
 *
 * Auto-registers on frappe.visual.desk namespace for easy access.
 *
 * Usage:
 *   await frappe.require("fv_desk.bundle.js");
 *   // Then:
 *   frappe.visual.desk.Page.create({ title: "My Page" });
 *   frappe.visual.desk.ListView.create("#el", { doctype: "Task" });
 *   frappe.visual.desk.Dialog.show({ title: "Hello" });
 *   frappe.visual.desk.FormView.enhance(frm, { kpis: [...] });
 *   frappe.visual.desk.ReportView.create("#el", { reportName: "..." });
 *   frappe.visual.desk.Sidebar.create("#el", { sections: [...] });
 *   frappe.visual.desk.Navbar.create("#el", { title: "Arkan" });
 *   frappe.visual.desk.FieldRenderer.render(el, { fieldtype: "Data" });
 */

import { FVPage } from "./fv_page";
import { FVFormView } from "./fv_form_view";
import { FVListView } from "./fv_list_view";
import { FVWorkspaceView } from "./fv_workspace_view";
import { FVDialog } from "./fv_dialog";
import { FVReportView } from "./fv_report_view";
import { FVSidebar } from "./fv_sidebar";
import { FVNavbar } from "./fv_navbar";
import { FVFieldRenderer } from "./fv_field_renderer";

// Register on global namespace
if (typeof frappe !== "undefined") {
	frappe.visual = frappe.visual || {};
	frappe.visual.desk = {
		Page: FVPage,
		FormView: FVFormView,
		ListView: FVListView,
		WorkspaceView: FVWorkspaceView,
		Dialog: FVDialog,
		ReportView: FVReportView,
		Sidebar: FVSidebar,
		Navbar: FVNavbar,
		FieldRenderer: FVFieldRenderer,
	};

	// Convenience shortcuts on frappe.visual
	frappe.visual.page = (opts) => FVPage.create(opts);
	frappe.visual.listView = (container, opts) => FVListView.create(container, opts);
	frappe.visual.workspaceView = (container, opts) => FVWorkspaceView.create(container, opts);
	frappe.visual.dialog = (opts) => FVDialog.show(opts);
	frappe.visual.confirm = (msg, cb, opts) => FVDialog.confirm(msg, cb, opts);
	frappe.visual.alert = (msg, opts) => FVDialog.alert(msg, opts);
	frappe.visual.prompt = (title, ph, opts) => FVDialog.prompt(title, ph, opts);
	frappe.visual.reportView = (container, opts) => FVReportView.create(container, opts);
	frappe.visual.sidebar = (container, opts) => FVSidebar.create(container, opts);
	frappe.visual.navbar = (container, opts) => FVNavbar.create(container, opts);
	frappe.visual.renderField = (container, def, val) => FVFieldRenderer.render(container, def, val);
	frappe.visual.renderForm = (container, dt, opts) => FVFieldRenderer.renderForm(container, dt, opts);
}

export {
	FVPage,
	FVFormView,
	FVListView,
	FVWorkspaceView,
	FVDialog,
	FVReportView,
	FVSidebar,
	FVNavbar,
	FVFieldRenderer,
};
