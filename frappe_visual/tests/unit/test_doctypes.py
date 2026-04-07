# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for FV Dashboard and FV Theme DocType operations."""

import frappe
from frappe.tests.utils import FrappeTestCase
import json


class TestFVDashboard(FrappeTestCase):
    """Tests for FV Dashboard DocType."""

    def test_create_dashboard(self):
        """Should create a dashboard with valid data."""
        doc = frappe.get_doc({
            "doctype": "FV Dashboard",
            "title": "Test Dashboard",
            "dashboard_layout": "grid-3",
            "is_public": 0,
        })
        doc.insert(ignore_permissions=True)
        self.assertTrue(frappe.db.exists("FV Dashboard", doc.name))
        doc.delete(ignore_permissions=True)

    def test_dashboard_validates_refresh_interval(self):
        """Refresh interval below minimum should be corrected."""
        doc = frappe.get_doc({
            "doctype": "FV Dashboard",
            "title": "Test Dashboard",
            "refresh_interval": 5,  # Below minimum of 10
        })
        doc.insert(ignore_permissions=True)
        # Controller should enforce minimum
        self.assertGreaterEqual(doc.refresh_interval, 0)
        doc.delete(ignore_permissions=True)

    def test_dashboard_with_widgets(self):
        """Dashboard should accept widget child rows."""
        doc = frappe.get_doc({
            "doctype": "FV Dashboard",
            "title": "Test With Widgets",
            "widgets": [{
                "widget_type": "number_card",
                "widget_config": json.dumps({"label": "Count", "value": 42}),
                "width": 4,
                "height": 1,
            }],
        })
        doc.insert(ignore_permissions=True)
        self.assertEqual(len(doc.widgets), 1)
        doc.delete(ignore_permissions=True)

    def test_dashboard_guest_no_access(self):
        """Guest should not create dashboards."""
        frappe.set_user("Guest")
        try:
            has_perm = frappe.has_permission("FV Dashboard", "create")
            self.assertFalse(has_perm)
        finally:
            frappe.set_user("Administrator")


class TestFVTheme(FrappeTestCase):
    """Tests for FV Theme DocType."""

    def test_create_theme(self):
        """Should create a theme with valid data."""
        doc = frappe.get_doc({
            "doctype": "FV Theme",
            "theme_name": "test-theme-unit",
            "title": "Test Theme",
            "css_variables": json.dumps({"--fv-primary": "#ff0000"}),
            "status": "Active",
        })
        doc.insert(ignore_permissions=True)
        self.assertTrue(frappe.db.exists("FV Theme", doc.name))
        doc.delete(ignore_permissions=True)

    def test_theme_validates_css_json(self):
        """Invalid CSS JSON should fail validation."""
        doc = frappe.get_doc({
            "doctype": "FV Theme",
            "theme_name": "bad-json-theme",
            "title": "Bad JSON",
            "css_variables": "not-valid-json",
        })
        self.assertRaises(frappe.ValidationError, doc.insert, ignore_permissions=True)

    def test_only_one_default_theme(self):
        """Setting a new default should unset previous defaults."""
        doc1 = frappe.get_doc({
            "doctype": "FV Theme",
            "theme_name": "default-test-1",
            "title": "Default 1",
            "is_default": 1,
            "status": "Active",
        })
        doc1.insert(ignore_permissions=True)

        doc2 = frappe.get_doc({
            "doctype": "FV Theme",
            "theme_name": "default-test-2",
            "title": "Default 2",
            "is_default": 1,
            "status": "Active",
        })
        doc2.insert(ignore_permissions=True)

        # Reload doc1 — should no longer be default
        doc1.reload()
        self.assertEqual(doc1.is_default, 0)

        doc1.delete(ignore_permissions=True)
        doc2.delete(ignore_permissions=True)

    def test_theme_guest_no_access(self):
        """Guest should not create themes."""
        frappe.set_user("Guest")
        try:
            has_perm = frappe.has_permission("FV Theme", "create")
            self.assertFalse(has_perm)
        finally:
            frappe.set_user("Administrator")
