# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for Internal API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase


class TestInternalAPI(FrappeTestCase):
    """Tests for admin-only internal API endpoints."""

    def test_get_system_health(self):
        """System health should return valid data."""
        from frappe_visual.api.internal import get_system_health
        result = get_system_health()
        self.assertEqual(result["status"], "success")
        self.assertIn("data", result)
        self.assertIn("icons_installed", result["data"])

    def test_clear_visual_cache(self):
        """Cache clear should succeed."""
        from frappe_visual.api.internal import clear_visual_cache
        result = clear_visual_cache()
        self.assertEqual(result["status"], "success")

    def test_inject_desktop_icons(self):
        """Desktop icon injection should succeed."""
        from frappe_visual.api.internal import inject_desktop_icons
        result = inject_desktop_icons()
        self.assertEqual(result["status"], "success")

    def test_rebuild_icon_sprite(self):
        """Icon sprite rebuild should succeed."""
        from frappe_visual.api.internal import rebuild_icon_sprite
        result = rebuild_icon_sprite()
        self.assertEqual(result["status"], "success")

    def test_guest_cannot_access_internal(self):
        """Guest should not access internal APIs."""
        frappe.set_user("Guest")
        try:
            from frappe_visual.api.internal import get_system_health
            self.assertRaises(
                (frappe.PermissionError, Exception),
                get_system_health,
            )
        finally:
            frappe.set_user("Administrator")
