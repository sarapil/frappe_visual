// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVPage — frappe_visual Page System
 * ====================================
 * Replaces frappe.ui.Page with a visual-first page layout that uses
 * CSS Logical Properties, glassmorphism effects, and frappe_visual icons.
 *
 * Provides: title bar with breadcrumb, action bar, content area with
 * sidebar panel, and footer. Supports both full-page and embedded modes.
 *
 * Usage:
 *   const page = FVPage.create({
 *     title: __("Projects"),
 *     icon: "building",
 *     breadcrumbs: [{ label: __("Home"), route: "/" }, { label: __("Projects") }],
 *     actions: [{ label: __("New"), primary: true, onClick: () => {} }],
 *   });
 *   page.mount("#my-container");
 */

export class FVPage {
	static create(opts = {}) {
		return new FVPage(opts);
	}

	constructor(opts = {}) {
		this.opts = Object.assign({
			title: "",
			subtitle: "",
			icon: null,
			breadcrumbs: [],
			actions: [],
			showSidebar: false,
			sidebarWidth: "280px",
			sidebarPosition: "end",
			cssClass: "",
			animate: true,
		}, opts);

		this._el = null;
		this._contentEl = null;
		this._sidebarEl = null;
		this._actionsEl = null;
		this._sections = [];
	}

	mount(container) {
		const target = typeof container === "string"
			? document.querySelector(container)
			: container;
		if (!target) return this;

		this._el = this._render();
		target.innerHTML = "";
		target.appendChild(this._el);

		if (this.opts.animate) {
			this._el.classList.add("fv-fx-page-enter");
		}
		return this;
	}

	_render() {
		const page = document.createElement("div");
		page.className = `fv-page ${this.opts.cssClass}`.trim();
		page.setAttribute("dir", "auto");

		page.innerHTML = `
			<div class="fv-page__header fv-fx-glass">
				${this._renderBreadcrumbs()}
				<div class="fv-page__title-row">
					<div class="fv-page__title-area">
						${this.opts.icon ? `<span class="fv-page__icon">${this._icon(this.opts.icon)}</span>` : ""}
						<div>
							<h2 class="fv-page__title">${frappe.utils.escape_html(this.opts.title)}</h2>
							${this.opts.subtitle ? `<p class="fv-page__subtitle">${frappe.utils.escape_html(this.opts.subtitle)}</p>` : ""}
						</div>
					</div>
					<div class="fv-page__actions"></div>
				</div>
			</div>
			<div class="fv-page__body">
				${this.opts.showSidebar ? `<aside class="fv-page__sidebar fv-fx-glass"></aside>` : ""}
				<main class="fv-page__content"></main>
			</div>
		`;

		this._contentEl = page.querySelector(".fv-page__content");
		this._sidebarEl = page.querySelector(".fv-page__sidebar");
		this._actionsEl = page.querySelector(".fv-page__actions");

		this._renderActions();
		return page;
	}

	_renderBreadcrumbs() {
		if (!this.opts.breadcrumbs.length) return "";
		const crumbs = this.opts.breadcrumbs.map((b, i) => {
			const isLast = i === this.opts.breadcrumbs.length - 1;
			if (isLast) {
				return `<span class="fv-breadcrumb__item fv-breadcrumb__item--active">${frappe.utils.escape_html(b.label)}</span>`;
			}
			return `<a class="fv-breadcrumb__item" href="${b.route || "#"}">${frappe.utils.escape_html(b.label)}</a>
				<span class="fv-breadcrumb__sep">${this._icon("chevron-right", "xs")}</span>`;
		}).join("");
		return `<nav class="fv-page__breadcrumbs fv-breadcrumb">${crumbs}</nav>`;
	}

	_renderActions() {
		if (!this._actionsEl || !this.opts.actions.length) return;
		this._actionsEl.innerHTML = "";
		this.opts.actions.forEach(action => {
			const btn = document.createElement("button");
			btn.className = `fv-btn ${action.primary ? "fv-btn--primary" : "fv-btn--secondary"} fv-fx-hover-lift`;
			btn.innerHTML = `${action.icon ? this._icon(action.icon, "sm") + " " : ""}${frappe.utils.escape_html(action.label)}`;
			if (action.onClick) btn.addEventListener("click", action.onClick);
			this._actionsEl.appendChild(btn);
		});
	}

	_icon(name, size = "md") {
		if (typeof frappe !== "undefined" && frappe.visual?.icons?.render) {
			return frappe.visual.icons.render(name, { size });
		}
		return `<i class="ti ti-${name}"></i>`;
	}

	/** Add a visual section to the content area */
	addSection(opts = {}) {
		const section = document.createElement("div");
		section.className = `fv-page__section ${opts.cssClass || ""}`.trim();
		if (opts.title) {
			const header = document.createElement("div");
			header.className = "fv-page__section-header";
			header.innerHTML = `<h3 class="fv-page__section-title">${frappe.utils.escape_html(opts.title)}</h3>`;
			section.appendChild(header);
		}
		const body = document.createElement("div");
		body.className = "fv-page__section-body";
		section.appendChild(body);
		this._contentEl.appendChild(section);
		this._sections.push({ el: section, body });
		return body;
	}

	/** Get the content area for direct manipulation */
	get content() { return this._contentEl; }
	get sidebar() { return this._sidebarEl; }
	get element() { return this._el; }

	/** Set a custom HTML content */
	setContent(html) {
		if (this._contentEl) this._contentEl.innerHTML = html;
		return this;
	}

	/** Add sidebar widget */
	addSidebarWidget(opts = {}) {
		if (!this._sidebarEl) return this;
		const widget = document.createElement("div");
		widget.className = "fv-sidebar__widget fv-fx-glass fv-fx-hover-lift";
		widget.innerHTML = `
			${opts.title ? `<h4 class="fv-sidebar__widget-title">${frappe.utils.escape_html(opts.title)}</h4>` : ""}
			<div class="fv-sidebar__widget-body"></div>
		`;
		this._sidebarEl.appendChild(widget);
		return widget.querySelector(".fv-sidebar__widget-body");
	}

	destroy() {
		if (this._el) {
			this._el.remove();
			this._el = null;
		}
	}
}
