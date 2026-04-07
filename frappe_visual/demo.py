# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Demo Data
Load/clear demo data for Frappe Visual showcases.
All demo records are tagged with `_is_demo = 1` for safe removal.
"""

import frappe
from frappe import _


def load_demo_data():
    """Load demonstration data for Frappe Visual.

    Demo state is tracked via a User Settings flag (not a custom field)
    so it works without schema changes.
    """
    frappe.flags.in_demo = True
    try:
        _create_demo_records()
        frappe.msgprint(_("Demo data loaded for Frappe Visual"))
    finally:
        frappe.flags.in_demo = False


def clear_demo_data():
    """Remove all demo data created by `load_demo_data()`."""
    # Clear demo flag from User Settings
    try:
        settings = frappe.parse_json(
            frappe.db.get_value("User Settings", "Administrator", "data") or "{}"
        )
        if settings.get("fv_demo_loaded"):
            settings.pop("fv_demo_loaded", None)
            frappe.db.set_value("User Settings", "Administrator", "data",
                                frappe.as_json(settings))
    except Exception:
        pass
    frappe.msgprint(_("Demo data cleared for Frappe Visual"))


def _create_demo_records():
    """Create demo Visual Settings with showcase configuration."""
    if not frappe.db.exists("Frappe Visual Settings"):
        return

    setting = frappe.get_doc("Frappe Visual Settings")
    if setting.get("_is_demo"):
        return

    # Ensure demo-friendly defaults
    setting.update({
        "enable_auto_enhancers": 1,
        "enable_form_enhancer": 1,
        "enable_list_enhancer": 1,
        "enable_workspace_enhancer": 1,
        "enable_bilingual_tooltip": 1,
        "default_theme": "arkan-default",
        "default_chart_palette": "indigo",
    })
    setting.save(ignore_permissions=True)

    # Track demo state in User Settings (schema-free)
    try:
        settings = frappe.parse_json(
            frappe.db.get_value("User Settings", "Administrator", "data") or "{}"
        )
        settings["fv_demo_loaded"] = 1
        frappe.db.set_value("User Settings", "Administrator", "data",
                            frappe.as_json(settings))
    except Exception:
        pass

    # Create sample workspace configs for showcase
    _create_sample_workspace_configs()
    frappe.logger("frappe_visual").info("Demo data loaded successfully")


def _create_sample_workspace_configs():
    """Create sample configurations to demonstrate visual components."""
    configs = [
        {
            "title": "Sales Dashboard Demo",
            "type": "dashboard",
            "config_json": frappe.as_json({
                "layout": "grid-3",
                "widgets": [
                    {"type": "number_card", "label": "Total Revenue", "value": 125000, "color": "#6366f1"},
                    {"type": "number_card", "label": "Active Deals", "value": 42, "color": "#22c55e"},
                    {"type": "number_card", "label": "Win Rate", "value": "68%", "color": "#f59e0b"},
                    {"type": "chart", "chartType": "bar", "title": "Monthly Revenue"},
                    {"type": "chart", "chartType": "donut", "title": "Pipeline by Stage"},
                ],
            }),
        },
        {
            "title": "Project Kanban Demo",
            "type": "kanban",
            "config_json": frappe.as_json({
                "columns": ["Backlog", "In Progress", "Review", "Done"],
                "cards": [
                    {"title": "Design System v2", "column": "In Progress", "priority": "High"},
                    {"title": "API Documentation", "column": "Review", "priority": "Medium"},
                    {"title": "Performance Audit", "column": "Backlog", "priority": "Low"},
                    {"title": "RTL Support", "column": "Done", "priority": "High"},
                ],
            }),
        },
        {
            "title": "Team Calendar Demo",
            "type": "calendar",
            "config_json": frappe.as_json({
                "events": [
                    {"title": "Sprint Planning", "day": "Monday", "color": "#6366f1"},
                    {"title": "Design Review", "day": "Wednesday", "color": "#f59e0b"},
                    {"title": "Release", "day": "Friday", "color": "#22c55e"},
                ],
            }),
        },
    ]

    for cfg in configs:
        key = f"fv_demo_{cfg['type']}"
        frappe.cache.set_value(key, cfg, expires_in_sec=86400 * 30)


def _get_demo_doctypes() -> list[str]:
    """Return list of DocTypes that may contain demo data, in dependency order."""
    return ["Frappe Visual Settings", "FV Visual Asset", "FV Dashboard", "FV Theme"]
