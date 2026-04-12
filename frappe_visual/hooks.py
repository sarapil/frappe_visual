# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

app_name = "frappe_visual"
app_title = "Frappe Visual"
app_publisher = "Arkan Lab"
app_description = "Interactive graph engine and UI component library for Frappe"
app_email = "moatazsarapil@gmail.com"
app_license = "GPL-3.0"
required_apps = ["frappe"]

# ─── App Branding ─────────────────────────────────────────────────
app_logo_url = "/assets/frappe_visual/images/frappe_visual-logo.svg"
app_icon = "/assets/frappe_visual/images/desktop_icons/frappe_visual-solid.svg"
app_color = "#6366F1"

add_to_apps_screen = [
    {
        "name": "frappe_visual",
        "logo": "/assets/frappe_visual/images/desktop_icons/frappe_visual-solid.svg",
        "title": "Frappe Visual",
        "route": "/desk/frappe-visual",
        "has_permission": "frappe_visual.api.has_visual_access",
    }
]

# ─── Desk Includes ────────────────────────────────────────────────
# The main bundle is lazy-loaded on demand via frappe.require().
# Only the lightweight bootstrap loader is included globally.
app_include_js = ["/assets/frappe_visual/js/frappe_visual_combined.js"]
# NOTE: Arkan Help JS is loaded by arkan_help's own hooks.py when installed.
# Do NOT include /assets/arkan_help/ files here — arkan_help is not in required_apps.
app_include_css = [
    "frappe_visual.bundle.css",
    "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/dist/tabler-icons.min.css",
    "/assets/frappe_visual/css/frappe_visual_combined.css",
]

# ─── Website Includes ─────────────────────────────────────────────
# web_include_js = []
# web_include_css = []

# ─── Page JS ──────────────────────────────────────────────────────
# ERP module pages auto-load JS from their page directories.
# Additional JS can be injected per-page:
page_js = {
    "fv-erp": "public/js/erp/pages/fv_erp_launchpad.js",
    "fv-role-hub": "public/js/erp/pages/fv_erp_pages.js",
    "fv-finance": "public/js/erp/pages/fv_erp_pages.js",
    "fv-stock": "public/js/erp/pages/fv_erp_pages.js",
    "fv-hr": "public/js/erp/pages/fv_erp_pages.js",
    "fv-selling": "public/js/erp/pages/fv_erp_pages.js",
    "fv-buying": "public/js/erp/pages/fv_erp_pages.js",
    "fv-manufacturing": "public/js/erp/pages/fv_erp_pages.js",
    "fv-projects": "public/js/erp/pages/fv_erp_pages.js",
    "fv-crm": "public/js/erp/pages/fv_erp_pages.js",
    "fv-assets": "public/js/erp/pages/fv_erp_pages.js",
    "fv-quality": "public/js/erp/pages/fv_erp_pages.js",
    "fv-support": "public/js/erp/pages/fv_erp_pages.js",
    "fv-payroll": "public/js/erp/pages/fv_erp_pages.js",
    "fv-education": "public/js/erp/pages/fv_erp_pages.js",
    "fv-pos": "public/js/erp/pages/fv_erp_pages.js",
    "fv-loans": "public/js/erp/pages/fv_erp_pages.js",
    "fv-website": "public/js/erp/pages/fv_erp_pages.js",
}

# ═══════════════════════════════════════════════════════════════════
# ICON SYSTEM - Install / Migrate / Uninstall Hooks
# ═══════════════════════════════════════════════════════════════════
after_install = ["frappe_visual.setup.icons.after_install", "frappe_visual.install.after_install"]

after_migrate = ["frappe_visual.seed.seed_data", "frappe_visual.setup.icons.after_migrate"]
before_uninstall = ["frappe_visual.setup.icons.before_uninstall", "frappe_visual.install.before_uninstall"]

# Boot session (preload icon config)
extend_bootinfo = "frappe_visual.setup.icons.extend_bootinfo"

# Jinja helpers
jinja = {
    "methods": [
        "frappe_visual.utils.icons.render_icon",
        "frappe_visual.utils.icons.get_icon_class",
    ]
}

# ─── Fixtures ─────────────────────────────────────────────────────
fixtures = [
    {
        "doctype": "Workspace",
        "filters": [["module", "=", "Frappe Visual"]],
    },
    {
        "doctype": "Page",
        "filters": [["module", "=", "Frappe Visual"]],
    },
    {"doctype": "Desktop Icon", "filters": [["app", "=", "frappe_visual"]]},
    {"doctype": "FV Visual Asset", "filters": [["is_public", "=", 1]]},
    {"doctype": "FV Dashboard", "filters": [["is_public", "=", 1]]},
    {"doctype": "FV Theme", "filters": [["status", "=", "Active"]]},
]

# ─── Website Routes ───────────────────────────────────────────────
website_route_rules = [
    {"from_route": "/frappe-visual-about", "to_route": "frappe_visual_about"},
    {"from_route": "/frappe-visual-gallery", "to_route": "frappe-visual-gallery"},
    {"from_route": "/frappe-visual-docs", "to_route": "frappe-visual-docs"},
]

# ─── Scheduled Tasks ──────────────────────────────────────────────
scheduler_events = {
    "daily": [
        "frappe_visual.tasks.cleanup_expired_snoozes",
        "frappe_visual.tasks.decay_frecency_scores",
    ],
    "cron": {
        "0 */6 * * *": [
            "frappe_visual.tasks.refresh_workspace_stats_cache",
        ],
    },
}

# CAPS Integration — Capability-Based Access Control
# Full capability list synced from frappe_visual/caps.py (15 capabilities)
# ------------------------------------------------------------
caps_capabilities = [
    # ── Module Capabilities ──
    {"name": "FV_view_visual_hub", "category": "Module", "description": "Access the Visual Hub page and all visual components"},
    {"name": "FV_use_app_map", "category": "Module", "description": "Generate and interact with application maps"},
    {"name": "FV_use_erd", "category": "Module", "description": "View Entity Relationship Diagrams"},
    {"name": "FV_use_storyboard", "category": "Module", "description": "Create and view storyboard walkthroughs"},
    {"name": "FV_use_kanban", "category": "Module", "description": "Create and interact with Kanban boards"},
    {"name": "FV_use_calendar", "category": "Module", "description": "View and interact with visual calendar"},
    {"name": "FV_use_gantt", "category": "Module", "description": "View project Gantt timelines"},
    {"name": "FV_use_map", "category": "Module", "description": "View geographic map with markers"},
    {"name": "FV_use_gallery", "category": "Module", "description": "View image galleries"},
    {"name": "FV_use_tree", "category": "Module", "description": "View hierarchical tree visualizations"},
    # ── Action Capabilities ──
    {"name": "FV_export_svg", "category": "Action", "description": "Export visual graphs as SVG files"},
    {"name": "FV_export_png", "category": "Action", "description": "Export visual graphs as PNG images"},
    {"name": "FV_change_layout", "category": "Action", "description": "Switch between layout engines (Force, Hierarchical, ELK, etc.)"},
    {"name": "FV_manage_settings", "category": "Action", "description": "Configure Frappe Visual Settings (license, theme, defaults)"},
    # ── Report Capabilities ──
    {"name": "FV_view_statistics", "category": "Report", "description": "View app and DocType statistics in Visual Hub"},
]

# Role bundles are defined in frappe_visual/caps.py: FV_ROLE_BUNDLES
# Viewer (11 caps) | Power User (14 caps) | Admin (15 caps)

# ─── Doc Events — CAPS auto-enforcement on FV DocTypes ────────────
# frappe_visual owns 5 DocTypes: Frappe Visual Settings, FV Visual Asset,
# FV Dashboard, FV Dashboard Widget, FV Theme.
# CAPS auto-enforcement for all (*) DocTypes is handled by the CAPS app
# itself via its own doc_events hook. We guard with check_capability()
# in the API / service layer and validate ownership/JSON in controllers.
doc_events = {
    "FV Visual Asset": {
        "before_save": "frappe_visual.caps_integration.gate.on_before_save",
    },
    "FV Dashboard": {
        "before_save": "frappe_visual.caps_integration.gate.on_before_save",
    },
    "FV Theme": {
        "before_save": "frappe_visual.caps_integration.gate.on_before_save",
    },
}

# ─── CLI Commands ─────────────────────────────────────────────────
# bench --site <site> frappe-visual info|seed|export-icons|check-caps|demo

get_help = "frappe_visual.utils.help.get_help"
