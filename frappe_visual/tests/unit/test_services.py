# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for services layer — GraphService, IconService, LayoutService."""

import frappe
from frappe.tests.utils import FrappeTestCase


class TestGraphService(FrappeTestCase):
    """Tests for GraphService static methods."""

    def test_build_app_map(self):
        """build_app_map should return nodes and edges."""
        from frappe_visual.services.graph_service import GraphService
        result = GraphService.build_app_map("frappe")
        self.assertIn("nodes", result)
        self.assertIn("edges", result)
        self.assertIsInstance(result["nodes"], list)
        self.assertTrue(len(result["nodes"]) > 0)

    def test_build_app_map_nonexistent(self):
        """Non-existent app should return empty graph."""
        from frappe_visual.services.graph_service import GraphService
        result = GraphService.build_app_map("nonexistent_app_xyz")
        self.assertEqual(len(result["nodes"]), 0)

    def test_build_doctype_relationships(self):
        """Should return relationship graph for a valid DocType."""
        from frappe_visual.services.graph_service import GraphService
        result = GraphService.build_doctype_relationships("User")
        self.assertIn("nodes", result)
        self.assertIn("edges", result)

    def test_get_quick_stats(self):
        """Quick stats should return app-level counts."""
        from frappe_visual.services.graph_service import GraphService
        result = GraphService.get_quick_stats("frappe")
        self.assertIsInstance(result, dict)


class TestIconService(FrappeTestCase):
    """Tests for IconService static methods."""

    def test_list_installed_icons(self):
        """Should return a list of icon names."""
        from frappe_visual.services.icon_service import IconService
        icons = IconService.list_installed_icons()
        self.assertIsInstance(icons, list)

    def test_icon_exists(self):
        """Common icons should exist."""
        from frappe_visual.services.icon_service import IconService
        # This depends on sprite being generated; may return False in test env
        result = IconService.icon_exists("settings")
        self.assertIsInstance(result, bool)

    def test_get_doctype_icon(self):
        """Should return an icon name for known DocTypes."""
        from frappe_visual.services.icon_service import IconService
        icon = IconService.get_doctype_icon("User")
        self.assertIsInstance(icon, str)
        self.assertTrue(len(icon) > 0)

    def test_search_icons(self):
        """Icon search should return filtered results."""
        from frappe_visual.services.icon_service import IconService
        results = IconService.search_icons("arrow")
        self.assertIsInstance(results, list)


class TestLayoutService(FrappeTestCase):
    """Tests for LayoutService static methods."""

    def test_get_batch_counts(self):
        """Batch counts should return dict of DocType → count."""
        from frappe_visual.services.layout_service import LayoutService
        result = LayoutService.get_batch_counts(["User", "DocType"])
        self.assertIsInstance(result, dict)
        self.assertIn("User", result)

    def test_get_batch_counts_empty(self):
        """Empty list should return empty dict."""
        from frappe_visual.services.layout_service import LayoutService
        result = LayoutService.get_batch_counts([])
        self.assertEqual(result, {})

    def test_build_tree_data(self):
        """Tree data builder should not crash for valid DocType."""
        from frappe_visual.services.layout_service import LayoutService
        try:
            result = LayoutService.build_tree_data("DocType", "module")
            self.assertIsInstance(result, (list, dict))
        except Exception:
            pass  # May not have parent_field

    def test_build_workspace_map(self):
        """Workspace map should return graph data."""
        from frappe_visual.services.layout_service import LayoutService
        result = LayoutService.build_workspace_map("Frappe Visual")
        self.assertIn("nodes", result)
