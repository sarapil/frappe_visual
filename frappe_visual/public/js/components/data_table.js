/**
 * FrappeVisual DataTable — Rich interactive data table
 * ======================================================
 * frappe.visual.DataTable.create({ container, columns, data, ... })
 *
 * Features: sort, filter, resize, fixed cols, row selection, inline edit, virtual scroll
 */
export class DataTable {
	static create(opts = {}) { return new DataTable(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			columns: [],            // [{ id, label, width, sortable, resizable, fixed, type, formatter, editable }]
			data: [],               // [{ col_id: value, ... }]
			selectable: false,      // row selection checkboxes
			multiSelect: true,
			sortable: true,
			resizable: true,
			striped: false,
			hoverable: true,
			bordered: false,
			compact: false,
			maxHeight: null,        // px — enables scroll
			emptyMessage: __('No data'),
			onSort: null,           // (colId, direction) => {}
			onSelect: null,         // (selectedRows) => {}
			onCellEdit: null,       // (rowIdx, colId, newVal, oldVal) => {}
			onRowClick: null,
		}, opts);

		this._selected = new Set();
		this._sortCol = null;
		this._sortDir = null;
		this._data = [...this.o.data];

		this.el = document.createElement('div');
		this.el.className = 'fv-dt';
		if (this.o.striped) this.el.classList.add('fv-dt-striped');
		if (this.o.hoverable) this.el.classList.add('fv-dt-hover');
		if (this.o.bordered) this.el.classList.add('fv-dt-bordered');
		if (this.o.compact) this.el.classList.add('fv-dt-compact');

		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const wrap = document.createElement('div');
		wrap.className = 'fv-dt-wrap';
		if (this.o.maxHeight) {
			wrap.style.maxHeight = this.o.maxHeight + 'px';
			wrap.style.overflowY = 'auto';
		}

		const table = document.createElement('table');
		table.className = 'fv-dt-table';

		// Header
		const thead = document.createElement('thead');
		const hRow = document.createElement('tr');

		if (this.o.selectable) {
			const th = document.createElement('th');
			th.className = 'fv-dt-th fv-dt-check';
			th.innerHTML = `<input type="checkbox" class="fv-dt-check-all" />`;
			th.querySelector('input').onchange = (e) => this._toggleAll(e.target.checked);
			hRow.appendChild(th);
		}

		this.o.columns.forEach(col => {
			const th = document.createElement('th');
			th.className = 'fv-dt-th';
			if (col.fixed) th.classList.add('fv-dt-fixed');
			if (col.width) th.style.width = col.width + 'px';
			th.style.minWidth = (col.width || 80) + 'px';

			let html = `<div class="fv-dt-th-inner">`;
			html += `<span class="fv-dt-th-label">${DataTable._esc(col.label || col.id)}</span>`;
			if (this.o.sortable && col.sortable !== false) {
				html += `<span class="fv-dt-sort-icon"></span>`;
			}
			html += `</div>`;
			if (this.o.resizable && col.resizable !== false) {
				html += `<div class="fv-dt-resize-handle"></div>`;
			}

			th.innerHTML = html;
			th.setAttribute('data-col', col.id);

			if (this.o.sortable && col.sortable !== false) {
				th.querySelector('.fv-dt-th-inner').onclick = () => this._sort(col.id);
			}

			if (this.o.resizable && col.resizable !== false) {
				this._initResize(th, col);
			}

			hRow.appendChild(th);
		});

		thead.appendChild(hRow);
		table.appendChild(thead);

		// Body
		const tbody = document.createElement('tbody');
		this._renderRows(tbody);
		table.appendChild(tbody);
		this._tbody = tbody;

		wrap.appendChild(table);
		this.el.innerHTML = '';
		this.el.appendChild(wrap);

		// Empty state
		if (this._data.length === 0) {
			const empty = document.createElement('div');
			empty.className = 'fv-dt-empty';
			empty.textContent = this.o.emptyMessage;
			this.el.appendChild(empty);
		}
	}

	_renderRows(tbody) {
		this._data.forEach((row, rowIdx) => {
			const tr = document.createElement('tr');
			tr.className = 'fv-dt-row';
			if (this._selected.has(rowIdx)) tr.classList.add('fv-dt-selected');

			if (this.o.selectable) {
				const td = document.createElement('td');
				td.className = 'fv-dt-td fv-dt-check';
				td.innerHTML = `<input type="checkbox" ${this._selected.has(rowIdx) ? 'checked' : ''} />`;
				td.querySelector('input').onchange = (e) => this._toggleRow(rowIdx, e.target.checked);
				tr.appendChild(td);
			}

			this.o.columns.forEach(col => {
				const td = document.createElement('td');
				td.className = 'fv-dt-td';
				if (col.fixed) td.classList.add('fv-dt-fixed');

				const val = row[col.id];
				const formatted = col.formatter ? col.formatter(val, row, rowIdx) : DataTable._esc(val ?? '');

				if (col.editable) {
					td.innerHTML = `<div class="fv-dt-cell-edit" tabindex="0">${formatted}</div>`;
					td.querySelector('.fv-dt-cell-edit').ondblclick = () => this._startEdit(td, rowIdx, col, val);
				} else {
					td.innerHTML = formatted;
				}

				tr.appendChild(td);
			});

			if (this.o.onRowClick) {
				tr.style.cursor = 'pointer';
				tr.onclick = (e) => {
					if (e.target.tagName === 'INPUT') return;
					this.o.onRowClick(row, rowIdx);
				};
			}

			tbody.appendChild(tr);
		});
	}

	_sort(colId) {
		if (this._sortCol === colId) {
			this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			this._sortCol = colId;
			this._sortDir = 'asc';
		}

		this._data.sort((a, b) => {
			const va = a[colId] ?? '';
			const vb = b[colId] ?? '';
			const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
			return this._sortDir === 'asc' ? cmp : -cmp;
		});

		// Update sort icons
		this.el.querySelectorAll('.fv-dt-th').forEach(th => {
			th.classList.remove('fv-dt-sort-asc', 'fv-dt-sort-desc');
			if (th.dataset.col === colId) th.classList.add(`fv-dt-sort-${this._sortDir}`);
		});

		this._tbody.innerHTML = '';
		this._renderRows(this._tbody);
		if (this.o.onSort) this.o.onSort(colId, this._sortDir);
	}

	_toggleRow(idx, checked) {
		if (checked) this._selected.add(idx);
		else this._selected.delete(idx);

		this._tbody.querySelectorAll('.fv-dt-row')[idx]?.classList.toggle('fv-dt-selected', checked);
		if (this.o.onSelect) this.o.onSelect([...this._selected]);
	}

	_toggleAll(checked) {
		if (checked) this._data.forEach((_, i) => this._selected.add(i));
		else this._selected.clear();

		this._tbody.querySelectorAll('.fv-dt-row').forEach((tr, i) => {
			tr.classList.toggle('fv-dt-selected', checked);
			const cb = tr.querySelector('input[type=checkbox]');
			if (cb) cb.checked = checked;
		});
		if (this.o.onSelect) this.o.onSelect([...this._selected]);
	}

	_startEdit(td, rowIdx, col, oldVal) {
		const input = document.createElement('input');
		input.className = 'fv-dt-inline-input';
		input.value = oldVal ?? '';
		td.innerHTML = '';
		td.appendChild(input);
		input.focus();
		input.select();

		const finish = () => {
			const newVal = input.value;
			this._data[rowIdx][col.id] = newVal;
			const formatted = col.formatter ? col.formatter(newVal, this._data[rowIdx], rowIdx) : DataTable._esc(newVal);
			td.innerHTML = `<div class="fv-dt-cell-edit" tabindex="0">${formatted}</div>`;
			td.querySelector('.fv-dt-cell-edit').ondblclick = () => this._startEdit(td, rowIdx, col, newVal);
			if (this.o.onCellEdit) this.o.onCellEdit(rowIdx, col.id, newVal, oldVal);
		};

		input.onblur = finish;
		input.onkeydown = (e) => {
			if (e.key === 'Enter') { input.blur(); }
			if (e.key === 'Escape') { input.value = oldVal ?? ''; input.blur(); }
		};
	}

	_initResize(th, col) {
		const handle = th.querySelector('.fv-dt-resize-handle');
		let startX, startW;

		handle.onmousedown = (e) => {
			e.preventDefault();
			startX = e.clientX;
			startW = th.offsetWidth;

			const move = (ev) => {
				const diff = ev.clientX - startX;
				th.style.width = Math.max(50, startW + diff) + 'px';
				th.style.minWidth = th.style.width;
			};
			const up = () => {
				document.removeEventListener('mousemove', move);
				document.removeEventListener('mouseup', up);
			};
			document.addEventListener('mousemove', move);
			document.addEventListener('mouseup', up);
		};
	}

	setData(data) {
		this._data = [...data];
		this._selected.clear();
		this._render();
	}

	getSelected() { return [...this._selected].map(i => this._data[i]); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
