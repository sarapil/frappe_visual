# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Tests for frappe_visual.utils.license and frappe_visual.utils.feature_flags
"""

import frappe
from frappe.tests import IntegrationTestCase


class TestLicenseValidator(IntegrationTestCase):
    """Test LicenseValidator class."""

    def setUp(self):
        from frappe_visual.utils.license import LicenseValidator
        LicenseValidator.clear_cache()

    def test_import(self):
        """LicenseValidator should be importable."""
        from frappe_visual.utils.license import LicenseValidator
        self.assertIsNotNone(LicenseValidator)

    def test_get_license_info(self):
        """get_license_info should return a dict with required keys."""
        from frappe_visual.utils.license import LicenseValidator

        info = LicenseValidator.get_license_info()

        self.assertIsInstance(info, dict)
        self.assertIn("is_premium", info)
        self.assertIn("tier", info)
        self.assertIn("source", info)
        self.assertIn("features", info)

    def test_free_tier_by_default(self):
        """Without license key, should be in free tier."""
        from frappe_visual.utils.license import LicenseValidator

        settings = frappe.get_single("Frappe Visual Settings")
        settings.license_key = ""
        settings.save()
        LicenseValidator.clear_cache()

        self.assertFalse(LicenseValidator.is_premium_active())

    def test_invalid_key_format(self):
        """Invalid key format should not validate."""
        from frappe_visual.utils.license import LicenseValidator

        result = LicenseValidator._validate_key("invalid-key")
        self.assertFalse(result)

    def test_empty_key(self):
        """Empty key should not validate."""
        from frappe_visual.utils.license import LicenseValidator

        result = LicenseValidator._validate_key("")
        self.assertFalse(result)

    def test_none_key(self):
        """None key should not validate."""
        from frappe_visual.utils.license import LicenseValidator

        result = LicenseValidator._validate_key(None)
        self.assertFalse(result)

    def test_short_key(self):
        """Too-short key should not validate."""
        from frappe_visual.utils.license import LicenseValidator

        result = LicenseValidator._validate_key("ABC")
        self.assertFalse(result)

    def test_wrong_parts_count(self):
        """Key with wrong number of parts should not validate."""
        from frappe_visual.utils.license import LicenseValidator

        result = LicenseValidator._validate_key("AAAA-BBBB-CCCC-DDDD-EEEE")
        self.assertFalse(result)

    def test_clear_cache(self):
        """clear_cache should not raise."""
        from frappe_visual.utils.license import LicenseValidator

        LicenseValidator.clear_cache()  # Should not raise

    def test_get_enabled_features_returns_list(self):
        """get_enabled_features should return a list."""
        from frappe_visual.utils.license import LicenseValidator

        features = LicenseValidator.get_enabled_features()
        self.assertIsInstance(features, list)
        self.assertGreater(len(features), 0, "Should have at least free features")


class TestFeatureFlags(IntegrationTestCase):
    """Test feature flags system."""

    def setUp(self):
        from frappe_visual.utils.license import LicenseValidator
        LicenseValidator.clear_cache()

    def test_import_feature_registry(self):
        """FEATURE_REGISTRY should be importable and non-empty."""
        from frappe_visual.utils.feature_flags import FEATURE_REGISTRY

        self.assertIsInstance(FEATURE_REGISTRY, dict)
        self.assertGreater(len(FEATURE_REGISTRY), 0)

    def test_free_features_exist(self):
        """Should have free tier features."""
        from frappe_visual.utils.feature_flags import FEATURE_REGISTRY, FeatureTier

        free_features = [k for k, v in FEATURE_REGISTRY.items() if v == FeatureTier.FREE]
        self.assertGreater(len(free_features), 0, "Should have free features")

    def test_premium_features_exist(self):
        """Should have premium tier features."""
        from frappe_visual.utils.feature_flags import FEATURE_REGISTRY, FeatureTier

        premium_features = [k for k, v in FEATURE_REGISTRY.items() if v == FeatureTier.PREMIUM]
        self.assertGreater(len(premium_features), 0, "Should have premium features")

    def test_is_feature_enabled_free(self):
        """Free features should always be enabled."""
        from frappe_visual.utils.feature_flags import is_feature_enabled

        result = is_feature_enabled("app_map_basic")
        self.assertTrue(result)

    def test_is_feature_enabled_unknown(self):
        """Unknown features should default to premium (disabled without license)."""
        from frappe_visual.utils.feature_flags import is_feature_enabled

        result = is_feature_enabled("nonexistent_feature_xyz")
        # Unknown features default to PREMIUM tier — disabled unless licensed
        self.assertFalse(result)

    def test_get_all_features(self):
        """get_all_features should return complete feature dict."""
        from frappe_visual.utils.feature_flags import get_all_features

        features = get_all_features()

        self.assertIsInstance(features, dict)
        self.assertIn("app_map_basic", features)

        # Each feature should have required keys
        for key, info in features.items():
            self.assertIn("tier", info, f"Feature '{key}' missing 'tier'")
            self.assertIn("enabled", info, f"Feature '{key}' missing 'enabled'")
            self.assertIn("requires_upgrade", info, f"Feature '{key}' missing 'requires_upgrade'")

    def test_feature_registry_values_are_valid_tiers(self):
        """Each registry value should be a valid FeatureTier string."""
        from frappe_visual.utils.feature_flags import FEATURE_REGISTRY, FeatureTier

        valid_tiers = {FeatureTier.FREE, FeatureTier.PREMIUM}
        for key, tier in FEATURE_REGISTRY.items():
            self.assertIn(tier, valid_tiers, f"Feature '{key}' has invalid tier: {tier}")

    def test_get_feature_tier(self):
        """get_feature_tier should return correct tier."""
        from frappe_visual.utils.feature_flags import get_feature_tier, FeatureTier

        self.assertEqual(get_feature_tier("app_map_basic"), FeatureTier.FREE)
        self.assertEqual(get_feature_tier("floating_windows"), FeatureTier.PREMIUM)

    def test_require_premium_decorator_blocks_without_license(self):
        """require_premium decorator should throw for premium features."""
        from frappe_visual.utils.feature_flags import require_premium
        from frappe_visual.utils.license import LicenseValidator

        settings = frappe.get_single("Frappe Visual Settings")
        settings.license_key = ""
        settings.save()
        LicenseValidator.clear_cache()

        @require_premium("floating_windows")
        def premium_function():
            return "success"

        with self.assertRaises(frappe.PermissionError):
            premium_function()

    def test_check_feature_api(self):
        """check_feature API should return feature info."""
        from frappe_visual.utils.feature_flags import check_feature

        result = check_feature("app_map_basic")
        self.assertIsInstance(result, dict)
        self.assertEqual(result["feature"], "app_map_basic")
        self.assertTrue(result["enabled"])
        self.assertEqual(result["tier"], "free")

    def test_get_enabled_features_api(self):
        """get_enabled_features API should return dict of feature:bool."""
        from frappe_visual.utils.feature_flags import get_enabled_features

        result = get_enabled_features()
        self.assertIsInstance(result, dict)
        self.assertTrue(result["app_map_basic"])  # Free feature always enabled


class TestFrappeVisualSettings(IntegrationTestCase):
    """Test Frappe Visual Settings DocType."""

    def test_settings_exists(self):
        """Frappe Visual Settings should be accessible."""
        settings = frappe.get_single("Frappe Visual Settings")
        self.assertIsNotNone(settings)

    def test_default_layout(self):
        """Default layout should be a valid layout."""
        settings = frappe.get_single("Frappe Visual Settings")
        valid_layouts = [
            "fcose", "breadthfirst", "elk-layered", "elk-mrtree",
            "elk-stress", "elk-radial", "circle", "grid", "concentric"
        ]
        self.assertIn(
            settings.default_layout or "fcose",
            valid_layouts
        )

    def test_settings_fields_exist(self):
        """Settings should have expected fields."""
        meta = frappe.get_meta("Frappe Visual Settings")
        field_names = [f.fieldname for f in meta.fields]

        expected = ["license_key", "default_layout", "enable_animations", "enable_minimap"]
        for field in expected:
            self.assertIn(field, field_names, f"Field '{field}' not found in Settings")
