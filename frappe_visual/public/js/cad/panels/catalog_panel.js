// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * CatalogPanel — Side panel for browsing & dragging items onto canvas
 * ====================================================================
 * Displays categorized items (furniture, fixtures, etc.) that can be
 * dragged onto the 2D CAD canvas or 3D scene.
 */

export class CatalogPanel {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			categories: [],
			items: [],
			provider: "static",
			doctype: null,
			searchable: true,
			onItemDrag: null,
			onItemClick: null,
		}, opts);
		this._items = this.opts.items;
		this._filteredItems = [...this._items];
		this._activeCategory = null;
	}

	async init() {
		if (this.opts.provider === "frappe" && this.opts.doctype) {
			await this._loadFromFrappe();
		}
		this._buildUI();
		return this;
	}

	async _loadFromFrappe() {
		try {
			const result = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: this.opts.doctype,
					fields: ["name", "label", "category", "thumbnail", "model_url", "width", "height"],
					limit_page_length: 0,
				},
			});
			this._items = (result.message || []).map(item => ({
				id: item.name,
				label: item.label || item.name,
				category: item.category,
				thumbnail: item.thumbnail,
				modelUrl: item.model_url,
				width: item.width || 60,
				height: item.height || 60,
			}));
			this._filteredItems = [...this._items];
		} catch {
			// Fallback to empty
			this._items = [];
			this._filteredItems = [];
		}
	}

	_buildUI() {
		this.container.classList.add("fv-catalog-panel");
		this.container.innerHTML = "";

		// Search
		if (this.opts.searchable) {
			const search = document.createElement("input");
			search.type = "search";
			search.placeholder = __("Search items...");
			search.className = "form-control input-sm fv-catalog-search";
			search.style.cssText = "margin-bottom:8px;";
			search.addEventListener("input", () => this._filterItems(search.value));
			this.container.appendChild(search);
		}

		// Categories
		const categories = this._getCategories();
		if (categories.length > 1) {
			const catBar = document.createElement("div");
			catBar.className = "fv-catalog-categories";
			catBar.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;";

			const allBtn = document.createElement("button");
			allBtn.className = "btn btn-xs btn-primary";
			allBtn.textContent = __("All");
			allBtn.addEventListener("click", () => this._setCategory(null));
			catBar.appendChild(allBtn);

			categories.forEach(cat => {
				const btn = document.createElement("button");
				btn.className = "btn btn-xs btn-default";
				btn.textContent = cat;
				btn.addEventListener("click", () => this._setCategory(cat));
				catBar.appendChild(btn);
			});
			this.container.appendChild(catBar);
		}

		// Items grid
		this._gridEl = document.createElement("div");
		this._gridEl.className = "fv-catalog-grid";
		this._gridEl.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;overflow-y:auto;flex:1;";
		this.container.appendChild(this._gridEl);

		this._renderItems();
	}

	_renderItems() {
		this._gridEl.innerHTML = "";
		this._filteredItems.forEach(item => {
			const el = document.createElement("div");
			el.className = "fv-catalog-item fv-fx-hover-lift";
			el.draggable = true;
			el.style.cssText = "text-align:center;padding:6px;border-radius:6px;cursor:grab;background:var(--bg-light-gray,#f8f8f8);font-size:11px;";
			el.innerHTML = item.thumbnail
				? `<img src="${item.thumbnail}" style="width:48px;height:48px;object-fit:contain;"><br>${item.label}`
				: `<div style="width:48px;height:48px;margin:0 auto;background:#e0e0e0;border-radius:4px;display:flex;align-items:center;justify-content:center;">📦</div>${item.label}`;

			el.addEventListener("dragstart", (e) => {
				e.dataTransfer.setData("application/json", JSON.stringify(item));
				this.opts.onItemDrag?.(item);
			});
			el.addEventListener("click", () => {
				this.opts.onItemClick?.(item);
			});

			this._gridEl.appendChild(el);
		});

		if (!this._filteredItems.length) {
			this._gridEl.innerHTML = `<p class="text-muted" style="grid-column:1/-1;text-align:center;padding:20px;">${__("No items found")}</p>`;
		}
	}

	_getCategories() {
		if (this.opts.categories.length) return this.opts.categories;
		const cats = new Set(this._items.map(i => i.category).filter(Boolean));
		return [...cats];
	}

	_setCategory(cat) {
		this._activeCategory = cat;
		this._filteredItems = cat
			? this._items.filter(i => i.category === cat)
			: [...this._items];
		this._renderItems();
	}

	_filterItems(query) {
		const q = (query || "").toLowerCase();
		this._filteredItems = this._items.filter(i => {
			const matchCat = !this._activeCategory || i.category === this._activeCategory;
			const matchSearch = !q || (i.label || "").toLowerCase().includes(q);
			return matchCat && matchSearch;
		});
		this._renderItems();
	}

	refresh() {
		this._filteredItems = [...this._items];
		this._activeCategory = null;
		this._renderItems();
	}

	dispose() {
		this.container.innerHTML = "";
	}
}
