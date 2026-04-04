/**
 * FrappeVisual SortableList — Drag-and-drop reorderable list
 * ============================================================
 * frappe.visual.SortableList.create({ container, items, ... })
 */
export class SortableList {
	static create(opts = {}) { return new SortableList(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			items: [],              // [{ id, label, icon?, content?, disabled? }]
			handle: true,           // show drag handle
			animation: 200,
			ghostClass: 'fv-sl2-ghost',
			dragClass: 'fv-sl2-drag',
			showIndex: false,
			removable: false,
			onReorder: null,        // fn(newItems, oldIndex, newIndex)
			onRemove: null,         // fn(item, index)
		}, opts);

		this.el = document.createElement('div');
		this.el.className = 'fv-sl2';
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		this.el.innerHTML = '';
		this.o.items.forEach((item, idx) => {
			const row = document.createElement('div');
			row.className = 'fv-sl2-item' + (item.disabled ? ' fv-sl2-disabled' : '');
			row.dataset.id = item.id || idx;
			row.draggable = !item.disabled;

			let html = '';
			if (this.o.handle) html += '<span class="fv-sl2-handle"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg></span>';
			if (this.o.showIndex) html += `<span class="fv-sl2-index">${idx + 1}</span>`;
			if (item.icon) html += `<span class="fv-sl2-icon">${item.icon}</span>`;
			html += `<span class="fv-sl2-label">${SortableList._esc(item.label || '')}</span>`;
			if (item.content) html += `<span class="fv-sl2-content">${item.content}</span>`;
			if (this.o.removable && !item.disabled) html += '<button class="fv-sl2-remove">&times;</button>';

			row.innerHTML = html;

			if (this.o.removable) {
				const removeBtn = row.querySelector('.fv-sl2-remove');
				if (removeBtn) removeBtn.onclick = (e) => { e.stopPropagation(); this._removeItem(idx); };
			}

			// Drag events
			row.ondragstart = (e) => {
				this._dragIdx = idx;
				row.classList.add(this.o.dragClass);
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', idx);
			};
			row.ondragend = () => row.classList.remove(this.o.dragClass);
			row.ondragover = (e) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = 'move';
				row.classList.add(this.o.ghostClass);
			};
			row.ondragleave = () => row.classList.remove(this.o.ghostClass);
			row.ondrop = (e) => {
				e.preventDefault();
				row.classList.remove(this.o.ghostClass);
				const fromIdx = this._dragIdx;
				if (fromIdx !== idx) this._moveItem(fromIdx, idx);
			};

			this.el.appendChild(row);
		});
	}

	_moveItem(from, to) {
		const items = [...this.o.items];
		const [moved] = items.splice(from, 1);
		items.splice(to, 0, moved);
		this.o.items = items;
		this._render();
		if (this.o.onReorder) this.o.onReorder(items, from, to);
	}

	_removeItem(idx) {
		const removed = this.o.items.splice(idx, 1)[0];
		this._render();
		if (this.o.onRemove) this.o.onRemove(removed, idx);
	}

	getItems() { return [...this.o.items]; }
	setItems(items) { this.o.items = items; this._render(); }
	addItem(item) { this.o.items.push(item); this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
