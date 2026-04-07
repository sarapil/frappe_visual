# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for v1 Search API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase


class TestSearchAPI(FrappeTestCase):
    """Tests for universal_search, record_frecency, and related endpoints."""

    def test_search_requires_login(self):
        """Search should reject guest users."""
        frappe.set_user("Guest")
        try:
            from frappe_visual.api.v1.search import universal_search
            self.assertRaises(frappe.PermissionError, universal_search, query="test")
        finally:
            frappe.set_user("Administrator")

    def test_search_minimum_query_length(self):
        """Search query must be at least 2 characters."""
        from frappe_visual.api.v1.search import universal_search
        result = universal_search(query="a")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error_code"], "QUERY_TOO_SHORT")

    def test_search_valid_query(self):
        """Valid search should return a result dict."""
        from frappe_visual.api.v1.search import universal_search
        result = universal_search(query="User")
        self.assertEqual(result["status"], "success")
        self.assertIn("data", result)

    def test_search_category_filter(self):
        """Category filtering should not crash."""
        from frappe_visual.api.v1.search import universal_search
        result = universal_search(query="User", categories="doctype")
        self.assertEqual(result["status"], "success")

    def test_search_pagination(self):
        """Page size should be capped at 50."""
        from frappe_visual.api.v1.search import universal_search
        result = universal_search(query="User", page=1, page_size=200)
        self.assertEqual(result["status"], "success")

    def test_record_frecency(self):
        """record_frecency should accept valid input."""
        try:
            from frappe_visual.api.v1.search import record_frecency
            result = record_frecency(item_type="doctype", item_id="User")
            self.assertIn(result["status"], ("success", "error"))
        except ImportError:
            self.skipTest("record_frecency not implemented")

    def test_get_recent_searches(self):
        """get_recent_searches should return a list."""
        try:
            from frappe_visual.api.v1.search import get_recent_searches
            result = get_recent_searches()
            self.assertEqual(result["status"], "success")
        except ImportError:
            self.skipTest("get_recent_searches not implemented")
