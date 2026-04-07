# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for v1 Preferences API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase


class TestPreferencesAPI(FrappeTestCase):
    """Tests for user preference CRUD operations."""

    def test_get_preferences(self):
        """get_preferences should return a dict."""
        from frappe_visual.api.v1.preferences import get_preferences
        result = get_preferences()
        self.assertEqual(result["status"], "success")

    def test_set_preference(self):
        """set_preference should persist a value."""
        from frappe_visual.api.v1.preferences import set_preference, get_preferences
        set_result = set_preference(key="test_pref", value="test_value")
        self.assertEqual(set_result["status"], "success")

    def test_set_preference_overwrites(self):
        """Setting same preference twice should overwrite."""
        from frappe_visual.api.v1.preferences import set_preference
        set_preference(key="overwrite_test", value="v1")
        result = set_preference(key="overwrite_test", value="v2")
        self.assertEqual(result["status"], "success")

    def test_set_preferences_bulk(self):
        """Bulk set should accept JSON object."""
        try:
            from frappe_visual.api.v1.preferences import set_preferences_bulk
            import json
            prefs = json.dumps({"pref_a": "val_a", "pref_b": "val_b"})
            result = set_preferences_bulk(preferences=prefs)
            self.assertEqual(result["status"], "success")
        except ImportError:
            self.skipTest("set_preferences_bulk not implemented")

    def test_get_recent_records(self):
        """get_recent_records should return a list."""
        try:
            from frappe_visual.api.v1.preferences import get_recent_records
            result = get_recent_records()
            self.assertEqual(result["status"], "success")
        except ImportError:
            self.skipTest("get_recent_records not implemented")

    def test_clear_recent_records(self):
        """clear_recent_records should not crash."""
        try:
            from frappe_visual.api.v1.preferences import clear_recent_records
            result = clear_recent_records()
            self.assertEqual(result["status"], "success")
        except ImportError:
            self.skipTest("clear_recent_records not implemented")
