// Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * My Workspace — Role-Based Workspace Hub
 *
 * Dynamically builds a personalized dashboard based on the
 * current user's roles. Shows only the ERP modules and quick
 * actions relevant to the user.
 * Route: /app/fv-role-hub
 */
frappe.pages["fv-role-hub"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("My Workspace"),
        single_column: true,
    });

    page.set_title_sub(__("Your personalized ERP dashboard"));

    const root = $(`<div id="fv-role-hub-root" style="padding:1rem">
        <div style="padding:3rem;text-align:center">
            <div class="fv-fx-page-enter">
                <i class="ti ti-home" style="font-size:3rem;color:var(--primary)"></i>
                <p style="margin-top:1rem;color:var(--text-muted)">${__("Building your workspace...")}</p>
            </div>
        </div>
    </div>`).appendTo(page.main);

    frappe.require("fv_erp.bundle.js", () => {
        frappe.visual.loadRoleHub().then(() => {
            if (frappe.visual.erp && frappe.visual.erp.roleHub) {
                frappe.visual.erp.roleHub(root.find("#fv-role-hub-root")[0] || root[0], {});
            }
        }).catch(() => {
            root.html(`<div style="padding:2rem;text-align:center">
                <p class="text-danger">${__("Error loading workspace. Please refresh.")}</p>
            </div>`);
        });
    });
};
