/**
 * Frappe Visual — VirtualScroller
 * ==================================
 * High-performance infinite scroll for 10k+ rows.
 * Renders only visible items using a virtual viewport, supporting
 * fixed-height and variable-height row modes, load-more triggers,
 * skeleton placeholders, and smooth scrolling.
 *
 * Features:
 *  - Fixed-height mode: O(1) row lookup, instant scroll to any position
 *  - Variable-height mode: measured rows with position cache
 *  - Overscan buffer (renders extra rows above/below viewport)
 *  - Skeleton loading placeholders for async data
 *  - Load-more trigger (infinite scroll) with threshold
 *  - Scroll-to-index API
 *  - Keyboard navigation (↑↓ PageUp PageDown Home End)
 *  - Smooth scroll with momentum
 *  - Item click/select callback
 *  - RTL / dark mode support
 *
 * API:
 *   frappe.visual.VirtualScroller.create('#el', { items, rowHeight, renderItem })
 *
 * @module frappe_visual/components/virtual_scroller
 */

export class VirtualScroller {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("VirtualScroller: container not found");

		this.opts = Object.assign({
			theme: "glass",
			items: [],
			rowHeight: 48,          // fixed height (px) or 0 for variable
			renderItem: null,        // (item, index) => HTMLElement | string
			keyField: "name",
			overscan: 5,            // extra rows above/below
			loadMore: null,          // async () => items[]  — infinite scroll
			loadMoreThreshold: 200,  // px from bottom
			skeleton: true,
			skeletonCount: 8,
			containerHeight: null,   // null = auto (fill parent)
			onItemClick: null,
			onSelect: null,
		}, opts);

		this.items = this.opts.items || [];
		this.scrollTop = 0;
		this._loading = false;
		this._allLoaded = false;
		this._heightCache = new Map();   // index → measured height
		this._positionCache = [];         // cumulative positions
		this._selectedIndex = -1;

		this._init();
	}

	static create(container, opts = {}) { return new VirtualScroller(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-vs", `fv-vs--${this.opts.theme}`);
		this.container.innerHTML = "";
		this.container.setAttribute("tabindex", "0");

		// Viewport
		this._viewport = document.createElement("div");
		this._viewport.className = "fv-vs-viewport";
		if (this.opts.containerHeight) {
			this._viewport.style.height = typeof this.opts.containerHeight === "number"
				? `${this.opts.containerHeight}px` : this.opts.containerHeight;
		}
		this.container.appendChild(this._viewport);

		// Spacer (total scrollable height)
		this._spacer = document.createElement("div");
		this._spacer.className = "fv-vs-spacer";
		this._viewport.appendChild(this._spacer);

		// Content (visible rows)
		this._content = document.createElement("div");
		this._content.className = "fv-vs-content";
		this._viewport.appendChild(this._content);

		this._viewport.addEventListener("scroll", () => this._onScroll(), { passive: true });
		this._bindKeyboard();

		if (this.items.length === 0 && this.opts.skeleton) {
			this._showSkeletons();
		} else {
			this._rebuild();
		}
	}

	/* ── Rebuild ─────────────────────────────────────────────── */
	_rebuild() {
		this._calcPositions();
		this._updateSpacerHeight();
		this._render();
	}

	_calcPositions() {
		if (this.opts.rowHeight > 0) return; // fixed height: positions computed on-the-fly
		const positions = [];
		let cumulative = 0;
		for (let i = 0; i < this.items.length; i++) {
			positions.push(cumulative);
			cumulative += this._getRowHeight(i);
		}
		this._positionCache = positions;
	}

	_getRowHeight(index) {
		if (this.opts.rowHeight > 0) return this.opts.rowHeight;
		if (this._heightCache.has(index)) return this._heightCache.get(index);
		return 48; // default estimate
	}

	_getTotalHeight() {
		if (this.opts.rowHeight > 0) return this.items.length * this.opts.rowHeight;
		if (this._positionCache.length === 0) return 0;
		const lastIdx = this.items.length - 1;
		return (this._positionCache[lastIdx] || 0) + this._getRowHeight(lastIdx);
	}

	_updateSpacerHeight() {
		this._spacer.style.height = `${this._getTotalHeight()}px`;
	}

	/* ── Scroll Handler ──────────────────────────────────────── */
	_onScroll() {
		this.scrollTop = this._viewport.scrollTop;
		this._render();

		// Infinite scroll
		if (this.opts.loadMore && !this._loading && !this._allLoaded) {
			const { scrollTop, scrollHeight, clientHeight } = this._viewport;
			if (scrollHeight - scrollTop - clientHeight < this.opts.loadMoreThreshold) {
				this._loadMore();
			}
		}
	}

	/* ── Render Visible ──────────────────────────────────────── */
	_render() {
		const viewportHeight = this._viewport.clientHeight;
		const scrollTop = this.scrollTop;
		const overscan = this.opts.overscan;

		const { startIdx, endIdx } = this._getVisibleRange(scrollTop, viewportHeight);
		const renderStart = Math.max(0, startIdx - overscan);
		const renderEnd = Math.min(this.items.length - 1, endIdx + overscan);

		// Offset for visible rows
		const offsetY = this.opts.rowHeight > 0
			? renderStart * this.opts.rowHeight
			: (this._positionCache[renderStart] || 0);

		this._content.style.transform = `translateY(${offsetY}px)`;

		// Build rows
		const fragment = document.createDocumentFragment();
		for (let i = renderStart; i <= renderEnd; i++) {
			const item = this.items[i];
			if (!item) continue;

			let row;
			if (this.opts.renderItem) {
				const rendered = this.opts.renderItem(item, i);
				if (typeof rendered === "string") {
					row = document.createElement("div");
					row.innerHTML = rendered;
					row = row.firstElementChild || row;
				} else {
					row = rendered;
				}
			} else {
				row = document.createElement("div");
				row.textContent = item[this.opts.keyField] || JSON.stringify(item);
			}

			row.classList.add("fv-vs-row");
			if (i === this._selectedIndex) row.classList.add("fv-vs-row--selected");
			if (this.opts.rowHeight > 0) row.style.height = `${this.opts.rowHeight}px`;
			row.dataset.index = i;

			row.addEventListener("click", () => {
				this._selectedIndex = i;
				if (this.opts.onItemClick) this.opts.onItemClick(item, i);
				if (this.opts.onSelect) this.opts.onSelect(item, i);
				this._render();
			});

			fragment.appendChild(row);

			// Measure variable heights
			if (this.opts.rowHeight === 0 && !this._heightCache.has(i)) {
				requestAnimationFrame(() => {
					if (row.offsetHeight) {
						this._heightCache.set(i, row.offsetHeight);
					}
				});
			}
		}

		this._content.innerHTML = "";
		this._content.appendChild(fragment);
	}

	_getVisibleRange(scrollTop, viewportHeight) {
		if (this.opts.rowHeight > 0) {
			const startIdx = Math.floor(scrollTop / this.opts.rowHeight);
			const endIdx = Math.ceil((scrollTop + viewportHeight) / this.opts.rowHeight);
			return { startIdx, endIdx: Math.min(endIdx, this.items.length - 1) };
		}

		// Variable height: binary search
		let startIdx = this._binarySearch(scrollTop);
		let endIdx = this._binarySearch(scrollTop + viewportHeight);
		return { startIdx, endIdx: Math.min(endIdx, this.items.length - 1) };
	}

	_binarySearch(offset) {
		let low = 0, high = this._positionCache.length - 1;
		while (low <= high) {
			const mid = (low + high) >>> 1;
			if (this._positionCache[mid] < offset) low = mid + 1;
			else high = mid - 1;
		}
		return Math.max(0, low - 1);
	}

	/* ── Infinite Scroll ─────────────────────────────────────── */
	async _loadMore() {
		this._loading = true;
		this._showLoadingIndicator();

		try {
			const newItems = await this.opts.loadMore();
			if (!newItems || newItems.length === 0) {
				this._allLoaded = true;
			} else {
				this.items.push(...newItems);
				this._rebuild();
			}
		} catch (e) {
			console.error("VirtualScroller: loadMore error", e);
		}

		this._loading = false;
		this._removeLoadingIndicator();
	}

	_showLoadingIndicator() {
		if (this._loadingEl) return;
		this._loadingEl = document.createElement("div");
		this._loadingEl.className = "fv-vs-loading";
		this._loadingEl.innerHTML = `<span class="fv-vs-spinner"></span> ${__("Loading...")}`;
		this.container.appendChild(this._loadingEl);
	}

	_removeLoadingIndicator() {
		if (this._loadingEl) { this._loadingEl.remove(); this._loadingEl = null; }
	}

	/* ── Skeletons ───────────────────────────────────────────── */
	_showSkeletons() {
		this._content.innerHTML = "";
		for (let i = 0; i < this.opts.skeletonCount; i++) {
			const sk = document.createElement("div");
			sk.className = "fv-vs-skeleton";
			sk.style.height = `${this.opts.rowHeight || 48}px`;
			sk.innerHTML = `<div class="fv-vs-skeleton-line" style="width:${60 + Math.random() * 30}%"></div>`;
			this._content.appendChild(sk);
		}
	}

	/* ── Keyboard ────────────────────────────────────────────── */
	_bindKeyboard() {
		this.container.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown") { e.preventDefault(); this._selectRelative(1); }
			else if (e.key === "ArrowUp") { e.preventDefault(); this._selectRelative(-1); }
			else if (e.key === "PageDown") { e.preventDefault(); this._selectRelative(10); }
			else if (e.key === "PageUp") { e.preventDefault(); this._selectRelative(-10); }
			else if (e.key === "Home") { e.preventDefault(); this.scrollToIndex(0); }
			else if (e.key === "End") { e.preventDefault(); this.scrollToIndex(this.items.length - 1); }
		});
	}

	_selectRelative(delta) {
		const newIdx = Math.max(0, Math.min(this.items.length - 1, this._selectedIndex + delta));
		this._selectedIndex = newIdx;
		this.scrollToIndex(newIdx);
		if (this.opts.onSelect) this.opts.onSelect(this.items[newIdx], newIdx);
		this._render();
	}

	/* ── Public API ──────────────────────────────────────────── */
	scrollToIndex(idx) {
		if (this.opts.rowHeight > 0) {
			this._viewport.scrollTop = idx * this.opts.rowHeight;
		} else if (this._positionCache[idx] !== undefined) {
			this._viewport.scrollTop = this._positionCache[idx];
		}
	}

	setItems(items) {
		this.items = items;
		this._heightCache.clear();
		this._selectedIndex = -1;
		this._allLoaded = false;
		this._rebuild();
	}

	appendItems(items) {
		this.items.push(...items);
		this._rebuild();
	}

	getSelectedItem() {
		return this._selectedIndex >= 0 ? this.items[this._selectedIndex] : null;
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-vs", `fv-vs--${this.opts.theme}`);
	}
}
