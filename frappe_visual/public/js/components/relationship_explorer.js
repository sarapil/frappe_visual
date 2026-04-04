// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * RelationshipExplorer — DocType Relationship Graph
 * ====================================================
 * Explores relationships radiating from a single DocType.
 * Supports: depth-based expansion, load-more, type filtering.
 */

import { GraphEngine } from "../core/graph_engine";
import { LayoutManager } from "../core/layout_manager";
import { DataAdapter } from "../utils/data_adapter";

export class RelationshipExplorer {
	/**
	 * @param {string|HTMLElement} container
	 * @param {string} doctype - Root DocType name
	 * @param {Object} [opts] - { depth: 2, layout: "elk-radial", ... }
	 */
	static async create(container, doctype, opts = {}) {
		const instance = new RelationshipExplorer(container, doctype, opts);
		await instance.init();
		return instance;
	}

	constructor(container, doctype, opts) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		this.rootDoctype = doctype;
		this.opts = Object.assign({ depth: 2, layout: "elk-radial" }, opts);
		this.engine = null;
	}

	async init() {
		this.container.innerHTML = "";

		// Graph container
		const graphEl = document.createElement("div");
		graphEl.style.cssText = "width:100%;height:500px;";
		this.container.appendChild(graphEl);

		try {
			let data;
			if (this.opts.data) {
				data = this.opts.data;
			} else {
				data = await DataAdapter.fetchDoctypeRelationships(
					this.rootDoctype,
					this.opts.depth
				);
			}

			this.engine = new GraphEngine({
				container: graphEl,
				nodes: data.nodes,
				edges: data.edges,
				layout: this.opts.layout,
				minimap: true,
				contextMenu: true,
				animate: true,
				antLines: false,
				pulseNodes: true,
				onNodeDblClick: (nodeData) => {
					if (nodeData.doctype) {
						this._expandNode(nodeData.doctype);
					}
				},
				...this.opts,
			});

			// Toolbar
			const toolbar = document.createElement("div");
			toolbar.style.marginTop = "8px";
			LayoutManager.createToolbar(toolbar, this.engine, this.opts.layout);
			this.container.appendChild(toolbar);
		} catch (err) {
			this.container.innerHTML = `<div style="color:var(--fv-danger);padding:16px;">${err.message}</div>`;
		}
	}

	async _expandNode(doctype) {
		try {
			const data = await DataAdapter.fetchDoctypeRelationships(doctype, 1);
			// Add only new nodes
			const existingIds = new Set(
				this.engine.cy.nodes().map((n) => n.id())
			);
			const newNodes = data.nodes.filter((n) => !existingIds.has(n.id));
			const newEdges = data.edges.filter(
				(e) =>
					!this.engine.cy.getElementById(e.id || `${e.source}-${e.target}`)
						.length
			);

			if (newNodes.length > 0) {
				this.engine.addNodes(newNodes);
				if (newEdges.length) this.engine.addEdges(newEdges);
				this.engine.runLayout(this.opts.layout);

				// Animate new nodes
				if (this.engine.animEngine) {
					this.engine.animEngine.animateNodeEnter(
						newNodes.map((n) => n.id)
					);
				}
			}
		} catch (err) {
			frappe.show_alert({ message: err.message, indicator: "red" });
		}
	}

	destroy() {
		if (this.engine) this.engine.destroy();
		this.container.innerHTML = "";
	}
}
