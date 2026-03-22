# -*- coding: utf-8 -*-
"""Tests for Frappe Visual Settings DocType."""

import frappe
from frappe.tests import IntegrationTestCase


class TestFrappeVisualSettings(IntegrationTestCase):
	def test_settings_exist(self):
		"""Settings DocType should exist after install."""
		settings = frappe.get_single("Frappe Visual Settings")
		self.assertIsNotNone(settings)

	def test_default_values(self):
		"""Settings should have correct defaults."""
		settings = frappe.get_single("Frappe Visual Settings")
		self.assertEqual(settings.default_layout, "fcose")
		self.assertEqual(settings.enable_animations, 1)
		self.assertEqual(settings.enable_minimap, 1)
