/**
 * VirtualScroll — Efficiently renders large lists using windowing
 *
 * frappe.visual.VirtualScroll.create({
 *   container: el,
 *   items: arrayOfItems,         // or totalCount for dynamic loading
 *   itemHeight: 40,              // fixed row height (px)
 *   renderItem: (item, index) => htmlString,
 *   overscan: 5,                 // extra items above/below viewport
 *   onLoadMore: async (startIndex, count) => items,
 *   totalCount: 10000,           // for dynamic loading
 * })
 */
export class VirtualScroll {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			items: [],
			itemHeight: 40,
			renderItem: (item, i) => `<div class="fv-virtual-scroll__item">${i}</div>`,
			overscan: 5,
			onLoadMore: null,
			totalCount: 0,
			className: "",
		}, opts);

		const total = o.totalCount || o.items.length;
		const el = document.createElement("div");
		el.className = `fv-virtual-scroll ${o.className}`.trim();
		el.style.cssText = "overflow-y:auto;position:relative;will-change:transform;";

		const spacer = document.createElement("div");
		spacer.style.height = (total * o.itemHeight) + "px";
		spacer.style.position = "relative";
		el.appendChild(spacer);

		const viewport = document.createElement("div");
		viewport.className = "fv-virtual-scroll__viewport";
		viewport.style.cssText = "position:absolute;top:0;left:0;right:0;will-change:transform;";
		spacer.appendChild(viewport);

		let renderedRange = { start: -1, end: -1 };
		let cache = new Map(); // index → element

		function getItem(index) {
			if (index < o.items.length) return o.items[index];
			return null;
		}

		function renderRange(start, end) {
			if (start === renderedRange.start && end === renderedRange.end) return;

			const frag = document.createDocumentFragment();
			const newCache = new Map();

			for (let i = start; i < end; i++) {
				let row = cache.get(i);
				if (!row) {
					const item = getItem(i);
					row = document.createElement("div");
					row.className = "fv-virtual-scroll__row";
					row.style.cssText = `position:absolute;top:${i * o.itemHeight}px;left:0;right:0;height:${o.itemHeight}px;`;
					row.innerHTML = item !== null ? o.renderItem(item, i) : `<div class="fv-virtual-scroll__loading">Loading...</div>`;
					row.dataset.index = i;
				}
				newCache.set(i, row);
				frag.appendChild(row);
			}

			viewport.innerHTML = "";
			viewport.appendChild(frag);
			cache = newCache;
			renderedRange = { start, end };
		}

		function onScroll() {
			const scrollTop = el.scrollTop;
			const viewportHeight = el.clientHeight;
			const start = Math.max(0, Math.floor(scrollTop / o.itemHeight) - o.overscan);
			const end = Math.min(total, Math.ceil((scrollTop + viewportHeight) / o.itemHeight) + o.overscan);
			renderRange(start, end);

			// Dynamic loading
			if (o.onLoadMore && end > o.items.length && o.items.length < total) {
				const loadStart = o.items.length;
				const loadCount = Math.min(50, total - loadStart);
				o.onLoadMore(loadStart, loadCount).then(newItems => {
					if (newItems) o.items.push(...newItems);
					onScroll(); // re-render
				});
			}
		}

		el.addEventListener("scroll", onScroll, { passive: true });
		if (o.container) o.container.appendChild(el);
		requestAnimationFrame(onScroll);

		return {
			el,
			scrollToIndex(i) {
				el.scrollTop = i * o.itemHeight;
			},
			setItems(items) {
				o.items = items;
				spacer.style.height = ((o.totalCount || items.length) * o.itemHeight) + "px";
				cache.clear();
				renderedRange = { start: -1, end: -1 };
				onScroll();
			},
			refresh() { cache.clear(); renderedRange = { start: -1, end: -1 }; onScroll(); },
			destroy() { el.remove(); },
		};
	}
}
