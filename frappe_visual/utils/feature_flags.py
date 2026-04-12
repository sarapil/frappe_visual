# -*- coding: utf-8 -*-

# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Feature gating system for Frappe Visual.
Implements Open Core model: free core + premium features.
"""

import frappe
from functools import wraps
from typing import List, Dict, Any


class FeatureTier:
	"""Feature tier constants."""

	FREE = "free"
	PREMIUM = "premium"


# ============================================
# FEATURE REGISTRY — Define your features here
# ============================================

FEATURE_REGISTRY: Dict[str, str] = {
	# === FREE TIER ===
	"app_map_basic": FeatureTier.FREE,
	"relationship_explorer_basic": FeatureTier.FREE,
	"visual_dashboard": FeatureTier.FREE,
	"storyboard_wizard": FeatureTier.FREE,
	"dark_mode": FeatureTier.FREE,
	"rtl_support": FeatureTier.FREE,
	"basic_layouts": FeatureTier.FREE,  # fcose, breadthfirst
	"search_filter": FeatureTier.FREE,
	"minimap": FeatureTier.FREE,

	# === PREMIUM TIER ===
	"advanced_layouts": FeatureTier.PREMIUM,  # elk-layered, elk-mrtree, elk-stress, elk-radial
	"floating_windows": FeatureTier.PREMIUM,
	"animation_engine": FeatureTier.PREMIUM,  # ant-lines, pulse, ambient
	"export_svg": FeatureTier.PREMIUM,
	"export_png": FeatureTier.PREMIUM,
	"custom_node_types": FeatureTier.PREMIUM,
	"custom_edge_types": FeatureTier.PREMIUM,
	"context_menus": FeatureTier.PREMIUM,
	"combo_groups": FeatureTier.PREMIUM,
	"summary_badges": FeatureTier.PREMIUM,
	"mcp_integration": FeatureTier.PREMIUM,
	"api_access": FeatureTier.PREMIUM,
	"white_labeling": FeatureTier.PREMIUM,
	"priority_support": FeatureTier.PREMIUM,
}


def require_premium(feature_key: str):
	"""
	Decorator: Block execution if feature requires premium and no license.

	Usage:
		@frappe.whitelist()
		@require_premium("animation_engine")
		def create_animation(data):
		    frappe.only_for(["System Manager", "Website Manager"])
			# Premium-only code
			pass
	"""

	def decorator(func):
		@wraps(func)
		def wrapper(*args, **kwargs):
			from frappe_visual.utils.license import LicenseValidator

			tier = FEATURE_REGISTRY.get(feature_key, FeatureTier.PREMIUM)

			if tier == FeatureTier.PREMIUM and not LicenseValidator.is_premium_active():
				frappe.throw(
					frappe._(
						"This feature requires a premium license. "
						"Subscribe on Frappe Cloud Marketplace or contact Arkan Lab."
					),
					title=frappe._("Premium Feature"),
					exc=frappe.PermissionError,
				)

			return func(*args, **kwargs)

		return wrapper

	return decorator


def is_feature_enabled(feature_key: str) -> bool:
	"""
	Check if a feature is available.

	Usage:
		if is_feature_enabled("animation_engine"):
			# Enable animations
			pass
	"""
	from frappe_visual.utils.license import LicenseValidator

	tier = FEATURE_REGISTRY.get(feature_key, FeatureTier.PREMIUM)

	if tier == FeatureTier.FREE:
		return True

	return LicenseValidator.is_premium_active()


def get_feature_tier(feature_key: str) -> str:
	"""Get the tier of a specific feature."""
	return FEATURE_REGISTRY.get(feature_key, FeatureTier.PREMIUM)


def get_all_features() -> Dict[str, Dict[str, Any]]:
	"""Get all features with their status."""
	from frappe_visual.utils.license import LicenseValidator

	is_premium = LicenseValidator.is_premium_active()

	result = {}
	for feature, tier in FEATURE_REGISTRY.items():
		result[feature] = {
			"tier": tier,
			"enabled": tier == FeatureTier.FREE or is_premium,
			"requires_upgrade": tier == FeatureTier.PREMIUM and not is_premium,
		}

	return result


# ── API Endpoints ─────────────────────────────────────────────────

@frappe.whitelist()
def get_enabled_features() -> Dict[str, bool]:
	"""API: Get dictionary of feature:enabled for client-side use."""
	from frappe_visual.caps_integration.gate import check_capability
	if not check_capability("FV_manage_settings"):
		frappe.throw(frappe._("Insufficient permissions"), frappe.PermissionError)

	from frappe_visual.utils.license import LicenseValidator

	is_premium = LicenseValidator.is_premium_active()

	return {
		feature: (tier == FeatureTier.FREE or is_premium)
		for feature, tier in FEATURE_REGISTRY.items()
	}


@frappe.whitelist()
def check_feature(feature_key: str) -> Dict[str, Any]:
	"""API: Check if a specific feature is available."""
	from frappe_visual.caps_integration.gate import check_capability
	if not check_capability("FV_view_visual_hub"):
		frappe.throw(frappe._("Insufficient permissions"), frappe.PermissionError)

	enabled = is_feature_enabled(feature_key)
	tier = get_feature_tier(feature_key)

	return {
		"feature": feature_key,
		"enabled": enabled,
		"tier": tier,
		"upgrade_required": not enabled and tier == FeatureTier.PREMIUM,
	}
