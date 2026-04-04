/**
 * Frappe Visual — MasonryGrid
 * =============================
 * Pinterest-style masonry layout with auto-placement,
 * animated inserts/removes, infinite scroll, and filters.
 *
 * Usage:
 *   const grid = MasonryGrid.create(container, {
 *     items: [
 *       { id: '1', content: '<div>Card</div>', height: 200 },
 *       { id: '2', render: (el) => { ... } },
 *     ],
 *     columns: 'auto',           // number or 'auto' (responsive)
 *     columnWidth: 280,           // min column width for auto
 *     gap: 16,
 *     animate: true,
 *     infiniteScroll: false,
 *     onLoadMore: () => {},
 *     theme: 'glass',
 *   });
 */

export class MasonryGrid {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				items: [],
				columns: "auto",
				columnWidth: 280,
				gap: 16,
				animate: true,
				infiniteScroll: false,
				onLoadMore: null,
				theme: "glass",
			},
			opts
		);

		this._items = [...this.opts.items];
		this._loading = false;
		this._init();
	}

	static create(container, opts = {}) {
		return new MasonryGrid(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
		this._observer = new ResizeObserver(() => this._layout());
		this._observer.observe(this.container);

		if (this.opts.infiniteScroll) {
			this._setupInfiniteScroll();
		}
	}

	_render() {
		const wrap = document.createElement("div");
		wrap.className = `fv-mg fv-mg-${this.opts.theme}`;
		wrap.style.position = "relative";

		this._items.forEach((item) => {
			const el = document.createElement("div");
			el.className = "fv-mg-item";
			el.setAttribute("data-id", item.id);

			if (this.opts.animate) {
				el.style.opacity = "0";
				el.style.transform = "translateY(20px)";
			}

			if (typeof item.content === "string") {
				el.innerHTML = item.content;
			} else if (item.content instanceof HTMLElement) {
				el.appendChild(item.content);
			} else if (typeof item.render === "function") {
				item.render(el);
			}

			wrap.appendChild(el);
		});

		// Loading indicator
		if (this.opts.infiniteScroll) {
			const loader = document.createElement("div");
			loader.className = "fv-mg-loader";
			loader.style.display = "none";
			loader.innerHTML = `<div class="fv-mg-spinner"></div>`;
			wrap.appendChild(loader);
			this._loader = loader;
		}

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;

		requestAnimationFrame(() => this._layout());
	}

	_getColumnCount() {
		const { columns, columnWidth, gap } = this.opts;
		if (typeof columns === "number") return columns;

		const containerWidth = this.el.offsetWidth;
		return Math.max(1, Math.floor((containerWidth + gap) / (columnWidth + gap)));
	}

	_layout() {
		if (!this.el) return;

		const cols = this._getColumnCount();
		const gap = this.opts.gap;
		const containerWidth = this.el.offsetWidth;
		const colWidth = (containerWidth - gap * (cols - 1)) / cols;

		const colHeights = new Array(cols).fill(0);
		const items = this.el.querySelectorAll(".fv-mg-item");

		items.forEach((el, idx) => {
			// Find shortest column
			const shortestCol = colHeights.indexOf(Math.min(...colHeights));

			const x = shortestCol * (colWidth + gap);
			const y = colHeights[shortestCol];

			el.style.position = "absolute";
			el.style.width = colWidth + "px";
			el.style.left = x + "px";
			el.style.top = y + "px";

			if (this.opts.animate) {
				el.style.transition =
					"transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease, left 0.4s ease, top 0.4s ease";
				setTimeout(() => {
					el.style.opacity = "1";
					el.style.transform = "translateY(0)";
				}, idx * 50);
			} else {
				el.style.opacity = "1";
				el.style.transform = "none";
			}

			colHeights[shortestCol] += el.offsetHeight + gap;
		});

		// Set container height
		this.el.style.height = Math.max(...colHeights) + "px";
	}

	_setupInfiniteScroll() {
		const sentinel = document.createElement("div");
		sentinel.className = "fv-mg-sentinel";
		sentinel.style.height = "1px";
		this.container.appendChild(sentinel);

		this._scrollObserver = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !this._loading) {
					this._loadMore();
				}
			},
			{ rootMargin: "200px" }
		);
		this._scrollObserver.observe(sentinel);
	}

	async _loadMore() {
		if (this._loading || !this.opts.onLoadMore) return;
		this._loading = true;

		if (this._loader) this._loader.style.display = "flex";

		try {
			await this.opts.onLoadMore();
		} finally {
			this._loading = false;
			if (this._loader) this._loader.style.display = "none";
		}
	}

	/* ── Public API ─────────────────────────────────────── */

	addItems(newItems) {
		this._items.push(...newItems);
		this._render();
	}

	removeItem(id) {
		const idx = this._items.findIndex((it) => it.id === id);
		if (idx === -1) return;

		const el = this.el.querySelector(`[data-id="${id}"]`);
		if (el && this.opts.animate) {
			el.style.opacity = "0";
			el.style.transform = "scale(0.8)";
			el.addEventListener("transitionend", () => {
				this._items.splice(idx, 1);
				el.remove();
				this._layout();
			}, { once: true });
		} else {
			this._items.splice(idx, 1);
			if (el) el.remove();
			this._layout();
		}
	}

	relayout() {
		this._layout();
	}

	filter(predicate) {
		const items = this.el.querySelectorAll(".fv-mg-item");
		items.forEach((el) => {
			const id = el.getAttribute("data-id");
			const item = this._items.find((it) => it.id === id);
			if (item && predicate(item)) {
				el.style.display = "";
			} else {
				el.style.display = "none";
			}
		});
		this._layout();
	}

	getItems() {
		return [...this._items];
	}

	destroy() {
		if (this._observer) this._observer.disconnect();
		if (this._scrollObserver) this._scrollObserver.disconnect();
		if (this.el) this.el.remove();
	}
}
