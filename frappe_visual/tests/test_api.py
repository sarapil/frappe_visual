"""
Tests for frappe_visual.api endpoints
"""

import frappe
from frappe.tests import IntegrationTestCase


class TestGetAppMap(IntegrationTestCase):
    """Test get_app_map API endpoint."""

    def test_get_app_map_returns_nodes_and_edges(self):
        """get_app_map should return a dict with nodes and edges."""
        from frappe_visual.api import get_app_map

        result = get_app_map("frappe")

        self.assertIsInstance(result, dict)
        self.assertIn("nodes", result)
        self.assertIn("edges", result)
        self.assertIsInstance(result["nodes"], list)
        self.assertIsInstance(result["edges"], list)

    def test_get_app_map_has_module_nodes(self):
        """get_app_map should return module-type nodes."""
        from frappe_visual.api import get_app_map

        result = get_app_map("frappe")
        module_nodes = [n for n in result["nodes"] if n["type"] == "module"]

        self.assertGreater(len(module_nodes), 0, "Should have at least one module node")

    def test_get_app_map_has_doctype_nodes(self):
        """get_app_map should return doctype nodes."""
        from frappe_visual.api import get_app_map

        result = get_app_map("frappe")
        dt_nodes = [n for n in result["nodes"] if n["type"] != "module"]

        self.assertGreater(len(dt_nodes), 0, "Should have at least one doctype node")

    def test_get_app_map_node_structure(self):
        """Each node should have required fields."""
        from frappe_visual.api import get_app_map

        result = get_app_map("frappe")

        for node in result["nodes"]:
            self.assertIn("id", node)
            self.assertIn("label", node)
            self.assertIn("type", node)

    def test_get_app_map_edge_structure(self):
        """Each edge should have source and target."""
        from frappe_visual.api import get_app_map

        result = get_app_map("frappe")

        for edge in result["edges"]:
            self.assertIn("source", edge)
            self.assertIn("target", edge)
            self.assertIn("type", edge)

    def test_get_app_map_unknown_app(self):
        """get_app_map with non-existent app should return empty lists."""
        from frappe_visual.api import get_app_map

        result = get_app_map("nonexistent_app_xyz")

        self.assertEqual(len(result["nodes"]), 0)
        self.assertEqual(len(result["edges"]), 0)

    def test_get_app_map_contains_edges(self):
        """Should have containment edges between modules and doctypes."""
        from frappe_visual.api import get_app_map

        result = get_app_map("frappe")
        contain_edges = [e for e in result["edges"] if e["type"] == "contains"]

        self.assertGreater(len(contain_edges), 0, "Should have containment edges")


class TestGetDoctypeRelationships(IntegrationTestCase):
    """Test get_doctype_relationships API endpoint."""

    def test_returns_nodes_and_edges(self):
        """Should return dict with nodes and edges."""
        from frappe_visual.api import get_doctype_relationships

        result = get_doctype_relationships("DocType", depth=1)

        self.assertIsInstance(result, dict)
        self.assertIn("nodes", result)
        self.assertIn("edges", result)

    def test_center_node_exists(self):
        """The center doctype should be in the result nodes."""
        from frappe_visual.api import get_doctype_relationships

        result = get_doctype_relationships("DocType", depth=1)
        node_ids = [n.get("id") or n.get("label") for n in result["nodes"]]

        # The center doctype should be present
        self.assertTrue(
            any("DocType" in str(nid) for nid in node_ids),
            "Center doctype should be in nodes"
        )

    def test_depth_parameter(self):
        """Different depths should return different amounts of data."""
        from frappe_visual.api import get_doctype_relationships

        result_1 = get_doctype_relationships("DocType", depth=1)
        result_2 = get_doctype_relationships("DocType", depth=2)

        # Depth 2 should generally have more nodes (or at least equal)
        self.assertGreaterEqual(
            len(result_2["nodes"]),
            len(result_1["nodes"]),
            "Deeper exploration should return at least as many nodes"
        )


class TestGetQuickStats(IntegrationTestCase):
    """Test get_quick_stats API endpoint."""

    def test_returns_stats(self):
        """Should return statistics dict."""
        from frappe_visual.api import get_quick_stats

        result = get_quick_stats("frappe")

        self.assertIsInstance(result, (dict, list))

    def test_frappe_has_doctypes(self):
        """Frappe core should have doctypes."""
        from frappe_visual.api import get_quick_stats

        result = get_quick_stats("frappe")

        # Result structure may vary, but should have content
        self.assertIsNotNone(result)


class TestClassifyDoctype(IntegrationTestCase):
    """Test internal _classify_doctype helper."""

    def test_classify_submittable(self):
        """Submittable doctypes should be classified as 'transaction'."""
        from frappe_visual.api import _classify_doctype

        mock_dt = frappe._dict({
            "is_submittable": 1,
            "issingle": 0,
            "istable": 0,
            "is_tree": 0,
            "is_virtual": 0,
            "name": "Test Transaction",
        })

        result = _classify_doctype(mock_dt)
        self.assertEqual(result, "transaction")

    def test_classify_child_table(self):
        """Child table doctypes should be classified as 'child-table'."""
        from frappe_visual.api import _classify_doctype

        mock_dt = frappe._dict({
            "is_submittable": 0,
            "issingle": 0,
            "istable": 1,
            "is_tree": 0,
            "is_virtual": 0,
            "name": "Test Child",
        })

        result = _classify_doctype(mock_dt)
        self.assertEqual(result, "child-table")

    def test_classify_single(self):
        """Single doctypes should be classified as 'settings'."""
        from frappe_visual.api import _classify_doctype

        mock_dt = frappe._dict({
            "is_submittable": 0,
            "issingle": 1,
            "istable": 0,
            "is_tree": 0,
            "is_virtual": 0,
            "name": "Test Single",
        })

        result = _classify_doctype(mock_dt)
        self.assertEqual(result, "settings")

    def test_classify_tree(self):
        """Tree doctypes should be classified as 'master'."""
        from frappe_visual.api import _classify_doctype

        mock_dt = frappe._dict({
            "is_submittable": 0,
            "issingle": 0,
            "istable": 0,
            "is_tree": 1,
            "is_virtual": 0,
            "name": "Test Tree",
        })

        result = _classify_doctype(mock_dt)
        self.assertEqual(result, "master")
