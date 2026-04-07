# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — GraphService
Business logic for building graph structures (app maps, ERD, relationship explorer).
Delegates from api/__init__.py (Thin Controller pattern).
"""

import frappe
from frappe import _


class GraphService:
    """Service class for graph/relationship business logic."""

    @staticmethod
    def build_app_map(app_name: str) -> dict:
        """Build a complete application map: modules → DocTypes → relationships."""
        nodes = []
        edges = []
        seen_nodes: set[str] = set()

        modules = frappe.get_all(
            "Module Def",
            filters={"app_name": app_name},
            fields=["name", "module_name", "app_name"],
        )

        for mod in modules:
            mod_id = f"module:{mod.name}"
            if mod_id not in seen_nodes:
                nodes.append({
                    "id": mod_id,
                    "label": mod.module_name or mod.name,
                    "type": "module",
                    "app": app_name,
                })
                seen_nodes.add(mod_id)

            doctypes = frappe.get_all(
                "DocType",
                filters={"module": mod.name, "custom": 0},
                fields=[
                    "name", "module", "issingle", "istable",
                    "is_submittable", "is_tree", "is_virtual", "description",
                ],
                limit_page_length=200,
            )

            for dt in doctypes:
                dt_id = f"doctype:{dt.name}"
                if dt_id in seen_nodes:
                    continue
                nodes.append({
                    "id": dt_id,
                    "label": dt.name,
                    "type": GraphService._classify_doctype(dt),
                    "parent": mod_id,
                    "module": mod.name,
                    "description": dt.description or "",
                    "doctype": dt.name,
                })
                seen_nodes.add(dt_id)
                edges.append({
                    "id": f"e:{mod_id}-{dt_id}",
                    "source": mod_id,
                    "target": dt_id,
                    "type": "contains",
                })

        GraphService._add_link_edges(nodes, edges, seen_nodes)
        return {"nodes": nodes, "edges": edges}

    @staticmethod
    def build_doctype_relationships(doctype: str, depth: int = 2) -> dict:
        """Get all relationships radiating from a single DocType."""
        nodes = []
        edges = []
        seen: set[str] = set()
        queue = [(doctype, 0)]

        while queue:
            current_dt, current_depth = queue.pop(0)
            if current_dt in seen:
                continue
            seen.add(current_dt)
            try:
                meta = frappe.get_meta(current_dt)
            except Exception:
                continue

            dt_id = f"doctype:{current_dt}"
            nodes.append({
                "id": dt_id,
                "label": current_dt,
                "type": GraphService._classify_meta(meta),
                "module": meta.module,
                "doctype": current_dt,
                "depth": current_depth,
            })

            if current_depth >= depth:
                continue

            for df in meta.fields:
                linked_dt, edge_type = GraphService._resolve_link(df)
                if linked_dt and linked_dt not in seen:
                    queue.append((linked_dt, current_depth + 1))
                    edges.append({
                        "id": f"e:{dt_id}-doctype:{linked_dt}",
                        "source": dt_id,
                        "target": f"doctype:{linked_dt}",
                        "type": edge_type,
                        "label": df.fieldname,
                    })

        return {"nodes": nodes, "edges": edges}

    @staticmethod
    def build_form_dashboard(doctype: str, docname: str, depth: int = 1) -> dict:
        """Get relationship graph + stats for a specific document."""
        graph = GraphService.build_doctype_relationships(doctype, depth)
        stats = {}
        try:
            meta = frappe.get_meta(doctype)
            for df in meta.fields:
                if df.fieldtype == "Link" and df.options:
                    try:
                        target_meta = frappe.get_meta(df.options)
                        if target_meta.has_field(df.fieldname):
                            count = frappe.db.count(df.options, {df.fieldname: docname})
                            if count:
                                stats[_(df.options)] = count
                    except Exception:
                        pass
                elif df.fieldtype == "Table" and df.options:
                    try:
                        count = frappe.db.count(df.options, {"parent": docname})
                        if count:
                            stats[_(df.options)] = count
                    except Exception:
                        pass
        except Exception:
            pass

        graph["stats"] = stats
        return graph

    @staticmethod
    def get_quick_stats(app_name: str | None = None) -> dict:
        """Get quick statistics for dashboard widgets."""
        stats = {}
        if app_name:
            stats["modules"] = frappe.db.count("Module Def", {"app_name": app_name})
            DocType = frappe.qb.DocType("DocType")
            ModuleDef = frappe.qb.DocType("Module Def")
            from pypika.functions import Count
            stats["doctypes"] = (
                frappe.qb.from_(DocType)
                .join(ModuleDef).on(DocType.module == ModuleDef.name)
                .where(ModuleDef.app_name == app_name)
                .where(DocType.custom == 0)
                .select(Count("*"))
            ).run()[0][0]
        else:
            stats["modules"] = frappe.db.count("Module Def")
            stats["doctypes"] = frappe.db.count("DocType", {"custom": 0})

        stats["reports"] = frappe.db.count("Report", {"is_standard": "Yes"})
        stats["pages"] = frappe.db.count("Page", {"standard": "Yes"})
        stats["workspaces"] = frappe.db.count("Workspace")
        return stats

    # ── Internal helpers ──────────────────────────────────────

    @staticmethod
    def _classify_doctype(dt_dict) -> str:
        if dt_dict.get("istable"):
            return "child-table"
        if dt_dict.get("issingle"):
            return "settings"
        if dt_dict.get("is_submittable"):
            return "transaction"
        if dt_dict.get("is_tree"):
            return "master"
        return "doctype"

    @staticmethod
    def _classify_meta(meta) -> str:
        if meta.istable:
            return "child-table"
        if meta.issingle:
            return "settings"
        if meta.is_submittable:
            return "transaction"
        return "doctype"

    @staticmethod
    def _resolve_link(df) -> tuple[str | None, str]:
        """Extract linked DocType and edge type from a field definition."""
        if df.fieldtype == "Link" and df.options:
            return df.options, "link"
        if df.fieldtype in ("Table", "Table MultiSelect") and df.options:
            return df.options, "child-table"
        return None, ""

    @staticmethod
    def _add_link_edges(nodes: list, edges: list, seen_nodes: set):
        """Scan link fields to build inter-doctype edges."""
        doctype_nodes = [n for n in nodes if n["type"] not in ("module", "workspace")]
        for node in doctype_nodes:
            dt_name = node.get("doctype")
            if not dt_name:
                continue
            try:
                meta = frappe.get_meta(dt_name)
            except Exception:
                continue
            for df in meta.fields:
                linked_dt, edge_type = GraphService._resolve_link(df)
                if not linked_dt:
                    continue
                target_id = f"doctype:{linked_dt}"
                if target_id not in seen_nodes:
                    continue
                edges.append({
                    "id": f"e:{node['id']}-{target_id}-{df.fieldname}",
                    "source": node["id"],
                    "target": target_id,
                    "type": edge_type,
                    "label": df.fieldname,
                })
