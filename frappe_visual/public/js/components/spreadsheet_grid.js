/**
 * SpreadsheetGrid — Lightweight spreadsheet-like editable grid
 *
 * frappe.visual.SpreadsheetGrid.create({
 *   container: el,
 *   columns: [{ key: "name", label: "Name", width: 150, editable: true, type: "text" }],
 *   data: [[row1col1, row1col2], ...],
 *   rowHeight: 32,
 *   showRowNumbers: true,
 *   showHeaders: true,
 *   onChange: (row, col, oldVal, newVal) => {},
 *   onSelectionChange: (selection) => {},
 *   theme: "glass",        // glass | flat | minimal
 * })
 */
export class SpreadsheetGrid {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			columns: [],
			data: [],
			rowHeight: 32,
			showRowNumbers: true,
			showHeaders: true,
			onChange: null,
			onSelectionChange: null,
			readOnly: false,
			theme: "glass",
			className: "",
		}, opts);

		const el = document.createElement("div");
		el.className = `fv-spreadsheet-grid fv-spreadsheet-grid--${o.theme} ${o.className}`.trim();

		let activeCell = null; // {row, col}
		let selection = null; // {startRow, startCol, endRow, endCol}
		let editing = false;

		function colCount() { return o.columns.length; }
		function rowCount() { return o.data.length; }

		function getCellValue(r, c) {
			if (o.data[r] && o.data[r][c] !== undefined) return o.data[r][c];
			return "";
		}

		function setCellValue(r, c, val) {
			if (!o.data[r]) o.data[r] = [];
			const old = o.data[r][c];
			o.data[r][c] = val;
			if (o.onChange) o.onChange(r, c, old, val);
		}

		function render() {
			const table = document.createElement("table");
			table.className = "fv-spreadsheet-grid__table";

			// Header
			if (o.showHeaders) {
				const thead = document.createElement("thead");
				const hrow = document.createElement("tr");
				if (o.showRowNumbers) {
					const th = document.createElement("th");
					th.className = "fv-spreadsheet-grid__corner";
					hrow.appendChild(th);
				}
				o.columns.forEach((col, ci) => {
					const th = document.createElement("th");
					th.className = "fv-spreadsheet-grid__header";
					th.style.width = col.width ? col.width + "px" : "auto";
					th.textContent = col.label || col.key;
					th.dataset.col = ci;
					hrow.appendChild(th);
				});
				thead.appendChild(hrow);
				table.appendChild(thead);
			}

			// Body
			const tbody = document.createElement("tbody");
			for (let ri = 0; ri < rowCount(); ri++) {
				const tr = document.createElement("tr");
				tr.style.height = o.rowHeight + "px";

				if (o.showRowNumbers) {
					const td = document.createElement("td");
					td.className = "fv-spreadsheet-grid__row-num";
					td.textContent = ri + 1;
					tr.appendChild(td);
				}

				for (let ci = 0; ci < colCount(); ci++) {
					const td = document.createElement("td");
					td.className = "fv-spreadsheet-grid__cell";
					td.dataset.row = ri;
					td.dataset.col = ci;
					td.textContent = getCellValue(ri, ci);

					if (activeCell && activeCell.row === ri && activeCell.col === ci) {
						td.classList.add("fv-spreadsheet-grid__cell--active");
					}
					if (selection && ri >= Math.min(selection.startRow, selection.endRow) &&
						ri <= Math.max(selection.startRow, selection.endRow) &&
						ci >= Math.min(selection.startCol, selection.endCol) &&
						ci <= Math.max(selection.startCol, selection.endCol)) {
						td.classList.add("fv-spreadsheet-grid__cell--selected");
					}

					td.addEventListener("click", () => selectCell(ri, ci));
					td.addEventListener("dblclick", () => startEdit(ri, ci));
					tr.appendChild(td);
				}
				tbody.appendChild(tr);
			}
			table.appendChild(tbody);

			el.innerHTML = "";
			el.appendChild(table);
		}

		function selectCell(r, c) {
			activeCell = { row: r, col: c };
			selection = { startRow: r, startCol: c, endRow: r, endCol: c };
			if (o.onSelectionChange) o.onSelectionChange({ ...selection });
			render();
		}

		function startEdit(r, c) {
			if (o.readOnly) return;
			const col = o.columns[c];
			if (col && col.editable === false) return;
			editing = true;
			render();

			const cell = el.querySelector(`[data-row="${r}"][data-col="${c}"]`);
			if (!cell) return;
			const input = document.createElement("input");
			input.type = "text";
			input.className = "fv-spreadsheet-grid__input";
			input.value = getCellValue(r, c);
			cell.textContent = "";
			cell.appendChild(input);
			input.focus();
			input.select();

			const finish = () => {
				setCellValue(r, c, input.value);
				editing = false;
				render();
			};
			input.addEventListener("blur", finish);
			input.addEventListener("keydown", e => {
				if (e.key === "Enter") { finish(); if (r < rowCount() - 1) selectCell(r + 1, c); }
				if (e.key === "Tab") { e.preventDefault(); finish(); if (c < colCount() - 1) selectCell(r, c + 1); else if (r < rowCount() - 1) selectCell(r + 1, 0); }
				if (e.key === "Escape") { editing = false; render(); }
			});
		}

		// Keyboard navigation
		el.tabIndex = 0;
		el.addEventListener("keydown", e => {
			if (editing || !activeCell) return;
			const { row: r, col: c } = activeCell;
			if (e.key === "ArrowUp" && r > 0) { e.preventDefault(); selectCell(r - 1, c); }
			if (e.key === "ArrowDown" && r < rowCount() - 1) { e.preventDefault(); selectCell(r + 1, c); }
			if (e.key === "ArrowLeft" && c > 0) { e.preventDefault(); selectCell(r, c - 1); }
			if (e.key === "ArrowRight" && c < colCount() - 1) { e.preventDefault(); selectCell(r, c + 1); }
			if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(r, c); }
			if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); setCellValue(r, c, ""); render(); }
		});

		if (o.container) o.container.appendChild(el);
		render();

		return {
			el,
			getData: () => JSON.parse(JSON.stringify(o.data)),
			setData(d) { o.data = d; render(); },
			getCell: (r, c) => getCellValue(r, c),
			setCell(r, c, v) { setCellValue(r, c, v); render(); },
			addRow(row) { o.data.push(row || new Array(colCount()).fill("")); render(); },
			removeRow(i) { o.data.splice(i, 1); render(); },
			getSelection: () => selection ? { ...selection } : null,
			refresh: render,
			destroy() { el.remove(); },
		};
	}
}
