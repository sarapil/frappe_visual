// Copyright (c) 2026, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Website Dashboard
 *
 * Visual ERP dashboard for the website module.
 * Loads the fv_erp bundle and renders the website dashboard
 * with KPIs, charts, quick actions, and recent documents.
 * Route: /app/fv-website
 */
frappe.pages["fv-website"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("Website Dashboard"),
        single_column: true,
    });

    // Back to launchpad
    page.set_secondary_action(__("All Modules"), () => {
        frappe.set_route("fv-erp");
    }, "ti ti-layout-dashboard");

    const root = $(`<div id="fv-erp-module-root" style="padding:1rem">
        <div style="padding:3rem;text-align:center">
            <div class="fv-fx-page-enter">
                <i class="ti ti-world" style="font-size:3rem;color:var(--primary)"></i>
                <p style="margin-top:1rem;color:var(--text-muted)">${__("Loading Website Dashboard...")}</p>
            </div>
        </div>
    </div>`).appendTo(page.main);

    frappe.require("fv_erp.bundle.js", () => {
        const container = root.find("#fv-erp-module-root")[0] || root[0];
        try {
            if (frappe.visual.erp && frappe.visual.erp.dashboard) {
                frappe.visual.erp.dashboard(container, "website", {});
            } else {
                container.innerHTML = `<div style="padding:2rem;text-align:center">
                    <p class="text-muted">${__("Module dashboard loading...")}</p>
                </div>`;
            }
        } catch (e) {
            console.error("FV ERP: Error loading website", e);
            container.innerHTML = `<div style="padding:2rem;text-align:center">
                <p class="text-danger">${__("Error loading dashboard. Please refresh.")}</p>
            </div>`;
        }
    });
};
