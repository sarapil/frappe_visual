# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for v1 Storytelling API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase
import json


class TestStorytellingAPI(FrappeTestCase):
    """Tests for data storytelling save/load/chart operations."""

    def test_save_story_requires_permission(self):
        """Guest should not be able to save stories."""
        frappe.set_user("Guest")
        try:
            from frappe_visual.api.v1.storytelling import save_story
            self.assertRaises(frappe.PermissionError, save_story, title="Test")
        finally:
            frappe.set_user("Administrator")

    def test_save_story_invalid_json(self):
        """Invalid chapters JSON should return error."""
        from frappe_visual.api.v1.storytelling import save_story
        result = save_story(title="Test", chapters="not-valid-json")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error_code"], "INVALID_JSON")

    def test_save_story_valid(self):
        """Valid story should save successfully."""
        from frappe_visual.api.v1.storytelling import save_story
        chapters = json.dumps([{"title": "Chapter 1", "chart_type": "bar"}])
        result = save_story(title="Test Story", chapters=chapters)
        self.assertEqual(result["status"], "success")
        self.assertIn("name", result["data"])
        # Cleanup
        if result.get("data", {}).get("name"):
            frappe.delete_doc("FV Visual Asset", result["data"]["name"],
                              ignore_permissions=True, force=True)

    def test_load_story_not_found(self):
        """Loading non-existent story should raise."""
        from frappe_visual.api.v1.storytelling import load_story
        self.assertRaises(Exception, load_story, name="NONEXISTENT-STORY")

    def test_get_chart_data_invalid_doctype(self):
        """Chart data with non-existent DocType should error."""
        from frappe_visual.api.v1.storytelling import get_chart_data
        result = get_chart_data(doctype="NonExistentDocType999", measure_field="count")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error_code"], "INVALID_DOCTYPE")

    def test_get_chart_data_invalid_field(self):
        """Chart data with invalid field should error."""
        from frappe_visual.api.v1.storytelling import get_chart_data
        result = get_chart_data(doctype="User", measure_field="nonexistent_field_xyz")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["error_code"], "INVALID_FIELD")

    def test_get_chart_data_count(self):
        """Chart data with count measure should work."""
        from frappe_visual.api.v1.storytelling import get_chart_data
        result = get_chart_data(doctype="User", measure_field="count")
        self.assertEqual(result["status"], "success")
        self.assertIn("labels", result["data"])
        self.assertIn("values", result["data"])

    def test_get_workspace_stories(self):
        """get_workspace_stories should return a list."""
        from frappe_visual.api.v1.storytelling import get_workspace_stories
        result = get_workspace_stories(workspace="Frappe Visual")
        self.assertEqual(result["status"], "success")
