# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Whiteboard API v1
==================================
Server-side save/load for whiteboard canvases.
Stores drawings as JSON in FV Visual Asset DocType.
Supports linking whiteboard elements to real documents.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error, paginated
import json


@frappe.whitelist()
def save_whiteboard(name: str | None = None, title: str = "Untitled",
                    canvas_data: str = "{}",
                    linked_documents: str | None = None) -> dict:
    """
    Save or update a whiteboard canvas.

    Args:
        name: Existing whiteboard name (for updates). None = create new.
        title: Whiteboard title.
        canvas_data: JSON string of canvas state (shapes, connections, etc).
        linked_documents: JSON array of {doctype, docname, element_id} links.
    """
    frappe.has_permission("FV Visual Asset", "write", throw=True)

    # Validate JSON
    try:
        if isinstance(canvas_data, str):
            json.loads(canvas_data)
    except json.JSONDecodeError:
        return error("Invalid canvas_data JSON", "INVALID_JSON")

    if name:
        # Update existing
        doc = frappe.get_doc("FV Visual Asset", name)
        doc.title = title
        doc.asset_data = canvas_data
        doc.asset_type = "Whiteboard"
        if linked_documents:
            doc.linked_documents = linked_documents
        doc.save(ignore_permissions=False)
    else:
        # Create new
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": title,
            "asset_type": "Whiteboard",
            "asset_data": canvas_data,
            "linked_documents": linked_documents or "[]",
            "owner": frappe.session.user,
        })
        doc.insert(ignore_permissions=False)

    return success(data={"name": doc.name, "title": doc.title})


@frappe.whitelist()
def load_whiteboard(name: str) -> dict:
    """Load a whiteboard canvas by name."""
    frappe.has_permission("FV Visual Asset", "read", throw=True)

    doc = frappe.get_doc("FV Visual Asset", name)

    return success(data={
        "name": doc.name,
        "title": doc.title,
        "canvas_data": json.loads(doc.asset_data or "{}"),
        "linked_documents": json.loads(doc.linked_documents or "[]"),
        "owner": doc.owner,
        "modified": str(doc.modified),
    })


@frappe.whitelist()
def list_whiteboards(page: int = 1, page_size: int = 20) -> dict:
    """List all whiteboards the user has access to."""
    frappe.has_permission("FV Visual Asset", "read", throw=True)

    page = max(1, int(page))
    page_size = min(50, max(1, int(page_size)))

    total = frappe.db.count("FV Visual Asset", {"asset_type": "Whiteboard"})

    items = frappe.get_all(
        "FV Visual Asset",
        filters={"asset_type": "Whiteboard"},
        fields=["name", "title", "owner", "creation", "modified"],
        order_by="modified desc",
        start=(page - 1) * page_size,
        limit_page_length=page_size,
    )

    return paginated(items, total, page, page_size)


@frappe.whitelist()
def delete_whiteboard(name: str) -> dict:
    """Delete a whiteboard canvas."""
    frappe.has_permission("FV Visual Asset", "delete", throw=True)
    frappe.delete_doc("FV Visual Asset", name, ignore_permissions=False)
    return success(message=f"Whiteboard '{name}' deleted")


@frappe.whitelist()
def link_element_to_document(whiteboard_name: str, element_id: str,
                              doctype: str, docname: str) -> dict:
    """
    Link a whiteboard element (sticky note, shape, etc.) to a real Frappe document.
    """
    frappe.has_permission("FV Visual Asset", "write", throw=True)
    frappe.has_permission(doctype, "read", throw=True)

    doc = frappe.get_doc("FV Visual Asset", whiteboard_name)
    links = json.loads(doc.linked_documents or "[]")

    # Remove existing link for this element
    links = [l for l in links if l.get("element_id") != element_id]

    # Add new link
    links.append({
        "element_id": element_id,
        "doctype": doctype,
        "docname": docname,
    })

    doc.linked_documents = json.dumps(links)
    doc.save(ignore_permissions=False)

    return success(data={"links": links})
