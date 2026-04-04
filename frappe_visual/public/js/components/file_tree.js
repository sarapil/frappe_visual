// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual FileTree — Collapsible file/folder tree
 * ======================================================
 * frappe.visual.FileTree.create({ container, nodes, ... })
 */
export class FileTree {
	static create(opts = {}) { return new FileTree(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			nodes: [],              // [{ id, label, icon, children, isFolder, isOpen, data }]
			selectable: true,
			multiSelect: false,
			showIcons: true,
			indent: 20,             // px per level
			draggable: false,
			lazyLoad: null,         // async (node) => children[]
			onSelect: null,         // (node) => {}
			onToggle: null,
			onDrop: null,           // (dragNode, dropNode) => {}
			contextMenu: null,      // (node, event) => [{ label, onClick }]
		}, opts);

		this._selected = new Set();
		this.el = document.createElement('div');
		this.el.className = 'fv-ft';
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		this.el.innerHTML = '';
		this._renderNodes(this.o.nodes, this.el, 0);
	}

	_renderNodes(nodes, parent, level) {
		nodes.forEach(node => {
			const item = document.createElement('div');
			item.className = 'fv-ft-node';
			item.setAttribute('data-id', node.id || '');

			const row = document.createElement('div');
			row.className = 'fv-ft-row';
			row.style.paddingInlineStart = (level * this.o.indent + 8) + 'px';
			if (this._selected.has(node.id)) row.classList.add('fv-ft-selected');

			let html = '';

			// Expand toggle
			if (node.isFolder || (node.children && node.children.length)) {
				html += `<button class="fv-ft-toggle ${node.isOpen ? 'fv-ft-open' : ''}">`;
				html += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
				html += `</button>`;
			} else {
				html += `<span class="fv-ft-spacer"></span>`;
			}

			// Icon
			if (this.o.showIcons) {
				if (node.icon) html += `<span class="fv-ft-icon">${node.icon}</span>`;
				else if (node.isFolder) {
					html += node.isOpen
						? `<span class="fv-ft-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><polyline points="2 10 22 10"/></svg></span>`
						: `<span class="fv-ft-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>`;
				} else {
					html += `<span class="fv-ft-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>`;
				}
			}

			// Label
			html += `<span class="fv-ft-label">${FileTree._esc(node.label || node.id)}</span>`;

			row.innerHTML = html;

			// Click to select
			row.onclick = (e) => {
				if (e.target.closest('.fv-ft-toggle')) return;
				this._select(node, row);
			};

			// Toggle
			const toggle = row.querySelector('.fv-ft-toggle');
			if (toggle) {
				toggle.onclick = async (e) => {
					e.stopPropagation();
					node.isOpen = !node.isOpen;
					toggle.classList.toggle('fv-ft-open', node.isOpen);

					// Lazy load
					if (node.isOpen && this.o.lazyLoad && (!node.children || node.children.length === 0)) {
						toggle.classList.add('fv-ft-loading');
						node.children = await this.o.lazyLoad(node);
						toggle.classList.remove('fv-ft-loading');
					}

					const childContainer = item.querySelector('.fv-ft-children');
					if (childContainer) {
						childContainer.style.display = node.isOpen ? '' : 'none';
					} else if (node.isOpen && node.children) {
						const cc = document.createElement('div');
						cc.className = 'fv-ft-children';
						this._renderNodes(node.children, cc, level + 1);
						item.appendChild(cc);
					}

					if (this.o.onToggle) this.o.onToggle(node);
				};
			}

			// Context menu
			if (this.o.contextMenu) {
				row.oncontextmenu = (e) => {
					e.preventDefault();
					const items = this.o.contextMenu(node, e);
					if (items && items.length) this._showContextMenu(e, items);
				};
			}

			// Draggable
			if (this.o.draggable) {
				row.draggable = true;
				row.ondragstart = (e) => { e.dataTransfer.setData('text/plain', node.id); };
				row.ondragover = (e) => { e.preventDefault(); row.classList.add('fv-ft-drag-over'); };
				row.ondragleave = () => row.classList.remove('fv-ft-drag-over');
				row.ondrop = (e) => {
					e.preventDefault();
					row.classList.remove('fv-ft-drag-over');
					const dragId = e.dataTransfer.getData('text/plain');
					if (this.o.onDrop && dragId !== node.id) this.o.onDrop(dragId, node);
				};
			}

			item.appendChild(row);

			// Children
			if (node.children && node.children.length && node.isOpen) {
				const cc = document.createElement('div');
				cc.className = 'fv-ft-children';
				this._renderNodes(node.children, cc, level + 1);
				item.appendChild(cc);
			}

			parent.appendChild(item);
		});
	}

	_select(node, row) {
		if (!this.o.selectable) return;

		if (!this.o.multiSelect) {
			this._selected.clear();
			this.el.querySelectorAll('.fv-ft-selected').forEach(r => r.classList.remove('fv-ft-selected'));
		}

		if (this._selected.has(node.id)) {
			this._selected.delete(node.id);
			row.classList.remove('fv-ft-selected');
		} else {
			this._selected.add(node.id);
			row.classList.add('fv-ft-selected');
		}

		if (this.o.onSelect) this.o.onSelect(node);
	}

	_showContextMenu(e, items) {
		const existing = document.querySelector('.fv-ft-ctx');
		if (existing) existing.remove();

		const menu = document.createElement('div');
		menu.className = 'fv-ft-ctx';
		menu.style.left = e.clientX + 'px';
		menu.style.top = e.clientY + 'px';

		items.forEach(item => {
			const btn = document.createElement('button');
			btn.className = 'fv-ft-ctx-item';
			btn.textContent = item.label;
			btn.onclick = () => { menu.remove(); if (item.onClick) item.onClick(); };
			menu.appendChild(btn);
		});

		document.body.appendChild(menu);
		const close = () => { menu.remove(); document.removeEventListener('click', close); };
		setTimeout(() => document.addEventListener('click', close), 10);
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
