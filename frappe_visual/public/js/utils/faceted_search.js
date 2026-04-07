/**
 * Frappe Visual — Faceted Search & Saved Views
 * ==============================================
 * Multi-facet filtering, saved view presets, deep-linking,
 * and aggregation counts for list/kanban/calendar views.
 *
 * @module utils/faceted_search
 * @since v0.2.0
 *
 * Usage:
 *   const fs = frappe.visual.search.create(container, {
 *       doctype: "VX Project",
 *       facets: ["status", "department", "priority"],
 *   })
 *   fs.on("filter", (filters) => reloadList(filters))
 */
(function () {
	"use strict";

	// ── Facet Type Detectors ───────────────────────────────────
	const FACET_TYPES = {
		Select: "select",
		Link: "link",
		Check: "toggle",
		Date: "daterange",
		Currency: "range",
		Int: "range",
		Float: "range",
		Rating: "range",
	};

	// ── State ──────────────────────────────────────────────────
	const _instances = new Map();
	const _savedViews = new Map();

	// ── FacetedSearch Class ────────────────────────────────────

	class FacetedSearch {
		constructor(container, options = {}) {
			this.container = typeof container === "string"
				? document.querySelector(container)
				: container;

			this.doctype = options.doctype;
			this.facets = options.facets || [];
			this.filters = {};          // { fieldname: value|[op, value] }
			this.counts = {};           // { fieldname: { value: count } }
			this.searchText = "";
			this.listeners = new Map(); // event → Set<fn>
			this.collapsed = new Set();

			this.options = {
				showCounts: options.showCounts !== false,
				showSearch: options.showSearch !== false,
				showClear: options.showClear !== false,
				debounceMs: options.debounceMs || 300,
				maxFacetValues: options.maxFacetValues || 20,
				...options,
			};

			this._debounceTimer = null;
			this._init();
		}

		async _init() {
			if (this.doctype && this.facets.length === 0) {
				this.facets = await this._autoDetectFacets();
			}

			if (this.options.showCounts) {
				await this._fetchCounts();
			}

			this._render();
			this._restoreFromURL();
		}

		// ── Facet Auto-Detection ────────────────────────────────

		async _autoDetectFacets() {
			try {
				const meta = frappe.get_meta?.(this.doctype)
					|| await new Promise((resolve) => frappe.model.with_doctype(this.doctype, () => resolve(frappe.get_meta(this.doctype))));

				if (!meta?.fields) return [];

				return meta.fields
					.filter((f) =>
						!f.hidden && !f.read_only &&
						(f.in_list_view || f.in_standard_filter) &&
						FACET_TYPES[f.fieldtype]
					)
					.slice(0, 8)
					.map((f) => ({
						fieldname: f.fieldname,
						label: f.label,
						type: FACET_TYPES[f.fieldtype],
						options: f.options,
						fieldtype: f.fieldtype,
					}));
			} catch (e) {
				console.warn("[FV Search] Auto-detect failed:", e);
				return [];
			}
		}

		// ── Count Aggregation ───────────────────────────────────

		async _fetchCounts() {
			for (const facet of this.facets) {
				if (facet.type !== "select" && facet.type !== "link") continue;

				try {
					const fieldname = typeof facet === "string" ? facet : facet.fieldname;
					const result = await frappe.xcall(
						"frappe.client.get_count",
						{
							doctype: this.doctype,
							filters: this._buildServerFilters(fieldname),
							group_by: fieldname,
						}
					).catch(() => null);

					if (result) {
						this.counts[fieldname] = result;
					}
				} catch { /* skip */ }
			}
		}

		_buildServerFilters(excludeField) {
			const filters = {};
			Object.entries(this.filters).forEach(([k, v]) => {
				if (k !== excludeField && v !== undefined && v !== null && v !== "") {
					filters[k] = v;
				}
			});
			return filters;
		}

		// ── Rendering ───────────────────────────────────────────

		_render() {
			if (!this.container) return;
			this.container.innerHTML = "";
			this.container.className = "fv-faceted-search";

			// Search bar
			if (this.options.showSearch) {
				const searchBar = document.createElement("div");
				searchBar.className = "fv-faceted-search__search";
				searchBar.innerHTML = `<input type="search" placeholder="${__("Search...")}" value="${this.searchText}" />`;
				searchBar.querySelector("input").addEventListener("input", (e) => {
					this.searchText = e.target.value;
					this._debounceEmit();
				});
				this.container.appendChild(searchBar);
			}

			// Active filters summary
			const activeCount = Object.values(this.filters).filter((v) => v !== undefined && v !== null && v !== "").length;
			if (activeCount > 0 && this.options.showClear) {
				const summary = document.createElement("div");
				summary.className = "fv-faceted-search__summary";
				summary.innerHTML = `
					<span>${activeCount} ${__("active filter(s)")}</span>
					<button class="fv-faceted-search__clear-all">${__("Clear All")}</button>
				`;
				summary.querySelector("button").addEventListener("click", () => this.clearAll());
				this.container.appendChild(summary);
			}

			// Facet panels
			this.facets.forEach((facetDef) => {
				const facet = typeof facetDef === "string"
					? { fieldname: facetDef, label: facetDef, type: "select" }
					: facetDef;

				const panel = document.createElement("div");
				panel.className = "fv-faceted-search__facet";

				const header = document.createElement("div");
				header.className = "fv-faceted-search__facet-header";
				header.innerHTML = `
					<span>${facet.label || facet.fieldname}</span>
					<span class="fv-faceted-search__toggle">${this.collapsed.has(facet.fieldname) ? "▸" : "▾"}</span>
				`;
				header.addEventListener("click", () => {
					if (this.collapsed.has(facet.fieldname)) {
						this.collapsed.delete(facet.fieldname);
					} else {
						this.collapsed.add(facet.fieldname);
					}
					this._render();
				});
				panel.appendChild(header);

				if (!this.collapsed.has(facet.fieldname)) {
					const body = document.createElement("div");
					body.className = "fv-faceted-search__facet-body";
					this._renderFacetControl(body, facet);
					panel.appendChild(body);
				}

				this.container.appendChild(panel);
			});
		}

		_renderFacetControl(body, facet) {
			switch (facet.type) {
				case "select":
				case "link":
					this._renderCheckboxFacet(body, facet);
					break;
				case "toggle":
					this._renderToggleFacet(body, facet);
					break;
				case "daterange":
					this._renderDateRangeFacet(body, facet);
					break;
				case "range":
					this._renderRangeFacet(body, facet);
					break;
			}
		}

		_renderCheckboxFacet(body, facet) {
			const counts = this.counts[facet.fieldname] || {};
			const options = facet.options
				? (typeof facet.options === "string" ? facet.options.split("\n") : facet.options)
				: Object.keys(counts);

			const currentVal = this.filters[facet.fieldname];

			options.slice(0, this.options.maxFacetValues).forEach((opt) => {
				const value = typeof opt === "object" ? opt.value : opt;
				const label = typeof opt === "object" ? opt.label : opt;
				const count = counts[value] || 0;
				const checked = Array.isArray(currentVal) ? currentVal.includes(value) : currentVal === value;

				const item = document.createElement("label");
				item.className = `fv-faceted-search__option ${checked ? "active" : ""}`;
				item.innerHTML = `
					<input type="checkbox" ${checked ? "checked" : ""} />
					<span class="fv-faceted-search__option-label">${__(label || value)}</span>
					${this.options.showCounts && count ? `<span class="fv-faceted-search__count">${count}</span>` : ""}
				`;
				item.querySelector("input").addEventListener("change", (e) => {
					this._toggleFilter(facet.fieldname, value, e.target.checked);
				});
				body.appendChild(item);
			});
		}

		_renderToggleFacet(body, facet) {
			const current = this.filters[facet.fieldname];
			const toggle = document.createElement("label");
			toggle.className = "fv-faceted-search__toggle-control";
			toggle.innerHTML = `
				<input type="checkbox" ${current ? "checked" : ""} />
				<span>${__(facet.label)}</span>
			`;
			toggle.querySelector("input").addEventListener("change", (e) => {
				this.setFilter(facet.fieldname, e.target.checked ? 1 : undefined);
			});
			body.appendChild(toggle);
		}

		_renderDateRangeFacet(body, facet) {
			const current = this.filters[facet.fieldname] || [];
			const wrapper = document.createElement("div");
			wrapper.className = "fv-faceted-search__daterange";
			wrapper.innerHTML = `
				<input type="date" class="from" value="${current[0] || ""}" placeholder="${__("From")}" />
				<span>–</span>
				<input type="date" class="to" value="${current[1] || ""}" placeholder="${__("To")}" />
			`;
			wrapper.querySelectorAll("input").forEach((inp) => {
				inp.addEventListener("change", () => {
					const from = wrapper.querySelector(".from").value;
					const to = wrapper.querySelector(".to").value;
					if (from && to) {
						this.setFilter(facet.fieldname, ["between", [from, to]]);
					} else if (from) {
						this.setFilter(facet.fieldname, [">=", from]);
					} else if (to) {
						this.setFilter(facet.fieldname, ["<=", to]);
					} else {
						this.setFilter(facet.fieldname, undefined);
					}
				});
			});
			body.appendChild(wrapper);
		}

		_renderRangeFacet(body, facet) {
			const current = this.filters[facet.fieldname];
			const wrapper = document.createElement("div");
			wrapper.className = "fv-faceted-search__range";
			wrapper.innerHTML = `
				<input type="number" class="min" placeholder="${__("Min")}" value="${current?.min || ""}" />
				<span>–</span>
				<input type="number" class="max" placeholder="${__("Max")}" value="${current?.max || ""}" />
			`;
			wrapper.querySelectorAll("input").forEach((inp) => {
				inp.addEventListener("change", () => {
					const min = wrapper.querySelector(".min").value;
					const max = wrapper.querySelector(".max").value;
					if (min && max) {
						this.setFilter(facet.fieldname, ["between", [min, max]]);
					} else if (min) {
						this.setFilter(facet.fieldname, [">=", min]);
					} else if (max) {
						this.setFilter(facet.fieldname, ["<=", max]);
					} else {
						this.setFilter(facet.fieldname, undefined);
					}
				});
			});
			body.appendChild(wrapper);
		}

		// ── Filter Management ───────────────────────────────────

		_toggleFilter(fieldname, value, add) {
			let current = this.filters[fieldname];
			if (!Array.isArray(current)) current = current ? [current] : [];

			if (add) {
				current.push(value);
			} else {
				current = current.filter((v) => v !== value);
			}

			this.filters[fieldname] = current.length === 0 ? undefined : (current.length === 1 ? current[0] : current);
			this._debounceEmit();
			this._render();
		}

		setFilter(fieldname, value) {
			if (value === undefined || value === null || value === "") {
				delete this.filters[fieldname];
			} else {
				this.filters[fieldname] = value;
			}
			this._debounceEmit();
			this._render();
		}

		clearAll() {
			this.filters = {};
			this.searchText = "";
			this._emitFilter();
			this._render();
		}

		_debounceEmit() {
			clearTimeout(this._debounceTimer);
			this._debounceTimer = setTimeout(() => this._emitFilter(), this.options.debounceMs);
		}

		_emitFilter() {
			const payload = {
				filters: { ...this.filters },
				searchText: this.searchText,
			};
			this._fire("filter", payload);
			this._syncToURL();

			if (frappe.visual.eventBus?.emit) {
				frappe.visual.eventBus.emit("search:filter", payload);
			}
		}

		// ── Saved Views ─────────────────────────────────────────

		saveView(name) {
			const view = {
				name,
				filters: { ...this.filters },
				searchText: this.searchText,
				createdAt: new Date().toISOString(),
			};
			_savedViews.set(`${this.doctype}:${name}`, view);
			_persistViews();
			frappe.toast({ message: __("View saved: {0}", [name]), indicator: "green" });
			return view;
		}

		loadView(name) {
			const view = _savedViews.get(`${this.doctype}:${name}`);
			if (!view) return;
			this.filters = { ...view.filters };
			this.searchText = view.searchText || "";
			this._emitFilter();
			this._render();
		}

		listViews() {
			const prefix = `${this.doctype}:`;
			return [..._savedViews.entries()]
				.filter(([k]) => k.startsWith(prefix))
				.map(([, v]) => v);
		}

		deleteView(name) {
			_savedViews.delete(`${this.doctype}:${name}`);
			_persistViews();
		}

		// ── URL Deep-Linking ────────────────────────────────────

		_syncToURL() {
			const params = new URLSearchParams();
			Object.entries(this.filters).forEach(([k, v]) => {
				if (v !== undefined && v !== null) {
					params.set(k, JSON.stringify(v));
				}
			});
			if (this.searchText) params.set("_q", this.searchText);

			const url = new URL(window.location);
			url.search = params.toString();
			window.history.replaceState({}, "", url);
		}

		_restoreFromURL() {
			const params = new URLSearchParams(window.location.search);
			let restored = false;

			params.forEach((val, key) => {
				if (key === "_q") {
					this.searchText = val;
					restored = true;
				} else {
					try {
						this.filters[key] = JSON.parse(val);
						restored = true;
					} catch { /* skip */ }
				}
			});

			if (restored) {
				this._emitFilter();
				this._render();
			}
		}

		// ── Event Emitter ───────────────────────────────────────

		on(event, fn) {
			if (!this.listeners.has(event)) this.listeners.set(event, new Set());
			this.listeners.get(event).add(fn);
			return () => this.listeners.get(event)?.delete(fn);
		}

		_fire(event, data) {
			this.listeners.get(event)?.forEach((fn) => {
				try { fn(data); } catch (e) { console.error("[FV Search]", e); }
			});
		}

		// ── Cleanup ─────────────────────────────────────────────

		destroy() {
			clearTimeout(this._debounceTimer);
			if (this.container) this.container.innerHTML = "";
			this.listeners.clear();
		}
	}

	// ── Persistence for Saved Views ────────────────────────────

	function _persistViews() {
		try {
			const obj = {};
			_savedViews.forEach((v, k) => { obj[k] = v; });
			localStorage.setItem("fv_saved_views", JSON.stringify(obj));
		} catch { /* ignore */ }
	}

	function _loadViews() {
		try {
			const stored = localStorage.getItem("fv_saved_views");
			if (stored) {
				Object.entries(JSON.parse(stored)).forEach(([k, v]) => {
					_savedViews.set(k, v);
				});
			}
		} catch { /* ignore */ }
	}

	_loadViews();

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.search");

	Object.assign(frappe.visual.search, {
		/**
		 * Create a faceted search panel.
		 * @param {Element|string} container
		 * @param {Object} options - { doctype, facets, showCounts, showSearch }
		 * @returns {FacetedSearch}
		 */
		create(container, options) {
			const instance = new FacetedSearch(container, options);
			if (options.doctype) _instances.set(options.doctype, instance);
			return instance;
		},

		/** Get active instance for a doctype. */
		get(doctype) {
			return _instances.get(doctype) || null;
		},
	});

	console.log(
		"%c⬡ FV Search%c ready — create() · facets · savedViews · URL deep-link",
		"color:#0ea5e9;font-weight:bold",
		"color:#94a3b8"
	);
})();
