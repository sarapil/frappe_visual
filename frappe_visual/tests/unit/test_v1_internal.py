# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for Internal API endpoints."""

import pytest
import frappe


class TestInternalAPI:
    """Test suite for frappe_visual.api.internal endpoints."""

    def test_rebuild_icon_sprite_requires_admin(self):
        """rebuild_icon_sprite should require FV_manage_settings."""
        from frappe_visual.api.internal import rebuild_icon_sprite
        # Admin should succeed (may throw if icon files missing, but perm check passes)
        result = rebuild_icon_sprite()
        assert result["status"] == "success"

    def test_inject_desktop_icons(self):
        """inject_desktop_icons should succeed for admin."""
        from frappe_visual.api.internal import inject_desktop_icons
        result = inject_desktop_icons()
        assert result["status"] == "success"

    def test_get_system_health(self):
        """get_system_health should return health data."""
        from frappe_visual.api.internal import get_system_health
        result = get_system_health()
        assert result["status"] == "success"
        assert "icons_installed" in result["data"]
        assert "caps_available" in result["data"]
        assert "cache_status" in result["data"]

    def test_clear_visual_cache(self):
        """clear_visual_cache should succeed."""
        from frappe_visual.api.internal import clear_visual_cache
        result = clear_visual_cache()
        assert result["status"] == "success"

    def test_internal_apis_deny_guest(self):
        """All internal APIs should deny guest access."""
        from frappe_visual.api.internal import get_system_health
        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                get_system_health()
        finally:
            frappe.set_user("Administrator")
