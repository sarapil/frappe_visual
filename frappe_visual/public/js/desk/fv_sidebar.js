// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVSidebar — Visual Sidebar Navigation
 * ========================================
 * Collapsible, icon-rich sidebar with:
 * - Section grouping with headers
 * - Active item tracking via route
 * - Badge counters (live DocType counts)
 * - Search filter
 * - Collapse/expand with animation
 * - RTL support via CSS Logical Properties
 *
 * Usage:
 *   const sidebar = FVSidebar.create("#sidebar", {
 *     sections: [
 *       {
 *         title: __("Modules"),
 *         items: [
 *           { label: __("Sales"), icon: "shopping-cart", route: "/app/sales-order", countDoctype: "Sales Order" },
 *           { label: __("Projects"), icon: "building", route: "/app/project" },
 *         ],
 *       },
 *     ],
 *   });
 */

export class FVSidebar {
	static create(container, opts = {}) {
		return new FVSidebar(container, opts);
	}

	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		this.opts = Object.assign({
			sections: [],
			collapsed: false,
			showSearch: true,
			showCollapseBtn: true,
			activeRoute: window.location.pathname,
			onItemClick: null,
		}, opts);

		this._collapsed = this.opts.collapsed;
		this._render();
		this._loadCounts();
	}

	_render() {
		this.container.innerHTML = "";
		this.container.classList.add("fv-sidebar");
		if (this._collapsed) this.container.classList.add("fv-sidebar--collapsed");

		const html = `
			<div class="fv-sidebar__inner">
				${this.opts.showCollapseBtn ? `
					<button class="fv-sidebar__collapse-btn fv-fx-hover-lift" title="${__("Toggle sidebar")}">
						<i class="ti ti-layout-sidebar-left-collapse"></i>
					</button>
				` : ""}

				${this.opts.showSearch ? `
					<div class="fv-sidebar__search">
						<i class="ti ti-search"></i>
						<input type="search" placeholder="${__("Search")}..." class="fv-sidebar__search-input" />
					</div>
				` : ""}

				<nav class="fv-sidebar__nav">
					${this.opts.sections.map(section => this._renderSection(section)).join("")}
				</nav>
			</div>
		`;

		this.container.innerHTML = html;

		// Collapse button
		this.container.querySelector(".fv-sidebar__collapse-btn")?.addEventListener("click", () => {
			this.toggle();
		});

		// Search
		const searchInput = this.container.querySelector(".fv-sidebar__search-input");
		if (searchInput) {
			searchInput.addEventListener("input", (e) => this._filter(e.target.value));
		}

		// Item clicks
		this.container.querySelectorAll(".fv-sidebar__item").forEach(item => {
			item.addEventListener("click", (e) => {
				e.preventDefault();
				const route = item.dataset.route;
				this._setActive(route);
				if (this.opts.onItemClick) {
					this.opts.onItemClick(route, item);
				} else if (route) {
					frappe.set_route(route);
				}
			});
		});
	}

	_renderSection(section) {
		return `
			<div class="fv-sidebar__section" data-section="${frappe.utils.escape_html(section.title || "")}">
				${section.title ? `
					<div class="fv-sidebar__section-header">
						<span class="fv-sidebar__section-title">${frappe.utils.escape_html(__(section.title))}</span>
					</div>
				` : ""}
				<ul class="fv-sidebar__items">
					${(section.items || []).map(item => this._renderItem(item)).join("")}
				</ul>
			</div>
		`;
	}

	_renderItem(item) {
		const isActive = this.opts.activeRoute && item.route &&
			this.opts.activeRoute.includes(item.route);

		return `
			<li>
				<a class="fv-sidebar__item ${isActive ? "fv-sidebar__item--active" : ""} fv-fx-hover-lift"
					href="${item.route || "#"}" data-route="${item.route || ""}"
					title="${frappe.utils.escape_html(__(item.label))}">
					<span class="fv-sidebar__item-icon">
						<i class="ti ti-${item.icon || "file"}"></i>
					</span>
					<span class="fv-sidebar__item-label">${frappe.utils.escape_html(__(item.label))}</span>
					${item.countDoctype ? `<span class="fv-sidebar__item-badge" data-count-doctype="${item.countDoctype}">—</span>` : ""}
					${item.badge ? `<span class="fv-sidebar__item-badge">${frappe.utils.escape_html(String(item.badge))}</span>` : ""}
				</a>
			</li>
		`;
	}

	_setActive(route) {
		this.container.querySelectorAll(".fv-sidebar__item").forEach(el => {
			el.classList.toggle("fv-sidebar__item--active", el.dataset.route === route);
		});
	}

	_filter(term) {
		const lower = term.toLowerCase();
		this.container.querySelectorAll(".fv-sidebar__item").forEach(el => {
			const label = el.querySelector(".fv-sidebar__item-label")?.textContent?.toLowerCase() || "";
			el.parentElement.style.display = label.includes(lower) ? "" : "none";
		});
		// Hide empty sections
		this.container.querySelectorAll(".fv-sidebar__section").forEach(section => {
			const visibleItems = section.querySelectorAll("li:not([style*='display: none'])");
			section.style.display = visibleItems.length ? "" : "none";
		});
	}

	async _loadCounts() {
		const badges = this.container.querySelectorAll("[data-count-doctype]");
		await Promise.all(Array.from(badges).map(async (el) => {
			const dt = el.dataset.countDoctype;
			if (!dt) return;
			try {
				const count = await frappe.xcall("frappe.client.get_count", { doctype: dt });
				el.textContent = (count || 0).toLocaleString();
			} catch {
				el.textContent = "";
			}
		}));
	}

	toggle() {
		this._collapsed = !this._collapsed;
		this.container.classList.toggle("fv-sidebar--collapsed", this._collapsed);
		const icon = this.container.querySelector(".fv-sidebar__collapse-btn i");
		if (icon) {
			icon.className = this._collapsed
				? "ti ti-layout-sidebar-left-expand"
				: "ti ti-layout-sidebar-left-collapse";
		}
	}

	collapse() { this._collapsed = true; this.container.classList.add("fv-sidebar--collapsed"); }
	expand() { this._collapsed = false; this.container.classList.remove("fv-sidebar--collapsed"); }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sidebar", "fv-sidebar--collapsed");
	}
}
