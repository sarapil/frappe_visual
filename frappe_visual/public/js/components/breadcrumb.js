// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Breadcrumb
 * ============================
 * Hierarchical breadcrumb navigation with overflow collapse,
 * dropdown menus, icons, custom separators, and route integration.
 *
 * Usage:
 *   const bc = Breadcrumb.create(container, {
 *     items: [
 *       { label: 'Home', icon: 'home', href: '/app' },
 *       { label: 'Module', href: '/app/module' },
 *       { label: 'Current Page' }
 *     ],
 *     separator: 'chevron',     // 'chevron' | 'slash' | 'dot' | 'arrow' | custom string
 *     maxVisible: 4,            // collapse middle items into dropdown
 *     showIcons: true,
 *     size: 'md',               // 'sm' | 'md' | 'lg'
 *     theme: 'glass',           // 'glass' | 'flat' | 'pills' | 'minimal'
 *     onNavigate: (item, idx) => {},
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

const SEPARATORS = {
	chevron: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
	slash: `<span>/</span>`,
	dot: `<span>•</span>`,
	arrow: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`,
};

export class Breadcrumb {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				items: [],
				separator: "chevron",
				maxVisible: 0,
				showIcons: true,
				size: "md",
				theme: "glass",
				onNavigate: null,
			},
			opts
		);

		this._init();
	}

	static create(container, opts = {}) {
		return new Breadcrumb(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { items, separator, maxVisible, size, theme, showIcons } =
			this.opts;

		const nav = document.createElement("nav");
		nav.className = `fv-bc fv-bc-${size} fv-bc-${theme}`;
		nav.setAttribute("aria-label", typeof __ !== "undefined" ? __("Breadcrumb") : "Breadcrumb");

		const ol = document.createElement("ol");
		ol.className = "fv-bc-list";

		const sepHTML =
			SEPARATORS[separator] || `<span>${_esc(separator)}</span>`;
		const visibleItems = this._getVisibleItems(items, maxVisible);

		visibleItems.forEach((item, idx) => {
			if (idx > 0) {
				const sepLi = document.createElement("li");
				sepLi.className = "fv-bc-sep";
				sepLi.setAttribute("aria-hidden", "true");
				sepLi.innerHTML = sepHTML;
				ol.appendChild(sepLi);
			}

			if (item._collapsed) {
				ol.appendChild(this._buildCollapsed(item._collapsedItems));
			} else {
				ol.appendChild(
					this._buildItem(item, idx === visibleItems.length - 1, showIcons)
				);
			}
		});

		this.container.innerHTML = "";
		nav.appendChild(ol);
		this.container.appendChild(nav);
		this.el = nav;
	}

	_getVisibleItems(items, max) {
		if (!max || max <= 0 || items.length <= max) return items;

		const first = items[0];
		const last = items.slice(-1)[0];
		const collapsed = items.slice(1, items.length - (max - 2));
		const visible = items.slice(items.length - (max - 2));

		return [
			first,
			{ _collapsed: true, _collapsedItems: collapsed },
			...visible,
		];
	}

	_buildItem(item, isCurrent, showIcons) {
		const li = document.createElement("li");
		li.className = "fv-bc-item";

		if (isCurrent) {
			li.setAttribute("aria-current", "page");
			li.classList.add("fv-bc-current");
		}

		const content = [];
		if (showIcons && item.icon) {
			content.push(`<span class="fv-bc-icon">${_esc(item.icon)}</span>`);
		}
		content.push(`<span class="fv-bc-label">${_esc(item.label)}</span>`);

		if (item.href && !isCurrent) {
			const a = document.createElement("a");
			a.className = "fv-bc-link";
			a.href = item.href;
			a.innerHTML = content.join("");
			a.addEventListener("click", (e) => {
				if (this.opts.onNavigate) {
					e.preventDefault();
					this.opts.onNavigate(item, this.opts.items.indexOf(item));
				}
			});
			li.appendChild(a);
		} else {
			const span = document.createElement("span");
			span.className = "fv-bc-text";
			span.innerHTML = content.join("");
			li.appendChild(span);
		}

		return li;
	}

	_buildCollapsed(collapsedItems) {
		const li = document.createElement("li");
		li.className = "fv-bc-item fv-bc-collapsed";

		const btn = document.createElement("button");
		btn.className = "fv-bc-collapse-btn";
		btn.textContent = "…";
		btn.title =
			typeof __ !== "undefined"
				? __("Show {0} more items", [collapsedItems.length])
				: `Show ${collapsedItems.length} more items`;

		const dropdown = document.createElement("div");
		dropdown.className = "fv-bc-dropdown";
		dropdown.style.display = "none";

		collapsedItems.forEach((item) => {
			const a = document.createElement("a");
			a.className = "fv-bc-dropdown-item";
			a.href = item.href || "#";
			a.textContent = item.label;
			a.addEventListener("click", (e) => {
				e.preventDefault();
				dropdown.style.display = "none";
				if (this.opts.onNavigate) {
					this.opts.onNavigate(item, this.opts.items.indexOf(item));
				} else if (item.href) {
					window.location.href = item.href;
				}
			});
			dropdown.appendChild(a);
		});

		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			const isOpen = dropdown.style.display !== "none";
			dropdown.style.display = isOpen ? "none" : "block";
		});

		// Close on outside click
		document.addEventListener("click", () => {
			dropdown.style.display = "none";
		});

		li.appendChild(btn);
		li.appendChild(dropdown);
		return li;
	}

	/* ── Public API ─────────────────────────────────────── */

	setItems(items) {
		this.opts.items = items;
		this._render();
	}

	push(item) {
		this.opts.items.push(item);
		this._render();
	}

	pop() {
		this.opts.items.pop();
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
