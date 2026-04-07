# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Data Storytelling API v1
==========================================
Server-side persistence and data fetching for DataStorytelling
chapters, scroll-triggered chart reveals, and workspace narratives.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error
import json


# Rate limit constant for heavy endpoints
_HEAVY_RATE_LIMIT = {"limit": 20, "seconds": 60}


@frappe.whitelist()
def save_story(name: str | None = None, title: str = "Untitled Story",
               chapters: str = "[]", workspace: str | None = None) -> dict:
    """
    Save or update a data story (collection of scroll-triggered chapters).

    Args:
        name: Existing story name for updates.
        title: Story title.
        chapters: JSON array of chapter configs.
        workspace: Associated workspace name.
    """
    frappe.has_permission("FV Visual Asset", "write", throw=True)

    try:
        if isinstance(chapters, str):
            json.loads(chapters)
    except json.JSONDecodeError:
        return error("Invalid chapters JSON", "INVALID_JSON")

    if name:
        doc = frappe.get_doc("FV Visual Asset", name)
        doc.title = title
        doc.asset_data = chapters
        doc.asset_type = "Story"
        if workspace:
            doc.reference_doctype = "Workspace"
            doc.reference_name = workspace
        doc.save(ignore_permissions=False)
    else:
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": title,
            "asset_type": "Story",
            "asset_data": chapters,
            "reference_doctype": "Workspace" if workspace else None,
            "reference_name": workspace,
            "owner": frappe.session.user,
        })
        doc.insert(ignore_permissions=False)

    return success(data={"name": doc.name, "title": doc.title})


@frappe.whitelist()
def load_story(name: str) -> dict:
    """Load a data story by name."""
    frappe.has_permission("FV Visual Asset", "read", throw=True)

    doc = frappe.get_doc("FV Visual Asset", name)
    return success(data={
        "name": doc.name,
        "title": doc.title,
        "chapters": json.loads(doc.asset_data or "[]"),
        "workspace": doc.reference_name,
        "owner": doc.owner,
        "modified": str(doc.modified),
    })


@frappe.whitelist()
def get_workspace_stories(workspace: str) -> dict:
    """Get all stories associated with a workspace."""
    frappe.has_permission("FV Visual Asset", "read", throw=True)

    stories = frappe.get_all(
        "FV Visual Asset",
        filters={
            "asset_type": "Story",
            "reference_doctype": "Workspace",
            "reference_name": workspace,
        },
        fields=["name", "title", "owner", "modified"],
        order_by="modified desc",
    )

    return success(data=stories)


@frappe.whitelist()
def get_chart_data(doctype: str, measure_field: str,
                   group_by: str = "creation", period: str = "monthly",
                   filters: str | None = None) -> dict:
    """
    Fetch aggregated chart data for a story chapter.

    Args:
        doctype: Source DocType.
        measure_field: Field to SUM/COUNT (use 'count' for COUNT(*)).
        group_by: Field to group by (date field for time series).
        period: daily, weekly, monthly, yearly.
        filters: JSON filters dict.
    """
    # ── Security: Validate DocType exists (prevents table injection) ──
    if not frappe.db.exists("DocType", doctype):
        return error(f"DocType '{doctype}' does not exist", "INVALID_DOCTYPE")

    frappe.has_permission(doctype, "read", throw=True)

    meta = frappe.get_meta(doctype)
    valid_fields = {df.fieldname for df in meta.fields}
    # Include standard date fields
    valid_fields |= {"creation", "modified", "name", "owner"}

    if isinstance(filters, str) and filters:
        filters = json.loads(filters)
    filters = filters or {}

    period_format = {
        "daily": "%Y-%m-%d",
        "weekly": "%Y-%u",
        "monthly": "%Y-%m",
        "yearly": "%Y",
    }
    date_fmt = period_format.get(period, "%Y-%m")

    # ── Validate group_by field ──
    if group_by not in valid_fields:
        return error(f"Field '{group_by}' not found in {doctype}", "INVALID_FIELD")

    if measure_field == "count":
        select_expr = "COUNT(*)"
    else:
        if measure_field not in valid_fields:
            return error(f"Field '{measure_field}' not found in {doctype}", "INVALID_FIELD")
        safe_measure = measure_field.replace("`", "")
        select_expr = f"SUM(`{safe_measure}`)"

    # ── Build WHERE clause — values always parameterized ──
    where_parts = ["1=1"]
    params = {}
    for i, (field, value) in enumerate(filters.items()):
        if field not in valid_fields:
            return error(f"Filter field '{field}' not found in {doctype}", "INVALID_FIELD")
        param_key = f"f{i}"
        safe_field = field.replace("`", "")
        where_parts.append(f"`{safe_field}` = %({param_key})s")
        params[param_key] = value

    where_clause = " AND ".join(where_parts)

    # Safe table/field names: validated against meta above
    safe_dt = doctype.replace("`", "")
    safe_group = group_by.replace("`", "")

    data = frappe.db.sql("""
        SELECT
            DATE_FORMAT(`{group_by}`, '{fmt}') as period_label,
            {select_expr} as value
        FROM `tab{doctype}`
        WHERE {where_clause}
        GROUP BY period_label
        ORDER BY period_label ASC
        LIMIT 100
    """.format(
        group_by=safe_group,
        fmt=date_fmt,
        select_expr=select_expr,
        doctype=safe_dt,
        where_clause=where_clause,
    ), params, as_dict=True)

    return success(data={
        "labels": [r.period_label for r in data],
        "values": [float(r.value or 0) for r in data],
        "doctype": doctype,
        "measure": measure_field,
        "period": period,
    })
