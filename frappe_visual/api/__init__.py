"""
Frappe Visual — Server-Side API
================================
Whitelisted API methods that power the visual components.
These endpoints fetch application metadata, doctype relationships,
and workspace structures for the graph engine.
"""

import frappe
from frappe import _
import json


def has_visual_access():
	"""Permission gate for add_to_apps_screen. All desk users have access."""
	return "System Manager" in frappe.get_roles() or "All" in frappe.get_roles()


@frappe.whitelist()
def get_app_map(app_name):
	"""
	Build a complete application map for the graph engine.
	Returns nodes (modules, doctypes) and edges (relationships).
	"""
	frappe.has_permission("DocType", "read", throw=True)

	nodes = []
	edges = []
	seen_nodes = set()

	# Get all modules for this app
	modules = frappe.get_all(
		"Module Def",
		filters={"app_name": app_name},
		fields=["name", "module_name", "app_name"],
	)

	for mod in modules:
		mod_id = f"module:{mod.name}"
		if mod_id not in seen_nodes:
			nodes.append({
				"id": mod_id,
				"label": mod.module_name or mod.name,
				"type": "module",
				"app": app_name,
			})
			seen_nodes.add(mod_id)

		# Get doctypes in this module
		doctypes = frappe.get_all(
			"DocType",
			filters={"module": mod.name, "custom": 0},
			fields=[
				"name", "module", "issingle", "istable",
				"is_submittable", "is_tree", "is_virtual",
				"description",
			],
			limit_page_length=200,
		)

		for dt in doctypes:
			dt_id = f"doctype:{dt.name}"
			if dt_id in seen_nodes:
				continue

			# Classify the doctype
			dt_type = _classify_doctype(dt)

			nodes.append({
				"id": dt_id,
				"label": dt.name,
				"type": dt_type,
				"parent": mod_id,
				"module": mod.name,
				"description": dt.description or "",
				"doctype": dt.name,
			})
			seen_nodes.add(dt_id)

			# Edges: module → doctype (containment)
			edges.append({
				"id": f"e:{mod_id}-{dt_id}",
				"source": mod_id,
				"target": dt_id,
				"type": "contains",
			})

	# Build relationship edges between doctypes
	_add_link_edges(nodes, edges, seen_nodes)

	return {"nodes": nodes, "edges": edges}


@frappe.whitelist()
def get_doctype_relationships(doctype, depth=2):
	"""
	Get all relationships radiating from a single DocType.
	Returns nodes and edges for the relationship explorer.
	"""
	frappe.has_permission("DocType", "read", throw=True)
	depth = int(depth)

	nodes = []
	edges = []
	seen = set()
	queue = [(doctype, 0)]

	while queue:
		current_dt, current_depth = queue.pop(0)

		if current_dt in seen:
			continue
		seen.add(current_dt)

		# Get doctype meta
		try:
			meta = frappe.get_meta(current_dt)
		except Exception:
			continue

		dt_id = f"doctype:{current_dt}"
		dt_info = {
			"issingle": meta.issingle,
			"istable": meta.istable,
			"is_submittable": meta.is_submittable,
		}

		nodes.append({
			"id": dt_id,
			"label": current_dt,
			"type": _classify_doctype_from_meta(meta),
			"module": meta.module,
			"doctype": current_dt,
			"depth": current_depth,
		})

		if current_depth >= depth:
			continue

		# Find linked doctypes from fields
		for df in meta.fields:
			linked_dt = None
			edge_type = "link"

			if df.fieldtype == "Link" and df.options:
				linked_dt = df.options
				edge_type = "link"
			elif df.fieldtype == "Table" and df.options:
				linked_dt = df.options
				edge_type = "child-table"
			elif df.fieldtype == "Table MultiSelect" and df.options:
				linked_dt = df.options
				edge_type = "child-table"
			elif df.fieldtype == "Dynamic Link":
				# Can't resolve at schema time
				continue

			if linked_dt and linked_dt not in seen:
				queue.append((linked_dt, current_depth + 1))

				edge_id = f"e:{dt_id}-doctype:{linked_dt}"
				edges.append({
					"id": edge_id,
					"source": dt_id,
					"target": f"doctype:{linked_dt}",
					"type": edge_type,
					"label": df.fieldname,
				})

	return {"nodes": nodes, "edges": edges}


@frappe.whitelist()
def get_workspace_map(workspace=None):
	"""
	Build a visual map of workspace shortcuts and links.
	"""
	frappe.has_permission("Workspace", "read", throw=True)

	filters = {}
	if workspace:
		filters["name"] = workspace

	workspaces = frappe.get_all(
		"Workspace",
		filters=filters,
		fields=["name", "title", "module", "icon", "is_default"],
		limit_page_length=50,
	)

	nodes = []
	edges = []

	for ws in workspaces:
		ws_id = f"workspace:{ws.name}"
		nodes.append({
			"id": ws_id,
			"label": ws.title or ws.name,
			"type": "workspace",
			"icon": ws.icon,
		})

		# Get shortcuts in this workspace
		shortcuts = frappe.get_all(
			"Workspace Shortcut",
			filters={"parent": ws.name},
			fields=["name", "label", "link_to", "type"],
		)

		for sc in shortcuts:
			target_id = f"doctype:{sc.link_to}" if sc.type == "DocType" else f"page:{sc.link_to}"
			nodes.append({
				"id": target_id,
				"label": sc.label or sc.link_to,
				"type": (sc.type or "page").lower().replace(" ", "-"),
				"parent": ws_id,
			})
			edges.append({
				"source": ws_id,
				"target": target_id,
				"type": "shortcut",
			})

	return {"nodes": nodes, "edges": edges}


@frappe.whitelist()
def get_quick_stats(app_name=None):
	"""
	Get quick statistics for dashboard widgets.
	"""
	frappe.only_for(["Frappe Visual User", "System Manager", "System Manager"])

	stats = {}

	if app_name:
		stats["modules"] = frappe.db.count("Module Def", {"app_name": app_name})
		DocType = frappe.qb.DocType("DocType")
		ModuleDef = frappe.qb.DocType("Module Def")
		from pypika.functions import Count
		stats["doctypes"] = (
			frappe.qb.from_(DocType)
			.join(ModuleDef)
			.on(DocType.module == ModuleDef.name)
			.where(ModuleDef.app_name == app_name)
			.where(DocType.custom == 0)
			.select(Count("*"))
		).run()[0][0]
	else:
		stats["modules"] = frappe.db.count("Module Def")
		stats["doctypes"] = frappe.db.count("DocType", {"custom": 0})

	stats["reports"] = frappe.db.count("Report", {"is_standard": "Yes"})
	stats["pages"] = frappe.db.count("Page", {"standard": "Yes"})
	stats["workspaces"] = frappe.db.count("Workspace")

	return stats


# ── Internal helpers ───────────────────────────────────────────

def _classify_doctype(dt_dict):
	"""Classify a DocType from its DB row."""
	if dt_dict.get("istable"):
		return "child-table"
	if dt_dict.get("issingle"):
		return "settings"
	if dt_dict.get("is_submittable"):
		return "transaction"
	if dt_dict.get("is_tree"):
		return "master"
	return "doctype"


def _classify_doctype_from_meta(meta):
	"""Classify from a Meta object."""
	if meta.istable:
		return "child-table"
	if meta.issingle:
		return "settings"
	if meta.is_submittable:
		return "transaction"
	return "doctype"


def _add_link_edges(nodes, edges, seen_nodes):
	"""
	Scan link fields to build inter-doctype edges.
	Only processes doctype nodes that were already collected.
	"""
	doctype_nodes = [n for n in nodes if n["type"] not in ("module", "workspace")]

	for node in doctype_nodes:
		dt_name = node.get("doctype")
		if not dt_name:
			continue

		try:
			meta = frappe.get_meta(dt_name)
		except Exception:
			continue

		for df in meta.fields:
			linked_dt = None
			edge_type = "link"

			if df.fieldtype == "Link" and df.options:
				linked_dt = df.options
				edge_type = "link"
			elif df.fieldtype in ("Table", "Table MultiSelect") and df.options:
				linked_dt = df.options
				edge_type = "child-table"

			if not linked_dt:
				continue

			target_id = f"doctype:{linked_dt}"
			if target_id not in seen_nodes:
				continue

			edge_id = f"e:{node['id']}-{target_id}-{df.fieldname}"
			edges.append({
				"id": edge_id,
				"source": node["id"],
				"target": target_id,
				"type": edge_type,
				"label": df.fieldname,
			})


# ── Form Dashboard Data API ───────────────────────────────────────

@frappe.whitelist()
def get_form_dashboard_data(doctype, docname, depth=1):
	"""
	Get relationship graph + stats for a specific document's form dashboard.

	Args:
		doctype: The DocType name
		docname: The document name
		depth: How many relationship levels to traverse (default: 1)

	Returns:
		dict with 'nodes', 'edges', and 'stats'
	"""
	frappe.only_for(["System Manager"])
	frappe.has_permission(doctype, "read", throw=True)
	depth = int(depth)

	# Get relationships from the existing endpoint logic
	nodes = []
	edges = []
	seen = set()
	queue = [(doctype, 0)]

	while queue:
		current_dt, current_depth = queue.pop(0)
		if current_dt in seen:
			continue
		seen.add(current_dt)

		try:
			meta = frappe.get_meta(current_dt)
		except Exception:
			continue

		dt_id = f"doctype:{current_dt}"
		nodes.append({
			"id": dt_id,
			"label": current_dt,
			"type": _classify_doctype_from_meta(meta),
			"module": meta.module,
			"doctype": current_dt,
			"depth": current_depth,
		})

		if current_depth >= depth:
			continue

		for df in meta.fields:
			linked_dt = None
			edge_type = "link"

			if df.fieldtype == "Link" and df.options:
				linked_dt = df.options
				edge_type = "link"
			elif df.fieldtype in ("Table", "Table MultiSelect") and df.options:
				linked_dt = df.options
				edge_type = "child-table"
			elif df.fieldtype == "Dynamic Link":
				continue

			if linked_dt and linked_dt not in seen:
				queue.append((linked_dt, current_depth + 1))
				edges.append({
					"id": f"e:{dt_id}-doctype:{linked_dt}",
					"source": dt_id,
					"target": f"doctype:{linked_dt}",
					"type": edge_type,
					"label": df.fieldname,
				})

	# Gather stats for the specific document
	stats = {}
	try:
		meta = frappe.get_meta(doctype)
		for df in meta.fields:
			if df.fieldtype == "Link" and df.options:
				try:
					count = frappe.db.count(
						df.options,
						filters={df.fieldname: docname} if frappe.get_meta(df.options).has_field(df.fieldname) else {}
					)
					if count:
						stats[_(df.options)] = count
				except Exception:
					pass
			elif df.fieldtype == "Table" and df.options:
				try:
					count = frappe.db.count(df.options, {"parent": docname})
					if count:
						stats[_(df.options)] = count
				except Exception:
					pass
	except Exception:
		pass

	return {
		"nodes": nodes,
		"edges": edges,
		"stats": stats,
	}


# ── Kanban Data API ───────────────────────────────────────────────

@frappe.whitelist()
def get_kanban_data(doctype, fieldname, fields=None, filters=None, order_by=None, limit_page_length=200):
	"""
	Fetch records for a Kanban board grouped by a status/select field.

	Args:
		doctype: The DocType to fetch records from
		fieldname: The field to group cards by (usually a Select/Link field)
		fields: List of fields to include in each card
		filters: Additional filters dict
		order_by: Sort order (default: 'modified desc')
		limit_page_length: Max records (default: 200)

	Returns:
		dict with 'cards' list and 'columns' metadata
	"""
	frappe.only_for(["System Manager"])
	frappe.has_permission(doctype, "read", throw=True)

	if isinstance(fields, str):
		import json
		fields = json.loads(fields)
	if isinstance(filters, str):
		import json
		filters = json.loads(filters)

	if not fields:
		fields = ["name", fieldname, "modified"]

	# Ensure required fields are present
	required = {"name", fieldname, "modified"}
	fields = list(set(fields) | required)

	# Validate fieldname exists in the DocType
	meta = frappe.get_meta(doctype)
	valid_fields = {df.fieldname for df in meta.fields}
	valid_fields.add("name")
	valid_fields.add("modified")
	valid_fields.add("creation")
	valid_fields.add("owner")
	valid_fields.add("_comments")
	valid_fields.add("_assign")

	# Filter to only valid fields
	fields = [f for f in fields if f in valid_fields]

	if not order_by:
		order_by = "modified desc"

	cards = frappe.get_list(
		doctype,
		fields=fields,
		filters=filters or {},
		order_by=order_by,
		limit_page_length=int(limit_page_length),
	)

	# Enrich cards with comment count and tags
	for card in cards:
		card["_doctype"] = doctype
		# Extract comment count from _comments
		if "_comments" in card and card["_comments"]:
			import json as _json
			try:
				card["_comment_count"] = len(_json.loads(card["_comments"]))
			except Exception:
				card["_comment_count"] = 0
		else:
			card["_comment_count"] = 0

		# Clean up _comments from response (it's large JSON)
		card.pop("_comments", None)

	# Get column definitions from the Select field options
	columns = []
	field_meta = meta.get_field(fieldname)
	if field_meta and field_meta.fieldtype == "Select" and field_meta.options:
		for option in field_meta.options.split("\n"):
			option = option.strip()
			if option:
				columns.append({"value": option, "label": _(option)})

	return {
		"cards": cards,
		"columns": columns,
		"total": len(cards),
	}


# ═══════════════════════════════════════════════════════════════════════════
# BILINGUAL TOOLTIP SUPPORT
# ═══════════════════════════════════════════════════════════════════════════

@frappe.whitelist(allow_guest=True)
def get_reverse_translation(arabic_text):
	"""
	Find the English source string for a given Arabic translation.
	Used by bilingual_tooltip.js to show English hints on Arabic text.

	Args:
	    arabic_text: The Arabic string to look up

	Returns:
	    The English source string if found, else None
	"""
	if not arabic_text or not isinstance(arabic_text, str):
		return None

	arabic_text = arabic_text.strip()
	if not arabic_text:
		return None

	# Try frappe's translation cache first (reverse lookup)
	try:
		# Get all translations for Arabic
		translations = frappe.get_all(
			"Translation",
			filters={
				"language": ["in", ["ar", "ar-SA", "ar-EG", "ar-AE"]],
				"translated_text": arabic_text,
			},
			fields=["source_text"],
			limit=1,
		)
		if translations:
			return translations[0].source_text

		# Also check partial match for longer strings
		if len(arabic_text) > 5:
			translations = frappe.get_all(
				"Translation",
				filters={
					"language": ["in", ["ar", "ar-SA", "ar-EG", "ar-AE"]],
					"translated_text": ["like", f"%{arabic_text}%"],
				},
				fields=["source_text", "translated_text"],
				limit=5,
			)
			for t in translations:
				if t.translated_text.strip() == arabic_text:
					return t.source_text
	except Exception:
		pass

	return None


@frappe.whitelist()
def get_tree_data(doctype, parent_field="parent"):
	"""
	Get hierarchical tree data for a DocType with a self-referencing parent field.

	Args:
	    doctype: The DocType name
	    parent_field: The field that contains the parent reference

	Returns:
	    Nested tree structure suitable for VisualTreeView
	"""
	frappe.has_permission(doctype, "read", throw=True)

	# Get all records
	records = frappe.get_all(
		doctype,
		fields=["name", parent_field, "modified"],
		filters={},
		order_by="name",
		limit_page_length=0,
	)

	# Build lookup
	lookup = {r.name: r for r in records}
	children_map = {}

	for r in records:
		parent = r.get(parent_field)
		if parent:
			if parent not in children_map:
				children_map[parent] = []
			children_map[parent].append(r.name)

	def build_tree(name, depth=0):
		"""Recursively build tree node."""
		node = {
			"id": name,
			"label": name,
			"children": [],
			"depth": depth,
		}
		if name in children_map:
			for child_name in children_map[name]:
				node["children"].append(build_tree(child_name, depth + 1))
		return node

	# Find root nodes (no parent or parent not in records)
	roots = []
	for r in records:
		parent = r.get(parent_field)
		if not parent or parent not in lookup:
			roots.append(build_tree(r.name))

	return roots
