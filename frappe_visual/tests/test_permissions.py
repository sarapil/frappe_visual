# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Permission Tests
Role-based access control and CAPS capability tests.
"""

import frappe
from frappe.tests import IntegrationTestCase


class TestFVPermissions(IntegrationTestCase):
    """Permission and CAPS capability tests for Frappe Visual."""

    def test_guest_cannot_access_reverse_translation(self):
        """Guest users cannot call the reverse translation API."""
        frappe.set_user("Guest")
        try:
            from frappe_visual.api import get_reverse_translation
            self.assertRaises(frappe.PermissionError, get_reverse_translation, "اختبار")
        finally:
            frappe.set_user("Administrator")

    def test_guest_cannot_access_app_map(self):
        """Guest users cannot call the app map API."""
        frappe.set_user("Guest")
        try:
            from frappe_visual.api import get_app_map
            self.assertRaises(frappe.PermissionError, get_app_map, "frappe")
        finally:
            frappe.set_user("Administrator")

    def test_admin_can_access_quick_stats(self):
        """System Manager / Administrator can call get_quick_stats."""
        frappe.set_user("Administrator")
        from frappe_visual.api import get_quick_stats
        result = get_quick_stats()
        self.assertIsInstance(result, dict)
        self.assertIn("doctypes", result)
        self.assertIn("modules", result)

    def test_admin_can_access_kanban_data(self):
        """Administrator can call get_kanban_data for a valid DocType."""
        frappe.set_user("Administrator")
        from frappe_visual.api import get_kanban_data
        # DocType "ToDo" has a status Select field
        result = get_kanban_data("ToDo", "status")
        self.assertIn("cards", result)
        self.assertIn("columns", result)

    def test_caps_gate_admin_passes(self):
        """Administrator always passes CAPS check_capability."""
        from frappe_visual.caps_integration.gate import check_capability
        self.assertTrue(check_capability("FV_view_visual_hub", user="Administrator"))
        self.assertTrue(check_capability("FV_manage_settings", user="Administrator"))

    def test_caps_gate_returns_bool(self):
        """check_capability always returns a boolean."""
        from frappe_visual.caps_integration.gate import check_capability
        result = check_capability("FV_view_visual_hub")
        self.assertIsInstance(result, bool)

    def test_caps_require_capability_decorator(self):
        """require_capability decorator should be a callable wrapper."""
        from frappe_visual.caps_integration.gate import require_capability

        @require_capability("FV_view_visual_hub")
        def sample_function():
            return "ok"

        # Administrator should pass
        frappe.set_user("Administrator")
        self.assertEqual(sample_function(), "ok")

    def test_exception_http_status_codes(self):
        """All custom exceptions should have http_status_code attribute."""
        from frappe_visual.exceptions import (
            FrappeVisualError, ValidationError, NotFoundError,
            PermissionError, ConfigurationError, IntegrationError,
            RateLimitError,
        )
        self.assertEqual(FrappeVisualError.http_status_code, 500)
        self.assertEqual(ValidationError.http_status_code, 400)
        self.assertEqual(NotFoundError.http_status_code, 404)
        self.assertEqual(PermissionError.http_status_code, 403)
        self.assertEqual(ConfigurationError.http_status_code, 500)
        self.assertEqual(IntegrationError.http_status_code, 502)
        self.assertEqual(RateLimitError.http_status_code, 429)

    def test_exception_error_codes(self):
        """All custom exceptions should have error_code attribute."""
        from frappe_visual.exceptions import (
            FrappeVisualError, ValidationError, NotFoundError,
            PermissionError, ConfigurationError, IntegrationError,
            RateLimitError,
        )
        self.assertTrue(FrappeVisualError.error_code.startswith("FV_"))
        self.assertTrue(ValidationError.error_code.startswith("FV_"))
        self.assertTrue(NotFoundError.error_code.startswith("FV_"))
        self.assertTrue(PermissionError.error_code.startswith("FV_"))
        self.assertTrue(ConfigurationError.error_code.startswith("FV_"))
        self.assertTrue(IntegrationError.error_code.startswith("FV_"))
        self.assertTrue(RateLimitError.error_code.startswith("FV_"))

    def test_has_visual_access_admin(self):
        """has_visual_access should return True for Administrator."""
        frappe.set_user("Administrator")
        from frappe_visual.api import has_visual_access
        self.assertTrue(has_visual_access())
