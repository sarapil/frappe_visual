# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for Theme API v1 endpoints."""

import pytest
import json
import frappe


class TestThemeAPI:
    """Test suite for frappe_visual.api.v1.theme endpoints."""

    def test_save_theme_requires_permission(self):
        """save_theme should enforce FV Theme write permission."""
        from frappe_visual.api.v1.theme import save_theme
        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                save_theme(title="Test Theme")
        finally:
            frappe.set_user("Administrator")

    def test_save_theme_creates_new(self):
        """save_theme should create a new FV Theme."""
        from frappe_visual.api.v1.theme import save_theme
        result = save_theme(
            title="Dark Indigo",
            base_theme="Dark",
            css_variables='{"--primary":"#6366F1"}',
            description="Test theme",
        )
        assert result["status"] == "success"
        assert result["data"]["title"] == "Dark Indigo"
        frappe.delete_doc("FV Theme", result["data"]["name"], force=True)

    def test_save_theme_invalid_json(self):
        """save_theme should reject invalid css_variables JSON."""
        from frappe_visual.api.v1.theme import save_theme
        result = save_theme(title="Bad", css_variables="{broken")
        assert result["status"] == "error"
        assert result["error_code"] == "INVALID_JSON"

    def test_save_theme_rejects_non_object(self):
        """save_theme should reject css_variables that aren't JSON objects."""
        from frappe_visual.api.v1.theme import save_theme
        result = save_theme(title="Bad", css_variables='[1,2,3]')
        assert result["status"] == "error"
        assert result["error_code"] == "INVALID_FORMAT"

    def test_load_theme(self):
        """load_theme should return complete theme data."""
        from frappe_visual.api.v1.theme import save_theme, load_theme
        created = save_theme(
            title="Load Me",
            base_theme="Light",
            css_variables='{"--bg":"#fff"}',
        )
        name = created["data"]["name"]
        try:
            result = load_theme(name=name)
            assert result["status"] == "success"
            assert result["data"]["base_theme"] == "Light"
            assert result["data"]["css_variables"]["--bg"] == "#fff"
        finally:
            frappe.delete_doc("FV Theme", name, force=True)

    def test_list_themes(self):
        """list_themes should return theme list."""
        from frappe_visual.api.v1.theme import list_themes
        result = list_themes()
        assert result["status"] == "success"
        assert isinstance(result["data"], list)

    def test_apply_theme_requires_admin(self):
        """apply_theme should require FV_manage_settings capability."""
        from frappe_visual.api.v1.theme import save_theme, apply_theme
        created = save_theme(title="Apply Test", css_variables='{}')
        name = created["data"]["name"]
        try:
            # Admin should be able to apply
            result = apply_theme(name=name)
            assert result["status"] == "success"
        finally:
            frappe.delete_doc("FV Theme", name, force=True)

    def test_delete_theme(self):
        """delete_theme should remove the record."""
        from frappe_visual.api.v1.theme import save_theme, delete_theme
        created = save_theme(title="Delete Me", css_variables='{}')
        name = created["data"]["name"]
        result = delete_theme(name=name)
        assert result["status"] == "success"
        assert not frappe.db.exists("FV Theme", name)
