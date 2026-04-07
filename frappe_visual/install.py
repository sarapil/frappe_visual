# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Post-Install / Pre-Uninstall Setup
Runs after `bench install-app frappe_visual` and before uninstall.
"""

import json
import frappe
from frappe import _


def after_install():
    """Post-installation setup for Frappe Visual."""
    _create_desktop_icon()
    frappe.logger().info("✅ Frappe Visual: post-install complete")


def before_uninstall():
    """Cleanup before uninstalling Frappe Visual."""
    _remove_desktop_icon()
    _remove_custom_roles()
    _remove_caps_capabilities()
    _remove_fv_records()
    frappe.logger().info("✅ Frappe Visual: pre-uninstall cleanup complete")


def _create_desktop_icon():
    """Create desktop shortcut icon for Frappe Visual."""
    if not frappe.db.exists("DocType", "Desktop Icon"):
        return

    if frappe.db.exists("Desktop Icon", {"module_name": "Frappe Visual"}):
        return

    try:
        frappe.get_doc({
            "doctype": "Desktop Icon",
            "module_name": "Frappe Visual",
            "label": _("Frappe Visual"),
            "logo_url": "/assets/frappe_visual/images/frappe_visual-logo.svg",
            "color": "#6366F1",
            "type": "module",
            "standard": 1,
        }).insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(title="Frappe Visual: create Desktop Icon failed")


def _remove_desktop_icon():
    """Remove desktop icon and clean Desktop Layout entries."""
    label = "Frappe Visual"

    # 1. Delete Desktop Icon records
    try:
        for name in frappe.get_all(
            "Desktop Icon",
            filters=[["module_name", "=", label]],
            pluck="name",
        ):
            frappe.delete_doc("Desktop Icon", name, ignore_permissions=True)
    except Exception:
        pass

    try:
        for name in frappe.get_all(
            "Desktop Icon",
            filters=[["app", "=", "frappe_visual"]],
            pluck="name",
        ):
            frappe.delete_doc("Desktop Icon", name, ignore_permissions=True)
    except Exception:
        pass

    # 2. Scrub from every Desktop Layout JSON blob
    if not frappe.db.exists("DocType", "Desktop Layout"):
        return

    try:
        for layout in frappe.get_all("Desktop Layout", fields=["name", "layout"]):
            data = json.loads(layout.layout or "[]")
            cleaned = [
                i for i in data
                if not (isinstance(i, dict) and i.get("app") == "frappe_visual")
                and not (isinstance(i, dict) and i.get("label") == label)
            ]
            if len(cleaned) != len(data):
                frappe.db.set_value(
                    "Desktop Layout", layout.name, "layout", json.dumps(cleaned)
                )
    except Exception:
        frappe.log_error(title="Frappe Visual: cleanup Desktop Layout failed")


def _remove_custom_roles():
    """Remove custom FV roles created by seed_data."""
    for role_name in ("FV User", "FV Manager", "FV Admin"):
        try:
            if frappe.db.exists("Role", role_name):
                # Remove role from all users first
                frappe.db.delete("Has Role", {"role": role_name})
                frappe.delete_doc("Role", role_name, ignore_permissions=True)
        except Exception:
            frappe.log_error(title=f"Frappe Visual: remove role {role_name} failed")


def _remove_caps_capabilities():
    """Remove CAPS capabilities created for Frappe Visual."""
    if not frappe.db.exists("DocType", "CAPS Capability"):
        return

    try:
        for cap in frappe.get_all(
            "CAPS Capability",
            filters=[["name", "like", "FV_%"]],
            pluck="name",
        ):
            frappe.delete_doc("CAPS Capability", cap, ignore_permissions=True)

        # Clean up capability bundles
        if frappe.db.exists("DocType", "CAPS Capability Bundle"):
            for bundle in frappe.get_all(
                "CAPS Capability Bundle",
                filters=[["name", "like", "FV_%"]],
                pluck="name",
            ):
                frappe.delete_doc("CAPS Capability Bundle", bundle, ignore_permissions=True)

        # Clean up user capability assignments
        if frappe.db.exists("DocType", "CAPS User Capability"):
            frappe.db.delete("CAPS User Capability", {"capability": ["like", "FV_%"]})
    except Exception:
        frappe.log_error(title="Frappe Visual: cleanup CAPS capabilities failed")


def _remove_fv_records():
    """Remove all FV Visual Asset, FV Dashboard, and FV Theme records."""
    for dt in ("FV Visual Asset", "FV Dashboard", "FV Theme"):
        try:
            if frappe.db.exists("DocType", dt):
                for name in frappe.get_all(dt, pluck="name"):
                    frappe.delete_doc(dt, name, ignore_permissions=True, force=True)
        except Exception:
            frappe.log_error(title=f"Frappe Visual: cleanup {dt} records failed")
