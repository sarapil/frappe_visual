# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for Export API v1 endpoints."""

import pytest
import json
import frappe


class TestExportAPI:
    """Test suite for frappe_visual.api.v1.export endpoints."""

    # ── export_doctype_csv ─────────────────────────────────────

    def test_export_doctype_csv_requires_permission(self):
        """Guest users cannot export DocType data."""
        from frappe_visual.api.v1.export import export_doctype_csv

        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                export_doctype_csv(doctype="User")
        finally:
            frappe.set_user("Administrator")

    def test_export_doctype_csv_sets_download_response(self):
        """export_doctype_csv should set response type to download."""
        from frappe_visual.api.v1.export import export_doctype_csv

        export_doctype_csv(
            doctype="DocType",
            fields='["name"]',
            limit=5,
        )

        assert frappe.response.get("type") == "download"
        assert frappe.response.get("filename") == "DocType.csv"
        assert isinstance(frappe.response.get("filecontent"), str)
        assert len(frappe.response["filecontent"]) > 0

    def test_export_doctype_csv_returns_csv_content(self):
        """CSV content should have header row + data rows."""
        from frappe_visual.api.v1.export import export_doctype_csv

        export_doctype_csv(
            doctype="DocType",
            fields='["name"]',
            filters='{"name": "User"}',
            limit=10,
        )

        content = frappe.response.get("filecontent", "")
        lines = content.strip().split("\n")
        assert lines[0] == "name"
        assert "User" in content

    def test_export_doctype_csv_respects_limit(self):
        """Limit parameter should cap the number of rows returned."""
        from frappe_visual.api.v1.export import export_doctype_csv

        export_doctype_csv(
            doctype="DocType",
            fields='["name"]',
            limit=2,
        )

        content = frappe.response.get("filecontent", "")
        lines = [l for l in content.strip().split("\n") if l]
        # 1 header + at most 2 data rows
        assert len(lines) <= 3

    def test_export_doctype_csv_with_string_filters(self):
        """Filters passed as JSON string should be parsed correctly."""
        from frappe_visual.api.v1.export import export_doctype_csv

        export_doctype_csv(
            doctype="DocType",
            fields='["name", "module"]',
            filters='{"module": "Core"}',
            limit=5,
        )

        content = frappe.response.get("filecontent", "")
        assert "name" in content.split("\n")[0]

    def test_export_doctype_csv_with_dict_filters(self):
        """Filters passed as dict should also work."""
        from frappe_visual.api.v1.export import export_doctype_csv

        export_doctype_csv(
            doctype="DocType",
            fields=["name"],
            filters={"module": "Core"},
            limit=5,
        )

        assert frappe.response.get("type") == "download"

    def test_export_doctype_csv_invalid_doctype(self):
        """Non-existent DocType should raise an error."""
        from frappe_visual.api.v1.export import export_doctype_csv

        with pytest.raises(Exception):
            export_doctype_csv(doctype="Nonexistent DocType XYZ")

    # ── export_chart_csv ───────────────────────────────────────

    def test_export_chart_csv_frappe_format(self):
        """Chart data in frappe format (labels + datasets) should export."""
        from frappe_visual.api.v1.export import export_chart_csv

        chart_data = json.dumps({
            "labels": ["Jan", "Feb", "Mar"],
            "datasets": [
                {"name": "Revenue", "values": [100, 200, 300]},
                {"name": "Cost", "values": [80, 150, 250]},
            ]
        })

        export_chart_csv(chart_data=chart_data)

        assert frappe.response.get("type") == "download"
        assert frappe.response.get("filename") == "chart_export.csv"
        content = frappe.response.get("filecontent", "")
        assert "Label" in content
        assert "Revenue" in content
        assert "Jan" in content

    def test_export_chart_csv_echarts_format(self):
        """Chart data in ECharts format (xAxis + series) should export."""
        from frappe_visual.api.v1.export import export_chart_csv

        chart_data = {
            "xAxis": {"data": ["Q1", "Q2", "Q3"]},
            "series": [
                {"name": "Sales", "data": [1000, 2000, 3000]},
            ]
        }

        export_chart_csv(chart_data=chart_data)

        content = frappe.response.get("filecontent", "")
        assert "Q1" in content
        assert "Sales" in content

    def test_export_chart_csv_string_input(self):
        """JSON string input should be parsed correctly."""
        from frappe_visual.api.v1.export import export_chart_csv

        chart_data = '{"labels": ["A", "B"], "datasets": [{"name": "V", "values": [1, 2]}]}'
        export_chart_csv(chart_data=chart_data)

        assert frappe.response.get("type") == "download"

    def test_export_chart_csv_empty_data(self):
        """Empty chart data should return empty CSV content."""
        from frappe_visual.api.v1.export import export_chart_csv

        export_chart_csv(chart_data=json.dumps({}))

        content = frappe.response.get("filecontent", "")
        assert content == ""


class TestExportService:
    """Test suite for ExportService utility methods."""

    def test_to_csv_basic(self):
        """to_csv should convert list of dicts to CSV string."""
        from frappe_visual.services.export_service import ExportService

        data = [
            {"name": "Alice", "score": 95},
            {"name": "Bob", "score": 87},
        ]

        result = ExportService.to_csv(data)
        lines = result.strip().split("\n")
        assert "name" in lines[0]
        assert "score" in lines[0]
        assert "Alice" in lines[1]
        assert "Bob" in lines[2]

    def test_to_csv_empty_list(self):
        """to_csv with empty list should return empty string."""
        from frappe_visual.services.export_service import ExportService

        assert ExportService.to_csv([]) == ""

    def test_to_csv_injection_prevention(self):
        """to_csv should prefix cells starting with = + - @ to prevent injection."""
        from frappe_visual.services.export_service import ExportService

        data = [{"formula": "=SUM(A1:A10)", "cmd": "+cmd"}]
        result = ExportService.to_csv(data)
        assert "'=SUM" in result
        assert "'+cmd" in result

    def test_chart_data_to_csv_empty(self):
        """chart_data_to_csv with empty dict should return empty."""
        from frappe_visual.services.export_service import ExportService

        assert ExportService.chart_data_to_csv({}) == ""

    def test_chart_data_to_csv_frappe_format(self):
        """chart_data_to_csv should handle frappe chart format."""
        from frappe_visual.services.export_service import ExportService

        chart = {
            "labels": ["Jan", "Feb"],
            "datasets": [{"name": "Sales", "values": [10, 20]}]
        }
        result = ExportService.chart_data_to_csv(chart)
        assert "Jan" in result
        assert "Sales" in result
