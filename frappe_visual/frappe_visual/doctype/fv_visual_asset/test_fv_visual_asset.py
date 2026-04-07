# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

import json
import frappe
import pytest


class TestFVVisualAsset:
    """Tests for FV Visual Asset DocType."""

    def test_create_story_asset(self):
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": "Test Story",
            "asset_type": "Story",
            "asset_data": json.dumps({"chapters": []}),
        })
        doc.insert(ignore_permissions=True)
        assert doc.name is not None
        assert doc.asset_type == "Story"
        doc.delete(ignore_permissions=True)

    def test_create_whiteboard_asset(self):
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": "Test Whiteboard",
            "asset_type": "Whiteboard",
            "asset_data": json.dumps({"nodes": [], "edges": []}),
        })
        doc.insert(ignore_permissions=True)
        assert doc.status == "Draft"
        doc.delete(ignore_permissions=True)

    def test_invalid_json_throws(self):
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": "Bad JSON",
            "asset_type": "Dashboard",
            "asset_data": "{invalid json}",
        })
        with pytest.raises(frappe.exceptions.ValidationError):
            doc.insert(ignore_permissions=True)

    def test_reference_requires_name(self):
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": "Ref Test",
            "asset_type": "Scene",
            "reference_doctype": "Workspace",
        })
        with pytest.raises(frappe.exceptions.ValidationError):
            doc.insert(ignore_permissions=True)

    def test_public_flag(self):
        doc = frappe.get_doc({
            "doctype": "FV Visual Asset",
            "title": "Public Asset",
            "asset_type": "Theme",
            "is_public": 1,
        })
        doc.insert(ignore_permissions=True)
        assert doc.is_public == 1
        doc.delete(ignore_permissions=True)
