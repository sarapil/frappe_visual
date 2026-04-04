/**
 * SortableHeaders — Click-to-sort column headers with tri-state indicators
 *
 * frappe.visual.SortableHeaders.create({
 *   table: tableElement,
 *   columns: [{ key: "name", sortable: true, comparator: null }],
 *   data: arrayOfRowObjects,
 *   onSort: (key, direction) => {},   // "asc" | "desc" | null
 *   multiSort: false,                  // allow multiple column sort
 *   renderRow: (rowObj) => trElement,  // optional custom row renderer
 *   theme: "glass",
 * })
 */
export class SortableHeaders {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			table: null,
			columns: [],
			data: [],
			onSort: null,
			multiSort: false,
			renderRow: null,
			theme: "glass",
		}, opts);

		const table = typeof o.table === "string" ? document.querySelector(o.table) : o.table;
		if (!table) return null;

		table.classList.add("fv-sortable-headers__table", `fv-sortable-headers--${o.theme}`);

		// sortState: Map<key, "asc"|"desc">
		const sortState = new Map();

		const headerRow = table.querySelector("thead tr");
		if (!headerRow) return null;

		const headers = Array.from(headerRow.children);

		headers.forEach((th, i) => {
			const col = o.columns[i];
			if (!col || col.sortable === false) return;

			th.classList.add("fv-sortable-headers__header", "fv-sortable-headers__header--sortable");
			th.style.cursor = "pointer";
			th.setAttribute("role", "columnheader");
			th.setAttribute("aria-sort", "none");

			// Add sort indicator
			const indicator = document.createElement("span");
			indicator.className = "fv-sortable-headers__indicator";
			indicator.innerHTML = _sortIcon(null);
			th.appendChild(indicator);

			th.addEventListener("click", () => {
				const key = col.key;
				const current = sortState.get(key);
				let next;

				if (!current) next = "asc";
				else if (current === "asc") next = "desc";
				else next = null;

				if (!o.multiSort) sortState.clear();

				if (next) sortState.set(key, next);
				else sortState.delete(key);

				applySort();
				updateIndicators();
				if (o.onSort) o.onSort(key, next);
			});
		});

		function applySort() {
			if (sortState.size === 0) {
				// Reset to original order — re-render original data
				renderBody(o.data);
				return;
			}

			const sorted = [...o.data].sort((a, b) => {
				for (const [key, dir] of sortState) {
					const col = o.columns.find(c => c.key === key);
					let cmp = 0;
					if (col && col.comparator) {
						cmp = col.comparator(a[key], b[key]);
					} else {
						const va = a[key], vb = b[key];
						if (va == null && vb == null) cmp = 0;
						else if (va == null) cmp = -1;
						else if (vb == null) cmp = 1;
						else if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
						else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" });
					}
					if (dir === "desc") cmp = -cmp;
					if (cmp !== 0) return cmp;
				}
				return 0;
			});

			renderBody(sorted);
		}

		function renderBody(data) {
			const tbody = table.querySelector("tbody");
			if (!tbody) return;

			if (o.renderRow) {
				tbody.innerHTML = "";
				data.forEach(row => {
					const tr = o.renderRow(row);
					if (tr) tbody.appendChild(tr);
				});
			} else {
				// Simple re-order: match by data index
				const rows = Array.from(tbody.querySelectorAll("tr"));
				const rowMap = new Map();
				rows.forEach((tr, i) => rowMap.set(i, tr));

				const indices = data.map(d => o.data.indexOf(d));
				tbody.innerHTML = "";
				indices.forEach(i => {
					const tr = rowMap.get(i);
					if (tr) tbody.appendChild(tr);
				});
			}
		}

		function updateIndicators() {
			headers.forEach((th, i) => {
				const col = o.columns[i];
				if (!col || col.sortable === false) return;

				const indicator = th.querySelector(".fv-sortable-headers__indicator");
				const dir = sortState.get(col.key) || null;

				indicator.innerHTML = _sortIcon(dir);
				th.setAttribute("aria-sort", dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none");
				th.classList.toggle("fv-sortable-headers__header--asc", dir === "asc");
				th.classList.toggle("fv-sortable-headers__header--desc", dir === "desc");
			});
		}

		function _sortIcon(dir) {
			if (dir === "asc") {
				return `<svg class="fv-sortable-headers__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>`;
			}
			if (dir === "desc") {
				return `<svg class="fv-sortable-headers__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`;
			}
			return `<svg class="fv-sortable-headers__icon fv-sortable-headers__icon--neutral" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"><path d="M12 5v14"/></svg>`;
		}

		return {
			table,
			getSortState: () => Object.fromEntries(sortState),
			sort(key, dir) {
				if (!o.multiSort) sortState.clear();
				if (dir) sortState.set(key, dir);
				else sortState.delete(key);
				applySort();
				updateIndicators();
			},
			clearSort() { sortState.clear(); applySort(); updateIndicators(); },
			destroy() {
				headers.forEach(th => {
					th.classList.remove("fv-sortable-headers__header", "fv-sortable-headers__header--sortable");
					const ind = th.querySelector(".fv-sortable-headers__indicator");
					if (ind) ind.remove();
				});
				table.classList.remove("fv-sortable-headers__table");
			},
		};
	}
}
