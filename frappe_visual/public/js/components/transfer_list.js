/**
 * FrappeVisual TransferList — Dual-pane move items left↔right
 * ==============================================================
 * frappe.visual.TransferList.create({ container, sourceItems, targetItems, ... })
 */
export class TransferList {
	static create(opts = {}) { return new TransferList(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			sourceItems: [],        // [{ value, label, icon? }]
			targetItems: [],
			sourceTitle: 'Available',
			targetTitle: 'Selected',
			searchable: true,
			height: 300,
			onChange: null,
		}, opts);

		this._sourceSelected = new Set();
		this._targetSelected = new Set();
		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = 'fv-trf';

		this.el.innerHTML = `
			<div class="fv-trf-pane fv-trf-source">
				<div class="fv-trf-header">
					<span class="fv-trf-title">${TransferList._esc(o.sourceTitle)}</span>
					<span class="fv-trf-count">${o.sourceItems.length}</span>
				</div>
				${o.searchable ? '<input class="fv-trf-search" placeholder="Search..." data-pane="source"/>' : ''}
				<div class="fv-trf-list" style="max-height:${o.height}px" data-pane="source"></div>
			</div>
			<div class="fv-trf-actions">
				<button class="fv-trf-btn fv-trf-move-right" title="Move right">&#8250;</button>
				<button class="fv-trf-btn fv-trf-move-all-right" title="Move all right">&#187;</button>
				<button class="fv-trf-btn fv-trf-move-left" title="Move left">&#8249;</button>
				<button class="fv-trf-btn fv-trf-move-all-left" title="Move all left">&#171;</button>
			</div>
			<div class="fv-trf-pane fv-trf-target">
				<div class="fv-trf-header">
					<span class="fv-trf-title">${TransferList._esc(o.targetTitle)}</span>
					<span class="fv-trf-count">${o.targetItems.length}</span>
				</div>
				${o.searchable ? '<input class="fv-trf-search" placeholder="Search..." data-pane="target"/>' : ''}
				<div class="fv-trf-list" style="max-height:${o.height}px" data-pane="target"></div>
			</div>
		`;

		this._renderList('source');
		this._renderList('target');
		this._bindEvents();
	}

	_renderList(pane, filter = '') {
		const items = pane === 'source' ? this.o.sourceItems : this.o.targetItems;
		const selected = pane === 'source' ? this._sourceSelected : this._targetSelected;
		const list = this.el.querySelector(`.fv-trf-list[data-pane="${pane}"]`);
		const filtered = filter ? items.filter(i => (i.label || i.value).toLowerCase().includes(filter.toLowerCase())) : items;

		list.innerHTML = filtered.map(item => {
			const sel = selected.has(item.value) ? ' fv-trf-item-sel' : '';
			return `<div class="fv-trf-item${sel}" data-value="${TransferList._esc(String(item.value))}">
				${item.icon ? `<span class="fv-trf-icon">${item.icon}</span>` : ''}
				<span>${TransferList._esc(item.label || item.value)}</span>
			</div>`;
		}).join('') || '<div class="fv-trf-empty">No items</div>';

		list.querySelectorAll('.fv-trf-item').forEach(el => {
			el.onclick = () => {
				const val = el.dataset.value;
				if (selected.has(val)) selected.delete(val); else selected.add(val);
				el.classList.toggle('fv-trf-item-sel');
			};
		});
	}

	_bindEvents() {
		// Search
		this.el.querySelectorAll('.fv-trf-search').forEach(inp => {
			inp.oninput = () => this._renderList(inp.dataset.pane, inp.value);
		});

		// Move buttons
		this.el.querySelector('.fv-trf-move-right').onclick = () => this._move('right');
		this.el.querySelector('.fv-trf-move-all-right').onclick = () => this._moveAll('right');
		this.el.querySelector('.fv-trf-move-left').onclick = () => this._move('left');
		this.el.querySelector('.fv-trf-move-all-left').onclick = () => this._moveAll('left');
	}

	_move(dir) {
		if (dir === 'right') {
			const moving = this.o.sourceItems.filter(i => this._sourceSelected.has(i.value));
			this.o.sourceItems = this.o.sourceItems.filter(i => !this._sourceSelected.has(i.value));
			this.o.targetItems.push(...moving);
			this._sourceSelected.clear();
		} else {
			const moving = this.o.targetItems.filter(i => this._targetSelected.has(i.value));
			this.o.targetItems = this.o.targetItems.filter(i => !this._targetSelected.has(i.value));
			this.o.sourceItems.push(...moving);
			this._targetSelected.clear();
		}
		this._render();
		if (this.o.onChange) this.o.onChange(this.o.sourceItems, this.o.targetItems);
	}

	_moveAll(dir) {
		if (dir === 'right') {
			this.o.targetItems.push(...this.o.sourceItems);
			this.o.sourceItems = [];
		} else {
			this.o.sourceItems.push(...this.o.targetItems);
			this.o.targetItems = [];
		}
		this._sourceSelected.clear();
		this._targetSelected.clear();
		this._render();
		if (this.o.onChange) this.o.onChange(this.o.sourceItems, this.o.targetItems);
	}

	getSelected() { return [...this.o.targetItems]; }
	getAvailable() { return [...this.o.sourceItems]; }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
