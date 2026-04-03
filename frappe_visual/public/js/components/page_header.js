/**
 * Frappe Visual — Breadcrumb Pro + Page Header
 * ================================================
 * Smart breadcrumbs with dropdown sub-navigation, search, avatar,
 * status badge, action buttons, and responsive collapse.
 * A complete page header component for premium Frappe pages.
 *
 * Features:
 *  - Auto-breadcrumb from current route (Frappe-aware)
 *  - Dropdown sub-nav on each breadcrumb segment (shows siblings)
 *  - Inline search on breadcrumb dropdown
 *  - Page title with status badge + document icon
 *  - User avatar (owner) + modified timestamp
 *  - Primary + secondary action buttons
 *  - "More actions" overflow menu (⋯)
 *  - Back button with route history
 *  - Responsive: collapses breadcrumbs on mobile
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.PageHeader.create('#el', { title, breadcrumbs, actions })
 *
 * @module frappe_visual/components/page_header
 */

function _esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

export class PageHeader {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("PageHeader: container not found");

		this.opts = Object.assign({
			theme: "glass",
			title: "",
			subtitle: "",
			icon: null,
			status: null,          // { label, color } — e.g. { label: "Active", color: "green" }
			breadcrumbs: [],       // [{ label, route?, children?: [{ label, route }] }]
			avatar: null,          // { image, name }
			modified: null,        // date string
			actions: [],           // [{ label, icon?, variant?: "primary"|"secondary"|"danger", onClick }]
			moreActions: [],       // overflow menu items: [{ label, icon?, onClick }]
			showBack: true,
			onBack: null,
			onSearch: null,        // enables search in breadcrumb dropdowns
		}, opts);

		this._openDropdown = null;
		this._init();
	}

	static create(container, opts) { return new PageHeader(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-ph", `fv-ph--${this.opts.theme}`);
		this.container.innerHTML = "";
		this._render();
		this._setupCloseDropdowns();
	}

	/* ── Render ──────────────────────────────────────────────── */
	_render() {
		this.container.innerHTML = `
			<div class="fv-ph-top">
				${this._renderBreadcrumbs()}
			</div>
			<div class="fv-ph-main">
				<div class="fv-ph-left">
					${this.opts.showBack ? `<button class="fv-ph-back" title="${__("Back")}">←</button>` : ""}
					${this.opts.icon ? `<span class="fv-ph-icon">${_esc(this.opts.icon)}</span>` : ""}
					<div class="fv-ph-titles">
						<h1 class="fv-ph-title">${_esc(this.opts.title)}</h1>
						${this.opts.subtitle ? `<span class="fv-ph-subtitle">${_esc(this.opts.subtitle)}</span>` : ""}
					</div>
					${this.opts.status ? `<span class="fv-ph-status fv-ph-status--${this.opts.status.color || "blue"}">${_esc(this.opts.status.label)}</span>` : ""}
				</div>
				<div class="fv-ph-right">
					${this._renderMeta()}
					${this._renderActions()}
				</div>
			</div>`;

		// Back button
		const backBtn = this.container.querySelector(".fv-ph-back");
		if (backBtn) backBtn.addEventListener("click", () => {
			if (this.opts.onBack) this.opts.onBack();
			else window.history.back();
		});

		// Action buttons
		this.container.querySelectorAll(".fv-ph-action[data-idx]").forEach(btn => {
			const idx = parseInt(btn.dataset.idx);
			btn.addEventListener("click", () => this.opts.actions[idx]?.onClick?.());
		});

		// More menu
		const moreBtn = this.container.querySelector(".fv-ph-more-btn");
		if (moreBtn) {
			moreBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this._toggleMoreMenu();
			});
		}

		// Breadcrumb dropdowns
		this.container.querySelectorAll(".fv-ph-crumb-trigger").forEach(el => {
			el.addEventListener("click", (e) => {
				e.stopPropagation();
				this._toggleBreadcrumbDropdown(el);
			});
		});

		// Breadcrumb links
		this.container.querySelectorAll(".fv-ph-crumb-link[data-route]").forEach(el => {
			el.addEventListener("click", () => frappe.set_route(el.dataset.route));
		});
	}

	/* ── Breadcrumbs ─────────────────────────────────────────── */
	_renderBreadcrumbs() {
		const crumbs = this.opts.breadcrumbs;
		if (!crumbs.length) return "";

		return `<nav class="fv-ph-breadcrumbs">${
			crumbs.map((c, i) => {
				const isLast = i === crumbs.length - 1;
				const hasChildren = c.children?.length > 0;

				let html = "";
				if (c.route && !isLast) {
					html = `<span class="fv-ph-crumb-link" data-route="${_esc(c.route)}">${_esc(c.label)}</span>`;
				} else {
					html = `<span class="fv-ph-crumb-current">${_esc(c.label)}</span>`;
				}

				if (hasChildren) {
					html += `<button class="fv-ph-crumb-trigger" data-idx="${i}">▾</button>`;
					html += `<div class="fv-ph-crumb-dropdown" data-idx="${i}" style="display:none">
						${this.opts.onSearch ? `<input class="fv-ph-crumb-search" placeholder="${__("Search…")}" data-idx="${i}" />` : ""}
						<div class="fv-ph-crumb-list">${c.children.map(ch =>
							`<div class="fv-ph-crumb-child" data-route="${_esc(ch.route || "")}">${_esc(ch.label)}</div>`
						).join("")}</div>
					</div>`;
				}

				return `<span class="fv-ph-crumb">${html}</span>${!isLast ? `<span class="fv-ph-crumb-sep">/</span>` : ""}`;
			}).join("")
		}</nav>`;
	}

	_toggleBreadcrumbDropdown(trigger) {
		const idx = trigger.dataset.idx;
		const dd = this.container.querySelector(`.fv-ph-crumb-dropdown[data-idx="${idx}"]`);
		if (!dd) return;

		const wasOpen = dd.style.display !== "none";
		this._closeAllDropdowns();
		if (!wasOpen) {
			dd.style.display = "block";
			this._openDropdown = dd;

			// Dropdown child clicks
			dd.querySelectorAll(".fv-ph-crumb-child").forEach(el => {
				el.addEventListener("click", () => {
					if (el.dataset.route) frappe.set_route(el.dataset.route);
					this._closeAllDropdowns();
				});
			});

			// Search filter
			const search = dd.querySelector(".fv-ph-crumb-search");
			if (search) {
				search.focus();
				search.addEventListener("input", (e) => {
					const q = e.target.value.toLowerCase();
					dd.querySelectorAll(".fv-ph-crumb-child").forEach(el => {
						el.style.display = el.textContent.toLowerCase().includes(q) ? "" : "none";
					});
				});
			}
		}
	}

	/* ── Meta (avatar + modified) ────────────────────────────── */
	_renderMeta() {
		const parts = [];
		if (this.opts.avatar) {
			parts.push(`<div class="fv-ph-avatar">
				${this.opts.avatar.image ? `<img src="${_esc(this.opts.avatar.image)}" />` : ""}
				<span>${_esc(this.opts.avatar.name || "")}</span>
			</div>`);
		}
		if (this.opts.modified) {
			parts.push(`<span class="fv-ph-modified">${frappe.datetime?.prettyDate?.(this.opts.modified) || this.opts.modified}</span>`);
		}
		return parts.length ? `<div class="fv-ph-meta">${parts.join("")}</div>` : "";
	}

	/* ── Actions ─────────────────────────────────────────────── */
	_renderActions() {
		const btns = this.opts.actions.map((a, i) =>
			`<button class="fv-ph-action fv-ph-action--${a.variant || "secondary"}" data-idx="${i}">
				${a.icon ? `<span class="fv-ph-action-icon">${a.icon}</span>` : ""}
				${_esc(a.label)}
			</button>`
		).join("");

		const more = this.opts.moreActions.length ? `
			<div class="fv-ph-more">
				<button class="fv-ph-more-btn" title="${__("More actions")}">⋯</button>
				<div class="fv-ph-more-menu" style="display:none">
					${this.opts.moreActions.map((a, i) =>
						`<div class="fv-ph-more-item" data-idx="${i}">
							${a.icon ? `<span>${a.icon}</span>` : ""}
							${_esc(a.label)}
						</div>`
					).join("")}
				</div>
			</div>` : "";

		return `<div class="fv-ph-actions">${btns}${more}</div>`;
	}

	_toggleMoreMenu() {
		const menu = this.container.querySelector(".fv-ph-more-menu");
		if (!menu) return;

		const wasOpen = menu.style.display !== "none";
		this._closeAllDropdowns();
		if (!wasOpen) {
			menu.style.display = "block";
			this._openDropdown = menu;
			menu.querySelectorAll(".fv-ph-more-item").forEach(el => {
				el.addEventListener("click", () => {
					const idx = parseInt(el.dataset.idx);
					this.opts.moreActions[idx]?.onClick?.();
					this._closeAllDropdowns();
				});
			});
		}
	}

	/* ── Dropdown management ─────────────────────────────────── */
	_closeAllDropdowns() {
		this.container.querySelectorAll(".fv-ph-crumb-dropdown, .fv-ph-more-menu").forEach(d => d.style.display = "none");
		this._openDropdown = null;
	}

	_setupCloseDropdowns() {
		document.addEventListener("click", () => this._closeAllDropdowns());
	}

	/* ── Static: auto-build from Frappe route ────────────────── */
	static fromRoute(container, opts = {}) {
		const route = frappe.get_route?.() || [];
		const breadcrumbs = [];

		if (route[0] === "app") {
			breadcrumbs.push({ label: __("Home"), route: "/app" });

			if (route[1]) {
				const dt = route[1].replace(/-/g, " ");
				breadcrumbs.push({ label: __(dt), route: `/app/${route[1]}` });
			}
			if (route[2]) {
				breadcrumbs.push({ label: route[2] });
				opts.title = opts.title || route[2];
			}
		}

		return new PageHeader(container, { ...opts, breadcrumbs });
	}

	/* ── Public API ──────────────────────────────────────────── */
	setTitle(title) { this.opts.title = title; this._render(); }
	setStatus(status) { this.opts.status = status; this._render(); }
	setBreadcrumbs(crumbs) { this.opts.breadcrumbs = crumbs; this._render(); }
	setActions(actions) { this.opts.actions = actions; this._render(); }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ph", `fv-ph--${this.opts.theme}`);
	}
}
