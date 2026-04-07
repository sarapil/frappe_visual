# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for Dashboard API v1 endpoints."""

import pytest
import json
import frappe


class TestDashboardAPI:
    """Test suite for frappe_visual.api.v1.dashboard endpoints."""

    def test_save_dashboard_requires_permission(self):
        """save_dashboard should enforce FV Dashboard write permission."""
        from frappe_visual.api.v1.dashboard import save_dashboard
        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                save_dashboard(title="Test")
        finally:
            frappe.set_user("Administrator")

    def test_save_dashboard_creates_new(self):
        """save_dashboard without name= should create a new FV Dashboard."""
        from frappe_visual.api.v1.dashboard import save_dashboard
        result = save_dashboard(
            title="Test Dashboard",
            dashboard_type="Standard",
            layout_config='{"cols":3}',
            widgets='[]',
        )
        assert result["status"] == "success"
        assert result["data"]["title"] == "Test Dashboard"
        # cleanup
        frappe.delete_doc("FV Dashboard", result["data"]["name"], force=True)

    def test_save_dashboard_invalid_json(self):
        """save_dashboard should reject invalid JSON."""
        from frappe_visual.api.v1.dashboard import save_dashboard
        result = save_dashboard(title="Bad", layout_config="{broken")
        assert result["status"] == "error"
        assert result["error_code"] == "INVALID_JSON"

    def test_load_dashboard(self):
        """load_dashboard should return dashboard data."""
        from frappe_visual.api.v1.dashboard import save_dashboard, load_dashboard
        created = save_dashboard(title="Load Test", layout_config='{"x":1}')
        name = created["data"]["name"]
        try:
            result = load_dashboard(name=name)
            assert result["status"] == "success"
            assert result["data"]["title"] == "Load Test"
        finally:
            frappe.delete_doc("FV Dashboard", name, force=True)

    def test_list_dashboards(self):
        """list_dashboards should return a list."""
        from frappe_visual.api.v1.dashboard import list_dashboards
        result = list_dashboards()
        assert result["status"] == "success"
        assert isinstance(result["data"], list)

    def test_delete_dashboard(self):
        """delete_dashboard should remove the record."""
        from frappe_visual.api.v1.dashboard import save_dashboard, delete_dashboard
        created = save_dashboard(title="Delete Me")
        name = created["data"]["name"]
        result = delete_dashboard(name=name)
        assert result["status"] == "success"
        assert not frappe.db.exists("FV Dashboard", name)
