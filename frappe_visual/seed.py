# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Seed Data
Runs on `after_migrate` to ensure reference data exists.
"""

import frappe
from frappe import _


def seed_data():
    """
    Idempotent seed — safe to run multiple times.
    Seeds reference data, settings defaults, roles, and CAPS capabilities.
    """
    frappe.logger().info("Frappe Visual: Running seed_data()...")

    _seed_settings()
    _seed_roles()
    _seed_caps_capabilities()

    frappe.logger().info("Frappe Visual: seed_data() complete.")


def _seed_settings():
    """Ensure Settings singleton has sensible defaults."""
    # Check if settings doctype exists
    settings_dt = None
    for dt_name in ["FV Settings", "Frappe Visual Settings", "Frappe_Visual Settings"]:
        if frappe.db.exists("DocType", dt_name):
            settings_dt = dt_name
            break

    if not settings_dt:
        return

    try:
        settings = frappe.get_single(settings_dt)
        # Only set defaults if not already configured
        if not settings.flags.get("has_been_configured"):
            frappe.logger().info(f"{settings_dt}: Defaults already configured or no flag.")
    except Exception as e:
        frappe.logger().warning(f"Could not seed settings: {e}")


def _seed_roles():
    """Ensure app-specific roles exist."""
    roles = [
        {"role": "FV User", "desk_access": 1},
        {"role": "FV Manager", "desk_access": 1},
        {"role": "FV Admin", "desk_access": 1},
    ]

    for role_data in roles:
        role_name = role_data["role"]
        if not frappe.db.exists("Role", role_name):
            doc = frappe.new_doc("Role")
            doc.role_name = role_name
            doc.desk_access = role_data.get("desk_access", 1)
            doc.insert(ignore_permissions=True)
            frappe.logger().info(f"Created role: {role_name}")


def _insert_if_missing(doctype, name, data=None):
    """Helper: insert a record only if it doesn't exist."""
    if not frappe.db.exists(doctype, name):
        doc = frappe.new_doc(doctype)
        doc.update(data or {})
        if hasattr(doc.meta, "get_field") and doc.meta.get_field("name1"):
            doc.name1 = name
        doc.insert(ignore_permissions=True)
        return doc
    return frappe.get_doc(doctype, name)


def _seed_caps_capabilities():
    """Seed CAPS capabilities and role bundles if CAPS is installed."""
    if not frappe.db.exists("DocType", "CAPS Capability"):
        frappe.logger().info("CAPS not installed — skipping capability seeding")
        return

    from frappe_visual.caps import FV_CAPABILITIES, FV_ROLE_BUNDLES

    # Seed individual capabilities
    for cap in FV_CAPABILITIES:
        if not frappe.db.exists("CAPS Capability", cap["name"]):
            try:
                frappe.get_doc({
                    "doctype": "CAPS Capability",
                    "capability_name": cap["name"],
                    "category": cap["category"],
                    "description": cap.get("description", ""),
                    "label": cap.get("label", cap["name"]),
                    "app": "frappe_visual",
                }).insert(ignore_permissions=True)
                frappe.logger().info(f"Created CAPS capability: {cap['name']}")
            except Exception:
                frappe.log_error(title=f"Seed CAPS capability: {cap['name']}")

    # Seed capability bundles
    if frappe.db.exists("DocType", "CAPS Capability Bundle"):
        for bundle_name, bundle_data in FV_ROLE_BUNDLES.items():
            if not frappe.db.exists("CAPS Capability Bundle", bundle_name):
                try:
                    doc = frappe.get_doc({
                        "doctype": "CAPS Capability Bundle",
                        "bundle_name": bundle_name,
                        "label": bundle_data.get("label", bundle_name),
                        "description": bundle_data.get("description", ""),
                        "app": "frappe_visual",
                    })
                    for cap_name in bundle_data.get("capabilities", []):
                        doc.append("capabilities", {"capability": cap_name})
                    doc.insert(ignore_permissions=True)
                    frappe.logger().info(f"Created CAPS bundle: {bundle_name}")
                except Exception:
                    frappe.log_error(title=f"Seed CAPS bundle: {bundle_name}")
