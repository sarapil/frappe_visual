# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for Scene Configuration API v1 endpoints."""

import pytest
import json
import frappe


class TestSceneAPI:
    """Test suite for frappe_visual.api.v1.scene endpoints."""

    def test_save_scene_requires_permission(self):
        """save_scene should enforce FV Visual Asset write permission."""
        from frappe_visual.api.v1.scene import save_scene
        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                save_scene(title="Test Scene")
        finally:
            frappe.set_user("Administrator")

    def test_save_scene_creates_asset(self):
        """save_scene should create an FV Visual Asset of type Scene."""
        from frappe_visual.api.v1.scene import save_scene
        result = save_scene(
            title="Office Scene",
            preset="office",
            theme="warm",
            frames='[{"label":"Revenue","value":"$100K"}]',
        )
        assert result["status"] == "success"
        assert result["data"]["title"] == "Office Scene"
        # cleanup
        frappe.delete_doc("FV Visual Asset", result["data"]["name"], force=True)

    def test_load_scene_returns_config(self):
        """load_scene should return full scene configuration."""
        from frappe_visual.api.v1.scene import save_scene, load_scene
        created = save_scene(title="Load Test", preset="library", theme="cool")
        name = created["data"]["name"]
        try:
            result = load_scene(name=name)
            assert result["status"] == "success"
            assert result["data"]["preset"] == "library"
            assert result["data"]["theme"] == "cool"
        finally:
            frappe.delete_doc("FV Visual Asset", name, force=True)

    def test_load_scene_wrong_type(self):
        """load_scene should reject non-Scene assets."""
        # Create a Story asset
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": "Not A Scene",
            "asset_type": "Story",
            "asset_data": "{}",
        }).insert(ignore_permissions=True)
        try:
            from frappe_visual.api.v1.scene import load_scene
            result = load_scene(name=doc.name)
            assert result["status"] == "error"
            assert result["error_code"] == "WRONG_ASSET_TYPE"
        finally:
            frappe.delete_doc("FV Visual Asset", doc.name, force=True)

    def test_list_scenes(self):
        """list_scenes should only return Scene type assets."""
        from frappe_visual.api.v1.scene import save_scene, list_scenes
        created = save_scene(title="Listed Scene", preset="cafe")
        try:
            result = list_scenes()
            assert result["status"] == "success"
            assert isinstance(result["data"], list)
        finally:
            frappe.delete_doc("FV Visual Asset", created["data"]["name"], force=True)
