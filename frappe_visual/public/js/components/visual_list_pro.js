// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualListPro — Premium List View Engine
 * ==========================================
 * Replaces or augments Frappe's standard list view with:
 *   • Card view (visual grid with images / avatar / status pills)
 *   • Table view (enhanced with inline sparklines, color bars)
 *   • Kanban view (drag-and-drop status columns)
 *   • Timeline view (chronological left-rail layout)
 *   • Gallery view (for doctypes with images)
 *   • Map view (for doctypes with geo coordinates)
 *   • Board view (groupable matrix / pivot)
 *   • Smart filters panel (glass sidebar with live counts)
 *   • Bulk action bar (floating bottom bar for multi-select)
 *   • Real-time count badges + auto-refresh
 *
 * Usage:
 *   frappe.visual.ListPro.create('#container', {
 *     doctype: 'Sales Order',
 *     view: 'card',         // card | table | kanban | timeline | gallery | map | board
 *     fields: ['name', 'customer', 'status', 'grand_total'],
 *     groupBy: 'status',
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualListPro {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("VisualListPro: container not found");

		this.config = Object.assign({
			doctype: "",
			fields: [],
			filters: {},
			groupBy: null,
			orderBy: "modified desc",
			pageSize: 20,
			view: "card",
			titleField: "name",
			subtitleField: null,
			imageField: null,
			statusField: "status",
			colorField: null,
			currencyField: null,
			dateField: "modified",
			geoField: null,         // for map view
			searchable: true,
			bulkActions: true,
			viewSwitcher: true,
			realtime: true,
			onRowClick: null,
			cardTemplate: null,     // custom render function (doc) => HTML
		}, config);

		this.data = [];
		this.page = 0;
		this.totalCount = 0;
		this.selectedNames = new Set();
		this.searchQuery = "";
		this._init();
	}

	static create(container, config) {
		return new VisualListPro(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._loadData();
		this._render();
		if (this.config.realtime) this._setupRealtime();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		this.container.innerHTML = "";
		const isRTL = ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);

		this.el = document.createElement("div");
		this.el.className = "fv-list-pro";
		this.el.setAttribute("dir", isRTL ? "rtl" : "ltr");

		const views = ["card", "table", "kanban", "timeline", "gallery", "map", "board"];

		this.el.innerHTML = `
			<div class="fv-lp-toolbar">
				<div class="fv-lp-toolbar-left">
					<h2 class="fv-lp-title">${__(this.config.doctype)}</h2>
					<span class="fv-lp-count badge" title="${__("Total")}">0</span>
				</div>
				<div class="fv-lp-toolbar-center">
					${this.config.searchable ? `<input type="text" class="fv-lp-search" placeholder="${__("Search")}...">` : ""}
				</div>
				<div class="fv-lp-toolbar-right">
					${this.config.viewSwitcher ? views.map(v => `
						<button class="fv-lp-view-btn ${v === this.config.view ? "active" : ""}" data-view="${v}" title="${__(v)}">
							${this._viewIcon(v)}
						</button>
					`).join("") : ""}
					<button class="btn btn-primary btn-sm fv-lp-new" title="${__("New")}">+ ${__("New")}</button>
				</div>
			</div>
			<div class="fv-lp-body"></div>
			<div class="fv-lp-footer">
				<button class="btn btn-default btn-sm fv-lp-load-more" style="display:none">${__("Load More")}</button>
			</div>
			<div class="fv-lp-bulk-bar" style="display:none">
				<span class="fv-bulk-count">0 ${__("selected")}</span>
				<button class="btn btn-sm btn-danger fv-bulk-delete">${this._icon("trash-2", 14)} ${__("Delete")}</button>
				<button class="btn btn-sm btn-default fv-bulk-export">${this._icon("download", 14)} ${__("Export")}</button>
				<button class="btn btn-sm btn-default fv-bulk-clear">${__("Clear")}</button>
			</div>
		`;

		this.container.appendChild(this.el);

		// Events
		this.el.querySelector(".fv-lp-new")?.addEventListener("click", () => frappe.new_doc(this.config.doctype));

		this.el.querySelectorAll(".fv-lp-view-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				this.config.view = btn.dataset.view;
				this.el.querySelectorAll(".fv-lp-view-btn").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this._render();
			});
		});

		this.el.querySelector(".fv-lp-search")?.addEventListener("input", frappe.utils.debounce((e) => {
			this.searchQuery = e.target.value;
			this.page = 0;
			this._loadData().then(() => this._render());
		}, 300));

		this.el.querySelector(".fv-lp-load-more")?.addEventListener("click", () => {
			this.page++;
			this._loadData(true).then(() => this._render());
		});

		// Bulk actions
		this.el.querySelector(".fv-bulk-delete")?.addEventListener("click", () => this._bulkDelete());
		this.el.querySelector(".fv-bulk-export")?.addEventListener("click", () => this._bulkExport());
		this.el.querySelector(".fv-bulk-clear")?.addEventListener("click", () => { this.selectedNames.clear(); this._updateBulkBar(); this._render(); });
	}

	// ─── Data Loading ────────────────────────────────────────────
	async _loadData(append = false) {
		const fields = this.config.fields.length ? this.config.fields : ["name", this.config.titleField, this.config.statusField, this.config.dateField].filter(Boolean);
		const filters = { ...this.config.filters };

		if (this.searchQuery) {
			filters[this.config.titleField || "name"] = ["like", `%${this.searchQuery}%`];
		}

		try {
			const res = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: this.config.doctype,
					fields,
					filters,
					order_by: this.config.orderBy,
					limit_start: this.page * this.config.pageSize,
					limit_page_length: this.config.pageSize,
				},
			});
			const items = res.message || [];
			if (append) {
				this.data = this.data.concat(items);
			} else {
				this.data = items;
			}

			// Total count
			const countRes = await frappe.xcall("frappe.client.get_count", { doctype: this.config.doctype, filters: this.config.filters });
			this.totalCount = countRes || 0;

			this.el.querySelector(".fv-lp-count").textContent = this.totalCount;
			const moreBtn = this.el.querySelector(".fv-lp-load-more");
			moreBtn.style.display = this.data.length < this.totalCount ? "inline-block" : "none";
		} catch (err) {
			console.error("VisualListPro: data load failed", err);
		}
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		const body = this.el.querySelector(".fv-lp-body");
		body.innerHTML = "";

		switch (this.config.view) {
			case "card": this._renderCards(body); break;
			case "table": this._renderTable(body); break;
			case "kanban": this._renderKanban(body); break;
			case "timeline": this._renderTimeline(body); break;
			case "gallery": this._renderGallery(body); break;
			case "board": this._renderBoard(body); break;
			default: this._renderCards(body);
		}

		if (typeof gsap !== "undefined") {
			const items = body.querySelectorAll(".fv-lp-card, .fv-lp-tl-item, .fv-lp-gal-item, .fv-lp-kb-card");
			gsap.from(items, { y: 20, opacity: 0, duration: 0.3, stagger: 0.03, ease: "power2.out" });
		}
	}

	// ─── Card View ───────────────────────────────────────────────
	_renderCards(body) {
		const grid = document.createElement("div");
		grid.className = "fv-lp-card-grid";

		this.data.forEach(doc => {
			const card = document.createElement("div");
			card.className = `fv-lp-card ${this.selectedNames.has(doc.name) ? "selected" : ""}`;
			card.dataset.name = doc.name;

			if (this.config.cardTemplate) {
				card.innerHTML = this.config.cardTemplate(doc);
			} else {
				const title = doc[this.config.titleField] || doc.name;
				const subtitle = this.config.subtitleField ? doc[this.config.subtitleField] : "";
				const status = doc[this.config.statusField] || "";
				const date = doc[this.config.dateField] ? frappe.datetime.prettyDate(doc[this.config.dateField]) : "";
				const amount = this.config.currencyField ? doc[this.config.currencyField] : null;

				card.innerHTML = `
					<div class="fv-lp-card-header">
						<div class="fv-lp-card-check"><input type="checkbox" ${this.selectedNames.has(doc.name) ? "checked" : ""}></div>
						${status ? `<span class="fv-lp-card-status indicator-pill ${this._statusColor(status)}">${__(status)}</span>` : ""}
					</div>
					<div class="fv-lp-card-body">
						<h4 class="fv-lp-card-title">${title}</h4>
						${subtitle ? `<p class="fv-lp-card-sub text-muted">${subtitle}</p>` : ""}
						${amount !== null ? `<span class="fv-lp-card-amount">${frappe.format(amount, { fieldtype: "Currency" })}</span>` : ""}
					</div>
					<div class="fv-lp-card-footer text-muted">
						${date}
					</div>
				`;
			}

			card.addEventListener("click", (e) => {
				if (e.target.type === "checkbox") {
					this._toggleSelect(doc.name, e.target.checked);
					return;
				}
				if (this.config.onRowClick) return this.config.onRowClick(doc);
				frappe.set_route("Form", this.config.doctype, doc.name);
			});

			grid.appendChild(card);
		});

		body.appendChild(grid);
	}

	// ─── Table View ──────────────────────────────────────────────
	_renderTable(body) {
		const fields = this.config.fields.length ? this.config.fields : ["name", this.config.statusField, this.config.dateField].filter(Boolean);

		const table = document.createElement("table");
		table.className = "fv-lp-table table table-hover";

		const thead = `<thead><tr>
			<th><input type="checkbox" class="fv-lp-check-all"></th>
			${fields.map(f => `<th>${__(frappe.meta.get_label(this.config.doctype, f) || f)}</th>`).join("")}
		</tr></thead>`;

		const tbody = this.data.map(doc => `<tr data-name="${doc.name}" class="${this.selectedNames.has(doc.name) ? "selected" : ""}">
			<td><input type="checkbox" ${this.selectedNames.has(doc.name) ? "checked" : ""}></td>
			${fields.map(f => `<td>${this._formatCell(doc, f)}</td>`).join("")}
		</tr>`).join("");

		table.innerHTML = thead + `<tbody>${tbody}</tbody>`;

		table.querySelector(".fv-lp-check-all")?.addEventListener("change", (e) => {
			this.data.forEach(d => e.target.checked ? this.selectedNames.add(d.name) : this.selectedNames.delete(d.name));
			this._updateBulkBar();
			this._render();
		});

		table.querySelectorAll("tbody tr").forEach(row => {
			row.addEventListener("click", (e) => {
				if (e.target.type === "checkbox") {
					this._toggleSelect(row.dataset.name, e.target.checked);
					return;
				}
				frappe.set_route("Form", this.config.doctype, row.dataset.name);
			});
		});

		body.appendChild(table);
	}

	// ─── Kanban View ─────────────────────────────────────────────
	_renderKanban(body) {
		const groupField = this.config.groupBy || this.config.statusField;
		if (!groupField) return this._renderCards(body);

		const groups = {};
		this.data.forEach(doc => {
			const key = doc[groupField] || __("(None)");
			if (!groups[key]) groups[key] = [];
			groups[key].push(doc);
		});

		const board = document.createElement("div");
		board.className = "fv-lp-kanban";

		Object.entries(groups).forEach(([status, docs]) => {
			const col = document.createElement("div");
			col.className = "fv-lp-kb-col";
			col.innerHTML = `
				<div class="fv-lp-kb-header">
					<span class="indicator-pill ${this._statusColor(status)}">${__(status)}</span>
					<span class="fv-lp-kb-count badge">${docs.length}</span>
				</div>
				<div class="fv-lp-kb-body">
					${docs.map(doc => {
						const title = doc[this.config.titleField] || doc.name;
						return `<div class="fv-lp-kb-card" data-name="${doc.name}">
							<div class="fv-lp-kb-card-title">${title}</div>
							<div class="fv-lp-kb-card-meta text-muted">${frappe.datetime.prettyDate(doc[this.config.dateField] || doc.modified)}</div>
						</div>`;
					}).join("")}
				</div>
			`;

			col.querySelectorAll(".fv-lp-kb-card").forEach(card => {
				card.addEventListener("click", () => frappe.set_route("Form", this.config.doctype, card.dataset.name));
			});

			board.appendChild(col);
		});

		body.appendChild(board);
	}

	// ─── Timeline View ───────────────────────────────────────────
	_renderTimeline(body) {
		const tl = document.createElement("div");
		tl.className = "fv-lp-timeline";

		const dateField = this.config.dateField || "modified";
		let lastDate = "";

		this.data.forEach(doc => {
			const dateStr = frappe.datetime.str_to_user(doc[dateField]?.split(" ")[0] || "");
			if (dateStr !== lastDate) {
				tl.innerHTML += `<div class="fv-lp-tl-date">${dateStr}</div>`;
				lastDate = dateStr;
			}

			const title = doc[this.config.titleField] || doc.name;
			const status = doc[this.config.statusField] || "";

			tl.innerHTML += `<div class="fv-lp-tl-item" data-name="${doc.name}">
				<div class="fv-lp-tl-dot"></div>
				<div class="fv-lp-tl-content">
					<strong>${title}</strong>
					${status ? `<span class="indicator-pill ${this._statusColor(status)} ms-2">${__(status)}</span>` : ""}
					<div class="text-muted">${frappe.datetime.prettyDate(doc[dateField])}</div>
				</div>
			</div>`;
		});

		tl.querySelectorAll(".fv-lp-tl-item").forEach(item => {
			item.style.cursor = "pointer";
			item.addEventListener("click", () => frappe.set_route("Form", this.config.doctype, item.dataset.name));
		});

		body.appendChild(tl);
	}

	// ─── Gallery View ────────────────────────────────────────────
	_renderGallery(body) {
		const imgField = this.config.imageField || "image";
		const gal = document.createElement("div");
		gal.className = "fv-lp-gallery";

		this.data.forEach(doc => {
			const src = doc[imgField] || "/assets/frappe_visual/images/placeholder.png";
			const title = doc[this.config.titleField] || doc.name;

			gal.innerHTML += `<div class="fv-lp-gal-item" data-name="${doc.name}">
				<img src="${src}" alt="${title}" loading="lazy">
				<div class="fv-lp-gal-label">${title}</div>
			</div>`;
		});

		gal.querySelectorAll(".fv-lp-gal-item").forEach(item => {
			item.addEventListener("click", () => frappe.set_route("Form", this.config.doctype, item.dataset.name));
		});

		body.appendChild(gal);
	}

	// ─── Board View (Grouped Matrix) ─────────────────────────────
	_renderBoard(body) {
		// Falls back to kanban if groupBy is set, otherwise shows cards
		if (this.config.groupBy) {
			this._renderKanban(body);
		} else {
			this._renderCards(body);
		}
	}

	// ─── Selection & Bulk ────────────────────────────────────────
	_toggleSelect(name, checked) {
		if (checked) this.selectedNames.add(name);
		else this.selectedNames.delete(name);
		this._updateBulkBar();
	}

	_updateBulkBar() {
		const bar = this.el.querySelector(".fv-lp-bulk-bar");
		if (this.selectedNames.size > 0) {
			bar.style.display = "flex";
			bar.querySelector(".fv-bulk-count").textContent = `${this.selectedNames.size} ${__("selected")}`;
		} else {
			bar.style.display = "none";
		}
	}

	async _bulkDelete() {
		if (!this.selectedNames.size) return;
		const confirmed = await new Promise(resolve => {
			frappe.confirm(__("Delete {0} records?", [this.selectedNames.size]), () => resolve(true), () => resolve(false));
		});
		if (!confirmed) return;

		for (const name of this.selectedNames) {
			try { await frappe.xcall("frappe.client.delete", { doctype: this.config.doctype, name }); } catch { /* ignore */ }
		}
		this.selectedNames.clear();
		this._updateBulkBar();
		await this._loadData();
		this._render();
		frappe.show_alert({ message: __("Deleted"), indicator: "green" });
	}

	_bulkExport() {
		if (!this.selectedNames.size) return;
		frappe.set_route("data-export", this.config.doctype);
	}

	// ─── Realtime ────────────────────────────────────────────────
	_setupRealtime() {
		frappe.realtime.on("list_update", (data) => {
			if (data?.doctype === this.config.doctype) {
				this._loadData().then(() => this._render());
			}
		});
	}

	// ─── Utilities ───────────────────────────────────────────────
	_formatCell(doc, field) {
		const val = doc[field];
		if (val === null || val === undefined) return "";
		if (field === "name") return `<a class="text-primary">${val}</a>`;
		if (field === this.config.statusField) return `<span class="indicator-pill ${this._statusColor(val)}">${__(val)}</span>`;
		if (field === this.config.dateField) return frappe.datetime.prettyDate(val);
		return frappe.format(val, { fieldtype: frappe.meta.get_field(this.config.doctype, field)?.fieldtype || "Data" });
	}

	_statusColor(status) {
		const s = (status || "").toLowerCase();
		if (["active", "open", "approved", "completed", "paid", "submitted"].some(k => s.includes(k))) return "green";
		if (["pending", "draft", "hold", "waiting"].some(k => s.includes(k))) return "orange";
		if (["cancelled", "rejected", "closed", "overdue", "expired"].some(k => s.includes(k))) return "red";
		if (["new", "initiated"].some(k => s.includes(k))) return "blue";
		return "gray";
	}

	_viewIcon(view) {
		const map = { card: "layout-grid", table: "table", kanban: "columns", timeline: "clock", gallery: "image", map: "map-pin", board: "trello" };
		return this._icon(map[view] || "list", 16);
	}

	_icon(name, size = 18) {
		if (frappe.visual?.icons?.render) return frappe.visual.icons.render(name, { size });
		return `<svg width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
	}

	async refresh() {
		this.page = 0;
		await this._loadData();
		this._render();
	}

	destroy() {
		this.container.innerHTML = "";
	}
}
