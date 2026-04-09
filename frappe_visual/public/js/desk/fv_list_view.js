// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVListView — Visual List Renderer
 * ====================================
 * Provides multiple view modes for DocType list views:
 * - Table (enhanced with visual indicators)
 * - Cards (responsive grid with image/icon support)
 * - Kanban (drag-and-drop status columns)
 * - Timeline (chronological vertical layout)
 * - Gallery (image-focused grid)
 * - Calendar (date-based view)
 *
 * Works as a standalone renderer or as an overlay on Frappe ListView.
 *
 * Usage:
 *   const list = FVListView.create("#container", {
 *     doctype: "Sales Order",
 *     defaultView: "cards",
 *     fields: ["name", "customer", "grand_total", "status"],
 *     statusField: "status",
 *     dateField: "transaction_date",
 *   });
 */

export class FVListView {
	static create(container, opts = {}) {
		return new FVListView(container, opts);
	}

	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		this.opts = Object.assign({
			doctype: null,
			fields: ["name"],
			filters: {},
			orderBy: "creation desc",
			pageSize: 20,
			defaultView: "cards",
			statusField: "status",
			dateField: "creation",
			imageField: null,
			titleField: "name",
			subtitleField: null,
			colorMap: {},
			showSearch: true,
			showFilters: true,
			showViewToggle: true,
			showPagination: true,
			onRowClick: null,
			cardTemplate: null,
		}, opts);

		this.currentView = this.opts.defaultView;
		this.currentPage = 1;
		this.totalCount = 0;
		this.data = [];
		this._searchTerm = "";

		this._render();
		this.refresh();
	}

	_render() {
		this.container.innerHTML = "";
		this.container.classList.add("fv-list-view");

		// Toolbar
		this._toolbar = document.createElement("div");
		this._toolbar.className = "fv-list-view__toolbar fv-fx-glass";
		this._toolbar.innerHTML = `
			<div class="fv-list-view__toolbar-start">
				${this.opts.showSearch ? `
					<div class="fv-list-view__search">
						<i class="ti ti-search"></i>
						<input type="search" placeholder="${__("Search")}..." class="fv-list-view__search-input" />
					</div>
				` : ""}
			</div>
			<div class="fv-list-view__toolbar-end">
				${this.opts.showViewToggle ? this._renderViewToggle() : ""}
			</div>
		`;
		this.container.appendChild(this._toolbar);

		// Search handler
		const searchInput = this._toolbar.querySelector(".fv-list-view__search-input");
		if (searchInput) {
			let debounceTimer;
			searchInput.addEventListener("input", (e) => {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					this._searchTerm = e.target.value;
					this.currentPage = 1;
					this.refresh();
				}, 300);
			});
		}

		// View toggle handlers
		this._toolbar.querySelectorAll(".fv-list-view__view-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				this.switchView(btn.dataset.view);
			});
		});

		// Content area
		this._content = document.createElement("div");
		this._content.className = "fv-list-view__content";
		this.container.appendChild(this._content);

		// Pagination
		if (this.opts.showPagination) {
			this._pagination = document.createElement("div");
			this._pagination.className = "fv-list-view__pagination";
			this.container.appendChild(this._pagination);
		}
	}

	_renderViewToggle() {
		const views = [
			{ key: "table", icon: "table", label: __("Table") },
			{ key: "cards", icon: "layout-grid", label: __("Cards") },
			{ key: "kanban", icon: "columns", label: __("Kanban") },
			{ key: "timeline", icon: "timeline", label: __("Timeline") },
		];
		return `<div class="fv-list-view__view-toggle">
			${views.map(v => `
				<button class="fv-list-view__view-btn ${v.key === this.currentView ? "fv-list-view__view-btn--active" : ""}"
					data-view="${v.key}" title="${v.label}">
					<i class="ti ti-${v.icon}"></i>
				</button>
			`).join("")}
		</div>`;
	}

	async refresh() {
		this._content.innerHTML = `<div class="fv-list-view__loading"><div class="fv-spinner"></div></div>`;

		try {
			const filters = { ...this.opts.filters };
			if (this._searchTerm && this.opts.titleField) {
				filters[this.opts.titleField] = ["like", `%${this._searchTerm}%`];
			}

			const [data, count] = await Promise.all([
				frappe.xcall("frappe.client.get_list", {
					doctype: this.opts.doctype,
					fields: this._getFields(),
					filters,
					order_by: this.opts.orderBy,
					limit_start: (this.currentPage - 1) * this.opts.pageSize,
					limit_page_length: this.opts.pageSize,
				}),
				frappe.xcall("frappe.client.get_count", {
					doctype: this.opts.doctype,
					filters,
				}),
			]);

			this.data = data || [];
			this.totalCount = count || 0;
			this._renderView();
			this._renderPagination();
		} catch (e) {
			this._content.innerHTML = `<div class="fv-list-view__error">
				<i class="ti ti-alert-circle"></i>
				<span>${__("Error loading data")}</span>
			</div>`;
			console.error("FVListView.refresh error:", e);
		}
	}

	_getFields() {
		const fields = [...new Set(["name", ...this.opts.fields])];
		if (this.opts.statusField && !fields.includes(this.opts.statusField)) {
			fields.push(this.opts.statusField);
		}
		if (this.opts.dateField && !fields.includes(this.opts.dateField)) {
			fields.push(this.opts.dateField);
		}
		if (this.opts.imageField && !fields.includes(this.opts.imageField)) {
			fields.push(this.opts.imageField);
		}
		return fields;
	}

	_renderView() {
		this._content.innerHTML = "";

		if (!this.data.length) {
			this._content.innerHTML = `<div class="fv-list-view__empty fv-fx-page-enter">
				<i class="ti ti-inbox-off" style="font-size:3rem;opacity:0.3"></i>
				<p>${__("No records found")}</p>
			</div>`;
			return;
		}

		switch (this.currentView) {
			case "table": this._renderTable(); break;
			case "cards": this._renderCards(); break;
			case "kanban": this._renderKanban(); break;
			case "timeline": this._renderTimeline(); break;
			default: this._renderCards();
		}
	}

	_renderTable() {
		const displayFields = this.opts.fields.filter(f => f !== "name");
		const table = document.createElement("div");
		table.className = "fv-list-table fv-fx-page-enter";

		table.innerHTML = `
			<table class="fv-list-table__table">
				<thead>
					<tr>
						<th>${__("ID")}</th>
						${displayFields.map(f => `<th>${__(frappe.model.unscrub(f))}</th>`).join("")}
					</tr>
				</thead>
				<tbody>
					${this.data.map(row => `
						<tr class="fv-list-table__row fv-fx-hover-lift" data-name="${frappe.utils.escape_html(row.name)}">
							<td><a class="fv-list-table__link" href="/app/${frappe.router.slug(this.opts.doctype)}/${encodeURIComponent(row.name)}">${frappe.utils.escape_html(row.name)}</a></td>
							${displayFields.map(f => `<td>${this._formatCell(row, f)}</td>`).join("")}
						</tr>
					`).join("")}
				</tbody>
			</table>
		`;

		this._bindRowClick(table);
		this._content.appendChild(table);
	}

	_renderCards() {
		const grid = document.createElement("div");
		grid.className = "fv-list-cards fv-fx-page-enter";

		this.data.forEach((row, i) => {
			const card = document.createElement("div");
			card.className = "fv-list-card fv-fx-glass fv-fx-hover-lift";
			card.dataset.name = row.name;
			card.style.animationDelay = `${i * 0.04}s`;

			const status = row[this.opts.statusField];
			const statusColor = this.opts.colorMap[status] || "var(--fv-text-muted)";
			const title = row[this.opts.titleField] || row.name;
			const subtitle = this.opts.subtitleField ? row[this.opts.subtitleField] : null;

			card.innerHTML = `
				${this.opts.imageField && row[this.opts.imageField]
					? `<div class="fv-list-card__image"><img src="${row[this.opts.imageField]}" alt="" loading="lazy" /></div>`
					: ""
				}
				<div class="fv-list-card__body">
					${status ? `<span class="fv-list-card__status" style="background:${statusColor};color:#fff">${__(status)}</span>` : ""}
					<h4 class="fv-list-card__title">${frappe.utils.escape_html(title)}</h4>
					${subtitle ? `<p class="fv-list-card__subtitle">${frappe.utils.escape_html(subtitle)}</p>` : ""}
					<div class="fv-list-card__meta">
						${this.opts.fields.filter(f => f !== this.opts.titleField && f !== this.opts.subtitleField && f !== this.opts.statusField).slice(0, 3).map(f =>
							`<span class="fv-list-card__meta-item">${__(frappe.model.unscrub(f))}: ${this._formatCell(row, f)}</span>`
						).join("")}
					</div>
				</div>
			`;

			card.addEventListener("click", () => this._handleRowClick(row));
			grid.appendChild(card);
		});

		this._content.appendChild(grid);
	}

	_renderKanban() {
		if (!this.opts.statusField) {
			this._renderCards();
			return;
		}

		const groups = {};
		this.data.forEach(row => {
			const status = row[this.opts.statusField] || __("Unknown");
			if (!groups[status]) groups[status] = [];
			groups[status].push(row);
		});

		const board = document.createElement("div");
		board.className = "fv-list-kanban fv-fx-page-enter";

		Object.entries(groups).forEach(([status, rows]) => {
			const col = document.createElement("div");
			col.className = "fv-list-kanban__column fv-fx-glass";
			const color = this.opts.colorMap[status] || "#6b7280";

			col.innerHTML = `
				<div class="fv-list-kanban__column-header" style="border-top:3px solid ${color}">
					<span class="fv-list-kanban__column-title">${__(status)}</span>
					<span class="fv-list-kanban__column-count">${rows.length}</span>
				</div>
				<div class="fv-list-kanban__column-body">
					${rows.map(row => `
						<div class="fv-list-kanban__card fv-fx-hover-lift" data-name="${frappe.utils.escape_html(row.name)}">
							<div class="fv-list-kanban__card-title">${frappe.utils.escape_html(row[this.opts.titleField] || row.name)}</div>
							${this.opts.subtitleField ? `<div class="fv-list-kanban__card-sub">${frappe.utils.escape_html(row[this.opts.subtitleField] || "")}</div>` : ""}
						</div>
					`).join("")}
				</div>
			`;

			col.querySelectorAll(".fv-list-kanban__card").forEach(cardEl => {
				cardEl.addEventListener("click", () => {
					const name = cardEl.dataset.name;
					const row = rows.find(r => r.name === name);
					if (row) this._handleRowClick(row);
				});
			});

			board.appendChild(col);
		});

		this._content.appendChild(board);
	}

	_renderTimeline() {
		const tl = document.createElement("div");
		tl.className = "fv-list-timeline fv-fx-page-enter";

		this.data.forEach((row, i) => {
			const dateVal = row[this.opts.dateField];
			const status = row[this.opts.statusField];
			const color = this.opts.colorMap[status] || "#6b7280";

			const item = document.createElement("div");
			item.className = "fv-list-timeline__item";
			item.style.animationDelay = `${i * 0.05}s`;

			item.innerHTML = `
				<div class="fv-list-timeline__marker" style="background:${color}"></div>
				<div class="fv-list-timeline__content fv-fx-glass fv-fx-hover-lift" data-name="${frappe.utils.escape_html(row.name)}">
					<div class="fv-list-timeline__date">${dateVal ? frappe.datetime.str_to_user(dateVal) : ""}</div>
					<h4 class="fv-list-timeline__title">${frappe.utils.escape_html(row[this.opts.titleField] || row.name)}</h4>
					${status ? `<span class="fv-list-timeline__status" style="color:${color}">${__(status)}</span>` : ""}
				</div>
			`;

			item.querySelector(".fv-list-timeline__content").addEventListener("click", () => this._handleRowClick(row));
			tl.appendChild(item);
		});

		this._content.appendChild(tl);
	}

	_formatCell(row, field) {
		const value = row[field];
		if (value == null || value === "") return "—";
		return frappe.utils.escape_html(String(value));
	}

	_handleRowClick(row) {
		if (this.opts.onRowClick) {
			this.opts.onRowClick(row);
		} else {
			frappe.set_route("Form", this.opts.doctype, row.name);
		}
	}

	_bindRowClick(table) {
		table.querySelectorAll(".fv-list-table__row").forEach(tr => {
			tr.addEventListener("click", (e) => {
				if (e.target.tagName === "A") return;
				const name = tr.dataset.name;
				const row = this.data.find(r => r.name === name);
				if (row) this._handleRowClick(row);
			});
		});
	}

	_renderPagination() {
		if (!this._pagination) return;
		const totalPages = Math.ceil(this.totalCount / this.opts.pageSize);
		if (totalPages <= 1) {
			this._pagination.innerHTML = "";
			return;
		}

		this._pagination.innerHTML = `
			<div class="fv-list-view__pagination-info">
				${__("Showing")} ${((this.currentPage - 1) * this.opts.pageSize) + 1}–${Math.min(this.currentPage * this.opts.pageSize, this.totalCount)}
				${__("of")} ${this.totalCount}
			</div>
			<div class="fv-list-view__pagination-btns">
				<button class="fv-btn fv-btn--sm" ${this.currentPage <= 1 ? "disabled" : ""} data-page="prev">
					<i class="ti ti-chevron-left"></i>
				</button>
				<span class="fv-list-view__page-num">${this.currentPage} / ${totalPages}</span>
				<button class="fv-btn fv-btn--sm" ${this.currentPage >= totalPages ? "disabled" : ""} data-page="next">
					<i class="ti ti-chevron-right"></i>
				</button>
			</div>
		`;

		this._pagination.querySelector('[data-page="prev"]')?.addEventListener("click", () => {
			if (this.currentPage > 1) { this.currentPage--; this.refresh(); }
		});
		this._pagination.querySelector('[data-page="next"]')?.addEventListener("click", () => {
			if (this.currentPage < totalPages) { this.currentPage++; this.refresh(); }
		});
	}

	switchView(viewName) {
		this.currentView = viewName;
		this._toolbar.querySelectorAll(".fv-list-view__view-btn").forEach(b => {
			b.classList.toggle("fv-list-view__view-btn--active", b.dataset.view === viewName);
		});
		this._renderView();
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-list-view");
	}
}
