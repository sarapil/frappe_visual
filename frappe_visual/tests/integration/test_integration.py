# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""
Frappe Visual — Integration Tests
===================================
Tests for API endpoints, DocType lifecycle, CAPS integration,
and cross-app interactions.
"""

import frappe
import pytest
from frappe.tests.utils import FrappeTestCase


class TestFVSettingAPI(FrappeTestCase):
    """Integration tests for Frappe Visual Settings DocType operations."""

    def test_fv_setting_create_singleton(self):
        """Frappe Visual Settings should be a singleton — only one instance."""
        if not frappe.db.exists("Frappe Visual Settings"):
            doc = frappe.get_doc({"doctype": "Frappe Visual Settings"})
            doc.insert(ignore_permissions=True)

        assert frappe.db.exists("Frappe Visual Settings")

    def test_fv_setting_update_toggle(self):
        """Should be able to toggle auto-enhancer settings."""
        if not frappe.db.exists("Frappe Visual Settings"):
            self.skipTest("Frappe Visual Settings not installed")

        doc = frappe.get_doc("Frappe Visual Settings")
        original = doc.enable_auto_enhancers

        doc.enable_auto_enhancers = 0 if original else 1
        doc.save(ignore_permissions=True)

        refreshed = frappe.get_doc("Frappe Visual Settings")
        assert refreshed.enable_auto_enhancers != original

        doc.enable_auto_enhancers = original
        doc.save(ignore_permissions=True)

    def test_fv_setting_permission_check(self):
        """Non-admin users should not be able to write Frappe Visual Settings."""
        if not frappe.db.exists("Frappe Visual Settings"):
            self.skipTest("Frappe Visual Settings not installed")

        frappe.set_user("Guest")
        try:
            has_perm = frappe.has_permission("Frappe Visual Settings", "write")
            assert not has_perm
        finally:
            frappe.set_user("Administrator")


class TestVisualHubAPI(FrappeTestCase):
    """Integration tests for Visual Hub API endpoints."""

    def test_component_catalog_endpoint(self):
        """The component catalog API should return a list."""
        try:
            from frappe_visual.api.v1.components import get_catalog
            result = get_catalog()
            assert isinstance(result, (dict, list))
        except ImportError:
            self.skipTest("Component catalog API not yet implemented")

    def test_workspace_stats_endpoint(self):
        """Workspace stats API should return valid data."""
        try:
            from frappe_visual.api.v1.workspace import get_workspace_stats
            result = get_workspace_stats()
            assert isinstance(result, dict)
        except ImportError:
            self.skipTest("Workspace stats API not yet implemented")


class TestSeedIdempotency(FrappeTestCase):
    """Verify seed operations are safe to run repeatedly."""

    def test_seed_data_idempotent(self):
        """seed_data should not raise on repeated calls."""
        from frappe_visual.seed import seed_data
        # Run twice — should be safe
        seed_data()
        seed_data()

    def test_demo_load_clear_cycle(self):
        """load_demo_data → clear_demo_data should complete without error."""
        from frappe_visual.demo import load_demo_data, clear_demo_data
        load_demo_data()
        clear_demo_data()


class TestCAPSIntegration(FrappeTestCase):
    """Verify CAPS capabilities are properly declared and accessible."""

    def test_caps_capabilities_in_hooks(self):
        """All 15 capabilities should be declared in hooks."""
        caps = frappe.get_hooks("caps_capabilities", app_name="frappe_visual")
        assert len(caps) == 15, f"Expected 15 capabilities, got {len(caps)}"

    def test_caps_capability_names_prefixed(self):
        """All capability names should be prefixed with FV_."""
        caps = frappe.get_hooks("caps_capabilities", app_name="frappe_visual")
        for cap in caps:
            assert cap["name"].startswith("FV_"), f"Capability {cap['name']} missing FV_ prefix"

    def test_caps_categories_valid(self):
        """All capabilities should have valid categories."""
        valid_categories = {"Module", "Action", "Report", "Field"}
        caps = frappe.get_hooks("caps_capabilities", app_name="frappe_visual")
        for cap in caps:
            assert cap["category"] in valid_categories, f"{cap['name']} has invalid category {cap['category']}"


class TestIconSetup(FrappeTestCase):
    """Verify icon system setup functions exist and are callable."""

    def test_after_install_callable(self):
        """setup.icons.after_install should be callable."""
        from frappe_visual.setup.icons import after_install
        assert callable(after_install)

    def test_after_migrate_callable(self):
        """setup.icons.after_migrate should be callable."""
        from frappe_visual.setup.icons import after_migrate
        assert callable(after_migrate)

    def test_extend_bootinfo_callable(self):
        """setup.icons.extend_bootinfo should be callable."""
        from frappe_visual.setup.icons import extend_bootinfo
        assert callable(extend_bootinfo)


class TestExceptionClasses(FrappeTestCase):
    """Verify custom exceptions are properly structured."""

    def test_all_exceptions_importable(self):
        """All custom exceptions should be importable."""
        from frappe_visual.exceptions import (
            ConfigurationError,
            ComponentNotFoundError,
            LayoutError,
            RenderError,
            LicenseError,
            ThemeError,
        )
        assert issubclass(ConfigurationError, Exception)
        assert issubclass(ComponentNotFoundError, Exception)
        assert issubclass(LayoutError, Exception)
        assert issubclass(RenderError, Exception)
        assert issubclass(LicenseError, Exception)
        assert issubclass(ThemeError, Exception)

    def test_configuration_error_attributes(self):
        """ConfigurationError should carry setting_name attribute."""
        from frappe_visual.exceptions import ConfigurationError
        err = ConfigurationError("my_setting")
        assert hasattr(err, "setting_name")
        assert err.setting_name == "my_setting"
