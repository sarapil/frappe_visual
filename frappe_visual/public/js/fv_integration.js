// Copyright (c) 2024, Arkan Lab — https://arkan.it.com
// License: MIT
// frappe_visual Integration for Frappe Visual

(function() {
    "use strict";

    // App branding registration
    const APP_CONFIG = {
        name: "frappe_visual",
        title: __("Frappe Visual"),
        color: "#6366F1",
        module: "Frappe Visual",
    };

    // Initialize visual enhancements when ready
    $(document).on("app_ready", function() {
        // Register app color with visual theme system
        if (frappe.visual && frappe.visual.ThemeManager) {
            try {
                document.documentElement.style.setProperty(
                    "--frappe-visual-primary",
                    APP_CONFIG.color
                );
            } catch(e) {}
        }

        // Initialize bilingual tooltips for Arabic support
        if (frappe.visual && frappe.visual.bilingualTooltip) {
            // bilingualTooltip auto-initializes — just ensure it's active
        }
    });

    // Route-based visual page rendering
    $(document).on("page-change", function() {
        if (!frappe.visual || !frappe.visual.generator) return;

        // Visual Settings Page
        if (frappe.get_route_str() === 'frappe-visual-settings') {
            const page = frappe.container.page;
            if (page && page.main) {
                frappe.visual.generator.settingsPage(
                    page.main[0] || page.main,
                    "Frappe Visual Settings"
                );
            }
        }

        // Visual Reports Hub
        if (frappe.get_route_str() === 'frappe-visual-reports') {
            const page = frappe.container.page;
            if (page && page.main) {
                frappe.visual.generator.reportsHub(
                    page.main[0] || page.main,
                    "Frappe Visual"
                );
            }
        }
    });
})();
