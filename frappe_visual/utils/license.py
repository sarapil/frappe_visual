# -*- coding: utf-8 -*-

# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
License validation for Frappe Visual.
Supports Frappe Cloud subscriptions and standalone license keys.
"""

import frappe
import hashlib
from typing import Optional


class LicenseValidator:
	"""
	Validates license keys for premium features.

	On Frappe Cloud: Auto-detects subscription status
	Self-hosted: Validates against Arkan Labs license server
	"""

	CACHE_KEY = "frappe_visual:license_status"
	CACHE_TTL = 3600  # 1 hour

	@staticmethod
	def is_premium_active() -> bool:
		"""Check if premium features should be enabled."""
		cached = frappe.cache.get_value(LicenseValidator.CACHE_KEY)
		if cached is not None:
			return cached

		try:
			settings = frappe.get_single("Frappe Visual Settings")
		except frappe.DoesNotExistError:
			return False

		# Priority 1: Frappe Cloud environment
		if LicenseValidator._is_frappe_cloud():
			result = True
		# Priority 2: Valid license key
		elif settings.license_key:
			result = LicenseValidator._validate_key(settings.license_key)
		# Default: Free tier
		else:
			result = False

		frappe.cache.set_value(
			LicenseValidator.CACHE_KEY,
			result,
			expires_in_sec=LicenseValidator.CACHE_TTL,
		)
		return result

	@staticmethod
	def get_license_info() -> dict:
		"""Get detailed license information."""
		is_premium = LicenseValidator.is_premium_active()
		is_cloud = LicenseValidator._is_frappe_cloud()

		return {
			"is_premium": is_premium,
			"tier": "premium" if is_premium else "free",
			"source": "frappe_cloud" if is_cloud else "license_key" if is_premium else "none",
			"features": LicenseValidator.get_enabled_features(),
		}

	@staticmethod
	def get_enabled_features() -> list:
		"""Get list of enabled features based on license."""
		from frappe_visual.utils.feature_flags import FEATURE_REGISTRY, FeatureTier

		is_premium = LicenseValidator.is_premium_active()
		enabled = []

		for feature, tier in FEATURE_REGISTRY.items():
			if tier == FeatureTier.FREE or is_premium:
				enabled.append(feature)

		return enabled

	@staticmethod
	def _is_frappe_cloud() -> bool:
		"""Detect if running on Frappe Cloud."""
		indicators = [
			frappe.conf.get("is_frappe_cloud"),
			frappe.conf.get("frappe_cloud_site"),
		]
		return any(indicators)

	@staticmethod
	def _validate_key(key: str) -> bool:
		"""
		Validate a standalone license key.

		Key format: XXXX-XXXX-XXXX-HASH
		"""
		if not key or len(key) < 10:
			return False

		try:
			parts = key.strip().upper().split("-")
			if len(parts) != 4:
				return False

			payload = parts[0] + parts[1] + parts[2]
			secret = frappe.conf.get(
				"frappe_visual_license_secret", "ARKAN_DEFAULT_SECRET"
			)
			expected = hashlib.sha256(
				f"{payload}:frappe_visual:{secret}".encode()
			).hexdigest()[:8].upper()

			return parts[3] == expected
		except Exception as e:
			frappe.log_error(
				f"License validation error: {e}", "Frappe Visual License"
			)
			return False

	@staticmethod
	def clear_cache():
		"""Clear license cache (call after settings change)."""
		frappe.cache.delete_value(LicenseValidator.CACHE_KEY)


# ── Whitelisted API endpoints ────────────────────────────────────

@frappe.whitelist()
def get_license_status() -> dict:
	"""API: Get current license status."""
	frappe.only_for(["Frappe Visual User", "System Manager", "System Manager"])

	return LicenseValidator.get_license_info()


@frappe.whitelist()
def validate_license_key(key: str) -> dict:
	"""API: Validate a license key without saving."""
	frappe.only_for(["Frappe Visual User", "System Manager", "System Manager"])

	is_valid = LicenseValidator._validate_key(key)
	return {
		"valid": is_valid,
		"message": "License key is valid" if is_valid else "Invalid license key",
	}
