/**
 * SummaryBadge — Compact status indicators
 */

export class SummaryBadge {
	/**
	 * Create a summary badge element.
	 * @param {Object} data - { total, completed, failed, pending, label }
	 */
	static create(data) {
		const el = document.createElement("div");
		el.className = "fv-summary-badge";

		const parts = [];
		if (data.label) parts.push(`<span class="fv-summary-label">${data.label}</span>`);
		if (data.total !== undefined) parts.push(`<span class="fv-summary-count">${data.total}</span>`);
		if (data.completed) parts.push(`<span class="fv-summary-check">${data.completed}✓</span>`);
		if (data.failed) parts.push(`<span class="fv-summary-cross">${data.failed}✗</span>`);

		el.innerHTML = parts.join(" · ");
		return el;
	}
}
