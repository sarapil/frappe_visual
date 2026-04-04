// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * ComboGroup — Collapsible Node Groups with Summary
 * ====================================================
 * Utility for creating compound nodes that show summary badges when collapsed.
 */

export class ComboGroup {
	/**
	 * Create a combo group definition.
	 * @param {Object} opts
	 * @param {string} opts.id
	 * @param {string} opts.label
	 * @param {Array} opts.children - Child node IDs
	 * @param {Object} [opts.summary] - { total, completed, failed }
	 * @param {string} [opts.type]
	 */
	static define(opts) {
		return {
			id: opts.id,
			label: opts.label,
			type: opts.type || "group",
			parent: opts.parent || undefined,
			childCount: (opts.children || []).length,
			summary: opts.summary || null,
			children: opts.children || [],
		};
	}

	/**
	 * Build the summary badge HTML for a collapsed group.
	 * @param {Object} summary - { total, completed, failed, pending }
	 */
	static buildBadgeHTML(summary) {
		if (!summary) return "";
		const parts = [];
		if (summary.total) parts.push(`${summary.total} items`);
		if (summary.completed) parts.push(`<span class="fv-summary-check">${summary.completed}✓</span>`);
		if (summary.failed) parts.push(`<span class="fv-summary-cross">${summary.failed}✗</span>`);
		if (summary.pending) parts.push(`${summary.pending}⏳`);

		return `<div class="fv-summary-badge">${parts.join(" · ")}</div>`;
	}
}
