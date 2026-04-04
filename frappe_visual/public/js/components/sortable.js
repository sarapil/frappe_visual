/**
 * Sortable — Drag-to-reorder list
 * ==================================
 * Lightweight drag-and-drop list reordering.
 *
 * frappe.visual.Sortable.create({
 *   target: "#list",
 *   items: ["Item 1", "Item 2", "Item 3"],
 *   handle: null,           // CSS selector for drag handle within item
 *   animation: 200,         // ms
 *   group: null,            // allow cross-list drag if same group
 *   renderItem: (item, i) => `<div>${item}</div>`,
 *   onSort: (newOrder) => {},
 *   className: ""
 * })
 */

export class Sortable {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			items: [],
			handle: null,
			animation: 200,
			group: null,
			renderItem: (item) => `<div style="padding:10px 12px;border:1px solid var(--border-color,#e5e7eb);border-radius:6px;margin-bottom:4px;background:var(--fg-color,#fff);cursor:grab;">${typeof item === "string" ? item : item.label || JSON.stringify(item)}</div>`,
			onSort: null,
			className: "",
		}, opts);
		this._dragIdx = -1;
		this.render();
	}

	static create(opts) { return new Sortable(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-sortable ${this.className}`;
		this._wrap = wrap;

		this._renderItems();

		el.innerHTML = "";
		el.appendChild(wrap);
	}

	_renderItems() {
		this._wrap.innerHTML = "";

		this.items.forEach((item, i) => {
			const row = document.createElement("div");
			row.className = "fv-sortable-item";
			row.dataset.idx = i;
			row.draggable = true;
			row.innerHTML = this.renderItem(item, i);
			row.style.transition = `transform ${this.animation}ms ease`;

			const dragEl = this.handle ? row.querySelector(this.handle) : row;
			if (dragEl) dragEl.style.cursor = "grab";

			row.addEventListener("dragstart", (e) => {
				this._dragIdx = i;
				row.style.opacity = "0.5";
				e.dataTransfer.effectAllowed = "move";
			});

			row.addEventListener("dragend", () => {
				row.style.opacity = "1";
				this._dragIdx = -1;
				this._wrap.querySelectorAll(".fv-sortable-item").forEach(el => {
					el.style.borderTop = "";
					el.style.borderBottom = "";
				});
			});

			row.addEventListener("dragover", (e) => {
				e.preventDefault();
				e.dataTransfer.dropEffect = "move";
				const rect = row.getBoundingClientRect();
				const mid = rect.top + rect.height / 2;
				this._wrap.querySelectorAll(".fv-sortable-item").forEach(el => {
					el.style.borderTop = "";
					el.style.borderBottom = "";
				});
				if (e.clientY < mid) {
					row.style.borderTop = "2px solid var(--primary, #6366f1)";
				} else {
					row.style.borderBottom = "2px solid var(--primary, #6366f1)";
				}
			});

			row.addEventListener("drop", (e) => {
				e.preventDefault();
				const fromIdx = this._dragIdx;
				const rect = row.getBoundingClientRect();
				const mid = rect.top + rect.height / 2;
				let toIdx = e.clientY < mid ? i : i + 1;
				if (fromIdx < toIdx) toIdx--;

				if (fromIdx !== toIdx && fromIdx >= 0) {
					const [moved] = this.items.splice(fromIdx, 1);
					this.items.splice(toIdx, 0, moved);
					this._renderItems();
					this.onSort?.(this.items);
				}
			});

			this._wrap.appendChild(row);
		});
	}
}
