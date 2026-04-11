// Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ERP Modules — ERP Module Launchpad
 *
 * Visual grid showing all available ERP modules based on user permissions.
 * Route: /app/fv-erp
 */
frappe.pages["fv-erp"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("ERP Modules"),
        single_column: true,
    });

    const root = $(`<div id="fv-erp-launchpad-root" style="padding:1rem">
        <div style="padding:3rem;text-align:center">
            <div class="fv-fx-page-enter">
                <i class="ti ti-layout-dashboard" style="font-size:3rem;color:var(--primary)"></i>
                <p style="margin-top:1rem;color:var(--text-muted)">${__("Loading ERP Modules...")}</p>
            </div>
        </div>
    </div>`).appendTo(page.main);

    frappe.require("fv_erp.bundle.js", () => {
        frappe.visual.loadERP().then(() => {
            if (frappe.visual.erp && frappe.visual.erp.launchpad) {
                frappe.visual.erp.launchpad(root.find("#fv-erp-launchpad-root")[0] || root[0], {});
            }
        }).catch(() => {
            root.html(`<div style="padding:2rem;text-align:center">
                <p class="text-danger">${__("Error loading modules. Please refresh.")}</p>
            </div>`);
        });
    });
};
