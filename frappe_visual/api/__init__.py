# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Server-Side API (Thin Controller)
===================================================
All business logic delegated to services/ layer.
Endpoints handle only: auth, input parsing, service dispatch.
"""

import frappe
from frappe import _
import json


def has_visual_access():
	"""Permission gate for add_to_apps_screen. Checks CAPS capability."""
	from frappe_visual.caps_integration.gate import check_capability
	return check_capability("FV_view_visual_hub")


@frappe.whitelist()
def get_app_map(app_name):
	"""Build a complete application map for the graph engine."""
	frappe.has_permission("DocType", "read", throw=True)
	from frappe_visual.services.graph_service import GraphService
	return GraphService.build_app_map(app_name)


@frappe.whitelist()
def get_doctype_relationships(doctype, depth=2):
	"""Get all relationships radiating from a single DocType."""
	frappe.has_permission("DocType", "read", throw=True)
	from frappe_visual.services.graph_service import GraphService
	return GraphService.build_doctype_relationships(doctype, int(depth))


@frappe.whitelist()
def get_form_dashboard_data(doctype, docname, depth=1):
	"""Get relationship graph + stats for a document form dashboard."""
	from frappe_visual.caps_integration.gate import check_capability
	if not check_capability("FV_view_visual_hub"):
		frappe.throw(_("Insufficient permissions"), frappe.PermissionError)
	frappe.has_permission(doctype, "read", throw=True)
	from frappe_visual.services.graph_service import GraphService
	return GraphService.build_form_dashboard(doctype, docname, int(depth))


@frappe.whitelist()
def get_quick_stats(app_name=None):
	"""Get quick statistics for dashboard widgets."""
	from frappe_visual.caps_integration.gate import check_capability
	if not check_capability("FV_view_visual_hub"):
		frappe.throw(_("Insufficient permissions"), frappe.PermissionError)
	from frappe_visual.services.graph_service import GraphService
	return GraphService.get_quick_stats(app_name)


@frappe.whitelist()
def get_workspace_map(workspace=None):
	"""Build a visual map of workspace shortcuts and links."""
	frappe.has_permission("Workspace", "read", throw=True)
	from frappe_visual.services.layout_service import LayoutService
	return LayoutService.build_workspace_map(workspace)


@frappe.whitelist()
def get_tree_data(doctype, parent_field="parent"):
	"""Get hierarchical tree data for a DocType."""
	frappe.has_permission(doctype, "read", throw=True)
	from frappe_visual.services.layout_service import LayoutService
	return LayoutService.build_tree_data(doctype, parent_field)


@frappe.whitelist()
def get_kanban_data(doctype, fieldname, fields=None, filters=None,
				order_by=None, limit_page_length=200):
	"""Fetch records for a Kanban board grouped by a status/select field."""
	from frappe_visual.caps_integration.gate import check_capability
	if not check_capability("FV_use_kanban"):
		frappe.throw(_("Insufficient permissions"), frappe.PermissionError)
	frappe.has_permission(doctype, "read", throw=True)

	if isinstance(fields, str):
		fields = json.loads(fields)
	if isinstance(filters, str):
		filters = json.loads(filters)

	from frappe_visual.services.kanban_service import KanbanService
	return KanbanService.get_kanban_data(
		doctype, fieldname, fields=fields, filters=filters,
		order_by=order_by, limit=int(limit_page_length),
	)


@frappe.whitelist()
def get_reverse_translation(arabic_text):
	"""Find the English source string for a given Arabic translation."""
	from frappe_visual.services.translation_service import TranslationService
	return TranslationService.reverse_lookup(arabic_text)
