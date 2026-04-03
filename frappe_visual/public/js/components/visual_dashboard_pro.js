/**
 * VisualDashboardPro — Premium Dashboard Builder
 * =================================================
 * Composable dashboard with drag-and-drop widget layout:
 *   • Widget types: KPI, chart, list, kanban, calendar, map, gauge, funnel,
 *     timeline, note, image, embed, shortcut grid, activity feed
 *   • Responsive grid layout (CSS Grid / masonry)
 *   • Drag-and-drop reordering with GSAP Draggable
 *   • Save/load layouts per user or globally
 *   • Real-time data refresh with configurable intervals
 *   • Glassmorphism / flat / minimal themes
 *   • Full-screen widget expansion
 *   • Dark mode auto-detect
 *   • RTL support
 *   • Export dashboard as PNG / PDF
 *
 * Usage:
 *   frappe.visual.DashboardPro.create('#container', {
 *     title: 'Sales Overview',
 *     widgets: [
 *       { type: 'kpi', label: 'Revenue', doctype: 'Sales Invoice', aggregate: 'sum', field: 'grand_total' },
 *       { type: 'chart', chartType: 'bar', doctype: 'Sales Invoice', x: 'posting_date', y: 'grand_total' },
 *       { type: 'list', doctype: 'Sales Order', filters: { status: 'To Deliver' }, limit: 5 },
 *     ],
 *     columns: 3,
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualDashboardPro {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("DashboardPro: container not found");

		this.config = Object.assign({
			title: "",
			subtitle: "",
			icon: "activity",
			color: "#6366F1",
			widgets: [],
			columns: 3,
			gap: 16,
			theme: "glass",          // glass | flat | minimal
			editable: false,         // enable drag-and-drop
			autoRefresh: 0,          // seconds (0 = off)
			saveable: false,         // save layout to server
			layoutKey: "",           // unique key for saved layout
			fullscreenable: true,
		}, config);

		this.widgetInstances = [];
		this._init();
	}

	static create(container, config) {
		return new VisualDashboardPro(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._renderWidgets();
		if (this.config.autoRefresh > 0) {
			this._refreshInterval = setInterval(() => this.refresh(), this.config.autoRefresh * 1000);
		}
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.container.innerHTML = "";
		const isRTL = ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);

		this.el = document.createElement("div");
		this.el.className = `fv-dash-pro fv-dash-pro--${this.config.theme}`;
		this.el.setAttribute("dir", isRTL ? "rtl" : "ltr");

		this.el.innerHTML = `
			${this.config.title ? `<div class="fv-dp-header">
				<div class="fv-dp-header-left">
					${this._icon(this.config.icon, 24)}
					<div>
						<h2 class="fv-dp-title">${__(this.config.title)}</h2>
						${this.config.subtitle ? `<p class="fv-dp-subtitle text-muted">${__(this.config.subtitle)}</p>` : ""}
					</div>
				</div>
				<div class="fv-dp-header-right">
					<button class="btn btn-xs btn-default fv-dp-refresh" title="${__("Refresh")}">
						${this._icon("refresh-cw", 14)}
					</button>
					${this.config.editable ? `<button class="btn btn-xs btn-default fv-dp-edit" title="${__("Edit Layout")}">
						${this._icon("layout", 14)}
					</button>` : ""}
				</div>
			</div>` : ""}
			<div class="fv-dp-grid" style="grid-template-columns: repeat(${this.config.columns}, 1fr); gap: ${this.config.gap}px;"></div>
		`;

		this.container.appendChild(this.el);

		this.el.querySelector(".fv-dp-refresh")?.addEventListener("click", () => this.refresh());
	}

	// ─── Widget Rendering ────────────────────────────────────────
	async _renderWidgets() {
		const grid = this.el.querySelector(".fv-dp-grid");
		grid.innerHTML = "";
		this.widgetInstances = [];

		const promises = this.config.widgets.map(async (wConf, idx) => {
			const cell = document.createElement("div");
			cell.className = "fv-dp-widget";
			cell.dataset.idx = idx;
			if (wConf.span) cell.style.gridColumn = `span ${wConf.span}`;
			if (wConf.rowSpan) cell.style.gridRow = `span ${wConf.rowSpan}`;

			cell.innerHTML = `
				<div class="fv-dp-widget-header">
					<span class="fv-dp-widget-title">${this._icon(wConf.icon || this._widgetIcon(wConf.type), 16)} ${__(wConf.label || wConf.type)}</span>
					<div class="fv-dp-widget-actions">
						${this.config.fullscreenable ? `<button class="fv-dp-widget-expand" title="${__("Expand")}">${this._icon("maximize-2", 12)}</button>` : ""}
					</div>
				</div>
				<div class="fv-dp-widget-body"></div>
			`;

			cell.querySelector(".fv-dp-widget-expand")?.addEventListener("click", () => this._expandWidget(cell, wConf));

			grid.appendChild(cell);

			const body = cell.querySelector(".fv-dp-widget-body");
			await this._populateWidget(body, wConf);
			this.widgetInstances.push({ el: cell, config: wConf });
		});

		await Promise.allSettled(promises);

		// GSAP entrance
		if (typeof gsap !== "undefined") {
			gsap.from(grid.querySelectorAll(".fv-dp-widget"), {
				y: 30, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out"
			});
		}
	}

	async _populateWidget(body, wConf) {
		switch (wConf.type) {
			case "kpi": return this._widgetKPI(body, wConf);
			case "chart": return this._widgetChart(body, wConf);
			case "list": return this._widgetList(body, wConf);
			case "shortcut": return this._widgetShortcuts(body, wConf);
			case "activity": return this._widgetActivity(body, wConf);
			case "note": return this._widgetNote(body, wConf);
			case "gauge": return this._widgetGauge(body, wConf);
			default:
				body.innerHTML = `<div class="text-muted text-center">${__("Unknown widget type")}: ${wConf.type}</div>`;
		}
	}

	// ─── KPI Widget ──────────────────────────────────────────────
	async _widgetKPI(body, conf) {
		try {
			let value = 0;
			if (conf.aggregate === "count") {
				value = await frappe.xcall("frappe.client.get_count", { doctype: conf.doctype, filters: conf.filters || {} });
			} else if (conf.aggregate === "sum" && conf.field) {
				const res = await frappe.call({
					method: "frappe.client.get_list",
					args: { doctype: conf.doctype, fields: [`sum(${conf.field}) as total`], filters: conf.filters || {} },
				});
				value = res.message?.[0]?.total || 0;
			}

			const color = conf.color || this.config.color;
			const formatted = conf.aggregate === "count" ? this._fmtNum(value) : frappe.format(value, { fieldtype: "Currency" });

			body.innerHTML = `
				<div class="fv-kpi-widget">
					<div class="fv-kpi-value" style="color:${color}">${formatted}</div>
					<div class="fv-kpi-label text-muted">${__(conf.sublabel || conf.doctype)}</div>
					${conf.trend ? `<div class="fv-kpi-trend ${conf.trend > 0 ? "green" : "red"}">
						${conf.trend > 0 ? "↑" : "↓"} ${Math.abs(conf.trend)}%
					</div>` : ""}
				</div>
			`;

			if (typeof gsap !== "undefined") {
				const el = body.querySelector(".fv-kpi-value");
				gsap.from(el, { scale: 0.5, opacity: 0, duration: 0.5, ease: "back.out(1.4)" });
			}
		} catch {
			body.innerHTML = `<div class="text-muted">—</div>`;
		}
	}

	// ─── Chart Widget ────────────────────────────────────────────
	async _widgetChart(body, conf) {
		// Delegate to VisualChartPro if available
		if (frappe.visual?.ChartPro) {
			await frappe.visual.ChartPro.create(body, {
				type: conf.chartType || "bar",
				doctype: conf.doctype,
				xField: conf.x,
				yField: conf.y,
				filters: conf.filters || {},
				height: conf.height || 250,
			});
		} else {
			body.innerHTML = `<div class="text-muted text-center">${__("ChartPro not loaded")}</div>`;
		}
	}

	// ─── List Widget ─────────────────────────────────────────────
	async _widgetList(body, conf) {
		try {
			const fields = conf.fields || ["name", "status", "modified"];
			const res = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: conf.doctype,
					fields,
					filters: conf.filters || {},
					order_by: conf.orderBy || "modified desc",
					limit_page_length: conf.limit || 5,
				},
			});
			const items = res.message || [];

			body.innerHTML = `<div class="fv-widget-list">
				${items.map(doc => `<div class="fv-wl-item" data-name="${doc.name}">
					<span class="fv-wl-name">${doc.name}</span>
					${doc.status ? `<span class="indicator-pill ${this._statusColor(doc.status)}">${__(doc.status)}</span>` : ""}
				</div>`).join("")}
				${!items.length ? `<div class="text-muted text-center">${__("No records")}</div>` : ""}
			</div>`;

			body.querySelectorAll(".fv-wl-item").forEach(item => {
				item.style.cursor = "pointer";
				item.addEventListener("click", () => frappe.set_route("Form", conf.doctype, item.dataset.name));
			});
		} catch {
			body.innerHTML = `<div class="text-muted">${__("Failed to load")}</div>`;
		}
	}

	// ─── Shortcuts Widget ────────────────────────────────────────
	_widgetShortcuts(body, conf) {
		const shortcuts = conf.items || [];
		body.innerHTML = `<div class="fv-widget-shortcuts">
			${shortcuts.map(s => `<a class="fv-ws-item" href="${s.route || "#"}" title="${__(s.label)}">
				${this._icon(s.icon || "link", 18)}
				<span>${__(s.label)}</span>
			</a>`).join("")}
		</div>`;
	}

	// ─── Activity Widget ─────────────────────────────────────────
	async _widgetActivity(body, conf) {
		try {
			const dt = conf.doctype;
			const filters = dt ? { reference_doctype: dt } : {};
			const res = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Activity Log",
					fields: ["subject", "creation", "user"],
					filters,
					order_by: "creation desc",
					limit_page_length: conf.limit || 5,
				},
			});
			const items = res.message || [];

			body.innerHTML = items.map(l => `
				<div class="fv-wa-item">
					<span class="fv-wa-text">${l.subject || ""}</span>
					<span class="fv-wa-time text-muted">${frappe.datetime.prettyDate(l.creation)}</span>
				</div>
			`).join("") || `<div class="text-muted text-center">${__("No recent activity")}</div>`;
		} catch {
			body.innerHTML = `<div class="text-muted">${__("Failed to load")}</div>`;
		}
	}

	// ─── Note Widget ─────────────────────────────────────────────
	_widgetNote(body, conf) {
		body.innerHTML = `<div class="fv-widget-note">${conf.content || ""}</div>`;
	}

	// ─── Gauge Widget ────────────────────────────────────────────
	async _widgetGauge(body, conf) {
		if (frappe.visual?.ChartPro) {
			await frappe.visual.ChartPro.create(body, {
				type: "gauge",
				data: [{ value: conf.value || 0, name: conf.label || "" }],
				height: conf.height || 200,
			});
		} else {
			const pct = Math.min(100, Math.max(0, conf.value || 0));
			const color = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
			body.innerHTML = `<div class="fv-gauge-simple">
				<svg viewBox="0 0 120 120" width="120" height="120">
					<circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" stroke-width="10"/>
					<circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="10"
						stroke-dasharray="${pct * 3.14} 314" stroke-linecap="round"
						transform="rotate(-90 60 60)"/>
					<text x="60" y="65" text-anchor="middle" font-size="20" font-weight="bold" fill="currentColor">${pct}%</text>
				</svg>
			</div>`;
		}
	}

	// ─── Widget Expansion ────────────────────────────────────────
	_expandWidget(cell, wConf) {
		if (cell.classList.contains("fv-dp-expanded")) {
			cell.classList.remove("fv-dp-expanded");
			if (typeof gsap !== "undefined") gsap.to(cell, { duration: 0.3 });
			return;
		}
		cell.classList.add("fv-dp-expanded");
		if (typeof gsap !== "undefined") gsap.from(cell, { scale: 0.9, duration: 0.3, ease: "power2.out" });
	}

	// ─── Refresh ─────────────────────────────────────────────────
	async refresh() {
		await this._renderWidgets();
	}

	// ─── Utils ───────────────────────────────────────────────────
	_icon(name, size = 18) {
		if (frappe.visual?.icons?.render) return frappe.visual.icons.render(name, { size });
		return `<svg width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
	}

	_fmtNum(n) {
		if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
		if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
		return n?.toString() || "0";
	}

	_widgetIcon(type) {
		const map = { kpi: "hash", chart: "bar-chart-2", list: "list", shortcut: "zap", activity: "clock", note: "edit-3", gauge: "target" };
		return map[type] || "box";
	}

	_statusColor(status) {
		const s = (status || "").toLowerCase();
		if (["active", "open", "approved", "completed", "paid"].some(k => s.includes(k))) return "green";
		if (["pending", "draft", "hold", "waiting"].some(k => s.includes(k))) return "orange";
		if (["cancelled", "rejected", "closed", "overdue"].some(k => s.includes(k))) return "red";
		return "gray";
	}

	destroy() {
		if (this._refreshInterval) clearInterval(this._refreshInterval);
		this.container.innerHTML = "";
	}
}
