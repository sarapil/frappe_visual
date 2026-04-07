# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Data Export Service
CSV and Excel export for charts, tables, and dashboard widgets.
"""

import csv
import io

import frappe
from frappe import _


class ExportService:
    """Export visual data to CSV / Excel formats."""

    @staticmethod
    def to_csv(data: list[dict], filename: str = "export.csv") -> str:
        """
        Convert a list of dicts to a CSV string and return as downloadable.

        Args:
            data: List of row dicts (keys become headers).
            filename: Suggested download filename.

        Returns:
            CSV content as string.
        """
        if not data:
            return ""

        output = io.StringIO()
        headers = list(data[0].keys())

        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        for row in data:
            sanitized = {}
            for k, v in row.items():
                cell = str(v) if v is not None else ""
                # Prevent CSV injection
                if cell and cell[0] in ("=", "+", "-", "@", "\t", "\r"):
                    cell = "'" + cell
                sanitized[k] = cell
            writer.writerow(sanitized)

        return output.getvalue()

    @staticmethod
    def doctype_to_csv(
        doctype: str,
        fields: list[str] | None = None,
        filters: dict | None = None,
        order_by: str = "creation desc",
        limit: int = 1000,
    ) -> str:
        """
        Export DocType records to CSV.

        Args:
            doctype: DocType name.
            fields: Fields to include (defaults to all data fields).
            filters: Filter dict.
            order_by: Sort order.
            limit: Max rows.

        Returns:
            CSV content as string.
        """
        frappe.has_permission(doctype, "read", throw=True)

        meta = frappe.get_meta(doctype)
        if not fields:
            fields = ["name"] + [
                df.fieldname for df in meta.fields
                if df.fieldtype not in ("Section Break", "Column Break", "Tab Break",
                                        "HTML", "Fold", "Heading")
            ]

        data = frappe.get_all(
            doctype,
            fields=fields,
            filters=filters or {},
            order_by=order_by,
            limit_page_length=limit,
        )

        return ExportService.to_csv(data, filename=f"{doctype}.csv")

    @staticmethod
    def chart_data_to_csv(chart_data: dict) -> str:
        """
        Convert ECharts-style chart data to CSV.

        Supports:
            - {labels: [...], datasets: [{values: [...]}]}
            - {xAxis: {data: [...]}, series: [{data: [...]}]}

        Args:
            chart_data: Chart config with labels + data.

        Returns:
            CSV content as string.
        """
        rows = []

        # frappe chart format
        if "labels" in chart_data and "datasets" in chart_data:
            labels = chart_data["labels"]
            datasets = chart_data["datasets"]
            header = {"Label": "Label"}
            for ds in datasets:
                header[ds.get("name", "Value")] = ds.get("name", "Value")

            for i, label in enumerate(labels):
                row = {"Label": label}
                for ds in datasets:
                    values = ds.get("values", [])
                    row[ds.get("name", "Value")] = values[i] if i < len(values) else ""
                rows.append(row)

        # ECharts format
        elif "xAxis" in chart_data and "series" in chart_data:
            x_data = chart_data.get("xAxis", {}).get("data", [])
            series = chart_data.get("series", [])

            for i, x_val in enumerate(x_data):
                row = {"X": x_val}
                for s in series:
                    s_data = s.get("data", [])
                    row[s.get("name", "Series")] = s_data[i] if i < len(s_data) else ""
                rows.append(row)

        return ExportService.to_csv(rows)
