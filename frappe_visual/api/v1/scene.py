# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Scene Configuration API v1
Persist/retrieve Scene Engine configurations (presets, frames, data binder rules).
"""

import json
import frappe
from frappe import _
from frappe_visual.api.response import success, error


@frappe.whitelist()
def save_scene(
    name: str | None = None,
    title: str = "Untitled Scene",
    workspace: str | None = None,
    preset: str = "office",
    theme: str = "warm",
    frames: str = "[]",
    documents: str = "[]",
    books: str = "[]",
    data_binder_rules: str = "[]",
    refresh_interval: int = 30000,
) -> dict:
    """Save or update a scene configuration as FV Visual Asset."""
    frappe.has_permission("FV Visual Asset", "write", throw=True)

    config = {
        "preset": preset,
        "theme": theme,
        "frames": json.loads(frames) if isinstance(frames, str) else frames,
        "documents": json.loads(documents) if isinstance(documents, str) else documents,
        "books": json.loads(books) if isinstance(books, str) else books,
        "data_binder_rules": json.loads(data_binder_rules) if isinstance(data_binder_rules, str) else data_binder_rules,
        "refresh_interval": int(refresh_interval),
    }

    if name:
        doc = frappe.get_doc("FV Visual Asset", name)
        doc.title = title
        doc.asset_data = json.dumps(config)
        if workspace:
            doc.reference_doctype = "Workspace"
            doc.reference_name = workspace
        doc.save(ignore_permissions=False)
    else:
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": title,
            "asset_type": "Scene",
            "asset_data": json.dumps(config),
            "reference_doctype": "Workspace" if workspace else None,
            "reference_name": workspace,
            "owner": frappe.session.user,
        })
        doc.insert(ignore_permissions=False)

    return success(data={"name": doc.name, "title": doc.title})


@frappe.whitelist()
def load_scene(name: str) -> dict:
    """Load a scene configuration."""
    frappe.has_permission("FV Visual Asset", "read", throw=True)

    doc = frappe.get_doc("FV Visual Asset", name)
    if doc.asset_type != "Scene":
        return error("Asset is not a Scene", "WRONG_ASSET_TYPE")

    config = json.loads(doc.asset_data or "{}")
    return success(data={
        "name": doc.name,
        "title": doc.title,
        "workspace": doc.reference_name,
        "preset": config.get("preset", "office"),
        "theme": config.get("theme", "warm"),
        "frames": config.get("frames", []),
        "documents": config.get("documents", []),
        "books": config.get("books", []),
        "data_binder_rules": config.get("data_binder_rules", []),
        "refresh_interval": config.get("refresh_interval", 30000),
        "owner": doc.owner,
        "modified": str(doc.modified),
    })


@frappe.whitelist()
def list_scenes(workspace: str | None = None) -> dict:
    """List all scene configurations."""
    frappe.has_permission("FV Visual Asset", "read", throw=True)

    filters = {"asset_type": "Scene"}
    if workspace:
        filters["reference_doctype"] = "Workspace"
        filters["reference_name"] = workspace

    scenes = frappe.get_all(
        "FV Visual Asset",
        filters=filters,
        fields=["name", "title", "reference_name as workspace", "owner", "modified"],
        order_by="modified desc",
    )

    return success(data=scenes)
