# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Dashboard API v1
Save/load/list dashboard configurations.
"""

import json
import frappe
from frappe import _
from frappe_visual.api.response import success, error


@frappe.whitelist()
def save_dashboard(
    name: str | None = None,
    title: str = "Untitled Dashboard",
    dashboard_type: str = "Standard",
    layout_config: str = "{}",
    widgets: str = "[]",
    workspace: str | None = None,
    refresh_interval: int = 30,
    is_public: int = 0,
) -> dict:
    """Save or update a dashboard configuration."""
    frappe.has_permission("FV Dashboard", "write", throw=True)

    try:
        if isinstance(layout_config, str):
            json.loads(layout_config)
        if isinstance(widgets, str):
            json.loads(widgets)
    except json.JSONDecodeError:
        return error("Invalid JSON in layout_config or widgets", "INVALID_JSON")

    if name:
        doc = frappe.get_doc("FV Dashboard", name)
        doc.title = title
        doc.dashboard_type = dashboard_type
        doc.layout_config = layout_config
        doc.workspace = workspace
        doc.refresh_interval = int(refresh_interval)
        doc.is_public = int(is_public)
        doc.save(ignore_permissions=False)
    else:
        doc = frappe.get_doc({
            "doctype": "FV Dashboard",
            "title": title,
            "dashboard_type": dashboard_type,
            "layout_config": layout_config,
            "workspace": workspace,
            "refresh_interval": int(refresh_interval),
            "is_public": int(is_public),
            "owner": frappe.session.user,
        })
        doc.insert(ignore_permissions=False)

    # Add widgets
    if widgets:
        widget_list = json.loads(widgets) if isinstance(widgets, str) else widgets
        doc.set("widgets", [])
        for w in widget_list:
            doc.append("widgets", {
                "widget_type": w.get("widget_type", "MetricCard"),
                "widget_label": w.get("widget_label", ""),
                "position_x": w.get("position_x", 0),
                "position_y": w.get("position_y", 0),
                "width": w.get("width", 4),
                "height": w.get("height", 3),
                "data_source_doctype": w.get("data_source_doctype"),
                "data_source_filters": json.dumps(w.get("data_source_filters", {})),
                "config": json.dumps(w.get("config", {})),
            })
        doc.save(ignore_permissions=False)

    return success(data={"name": doc.name, "title": doc.title})


@frappe.whitelist()
def load_dashboard(name: str) -> dict:
    """Load a dashboard by name."""
    frappe.has_permission("FV Dashboard", "read", throw=True)

    doc = frappe.get_doc("FV Dashboard", name)
    widgets = []
    for w in doc.widgets or []:
        widgets.append({
            "widget_type": w.widget_type,
            "widget_label": w.widget_label,
            "position_x": w.position_x,
            "position_y": w.position_y,
            "width": w.width,
            "height": w.height,
            "data_source_doctype": w.data_source_doctype,
            "data_source_filters": json.loads(w.data_source_filters or "{}"),
            "config": json.loads(w.config or "{}"),
        })

    return success(data={
        "name": doc.name,
        "title": doc.title,
        "dashboard_type": doc.dashboard_type,
        "layout_config": json.loads(doc.layout_config or "{}"),
        "widgets": widgets,
        "workspace": doc.workspace,
        "refresh_interval": doc.refresh_interval,
        "is_public": doc.is_public,
        "owner": doc.owner,
        "modified": str(doc.modified),
    })


@frappe.whitelist()
def list_dashboards(workspace: str | None = None) -> dict:
    """List dashboards, optionally filtered by workspace."""
    frappe.has_permission("FV Dashboard", "read", throw=True)

    filters = {}
    if workspace:
        filters["workspace"] = workspace

    # Show public + user's own
    dashboards = frappe.get_all(
        "FV Dashboard",
        filters=filters,
        or_filters=[
            {"is_public": 1},
            {"owner": frappe.session.user},
        ],
        fields=["name", "title", "dashboard_type", "workspace", "is_public", "owner", "modified"],
        order_by="modified desc",
    )

    return success(data=dashboards)


@frappe.whitelist()
def delete_dashboard(name: str) -> dict:
    """Delete a dashboard."""
    frappe.has_permission("FV Dashboard", "delete", throw=True)
    frappe.delete_doc("FV Dashboard", name, ignore_permissions=False)
    return success(message=_("Dashboard deleted"))
