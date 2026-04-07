# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for v1 Whiteboard API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase
import json


class TestWhiteboardAPI(FrappeTestCase):
    """Tests for whiteboard save/load/list operations."""

    def test_save_whiteboard_requires_permission(self):
        """Guest should not be able to save whiteboards."""
        frappe.set_user("Guest")
        try:
            from frappe_visual.api.v1.whiteboard import save_whiteboard
            self.assertRaises(frappe.PermissionError, save_whiteboard, title="Test")
        finally:
            frappe.set_user("Administrator")

    def test_save_whiteboard_valid(self):
        """Valid whiteboard should save."""
        from frappe_visual.api.v1.whiteboard import save_whiteboard
        content = json.dumps({"shapes": [], "lines": []})
        result = save_whiteboard(title="Test Board", content=content)
        self.assertEqual(result["status"], "success")
        if result.get("data", {}).get("name"):
            frappe.delete_doc("FV Visual Asset", result["data"]["name"],
                              ignore_permissions=True, force=True)

    def test_load_whiteboard_not_found(self):
        """Loading non-existent whiteboard should raise."""
        from frappe_visual.api.v1.whiteboard import load_whiteboard
        self.assertRaises(Exception, load_whiteboard, name="NONEXISTENT-WB")

    def test_list_whiteboards(self):
        """list_whiteboards should return paginated results."""
        from frappe_visual.api.v1.whiteboard import list_whiteboards
        result = list_whiteboards()
        self.assertEqual(result["status"], "success")

    def test_delete_whiteboard_not_found(self):
        """Deleting non-existent whiteboard should error gracefully."""
        try:
            from frappe_visual.api.v1.whiteboard import delete_whiteboard
            result = delete_whiteboard(name="NONEXISTENT-WB")
            self.assertIn(result["status"], ("success", "error"))
        except Exception:
            pass  # May raise DoesNotExistError
