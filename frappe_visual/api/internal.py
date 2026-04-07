# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Internal API
Non-marketplace internal endpoints for admin operations,
icon sprite manipulation, and desktop layout injection.
These are NOT exposed in the marketplace listing.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error


@frappe.whitelist()
def rebuild_icon_sprite():
    """Force rebuild of the icon sprite (admin only)."""
    from frappe_visual.caps_integration.gate import check_capability
    if not check_capability("FV_manage_settings"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    from frappe_visual.setup.icons import after_install
    after_install()

    return success(message="Icon sprite rebuilt successfully")


@frappe.whitelist()
def inject_desktop_icons():
    """Force re-injection of desktop icons into all layouts (admin only)."""
    from frappe_visual.caps_integration.gate import check_capability
    if not check_capability("FV_manage_settings"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    from frappe_visual.desktop_utils import inject_app_desktop_icon
    inject_app_desktop_icon(
        app="frappe_visual",
        label="Frappe Visual",
        route="/desk/frappe-visual",
        logo_url="/assets/frappe_visual/images/frappe_visual-logo.svg",
        bg_color="#4F46E5",
    )

    return success(message="Desktop icons injected into all layouts")


@frappe.whitelist()
def get_system_health():
    """Get system health data for Frappe Visual (admin only)."""
    from frappe_visual.caps_integration.gate import check_capability
    if not check_capability("FV_manage_settings"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    from frappe_visual.setup.icons import list_installed_icons

    health = {
        "icons_installed": len(list_installed_icons()),
        "caps_available": frappe.db.exists("DocType", "CAPS Capability") is not None,
        "settings_doctype": None,
        "cache_status": "ok" if frappe.cache.get_value("fv_health_check") else "unknown",
    }

    for dt_name in ["FV Settings", "Frappe Visual Settings", "FV Setting"]:
        if frappe.db.exists("DocType", dt_name):
            health["settings_doctype"] = dt_name
            break

    return success(data=health)


@frappe.whitelist()
def clear_visual_cache():
    """Clear all Frappe Visual caches (admin only)."""
    from frappe_visual.caps_integration.gate import check_capability
    if not check_capability("FV_manage_settings"):
        frappe.throw(_("Insufficient permissions"), frappe.PermissionError)

    # Clear all fv_* cache keys
    for pattern in ["fv_*", "frappe_visual_*"]:
        keys = frappe.cache.get_keys(pattern)
        for key in keys:
            frappe.cache.delete_value(key)

    return success(message="All Frappe Visual caches cleared")
