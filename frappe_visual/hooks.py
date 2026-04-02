app_name = "frappe_visual"
app_title = "Frappe Visual"
app_publisher = "Arkan Lab"
app_description = "Visual GUI For Any APP — Interactive graph-based UX framework with animations, floating windows, and a complete design system for Frappe applications"
app_email = "moatazsarapil@gmail.com"
app_license = "GPL-3.0"
required_apps = ["frappe"]

# ─── App Branding ─────────────────────────────────────────────────
app_logo_url = "/assets/frappe_visual/images/frappe_visual-logo.svg"
app_icon = "/assets/frappe_visual/images/desktop_icons/frappe_visual-solid.svg"

add_to_apps_screen = [
    {
        "name": "frappe_visual",
        "logo": "/assets/frappe_visual/images/desktop_icons/frappe_visual-solid.svg",
        "title": "Frappe Visual",
        "route": "/app/visual-hub",
        "has_permission": "frappe_visual.api.has_visual_access",
    }
]

# ─── Desk Includes ────────────────────────────────────────────────
# The main bundle is lazy-loaded on demand via frappe.require().
# Only the lightweight bootstrap loader is included globally.
app_include_js = [
    "/assets/frappe_visual/js/fv_bootstrap.js",
    "/assets/frappe_visual/js/icon_helper.js",
]
app_include_css = [
    "/assets/frappe_visual/css/frappe_visual-theme.css",
    "frappe_visual.bundle.css",
    # Tabler Icons Webfont (6,000+ icons)
    "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.30.0/dist/tabler-icons.min.css",
    # App icon utilities
    "/assets/frappe_visual/css/icons.css",
    # Brand CSS variables
    "/assets/frappe_visual/css/brand.css",
]

# ─── Website Includes ─────────────────────────────────────────────
# web_include_js = []
# web_include_css = []

# ─── Page JS ──────────────────────────────────────────────────────
# page_js = {"visual-hub": "public/js/pages/visual_hub.js"}

# ═══════════════════════════════════════════════════════════════════
# ICON SYSTEM - Install / Migrate / Uninstall Hooks
# ═══════════════════════════════════════════════════════════════════
after_install = "frappe_visual.setup.icons.after_install"

after_migrate = ["frappe_visual.frappe_visual.seed.seed_data"]
before_uninstall = "frappe_visual.setup.icons.before_uninstall"
after_migrate = "frappe_visual.setup.icons.after_migrate"

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
]

# ─── Website Routes ───────────────────────────────────────────────
website_route_rules = [
    {"from_route": "/frappe-visual-about", "to_route": "frappe_visual_about"},
]

# ─── Scheduled Tasks ──────────────────────────────────────────────
# scheduler_events = {}

# CAPS Integration — Capability-Based Access Control
# ------------------------------------------------------------
caps_capabilities = [
    {"name": "FV_view_maps", "category": "Module", "description": "View app maps and ERDs"},
    {"name": "FV_manage_settings", "category": "Module", "description": "Manage Visual settings"},
    {"name": "FV_use_components", "category": "Action", "description": "Use visual components"},
]
