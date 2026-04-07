# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Workspace Stats API v1
========================================
Efficient batch count and sparkline data for Bento grid tiles,
workspace dashboards, and form dashboard cards.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error
import json


@frappe.whitelist()
def get_batch_counts(doctypes: str) -> dict:
    """
    Get record counts for multiple DocTypes in a single call.
    Much more efficient than N separate get_count calls.

    Args:
        doctypes: JSON array of DocType names, or comma-separated string.
    """
    frappe.has_permission("DocType", "read", throw=True)

    if isinstance(doctypes, str):
        try:
            dt_list = json.loads(doctypes)
        except json.JSONDecodeError:
            dt_list = [d.strip() for d in doctypes.split(",") if d.strip()]
    else:
        dt_list = doctypes

    if not dt_list or len(dt_list) > 50:
        return error("Provide 1-50 DocType names", "INVALID_PARAM")

    counts = {}
    for dt in dt_list:
        try:
            if frappe.has_permission(dt, "read"):
                counts[dt] = frappe.db.count(dt)
            else:
                counts[dt] = None  # No permission
        except Exception:
            counts[dt] = None

    return success(data=counts)


@frappe.whitelist()
def get_sparkline_data(doctype: str, days: int = 7,
                       date_field: str = "creation") -> dict:
    """
    Get daily record counts for sparkline charts.

    Args:
        doctype: The DocType to query.
        days: Number of days to look back (default 7, max 90).
        date_field: Which date field to group by (creation or modified).
    """
    frappe.has_permission(doctype, "read", throw=True)

    days = min(90, max(1, int(days)))
    if date_field not in ("creation", "modified"):
        date_field = "creation"

    # Validate doctype exists (prevents injection via non-existent names)
    if not frappe.db.exists("DocType", doctype):
        return error("Invalid DocType", "INVALID_DOCTYPE")
    # date_field is already validated against whitelist above
    escaped_dt = doctype.replace('`', '')
    data = frappe.db.sql(
        f"SELECT DATE(`{date_field}`) as day, COUNT(*) as count "
        f"FROM `tab{escaped_dt}` "
        f"WHERE `{date_field}` >= DATE_SUB(CURDATE(), INTERVAL %(days)s DAY) "
        f"GROUP BY DATE(`{date_field}`) "
        f"ORDER BY day ASC",
        {"days": days}, as_dict=True,
    )

    # Fill gaps with zeros
    from datetime import date, timedelta
    today = date.today()
    day_map = {str(row.day): row.count for row in data}
    series = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        series.append({
            "date": str(d),
            "count": day_map.get(str(d), 0),
        })

    return success(data={
        "doctype": doctype,
        "series": series,
        "total": sum(r["count"] for r in series),
    })


@frappe.whitelist()
def get_workspace_dashboard(workspace: str | None = None) -> dict:
    """
    Get comprehensive dashboard data for a workspace.
    Returns shortcut DocTypes with counts, recent activity,
    and status distribution for submittable DocTypes.
    """
    frappe.has_permission("Workspace", "read", throw=True)

    result = {"shortcuts": [], "recent_activity": []}

    if workspace:
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

                    # Get status distribution for submittable DocTypes
                    meta = frappe.get_meta(dt)
                    if meta.is_submittable:
                        escaped_dt = dt.replace('`', '')
                        statuses = frappe.db.sql(
                            f"SELECT `docstatus`, COUNT(*) as cnt "
                            f"FROM `tab{escaped_dt}` "
                            f"GROUP BY `docstatus`",
                            as_dict=True,
                        )
                        status_map = {0: "Draft", 1: "Submitted", 2: "Cancelled"}
                        for s in statuses:
                            item["statuses"][status_map.get(s.docstatus, "Other")] = s.cnt
            except Exception:
                pass

            result["shortcuts"].append(item)

    return success(data=result)
