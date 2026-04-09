// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVNavbar — Visual Navbar
 * ==========================
 * Custom navigation bar with:
 * - App logo & title
 * - Spotlight search (Ctrl+K)
 * - Quick create menu
 * - Notification bell
 * - User menu with avatar
 * - Breadcrumb integration
 * - RTL support
 *
 * Usage:
 *   FVNavbar.create("#navbar", {
 *     logo: "/assets/arkan_theme/images/logo.svg",
 *     title: "Arkan ERP",
 *     showSearch: true,
 *     showNotifications: true,
 *     quickCreate: [
 *       { label: "Sales Order", doctype: "Sales Order" },
 *     ],
 *   });
 */

export class FVNavbar {
	static create(container, opts = {}) {
		return new FVNavbar(container, opts);
	}

	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		this.opts = Object.assign({
			logo: null,
			title: "Arkan",
			showSearch: true,
			showNotifications: true,
			showQuickCreate: true,
			quickCreate: [],
			navItems: [],
			userMenu: [],
			onSearch: null,
		}, opts);

		this._render();
		this._bindEvents();
	}

	_render() {
		this.container.innerHTML = "";
		this.container.classList.add("fv-navbar");
		this.container.setAttribute("dir", "auto");

		this.container.innerHTML = `
			<div class="fv-navbar__inner fv-fx-glass">
				<div class="fv-navbar__start">
					<a class="fv-navbar__brand" href="/desk">
						${this.opts.logo ? `<img src="${this.opts.logo}" alt="" class="fv-navbar__logo" />` : ""}
						<span class="fv-navbar__title">${frappe.utils.escape_html(this.opts.title)}</span>
					</a>
					${this.opts.navItems.length ? `
						<nav class="fv-navbar__nav">
							${this.opts.navItems.map(item => `
								<a class="fv-navbar__nav-item fv-fx-hover-lift" href="${item.route || "#"}">
									${item.icon ? `<i class="ti ti-${item.icon}"></i>` : ""}
									<span>${frappe.utils.escape_html(__(item.label))}</span>
								</a>
							`).join("")}
						</nav>
					` : ""}
				</div>

				<div class="fv-navbar__center">
					${this.opts.showSearch ? `
						<button class="fv-navbar__search-trigger fv-fx-glass" id="fv-nav-search">
							<i class="ti ti-search"></i>
							<span>${__("Search")}...</span>
							<kbd>⌘K</kbd>
						</button>
					` : ""}
				</div>

				<div class="fv-navbar__end">
					${this.opts.showQuickCreate ? `
						<div class="fv-navbar__quick-create">
							<button class="fv-navbar__icon-btn fv-fx-hover-lift" id="fv-nav-create" title="${__("Quick Create")}">
								<i class="ti ti-plus"></i>
							</button>
							<div class="fv-navbar__dropdown" id="fv-nav-create-menu" style="display:none">
								${this.opts.quickCreate.map(item => `
									<a class="fv-navbar__dropdown-item" href="/app/${frappe.router?.slug?.(item.doctype) || item.doctype.toLowerCase().replace(/ /g, "-")}/new">
										<i class="ti ti-${item.icon || "file-plus"}"></i>
										${frappe.utils.escape_html(__(item.label || item.doctype))}
									</a>
								`).join("")}
							</div>
						</div>
					` : ""}

					${this.opts.showNotifications ? `
						<button class="fv-navbar__icon-btn fv-fx-hover-lift" id="fv-nav-notifications" title="${__("Notifications")}">
							<i class="ti ti-bell"></i>
							<span class="fv-navbar__badge" id="fv-nav-notif-count" style="display:none">0</span>
						</button>
					` : ""}

					<div class="fv-navbar__user">
						<button class="fv-navbar__user-btn" id="fv-nav-user">
							<span class="fv-navbar__avatar">
								${frappe.session?.user_image
									? `<img src="${frappe.session.user_image}" alt="" />`
									: `<i class="ti ti-user"></i>`
								}
							</span>
						</button>
						<div class="fv-navbar__dropdown fv-navbar__user-menu" id="fv-nav-user-menu" style="display:none">
							<div class="fv-navbar__user-info">
								<strong>${frappe.utils.escape_html(frappe.session?.user_fullname || "User")}</strong>
								<small>${frappe.utils.escape_html(frappe.session?.user || "")}</small>
							</div>
							<hr/>
							<a class="fv-navbar__dropdown-item" href="/app/user-settings">
								<i class="ti ti-settings"></i> ${__("Settings")}
							</a>
							${this.opts.userMenu.map(item => `
								<a class="fv-navbar__dropdown-item" href="${item.route || "#"}">
									${item.icon ? `<i class="ti ti-${item.icon}"></i>` : ""} ${frappe.utils.escape_html(__(item.label))}
								</a>
							`).join("")}
							<hr/>
							<a class="fv-navbar__dropdown-item fv-navbar__dropdown-item--danger" href="/api/method/logout">
								<i class="ti ti-logout"></i> ${__("Logout")}
							</a>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	_bindEvents() {
		// Search trigger
		const searchBtn = this.container.querySelector("#fv-nav-search");
		if (searchBtn) {
			searchBtn.addEventListener("click", () => {
				if (this.opts.onSearch) {
					this.opts.onSearch();
				} else if (frappe.visual?.commandPalette) {
					frappe.visual.commandPalette();
				}
			});
		}

		// Quick create dropdown
		this._setupDropdown("fv-nav-create", "fv-nav-create-menu");

		// User menu dropdown
		this._setupDropdown("fv-nav-user", "fv-nav-user-menu");

		// Keyboard shortcut
		document.addEventListener("keydown", (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				searchBtn?.click();
			}
		});

		// Load notification count
		this._loadNotificationCount();
	}

	_setupDropdown(triggerID, menuID) {
		const trigger = this.container.querySelector(`#${triggerID}`);
		const menu = this.container.querySelector(`#${menuID}`);
		if (!trigger || !menu) return;

		trigger.addEventListener("click", (e) => {
			e.stopPropagation();
			const isOpen = menu.style.display !== "none";
			// Close all dropdowns
			this.container.querySelectorAll(".fv-navbar__dropdown").forEach(d => d.style.display = "none");
			menu.style.display = isOpen ? "none" : "block";
		});

		document.addEventListener("click", () => {
			menu.style.display = "none";
		});
	}

	async _loadNotificationCount() {
		const badge = this.container.querySelector("#fv-nav-notif-count");
		if (!badge) return;
		try {
			const count = await frappe.xcall("frappe.desk.notifications.get_notifications");
			const total = count?.open_count_doctype
				? Object.values(count.open_count_doctype).reduce((a, b) => a + b, 0) : 0;
			if (total > 0) {
				badge.textContent = total > 99 ? "99+" : total;
				badge.style.display = "";
			}
		} catch {
			// Notifications not critical
		}
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-navbar");
	}
}
