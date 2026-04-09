// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVWorkspaceView — Visual Workspace Renderer
 * =============================================
 * Renders workspace dashboards with:
 * - Scene header (SVG immersive, powered by SceneEngine)
 * - KPI number cards with real-time data
 * - Shortcut grid with glassmorphism cards
 * - Quick lists and reports
 * - Chart area with multiple chart types
 * - Recent documents feed
 *
 * Can be used standalone or to enhance existing Frappe workspaces.
 *
 * Usage:
 *   FVWorkspaceView.create("#container", {
 *     title: "Finance",
 *     icon: "currency-dollar",
 *     kpis: [
 *       { label: "Revenue", doctype: "Sales Invoice", filters: {status:"Paid"}, aggregate: "sum", field: "grand_total" },
 *     ],
 *     shortcuts: [
 *       { label: "Sales Orders", route: "/app/sales-order", icon: "file-text", count_doctype: "Sales Order" },
 *     ],
 *     charts: [
 *       { type: "donut", title: "By Status", doctype: "Sales Order", groupBy: "status" },
 *     ],
 *   });
 */

export class FVWorkspaceView {
	static create(container, opts = {}) {
		return new FVWorkspaceView(container, opts);
	}

	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		this.opts = Object.assign({
			title: "",
			subtitle: "",
			icon: "dashboard",
			color: "#6366F1",
			kpis: [],
			shortcuts: [],
			charts: [],
			quickLists: [],
			recentDoctype: null,
			showScene: false,
			scenePreset: null,
		}, opts);

		this._render();
		this._loadData();
	}

	_render() {
		this.container.innerHTML = "";
		this.container.classList.add("fv-workspace-view");

		const html = `
			<div class="fv-workspace-view__inner fv-fx-page-enter">
				${this.opts.showScene ? `<div class="fv-workspace-view__scene" id="fv-ws-scene"></div>` : ""}
				<div class="fv-workspace-view__header fv-fx-glass">
					<div class="fv-workspace-view__header-title">
						<i class="ti ti-${this.opts.icon}" style="color:${this.opts.color};font-size:1.75rem"></i>
						<div>
							<h2>${frappe.utils.escape_html(this.opts.title)}</h2>
							${this.opts.subtitle ? `<p class="text-muted">${frappe.utils.escape_html(this.opts.subtitle)}</p>` : ""}
						</div>
					</div>
				</div>

				${this.opts.kpis.length ? `<div class="fv-workspace-view__kpis" id="fv-ws-kpis"></div>` : ""}
				${this.opts.shortcuts.length ? `<div class="fv-workspace-view__shortcuts" id="fv-ws-shortcuts"></div>` : ""}
				${this.opts.charts.length ? `<div class="fv-workspace-view__charts" id="fv-ws-charts"></div>` : ""}
				${this.opts.quickLists.length ? `<div class="fv-workspace-view__lists" id="fv-ws-lists"></div>` : ""}
				${this.opts.recentDoctype ? `<div class="fv-workspace-view__recent" id="fv-ws-recent"></div>` : ""}
			</div>
		`;

		this.container.innerHTML = html;
		this._renderShortcuts();
	}

	_renderShortcuts() {
		const el = this.container.querySelector("#fv-ws-shortcuts");
		if (!el) return;

		el.innerHTML = `<h3 class="fv-workspace-view__section-title">${__("Quick Access")}</h3>
			<div class="fv-workspace-view__shortcuts-grid">
				${this.opts.shortcuts.map((s, i) => `
					<a class="fv-workspace-shortcut fv-fx-glass fv-fx-hover-lift" href="${s.route || "#"}"
						style="animation-delay:${i * 0.05}s">
						<div class="fv-workspace-shortcut__icon" style="background:${s.color || this.opts.color}20;color:${s.color || this.opts.color}">
							<i class="ti ti-${s.icon || "file"}"></i>
						</div>
						<div class="fv-workspace-shortcut__info">
							<span class="fv-workspace-shortcut__label">${frappe.utils.escape_html(__(s.label))}</span>
							<span class="fv-workspace-shortcut__count" data-count-doctype="${s.count_doctype || ""}">—</span>
						</div>
					</a>
				`).join("")}
			</div>
		`;
	}

	async _loadData() {
		await Promise.all([
			this._loadKPIs(),
			this._loadShortcutCounts(),
			this._loadQuickLists(),
			this._loadRecent(),
		]);
		this._renderCharts();
	}

	async _loadKPIs() {
		const el = this.container.querySelector("#fv-ws-kpis");
		if (!el || !this.opts.kpis.length) return;

		const results = await Promise.all(
			this.opts.kpis.map(async (kpi) => {
				try {
					if (kpi.aggregate === "count") {
						const count = await frappe.xcall("frappe.client.get_count", {
							doctype: kpi.doctype,
							filters: kpi.filters || {},
						});
						return { ...kpi, value: count };
					} else if (kpi.aggregate === "sum" && kpi.field) {
						const result = await frappe.xcall("frappe.client.get_list", {
							doctype: kpi.doctype,
							filters: kpi.filters || {},
							fields: [`sum(${kpi.field}) as total`],
							limit_page_length: 0,
						});
						return { ...kpi, value: result?.[0]?.total || 0 };
					}
					return { ...kpi, value: 0 };
				} catch {
					return { ...kpi, value: "—" };
				}
			})
		);

		el.innerHTML = `<h3 class="fv-workspace-view__section-title">${__("Key Metrics")}</h3>
			<div class="fv-workspace-view__kpis-grid">
				${results.map((kpi, i) => {
					let displayValue = kpi.value;
					if (kpi.format === "Currency") {
						displayValue = format_currency(kpi.value || 0);
					} else if (typeof kpi.value === "number") {
						displayValue = kpi.value.toLocaleString();
					}
					return `<div class="fv-workspace-kpi fv-fx-glass fv-fx-hover-lift" style="animation-delay:${i * 0.06}s">
						<div class="fv-workspace-kpi__icon" style="background:${kpi.color || this.opts.color}20;color:${kpi.color || this.opts.color}">
							<i class="ti ti-${kpi.icon || "chart-bar"}"></i>
						</div>
						<div class="fv-workspace-kpi__value">${frappe.utils.escape_html(String(displayValue))}</div>
						<div class="fv-workspace-kpi__label">${frappe.utils.escape_html(__(kpi.label))}</div>
					</div>`;
				}).join("")}
			</div>
		`;
	}

	async _loadShortcutCounts() {
		const countEls = this.container.querySelectorAll("[data-count-doctype]");
		await Promise.all(Array.from(countEls).map(async (el) => {
			const dt = el.dataset.countDoctype;
			if (!dt) return;
			try {
				const count = await frappe.xcall("frappe.client.get_count", { doctype: dt });
				el.textContent = (count || 0).toLocaleString();
			} catch {
				el.textContent = "—";
			}
		}));
	}

	async _loadQuickLists() {
		const el = this.container.querySelector("#fv-ws-lists");
		if (!el || !this.opts.quickLists.length) return;

		const lists = await Promise.all(
			this.opts.quickLists.map(async (ql) => {
				try {
					const data = await frappe.xcall("frappe.client.get_list", {
						doctype: ql.doctype,
						fields: ql.fields || ["name", "modified"],
						filters: ql.filters || {},
						order_by: ql.orderBy || "modified desc",
						limit_page_length: ql.limit || 5,
					});
					return { ...ql, data };
				} catch {
					return { ...ql, data: [] };
				}
			})
		);

		el.innerHTML = lists.map(ql => `
			<div class="fv-workspace-quicklist fv-fx-glass">
				<h4 class="fv-workspace-quicklist__title">
					${frappe.utils.escape_html(__(ql.label || ql.doctype))}
					<a href="/app/${frappe.router.slug(ql.doctype)}" class="fv-workspace-quicklist__viewall">${__("View All")}</a>
				</h4>
				<ul class="fv-workspace-quicklist__items">
					${ql.data.map(row => `
						<li class="fv-workspace-quicklist__item fv-fx-hover-lift">
							<a href="/app/${frappe.router.slug(ql.doctype)}/${encodeURIComponent(row.name)}">${frappe.utils.escape_html(row[ql.titleField || "name"])}</a>
							${row.modified ? `<span class="fv-workspace-quicklist__date">${frappe.datetime.prettyDate(row.modified)}</span>` : ""}
						</li>
					`).join("")}
				</ul>
			</div>
		`).join("");
	}

	async _loadRecent() {
		const el = this.container.querySelector("#fv-ws-recent");
		if (!el || !this.opts.recentDoctype) return;

		try {
			const data = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.recentDoctype,
				fields: ["name", "modified", "owner"],
				order_by: "modified desc",
				limit_page_length: 8,
			});

			el.innerHTML = `<h3 class="fv-workspace-view__section-title">${__("Recent")}</h3>
				<div class="fv-workspace-recent__grid">
					${data.map(row => `
						<a class="fv-workspace-recent__item fv-fx-glass fv-fx-hover-lift"
							href="/app/${frappe.router.slug(this.opts.recentDoctype)}/${encodeURIComponent(row.name)}">
							<span class="fv-workspace-recent__name">${frappe.utils.escape_html(row.name)}</span>
							<span class="fv-workspace-recent__time">${frappe.datetime.prettyDate(row.modified)}</span>
						</a>
					`).join("")}
				</div>
			`;
		} catch {
			el.innerHTML = "";
		}
	}

	_renderCharts() {
		const el = this.container.querySelector("#fv-ws-charts");
		if (!el || !this.opts.charts.length) return;

		el.innerHTML = `<h3 class="fv-workspace-view__section-title">${__("Analytics")}</h3>
			<div class="fv-workspace-view__charts-grid">
				${this.opts.charts.map((c, i) => `
					<div class="fv-workspace-chart fv-fx-glass" id="fv-ws-chart-${i}">
						<h4 class="fv-workspace-chart__title">${frappe.utils.escape_html(__(c.title))}</h4>
						<div class="fv-workspace-chart__body" id="fv-ws-chart-body-${i}"></div>
					</div>
				`).join("")}
			</div>
		`;

		// Charts can be rendered by downstream apps using frappe.visual chart components
		this.opts.charts.forEach((chart, i) => {
			const chartContainer = el.querySelector(`#fv-ws-chart-body-${i}`);
			if (chartContainer && chart.render) {
				chart.render(chartContainer, chart);
			}
		});
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-workspace-view");
	}
}
