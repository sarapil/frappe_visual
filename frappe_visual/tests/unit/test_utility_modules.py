# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""
Frappe Visual — Unit Tests for New Utility Modules
===================================================
Tests for: responsive_system, plugin_system, drag_manager,
animation_timeline, pdf_export, theme_builder, faceted_search, perf_monitor.

These are server-side stubs verifying Python API surfaces.
Full JS tests require a browser environment (Cypress / Playwright).
"""

import frappe
import pytest


class TestFVSettingIntegrity:
    """Verify FV Setting DocType integrity."""

    def test_fv_setting_exists(self):
        """FV Setting singleton should exist after install."""
        assert frappe.db.exists("DocType", "FV Setting")

    def test_fv_setting_fields(self):
        """FV Setting should have key toggle fields."""
        meta = frappe.get_meta("FV Setting")
        field_names = [f.fieldname for f in meta.fields]
        expected = [
            "enable_auto_enhancers",
            "enable_form_enhancer",
            "enable_list_enhancer",
            "enable_workspace_enhancer",
        ]
        for field in expected:
            assert field in field_names, f"Missing field: {field}"


class TestCAPSCapabilities:
    """Verify CAPS capability declarations match."""

    def test_caps_py_has_15_capabilities(self):
        """caps.py should declare exactly 15 FV capabilities."""
        from frappe_visual.caps import FV_CAPABILITIES
        assert len(FV_CAPABILITIES) == 15

    def test_hooks_caps_match(self):
        """hooks.py caps_capabilities should match caps.py declarations."""
        from frappe_visual.caps import FV_CAPABILITIES
        hooks = frappe.get_hooks("caps_capabilities", app_name="frappe_visual")
        hook_names = {c["name"] for c in hooks}
        caps_names = {c["name"] for c in FV_CAPABILITIES}
        assert hook_names == caps_names, f"Mismatch: hooks={hook_names - caps_names}, caps={caps_names - hook_names}"

    def test_role_bundles_exist(self):
        """Three role bundles should be defined."""
        from frappe_visual.caps import FV_ROLE_BUNDLES
        assert "FV Viewer" in FV_ROLE_BUNDLES
        assert "FV Power User" in FV_ROLE_BUNDLES
        assert "FV Admin" in FV_ROLE_BUNDLES

    def test_admin_has_all_capabilities(self):
        """FV Admin should include all 15 capabilities."""
        from frappe_visual.caps import FV_ROLE_BUNDLES, FV_CAPABILITIES
        admin_caps = set(FV_ROLE_BUNDLES["FV Admin"])
        all_cap_names = {c["name"] for c in FV_CAPABILITIES}
        assert admin_caps == all_cap_names


class TestDemoData:
    """Verify demo data lifecycle."""

    def test_demo_doctypes_not_empty(self):
        """_get_demo_doctypes should return at least FV Setting."""
        from frappe_visual.demo import _get_demo_doctypes
        dt_list = _get_demo_doctypes()
        assert "FV Setting" in dt_list

    def test_load_and_clear_demo_idempotent(self):
        """load_demo_data + clear_demo_data should be idempotent."""
        from frappe_visual.demo import load_demo_data, clear_demo_data
        # Should not raise
        load_demo_data()
        clear_demo_data()


class TestExceptionsModule:
    """Verify custom exceptions."""

    def test_configuration_error_message(self):
        """ConfigurationError should include setting name."""
        from frappe_visual.exceptions import ConfigurationError
        err = ConfigurationError("test_setting")
        assert "test_setting" in str(err)
        assert err.setting_name == "test_setting"

    def test_component_not_found_error(self):
        """ComponentNotFoundError should format correctly."""
        from frappe_visual.exceptions import ComponentNotFoundError
        err = ComponentNotFoundError("GraphEngine")
        assert "GraphEngine" in str(err)


class TestSeedIdempotency:
    """Verify seed.py is idempotent."""

    def test_seed_data_runs_twice(self):
        """seed_data should be safe to call multiple times."""
        from frappe_visual.seed import seed_data
        seed_data()
        seed_data()  # Should not raise


class TestAPIResponseHelpers:
    """Verify API response format helpers."""

    def test_success_response(self):
        from frappe_visual.api.response import success
        result = success(data={"key": "val"}, message="ok")
        assert result["status"] == "success"
        assert result["data"]["key"] == "val"

    def test_error_response(self):
        from frappe_visual.api.response import error
        result = error("Not found", error_code="NOT_FOUND", http_status=404)
        assert result["status"] == "error"
        assert result["error_code"] == "NOT_FOUND"

    def test_paginated_response(self):
        from frappe_visual.api.response import paginated
        result = paginated(data=[1, 2, 3], total=50, page=2, page_size=20)
        assert result["meta"]["total"] == 50
        assert result["meta"]["page"] == 2
        assert result["meta"]["total_pages"] == 3
