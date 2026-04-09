/**
 * FV ERP Website — Visual Website Management Dashboard
 * =====================================================
 * Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
 * License: GPL-3.0
 *
 * Provides: Web Page Manager, Blog Dashboard, Web Form Tracker,
 * Website Settings, Portal User Overview.
 */

export class FVERPWebsite {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({}, opts);
		this.data = {};
	}

	async render() {
		this.container.innerHTML = "";
		const wrapper = document.createElement("div");
		wrapper.className = "fv-erp-website fv-fx-page-enter";
		wrapper.innerHTML = `
		<div class="fv-erp-website__inner">
			<div class="fv-erp-website__header fv-fx-glass">
				<div style="display:flex;align-items:center;gap:0.75rem">
					<span style="font-size:1.75rem">🌐</span>
					<div>
						<h2 style="margin:0;font-size:1.5rem">${__("Website Dashboard")}</h2>
						<p style="margin:0;font-size:0.85rem;color:var(--fv-text-muted)">${__("Pages, Blog & Portal Management")}</p>
					</div>
				</div>
				<div class="fv-erp-website__actions">
					<button class="fv-btn fv-btn--sm fv-btn--primary" onclick="frappe.new_doc('Web Page')">
						+ ${__("New Page")}
					</button>
					<button class="fv-btn fv-btn--sm fv-btn--outline" onclick="frappe.new_doc('Blog Post')">
						+ ${__("New Post")}
					</button>
				</div>
			</div>
			<div class="fv-erp-website__kpis"></div>
			<div class="fv-erp-website__grid">
				<div class="fv-erp-website__pages fv-fx-glass"></div>
				<div class="fv-erp-website__blog fv-fx-glass"></div>
			</div>
			<div class="fv-erp-website__grid">
				<div class="fv-erp-website__forms fv-fx-glass"></div>
				<div class="fv-erp-website__quick-links fv-fx-glass"></div>
			</div>
		</div>`;
		this.container.appendChild(wrapper);
		await this._loadData();
		this._renderKPIs(wrapper.querySelector(".fv-erp-website__kpis"));
		this._renderPages(wrapper.querySelector(".fv-erp-website__pages"));
		this._renderBlog(wrapper.querySelector(".fv-erp-website__blog"));
		this._renderForms(wrapper.querySelector(".fv-erp-website__forms"));
		this._renderQuickLinks(wrapper.querySelector(".fv-erp-website__quick-links"));
		return this;
	}

	async _loadData() {
		const [pages, publishedPages, blogPosts, publishedBlogs, webForms, portalUsers] = await Promise.all([
			frappe.xcall("frappe.client.get_count", { doctype: "Web Page", filters: {} }).catch(() => 0),
			frappe.xcall("frappe.client.get_count", { doctype: "Web Page", filters: { published: 1 } }).catch(() => 0),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Blog Post",
				fields: ["name", "title", "blog_category", "published", "creation", "blogger"],
				order_by: "creation desc",
				limit_page_length: 10,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_count", { doctype: "Blog Post", filters: { published: 1 } }).catch(() => 0),
			frappe.xcall("frappe.client.get_list", {
				doctype: "Web Form",
				fields: ["name", "title", "doc_type", "published", "route"],
				limit_page_length: 15,
			}).catch(() => []),
			frappe.xcall("frappe.client.get_count", { doctype: "User", filters: { user_type: "Website User" } }).catch(() => 0),
		]);
		const recentPages = await frappe.xcall("frappe.client.get_list", {
			doctype: "Web Page",
			fields: ["name", "title", "route", "published", "creation"],
			order_by: "creation desc",
			limit_page_length: 10,
		}).catch(() => []);
		this.data = { pages, publishedPages, blogPosts, publishedBlogs, webForms, portalUsers, recentPages };
	}

	_renderKPIs(el) {
		const d = this.data;
		const kpis = [
			{ label: __("Web Pages"), value: d.pages || 0, icon: "📄", color: "#6366f1" },
			{ label: __("Published"), value: d.publishedPages || 0, icon: "🌐", color: "#10b981" },
			{ label: __("Blog Posts"), value: d.publishedBlogs || 0, icon: "✍️", color: "#3b82f6" },
			{ label: __("Portal Users"), value: d.portalUsers || 0, icon: "👥", color: "#f59e0b" },
		];
		el.innerHTML = `<div class="fv-erp-kpi-row">${kpis.map(k => `
			<div class="fv-erp-kpi-card fv-fx-glass fv-fx-hover-lift" style="--kpi-accent:${k.color}">
				<span class="fv-erp-kpi-card__icon">${k.icon}</span>
				<div class="fv-erp-kpi-card__value">${k.value.toLocaleString()}</div>
				<div class="fv-erp-kpi-card__label">${k.label}</div>
			</div>`).join("")}</div>`;
	}

	_renderPages(el) {
		const items = this.data.recentPages || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Web Pages")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Title")}</th><th>${__("Route")}</th><th>${__("Published")}</th>
			</tr></thead>
			<tbody>${items.map(p => `<tr>
				<td><a href="/app/web-page/${encodeURIComponent(p.name)}">${frappe.utils.escape_html(p.title || p.name)}</a></td>
				<td><code>/${frappe.utils.escape_html(p.route || "")}</code></td>
				<td>${p.published ? "✅" : "❌"}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No web pages found")}</p>`}`;
	}

	_renderBlog(el) {
		const items = this.data.blogPosts || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Recent Blog Posts")}</h3>
		${items.length ? `<table class="fv-erp-table">
			<thead><tr>
				<th>${__("Title")}</th><th>${__("Category")}</th><th>${__("Author")}</th><th>${__("Published")}</th>
			</tr></thead>
			<tbody>${items.map(b => `<tr>
				<td><a href="/app/blog-post/${encodeURIComponent(b.name)}">${frappe.utils.escape_html(b.title || b.name)}</a></td>
				<td>${frappe.utils.escape_html(b.blog_category || "—")}</td>
				<td>${frappe.utils.escape_html(b.blogger || "—")}</td>
				<td>${b.published ? "✅" : "❌"}</td>
			</tr>`).join("")}</tbody>
		</table>` : `<p class="text-muted">${__("No blog posts found")}</p>`}`;
	}

	_renderForms(el) {
		const items = this.data.webForms || [];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Web Forms")}</h3>
		${items.length ? `<div class="fv-erp-card-list">${items.map(f => `
			<div class="fv-erp-mini-card fv-fx-hover-lift">
				<a href="/app/web-form/${encodeURIComponent(f.name)}">${frappe.utils.escape_html(f.title || f.name)}</a>
				<span class="text-muted">${frappe.utils.escape_html(f.doc_type || "")} ${f.published ? "✅" : "❌"}</span>
			</div>`).join("")}</div>` : `<p class="text-muted">${__("No web forms found")}</p>`}`;
	}

	_renderQuickLinks(el) {
		const links = [
			{ label: __("Website Settings"), route: "website-settings", icon: "⚙️" },
			{ label: __("Website Theme"), route: "List/Website Theme", icon: "🎨" },
			{ label: __("Website Sidebar"), route: "List/Website Sidebar", icon: "📑" },
			{ label: __("Website Script"), route: "List/Website Script", icon: "📜" },
			{ label: __("Blog Category"), route: "List/Blog Category", icon: "🏷️" },
			{ label: __("Contact Us"), route: "contact-us-settings", icon: "📧" },
		];
		el.innerHTML = `
		<h3 class="fv-panel-title">${__("Quick Links")}</h3>
		<div class="fv-erp-quick-links">${links.map(l => `
			<button class="fv-btn fv-btn--sm fv-btn--outline fv-fx-hover-lift" onclick="frappe.set_route('${l.route}')">
				${l.icon} ${l.label}
			</button>`).join("")}</div>`;
	}

	static async create(container, opts = {}) {
		const inst = new FVERPWebsite(container, opts);
		return inst.render();
	}
}
