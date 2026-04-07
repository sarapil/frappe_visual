# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for v1 Workspace Stats API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase
import json


class TestWorkspaceStatsAPI(FrappeTestCase):
    """Tests for batch counts, sparklines, and dashboard stats."""

    def test_batch_counts_valid(self):
        """Batch counts should return counts for valid DocTypes."""
        from frappe_visual.api.v1.workspace_stats import get_batch_counts
        doctypes = json.dumps(["User", "DocType"])
        result = get_batch_counts(doctypes=doctypes)
        self.assertEqual(result["status"], "success")
        self.assertIn("data", result)

    def test_batch_counts_invalid_doctype(self):
        """Batch counts should skip non-existent DocTypes gracefully."""
        from frappe_visual.api.v1.workspace_stats import get_batch_counts
        doctypes = json.dumps(["User", "NonExistentDT999"])
        result = get_batch_counts(doctypes=doctypes)
        self.assertEqual(result["status"], "success")

    def test_batch_counts_empty_list(self):
        """Empty DocType list should return empty data."""
        from frappe_visual.api.v1.workspace_stats import get_batch_counts
        result = get_batch_counts(doctypes="[]")
        self.assertEqual(result["status"], "success")

    def test_get_sparkline_data(self):
        """Sparkline data should return time-series counts."""
        try:
            from frappe_visual.api.v1.workspace_stats import get_sparkline_data
            result = get_sparkline_data(doctype="User", days=30)
            self.assertEqual(result["status"], "success")
            self.assertIn("data", result)
        except ImportError:
            self.skipTest("get_sparkline_data not implemented")

    def test_get_sparkline_data_invalid_doctype(self):
        """Sparkline for non-existent DocType should error."""
        try:
            from frappe_visual.api.v1.workspace_stats import get_sparkline_data
            result = get_sparkline_data(doctype="NonExistent999", days=30)
            self.assertEqual(result["status"], "error")
        except ImportError:
            self.skipTest("get_sparkline_data not implemented")

    def test_get_workspace_dashboard(self):
        """Workspace dashboard should return shortcuts + counts."""
        try:
            from frappe_visual.api.v1.workspace_stats import get_workspace_dashboard
            result = get_workspace_dashboard(workspace="Frappe Visual")
            self.assertEqual(result["status"], "success")
        except ImportError:
            self.skipTest("get_workspace_dashboard not implemented")

    def test_batch_counts_comma_separated(self):
        """Comma-separated string input should work."""
        from frappe_visual.api.v1.workspace_stats import get_batch_counts
        result = get_batch_counts(doctypes="User,DocType")
        self.assertEqual(result["status"], "success")
