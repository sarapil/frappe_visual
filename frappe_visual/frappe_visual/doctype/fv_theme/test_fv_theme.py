# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for FV Theme DocType controller and validation logic."""

import json
import frappe
import pytest


class TestFVTheme:
    """Tests for FV Theme DocType."""

    def _make(self, **kwargs) -> "frappe.Document":
        defaults = {
            "doctype": "FV Theme",
            "theme_name": f"test-theme-{frappe.generate_hash(length=6)}",
            "title": "Test Theme",
            "css_variables": json.dumps({"--fv-primary": "#6366f1"}),
            "status": "Active",
        }
        defaults.update(kwargs)
        doc = frappe.get_doc(defaults)
        doc.insert(ignore_permissions=True)
        return doc

    # ── Creation ─────────────────────────────────────────────────

    def test_create_theme(self):
        """Should create a theme with valid data."""
        doc = self._make(title="Creation Test")
        assert frappe.db.exists("FV Theme", doc.name)
        doc.delete(ignore_permissions=True)

    # ── CSS Variables Validation ─────────────────────────────────

    def test_invalid_json_throws(self):
        """Invalid JSON in css_variables should be rejected."""
        with pytest.raises(frappe.exceptions.ValidationError):
            self._make(title="Bad JSON", css_variables="{not valid}")

    def test_non_object_json_throws(self):
        """css_variables must be a JSON object, not array or scalar."""
        with pytest.raises(frappe.exceptions.ValidationError):
            self._make(title="Array JSON", css_variables=json.dumps([1, 2, 3]))

    def test_valid_css_variables_accepted(self):
        """Valid JSON object should be accepted."""
        vars_data = {"--fv-primary": "#10b981", "--fv-radius": "8px"}
        doc = self._make(title="Good Vars", css_variables=json.dumps(vars_data))
        stored = json.loads(doc.css_variables)
        assert stored["--fv-primary"] == "#10b981"
        doc.delete(ignore_permissions=True)

    # ── Default Enforcement ──────────────────────────────────────

    def test_single_default_enforcement(self):
        """Only one theme should be default at a time."""
        doc1 = self._make(title="Default 1", is_default=1)
        doc2 = self._make(title="Default 2", is_default=1)

        # After doc2 sets is_default=1, doc1 should have been cleared
        doc1.reload()
        assert doc1.is_default == 0
        assert doc2.is_default == 1

        doc2.delete(ignore_permissions=True)
        doc1.delete(ignore_permissions=True)

    # ── Permissions ──────────────────────────────────────────────

    def test_guest_cannot_create(self):
        """Guest should not be able to create themes."""
        frappe.set_user("Guest")
        try:
            assert not frappe.has_permission("FV Theme", "create")
        finally:
            frappe.set_user("Administrator")
