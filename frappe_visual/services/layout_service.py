# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — LayoutService
Business logic for workspace maps, shortcuts, and layout operations.
"""

import frappe
from frappe import _


class LayoutService:
    """Service class for workspace/layout business logic."""

    @staticmethod
    def build_workspace_map(workspace: str | None = None) -> dict:
        """Build a visual map of workspace shortcuts and links."""
        filters = {}
        if workspace:
            filters["name"] = workspace

        workspaces = frappe.get_all(
            "Workspace",
            filters=filters,
            fields=["name", "title", "module", "icon", "is_default"],
            limit_page_length=50,
        )

        nodes = []
        edges = []

        for ws in workspaces:
            ws_id = f"workspace:{ws.name}"
            nodes.append({
                "id": ws_id,
                "label": ws.title or ws.name,
                "type": "workspace",
                "icon": ws.icon,
            })

            shortcuts = frappe.get_all(
                "Workspace Shortcut",
                filters={"parent": ws.name},
                fields=["name", "label", "link_to", "type"],
            )

            for sc in shortcuts:
                target_id = (
                    f"doctype:{sc.link_to}" if sc.type == "DocType"
                    else f"page:{sc.link_to}"
                )
                nodes.append({
                    "id": target_id,
                    "label": sc.label or sc.link_to,
                    "type": (sc.type or "page").lower().replace(" ", "-"),
                    "parent": ws_id,
                })
                edges.append({
                    "source": ws_id,
                    "target": target_id,
                    "type": "shortcut",
                })

        return {"nodes": nodes, "edges": edges}

    @staticmethod
    def get_batch_counts(dt_list: list[str]) -> dict:
        """Get record counts for multiple DocTypes efficiently."""
        counts = {}
        for dt in dt_list:
            try:
                if frappe.has_permission(dt, "read"):
                    counts[dt] = frappe.db.count(dt)
                else:
                    counts[dt] = None
            except Exception:
                counts[dt] = None
        return counts

    @staticmethod
    def get_workspace_dashboard(workspace: str | None = None) -> dict:
        """Get comprehensive dashboard data for a workspace."""
        result = {"shortcuts": [], "recent_activity": []}
        if not workspace:
            return result

        shortcuts = frappe.get_all(
            "Workspace Shortcut",
            filters={"parent": workspace, "type": "DocType"},
            fields=["label", "link_to", "color"],
            order_by="idx",
        )

        for sc in shortcuts:
            dt = sc.link_to
            item = {
                "label": sc.label or _(dt),
                "doctype": dt,
                "color": sc.color,
                "count": None,
                "statuses": {},
            }
            try:
                if frappe.has_permission(dt, "read"):
                    item["count"] = frappe.db.count(dt)
                    meta = frappe.get_meta(dt)
                    if meta.is_submittable:
                        escaped_dt = dt.replace("`", "")
                        statuses = frappe.db.sql(
                            f"SELECT `docstatus`, COUNT(*) as cnt "
                            f"FROM `tab{escaped_dt}` GROUP BY `docstatus`",
                            as_dict=True,
                        )
                        status_map = {0: "Draft", 1: "Submitted", 2: "Cancelled"}
                        for s in statuses:
                            item["statuses"][status_map.get(s.docstatus, "Other")] = s.cnt
            except Exception:
                pass
            result["shortcuts"].append(item)

        return result

    @staticmethod
    def build_tree_data(doctype: str, parent_field: str = "parent") -> list:
        """Get hierarchical tree data for a self-referencing DocType."""
        records = frappe.get_all(
            doctype,
            fields=["name", parent_field, "modified"],
            order_by="name",
            limit_page_length=0,
        )
        lookup = {r.name: r for r in records}
        children_map: dict[str, list] = {}
        for r in records:
            parent = r.get(parent_field)
            if parent:
                children_map.setdefault(parent, []).append(r.name)

        def build_node(name: str, depth: int = 0) -> dict:
            node = {"id": name, "label": name, "children": [], "depth": depth}
            for child in children_map.get(name, []):
                node["children"].append(build_node(child, depth + 1))
            return node

        return [
            build_node(r.name)
            for r in records
            if not r.get(parent_field) or r.get(parent_field) not in lookup
        ]
