# -*- coding: utf-8 -*-
"""Frappe Visual Settings — Global configuration and license management."""

import frappe
from frappe.model.document import Document
from frappe_visual.utils.license import LicenseValidator


class FrappeVisualSettings(Document):
	def validate(self):
		self.update_license_status()

	def update_license_status(self):
		"""Update license status display."""
		LicenseValidator.clear_cache()

		info = LicenseValidator.get_license_info()

		if info["is_premium"]:
			self.license_status = f"Premium ({info['source'].replace('_', ' ').title()})"
		else:
			self.license_status = "Free Tier"

		# Update HTML field
		features = info.get("features", [])
		self.license_info = self._render_license_info(info, features)

	def _render_license_info(self, info, features):
		"""Render license info HTML."""
		tier_badge = "green" if info["is_premium"] else "orange"
		tier_label = "Premium" if info["is_premium"] else "Free"

		feature_list = "".join([f"<li>✅ {f.replace('_', ' ').title()}</li>" for f in features[:12]])

		return f"""
		<div class="license-info" style="padding: 8px 0;">
			<span class="indicator-pill {tier_badge}">{tier_label}</span>
			<p style="margin: 8px 0 4px 0; font-weight: 600;">Enabled Features ({len(features)}):</p>
			<ul style="list-style: none; padding: 0; margin: 0; font-size: 12px; columns: 2;">{feature_list}</ul>
		</div>
		"""
