/**
 * RowExpander — Expandable/collapsible row detail panels for tables
 *
 * frappe.visual.RowExpander.create({
 *   table: tableElement,
 *   renderDetail: (rowData, rowIndex) => htmlString,
 *   getRowData: (rowIndex) => object,
 *   expandIcon: "chevron-right",
 *   collapseIcon: "chevron-down",
 *   animation: true,            // smooth expand/collapse
 *   accordion: false,           // only one expanded at a time
 *   onExpand: (rowIndex) => {},
 *   onCollapse: (rowIndex) => {},
 *   theme: "glass",
 * })
 */
export class RowExpander {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			table: null,
			renderDetail: (data, i) => `<div class="fv-row-expander__placeholder">Detail row ${i}</div>`,
			getRowData: (i) => ({}),
			expandIcon: "chevron-right",
			collapseIcon: "chevron-down",
			animation: true,
			accordion: false,
			onExpand: null,
			onCollapse: null,
			theme: "glass",
		}, opts);

		const table = typeof o.table === "string" ? document.querySelector(o.table) : o.table;
		if (!table) return null;

		table.classList.add("fv-row-expander__table", `fv-row-expander--${o.theme}`);
		const expanded = new Set();
		const detailRows = new Map();

		// Add toggle column to header
		const headerRow = table.querySelector("thead tr");
		if (headerRow) {
			const th = document.createElement("th");
			th.className = "fv-row-expander__toggle-header";
			th.style.width = "40px";
			headerRow.insertBefore(th, headerRow.firstChild);
		}

		// Process body rows
		const tbody = table.querySelector("tbody") || table;
		const rows = Array.from(tbody.querySelectorAll("tr"));

		rows.forEach((row, ri) => {
			const td = document.createElement("td");
			td.className = "fv-row-expander__toggle-cell";
			const btn = document.createElement("button");
			btn.className = "fv-row-expander__toggle-btn";
			btn.type = "button";
			btn.innerHTML = _chevron(o.expandIcon);
			btn.setAttribute("aria-expanded", "false");
			btn.setAttribute("aria-label", "Expand row");

			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				if (expanded.has(ri)) {
					collapseRow(ri);
				} else {
					expandRow(ri);
				}
			});

			td.appendChild(btn);
			row.insertBefore(td, row.firstChild);
		});

		function expandRow(ri) {
			if (o.accordion) {
				expanded.forEach(idx => collapseRow(idx));
			}

			expanded.add(ri);
			const row = rows[ri];
			const btn = row.querySelector(".fv-row-expander__toggle-btn");
			btn.innerHTML = _chevron(o.collapseIcon);
			btn.setAttribute("aria-expanded", "true");

			const colSpan = row.children.length;
			const detailTr = document.createElement("tr");
			detailTr.className = "fv-row-expander__detail-row";
			const detailTd = document.createElement("td");
			detailTd.colSpan = colSpan;
			detailTd.className = "fv-row-expander__detail-cell";

			const content = document.createElement("div");
			content.className = "fv-row-expander__detail-content";
			content.innerHTML = o.renderDetail(o.getRowData(ri), ri);

			if (o.animation) {
				content.style.maxHeight = "0";
				content.style.overflow = "hidden";
				content.style.transition = "max-height 0.3s ease";
			}

			detailTd.appendChild(content);
			detailTr.appendChild(detailTd);
			row.after(detailTr);
			detailRows.set(ri, detailTr);

			if (o.animation) {
				requestAnimationFrame(() => {
					content.style.maxHeight = content.scrollHeight + "px";
				});
			}

			if (o.onExpand) o.onExpand(ri);
		}

		function collapseRow(ri) {
			expanded.delete(ri);
			const row = rows[ri];
			const btn = row.querySelector(".fv-row-expander__toggle-btn");
			btn.innerHTML = _chevron(o.expandIcon);
			btn.setAttribute("aria-expanded", "false");

			const detailTr = detailRows.get(ri);
			if (detailTr) {
				if (o.animation) {
					const content = detailTr.querySelector(".fv-row-expander__detail-content");
					content.style.maxHeight = "0";
					setTimeout(() => detailTr.remove(), 300);
				} else {
					detailTr.remove();
				}
				detailRows.delete(ri);
			}

			if (o.onCollapse) o.onCollapse(ri);
		}

		function _chevron(name) {
			return `<svg class="fv-row-expander__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${name === "chevron-down" ? "M6 9l6 6 6-6" : "M9 18l6-6-6-6"}"/></svg>`;
		}

		return {
			table,
			expand(ri) { expandRow(ri); },
			collapse(ri) { collapseRow(ri); },
			toggle(ri) { expanded.has(ri) ? collapseRow(ri) : expandRow(ri); },
			expandAll() { rows.forEach((_, i) => expandRow(i)); },
			collapseAll() { [...expanded].forEach(i => collapseRow(i)); },
			isExpanded: (ri) => expanded.has(ri),
			getExpanded: () => [...expanded],
			destroy() {
				detailRows.forEach(tr => tr.remove());
				table.querySelectorAll(".fv-row-expander__toggle-cell, .fv-row-expander__toggle-header").forEach(e => e.remove());
				table.classList.remove("fv-row-expander__table");
			},
		};
	}
}
