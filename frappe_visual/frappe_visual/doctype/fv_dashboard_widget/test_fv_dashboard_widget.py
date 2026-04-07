# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for FV Dashboard Widget child-table DocType."""

import json
import frappe
import pytest


class TestFVDashboardWidget:
    """Tests for FV Dashboard Widget (child table of FV Dashboard)."""

    def _make_dashboard(self, widgets: list | None = None) -> "frappe.Document":
        """Create a parent FV Dashboard with optional widgets."""
        doc = frappe.get_doc({
            "doctype": "FV Dashboard",
            "title": "Widget Test Dashboard",
            "dashboard_layout": "grid-3",
            "is_public": 0,
            "widgets": widgets or [],
        })
        doc.insert(ignore_permissions=True)
        return doc

    def test_widget_inherits_parent(self):
        """Widget child row should reference the parent dashboard."""
        doc = self._make_dashboard(widgets=[{
            "widget_type": "number_card",
            "widget_config": json.dumps({"label": "Total", "value": 100}),
            "width": 4,
            "height": 1,
        }])
        widget = doc.widgets[0]
        assert widget.parent == doc.name
        assert widget.parenttype == "FV Dashboard"
        doc.delete(ignore_permissions=True)

    def test_multiple_widgets(self):
        """Dashboard should support multiple widget rows."""
        widgets_data = [
            {
                "widget_type": "number_card",
                "widget_config": json.dumps({"label": "Revenue"}),
                "width": 4,
                "height": 1,
            },
            {
                "widget_type": "chart",
                "widget_config": json.dumps({"type": "bar"}),
                "width": 8,
                "height": 2,
            },
        ]
        doc = self._make_dashboard(widgets=widgets_data)
        assert len(doc.widgets) == 2
        assert doc.widgets[0].widget_type == "number_card"
        assert doc.widgets[1].widget_type == "chart"
        doc.delete(ignore_permissions=True)

    def test_widget_stores_config_as_json(self):
        """Widget config should persist as a JSON string."""
        config = {"label": "Tasks", "filters": {"status": "Open"}}
        doc = self._make_dashboard(widgets=[{
            "widget_type": "number_card",
            "widget_config": json.dumps(config),
            "width": 6,
            "height": 1,
        }])
        stored = json.loads(doc.widgets[0].widget_config)
        assert stored["label"] == "Tasks"
        assert stored["filters"]["status"] == "Open"
        doc.delete(ignore_permissions=True)
