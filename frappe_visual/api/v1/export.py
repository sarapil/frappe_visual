# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — v1 Export API
Data export endpoints for charts and tables.
"""

import frappe
from frappe import _
import json


@frappe.whitelist()
def export_doctype_csv(doctype, fields=None, filters=None, order_by="creation desc", limit=1000):
    """Export DocType records as CSV."""
    frappe.has_permission(doctype, "read", throw=True)

    if isinstance(fields, str):
        fields = json.loads(fields)
    if isinstance(filters, str):
        filters = json.loads(filters)

    from frappe_visual.services.export_service import ExportService
    csv_content = ExportService.doctype_to_csv(
        doctype,
        fields=fields,
        filters=filters,
        order_by=order_by,
        limit=int(limit),
    )

    frappe.response["type"] = "download"
    frappe.response["filename"] = f"{doctype}.csv"
    frappe.response["filecontent"] = csv_content


@frappe.whitelist()
def export_chart_csv(chart_data):
    """Export chart data as CSV."""
    if isinstance(chart_data, str):
        chart_data = json.loads(chart_data)

    from frappe_visual.services.export_service import ExportService
    csv_content = ExportService.chart_data_to_csv(chart_data)

    frappe.response["type"] = "download"
    frappe.response["filename"] = "chart_export.csv"
    frappe.response["filecontent"] = csv_content
