/**
 * DataAdapter — Frappe ↔ Graph Data Bridge
 * ==========================================
 * Fetches Frappe metadata (modules, doctypes, links, permissions)
 * and converts them into graph node/edge format for the engine.
 */

import { ColorSystem } from "./color_system";

export class DataAdapter {
	/**
	 * Fetch all modules and their doctypes for a given app.
	 * Returns { nodes: [...], edges: [...] }
	 */
	static async fetchAppMap(appName) {
		const result = await frappe.xcall(
			"frappe_visual.api.get_app_map",
			{ app_name: appName }
		);
		return DataAdapter.transformAppMap(result);
	}

	/**
	 * Transform server response into graph format.
	 */
	static transformAppMap(data) {
		const nodes = [];
		const edges = [];

		// App root node
		nodes.push({
			id: `app-${data.app_name}`,
			label: data.app_title || data.app_name,
			type: "workspace",
			icon: "📦",
		});

		// Modules
		(data.modules || []).forEach((mod) => {
			const modId = `mod-${mod.name}`;
			nodes.push({
				id: modId,
				label: mod.label || mod.name,
				type: "module",
				parent: `app-${data.app_name}`,
				meta: { module: mod.name },
				summary: {
					[__("DocTypes")]: mod.doctypes?.length || 0,
					[__("Reports")]: mod.reports?.length || 0,
				},
			});

			// DocTypes in module
			(mod.doctypes || []).forEach((dt) => {
				const dtId = `dt-${dt.name}`;
				nodes.push({
					id: dtId,
					label: dt.name,
					type: DataAdapter._classifyDocType(dt),
					parent: modId,
					doctype: dt.name,
					meta: dt,
					status: dt.is_virtual ? "disabled" : null,
					summary: {
						[__("Fields")]: dt.field_count || "?",
						[__("Records")]: dt.count || "?",
					},
				});

				// Link fields → edges
				(dt.links || []).forEach((link) => {
					const targetId = `dt-${link.options}`;
					edges.push({
						source: dtId,
						target: targetId,
						label: link.fieldname,
						type: link.fieldtype === "Table" ? "child" : "link",
					});
				});
			});

			// Reports
			(mod.reports || []).forEach((rpt) => {
				const rptId = `rpt-${rpt.name}`;
				nodes.push({
					id: rptId,
					label: rpt.name,
					type: "report",
					parent: modId,
					meta: rpt,
				});

				if (rpt.ref_doctype) {
					edges.push({
						source: rptId,
						target: `dt-${rpt.ref_doctype}`,
						type: "reference",
						label: "based on",
					});
				}
			});
		});

		return { nodes, edges };
	}

	/**
	 * Fetch DocType relationships for a specific doctype.
	 */
	static async fetchDoctypeRelationships(doctype, depth = 2) {
		const result = await frappe.xcall(
			"frappe_visual.api.get_doctype_relationships",
			{ doctype, depth }
		);
		return DataAdapter.transformRelationships(result, doctype);
	}

	static transformRelationships(data, rootDoctype) {
		const nodes = [];
		const edges = [];
		const seen = new Set();

		function addDocType(dt, level) {
			if (seen.has(dt.name)) return;
			seen.add(dt.name);

			nodes.push({
				id: `dt-${dt.name}`,
				label: dt.name,
				type: DataAdapter._classifyDocType(dt),
				doctype: dt.name,
				meta: dt,
				summary: {
					[__("Fields")]: dt.field_count || "?",
					[__("Links")]: dt.link_count || "?",
				},
			});
		}

		// Root
		addDocType(data.root, 0);

		// Related doctypes
		(data.relationships || []).forEach((rel) => {
			addDocType(rel.doctype, rel.level);
			edges.push({
				source: `dt-${rel.source}`,
				target: `dt-${rel.doctype.name}`,
				label: rel.fieldname,
				type: rel.type,
			});
		});

		return { nodes, edges };
	}

	/**
	 * Classify a DocType into a visual category.
	 */
	static _classifyDocType(dt) {
		if (dt.istable) return "child-table";
		if (dt.issingle) return "settings";
		if (dt.is_submittable) return "transaction";
		if (dt.name.includes("Log") || dt.name.includes("History")) return "log";
		if (dt.name.includes("Settings") || dt.name.includes("Configuration"))
			return "settings";
		return "doctype";
	}

	/**
	 * Fetch workspace structure.
	 */
	static async fetchWorkspaceMap() {
		const workspaces = await frappe.xcall("frappe.client.get_list", {
			doctype: "Workspace",
			fields: ["name", "title", "module", "parent_page", "is_hidden"],
			limit_page_length: 0,
		});

		const nodes = [];
		const edges = [];

		workspaces.forEach((ws) => {
			nodes.push({
				id: `ws-${ws.name}`,
				label: ws.title || ws.name,
				type: "workspace",
				meta: ws,
				status: ws.is_hidden ? "disabled" : "active",
			});

			if (ws.parent_page) {
				edges.push({
					source: `ws-${ws.parent_page}`,
					target: `ws-${ws.name}`,
					type: "child",
				});
			}
		});

		return { nodes, edges };
	}

	/**
	 * Generic list-to-nodes converter.
	 * @param {Array} items - Flat data array
	 * @param {Object} mapping - { id, label, type, parent, ... }
	 */
	static listToNodes(items, mapping) {
		return items.map((item) => ({
			id: mapping.id ? (typeof mapping.id === "function" ? mapping.id(item) : item[mapping.id]) : item.name,
			label: mapping.label ? (typeof mapping.label === "function" ? mapping.label(item) : item[mapping.label]) : item.name,
			type: mapping.type ? (typeof mapping.type === "function" ? mapping.type(item) : mapping.type) : "default",
			parent: mapping.parent ? (typeof mapping.parent === "function" ? mapping.parent(item) : item[mapping.parent]) : undefined,
			doctype: mapping.doctype || null,
			docname: item.name,
			meta: item,
			status: mapping.status ? (typeof mapping.status === "function" ? mapping.status(item) : item[mapping.status]) : null,
			summary: mapping.summary ? mapping.summary(item) : null,
		}));
	}

	/**
	 * Build edges from parent-child relationships.
	 */
	static buildParentEdges(nodes, parentField = "parent") {
		return nodes
			.filter((n) => n.data?.parent || n.parent)
			.map((n) => ({
				source: n.data?.parent || n.parent,
				target: n.data?.id || n.id,
				type: "child",
			}));
	}

	/**
	 * Load more items (pagination) for a node.
	 */
	static async loadMore(doctype, filters = {}, start = 0, limit = 20) {
		const items = await frappe.xcall("frappe.client.get_list", {
			doctype: doctype,
			fields: ["name", "modified", "owner"],
			filters: filters,
			order_by: "modified desc",
			limit_start: start,
			limit_page_length: limit,
		});

		return items;
	}
}
