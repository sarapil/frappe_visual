# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for FV Dashboard DocType controller and validation logic."""

import json
import frappe
import pytest


class TestFVDashboard:
    """Tests for FV Dashboard DocType."""

    def _make(self, **kwargs) -> "frappe.Document":
        defaults = {
            "doctype": "FV Dashboard",
            "title": "Test Dashboard",
            "dashboard_layout": "grid-3",
            "is_public": 0,
        }
        defaults.update(kwargs)
        doc = frappe.get_doc(defaults)
        doc.insert(ignore_permissions=True)
        return doc

    # ── Creation ─────────────────────────────────────────────────

    def test_create_dashboard(self):
        """Should create a dashboard with valid data."""
        doc = self._make(title="Create Test")
        assert frappe.db.exists("FV Dashboard", doc.name)
        doc.delete(ignore_permissions=True)

    def test_dashboard_with_widgets(self):
        """Dashboard should accept widget child rows."""
        doc = self._make(
            title="Widget Dashboard",
            widgets=[{
                "widget_type": "number_card",
                "widget_config": json.dumps({"label": "Count", "value": 42}),
                "width": 4,
                "height": 1,
            }],
        )
        assert len(doc.widgets) == 1
        assert doc.widgets[0].widget_type == "number_card"
        doc.delete(ignore_permissions=True)

    # ── Validation ───────────────────────────────────────────────

    def test_negative_refresh_interval_throws(self):
        """Negative refresh interval should be rejected."""
        with pytest.raises(frappe.exceptions.ValidationError):
            self._make(title="Neg Interval", refresh_interval=-5)

    def test_invalid_layout_config_throws(self):
        """Invalid JSON in layout_config should be rejected."""
        with pytest.raises(frappe.exceptions.ValidationError):
            self._make(title="Bad Config", layout_config="{not valid json}")

    def test_valid_layout_config_accepted(self):
        """Valid JSON in layout_config should be accepted."""
        cfg = json.dumps({"columns": 3, "gap": 16})
        doc = self._make(title="Good Config", layout_config=cfg)
        assert doc.layout_config == cfg
        doc.delete(ignore_permissions=True)

    # ── Permissions ──────────────────────────────────────────────

    def test_guest_cannot_create(self):
        """Guest should not be able to create dashboards."""
        frappe.set_user("Guest")
        try:
            assert not frappe.has_permission("FV Dashboard", "create")
        finally:
            frappe.set_user("Administrator")
