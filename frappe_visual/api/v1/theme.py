# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Theme API v1
Save/load/list/apply custom theme configurations.
"""

import json
import frappe
from frappe import _
from frappe_visual.api.response import success, error


@frappe.whitelist()
def save_theme(
    name: str | None = None,
    title: str = "Custom Theme",
    base_theme: str = "Light",
    css_variables: str = "{}",
    app: str | None = None,
    is_default: int = 0,
    description: str | None = None,
) -> dict:
    """Save or update a theme configuration."""
    frappe.has_permission("FV Theme", "write", throw=True)

    try:
        if isinstance(css_variables, str):
            data = json.loads(css_variables)
            if not isinstance(data, dict):
                return error("css_variables must be a JSON object", "INVALID_FORMAT")
    except json.JSONDecodeError:
        return error("Invalid JSON in css_variables", "INVALID_JSON")

    if name:
        doc = frappe.get_doc("FV Theme", name)
        doc.title = title
        doc.base_theme = base_theme
        doc.css_variables = css_variables
        doc.app = app
        doc.is_default = int(is_default)
        doc.description = description
        doc.save(ignore_permissions=False)
    else:
        doc = frappe.get_doc({
            "doctype": "FV Theme",
            "title": title,
            "base_theme": base_theme,
            "css_variables": css_variables,
            "app": app,
            "is_default": int(is_default),
            "description": description,
            "owner": frappe.session.user,
        })
        doc.insert(ignore_permissions=False)

    return success(data={"name": doc.name, "title": doc.title})


@frappe.whitelist()
def load_theme(name: str) -> dict:
    """Load a theme by name."""
    frappe.has_permission("FV Theme", "read", throw=True)

    doc = frappe.get_doc("FV Theme", name)
    return success(data={
        "name": doc.name,
        "title": doc.title,
        "base_theme": doc.base_theme,
        "css_variables": json.loads(doc.css_variables or "{}"),
        "app": doc.app,
        "is_default": doc.is_default,
        "status": doc.status,
        "description": doc.description,
        "preview_image": doc.preview_image,
        "owner": doc.owner,
    })


@frappe.whitelist()
def list_themes(app: str | None = None, status: str = "Active") -> dict:
    """List available themes."""
    frappe.has_permission("FV Theme", "read", throw=True)

    filters = {"status": status}
    if app:
        filters["app"] = app

    themes = frappe.get_all(
        "FV Theme",
        filters=filters,
        fields=["name", "title", "base_theme", "app", "is_default", "status", "preview_image"],
        order_by="is_default desc, title asc",
    )

    return success(data=themes)


@frappe.whitelist()
def get_active_theme() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Get the currently active (default) theme."""
    theme = frappe.get_all(
        "FV Theme",
        filters={"is_default": 1, "status": "Active"},
        fields=["name", "title", "base_theme", "css_variables"],
        limit=1,
    )

    if not theme:
        return success(data=None, message=_("No default theme set"))

    t = theme[0]
    return success(data={
        "name": t.name,
        "title": t.title,
        "base_theme": t.base_theme,
        "css_variables": json.loads(t.css_variables or "{}"),
    })


@frappe.whitelist()
def delete_theme(name: str) -> dict:
    """Delete a theme."""
    frappe.has_permission("FV Theme", "delete", throw=True)
    frappe.delete_doc("FV Theme", name, ignore_permissions=False)
    return success(message=_("Theme deleted"))
