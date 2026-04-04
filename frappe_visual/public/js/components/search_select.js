// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — SearchSelect
 * ===============================
 * Searchable dropdown with option grouping, icons, descriptions,
 * recent/pinned items, keyboard navigation, and create-new support.
 *
 * Usage:
 *   frappe.visual.SearchSelect.create('#el', {
 *     options: [
 *       { value: 'US', label: 'United States', group: 'Americas', icon: '🇺🇸' },
 *       { value: 'UK', label: 'United Kingdom', group: 'Europe', icon: '🇬🇧' },
 *     ],
 *     placeholder: 'Select country',
 *     onChange: v => console.log(v)
 *   })
 *
 * @module frappe_visual/components/search_select
 */

export class SearchSelect {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("SearchSelect: container not found");

		this.opts = Object.assign({
			theme: "glass",
			options: [],           // [{value, label, group?, icon?, description?, disabled?}]
			value: null,
			placeholder: __("Search…"),
			emptyText: __("No results"),
			allowCreate: false,
			createLabel: __("Create"),
			maxHeight: 280,
			showGroups: true,
			showIcons: true,
			showDescriptions: true,
			clearable: true,
			disabled: false,
			multi: false,          // allow multiple selections
			maxSelections: 50,
			recentKey: null,       // localStorage key for recent items
			maxRecent: 5,
			onChange: null,
			onCreate: null,
		}, opts);

		this._value = this.opts.multi
			? (Array.isArray(this.opts.value) ? [...this.opts.value] : [])
			: this.opts.value;
		this._open = false;
		this._query = "";
		this._highlightIdx = -1;
		this._filtered = [];
		this._recents = this._loadRecents();
		this._init();
	}

	static create(container, opts = {}) { return new SearchSelect(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-ss", `fv-ss--${this.opts.theme}`);
		if (this.opts.disabled) this.container.classList.add("fv-ss--disabled");
		this.container.innerHTML = "";

		// Trigger / display
		this._triggerEl = document.createElement("div");
		this._triggerEl.className = "fv-ss-trigger";
		this._triggerEl.addEventListener("click", () => !this.opts.disabled && this._toggle());
		this.container.appendChild(this._triggerEl);

		// Dropdown
		this._dropEl = document.createElement("div");
		this._dropEl.className = "fv-ss-dropdown";
		this._dropEl.style.display = "none";
		this._dropEl.style.maxHeight = this.opts.maxHeight + "px";
		this.container.appendChild(this._dropEl);

		// Search input inside dropdown
		this._searchWrap = document.createElement("div");
		this._searchWrap.className = "fv-ss-search-wrap";
		this._searchInput = document.createElement("input");
		this._searchInput.type = "text";
		this._searchInput.className = "fv-ss-search";
		this._searchInput.placeholder = this.opts.placeholder;
		this._searchInput.addEventListener("input", () => { this._query = this._searchInput.value; this._filter(); });
		this._searchInput.addEventListener("keydown", (e) => this._onKeydown(e));
		this._searchWrap.appendChild(this._searchInput);
		this._dropEl.appendChild(this._searchWrap);

		// Options list
		this._listEl = document.createElement("div");
		this._listEl.className = "fv-ss-list";
		this._dropEl.appendChild(this._listEl);

		// Outside click
		this._outsideClick = (e) => {
			if (this._open && !this.container.contains(e.target)) this.close();
		};
		document.addEventListener("mousedown", this._outsideClick);

		this._updateTrigger();
	}

	_updateTrigger() {
		if (this.opts.multi) {
			if (this._value.length === 0) {
				this._triggerEl.innerHTML = `<span class="fv-ss-placeholder">${this._esc(this.opts.placeholder)}</span><span class="fv-ss-arrow">▾</span>`;
			} else {
				const tags = this._value.map(v => {
					const opt = this.opts.options.find(o => o.value === v);
					return `<span class="fv-ss-tag">${this._esc(opt ? opt.label : v)}<button class="fv-ss-tag-remove" data-val="${this._esc(v)}">×</button></span>`;
				}).join("");
				this._triggerEl.innerHTML = `<div class="fv-ss-tags">${tags}</div><span class="fv-ss-arrow">▾</span>`;
				this._triggerEl.querySelectorAll(".fv-ss-tag-remove").forEach(btn => {
					btn.addEventListener("click", (e) => { e.stopPropagation(); this._deselect(btn.dataset.val); });
				});
			}
		} else {
			const selected = this.opts.options.find(o => o.value === this._value);
			if (selected) {
				let html = "";
				if (this.opts.showIcons && selected.icon) html += `<span class="fv-ss-selected-icon">${this._esc(selected.icon)}</span>`;
				html += `<span class="fv-ss-selected-label">${this._esc(selected.label)}</span>`;
				if (this.opts.clearable) html += `<button class="fv-ss-clear">×</button>`;
				html += `<span class="fv-ss-arrow">▾</span>`;
				this._triggerEl.innerHTML = html;
				const clearBtn = this._triggerEl.querySelector(".fv-ss-clear");
				if (clearBtn) clearBtn.addEventListener("click", (e) => { e.stopPropagation(); this.clear(); });
			} else {
				this._triggerEl.innerHTML = `<span class="fv-ss-placeholder">${this._esc(this.opts.placeholder)}</span><span class="fv-ss-arrow">▾</span>`;
			}
		}
	}

	/* ── Filter & Render ─────────────────────────────────────── */
	_filter() {
		const q = this._query.toLowerCase().trim();
		this._filtered = this.opts.options.filter(o => {
			if (o.disabled) return false;
			if (this.opts.multi && this._value.includes(o.value)) return false;
			if (!q) return true;
			return (o.label || "").toLowerCase().includes(q) ||
				(o.value || "").toLowerCase().includes(q) ||
				(o.description || "").toLowerCase().includes(q);
		});
		this._highlightIdx = this._filtered.length > 0 ? 0 : -1;
		this._renderList();
	}

	_renderList() {
		this._listEl.innerHTML = "";

		// Recents (only when no search query)
		if (!this._query && this._recents.length > 0) {
			const header = document.createElement("div");
			header.className = "fv-ss-group-header";
			header.textContent = __("Recent");
			this._listEl.appendChild(header);

			for (const val of this._recents) {
				const opt = this.opts.options.find(o => o.value === val);
				if (opt && !opt.disabled) this._listEl.appendChild(this._renderOption(opt, true));
			}

			const divider = document.createElement("div");
			divider.className = "fv-ss-divider";
			this._listEl.appendChild(divider);
		}

		if (this._filtered.length === 0) {
			const empty = document.createElement("div");
			empty.className = "fv-ss-empty";
			empty.textContent = this.opts.emptyText;
			this._listEl.appendChild(empty);

			if (this.opts.allowCreate && this._query) {
				const createBtn = document.createElement("div");
				createBtn.className = "fv-ss-create";
				createBtn.innerHTML = `${this.opts.createLabel}: <strong>${this._esc(this._query)}</strong>`;
				createBtn.addEventListener("click", () => {
					if (this.opts.onCreate) this.opts.onCreate(this._query);
					this._selectValue(this._query);
				});
				this._listEl.appendChild(createBtn);
			}
			return;
		}

		// Group options
		if (this.opts.showGroups) {
			const groups = {};
			const ungrouped = [];
			for (const opt of this._filtered) {
				if (opt.group) {
					(groups[opt.group] = groups[opt.group] || []).push(opt);
				} else {
					ungrouped.push(opt);
				}
			}

			let idx = 0;
			for (const opt of ungrouped) {
				this._listEl.appendChild(this._renderOption(opt, false, idx++));
			}
			for (const [group, opts] of Object.entries(groups)) {
				const header = document.createElement("div");
				header.className = "fv-ss-group-header";
				header.textContent = group;
				this._listEl.appendChild(header);
				for (const opt of opts) {
					this._listEl.appendChild(this._renderOption(opt, false, idx++));
				}
			}
		} else {
			this._filtered.forEach((opt, i) => {
				this._listEl.appendChild(this._renderOption(opt, false, i));
			});
		}
	}

	_renderOption(opt, isRecent, globalIdx) {
		const el = document.createElement("div");
		el.className = "fv-ss-option";
		if (globalIdx === this._highlightIdx) el.classList.add("fv-ss-option--highlighted");
		if (isRecent) el.classList.add("fv-ss-option--recent");

		let html = "";
		if (this.opts.showIcons && opt.icon) html += `<span class="fv-ss-opt-icon">${this._esc(opt.icon)}</span>`;
		html += `<div class="fv-ss-opt-text"><span class="fv-ss-opt-label">${this._esc(opt.label)}</span>`;
		if (this.opts.showDescriptions && opt.description) html += `<span class="fv-ss-opt-desc">${this._esc(opt.description)}</span>`;
		html += `</div>`;
		el.innerHTML = html;

		el.addEventListener("click", () => this._selectValue(opt.value));
		el.addEventListener("mouseenter", () => {
			if (globalIdx != null) this._highlightIdx = globalIdx;
			this._listEl.querySelectorAll(".fv-ss-option--highlighted").forEach(e => e.classList.remove("fv-ss-option--highlighted"));
			el.classList.add("fv-ss-option--highlighted");
		});

		return el;
	}

	/* ── Keyboard ────────────────────────────────────────────── */
	_onKeydown(e) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			this._highlightIdx = Math.min(this._highlightIdx + 1, this._filtered.length - 1);
			this._renderList();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			this._highlightIdx = Math.max(this._highlightIdx - 1, 0);
			this._renderList();
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (this._highlightIdx >= 0 && this._filtered[this._highlightIdx]) {
				this._selectValue(this._filtered[this._highlightIdx].value);
			} else if (this.opts.allowCreate && this._query) {
				if (this.opts.onCreate) this.opts.onCreate(this._query);
				this._selectValue(this._query);
			}
		} else if (e.key === "Escape") {
			this.close();
		}
	}

	/* ── Selection ───────────────────────────────────────────── */
	_selectValue(val) {
		if (this.opts.multi) {
			if (!this._value.includes(val) && this._value.length < this.opts.maxSelections) {
				this._value.push(val);
			}
		} else {
			this._value = val;
		}

		this._saveRecent(val);
		this._updateTrigger();
		this._query = "";

		if (!this.opts.multi) {
			this.close();
		} else {
			this._searchInput.value = "";
			this._filter();
		}

		if (this.opts.onChange) this.opts.onChange(this.opts.multi ? [...this._value] : this._value);
	}

	_deselect(val) {
		this._value = this._value.filter(v => v !== val);
		this._updateTrigger();
		if (this.opts.onChange) this.opts.onChange([...this._value]);
	}

	/* ── Open/Close ──────────────────────────────────────────── */
	_toggle() { this._open ? this.close() : this.open(); }

	open() {
		this._open = true;
		this._dropEl.style.display = "";
		this._query = "";
		this._searchInput.value = "";
		this._filter();
		this._searchInput.focus();
	}

	close() {
		this._open = false;
		this._dropEl.style.display = "none";
	}

	/* ── Recents ─────────────────────────────────────────────── */
	_loadRecents() {
		if (!this.opts.recentKey) return [];
		try { return JSON.parse(localStorage.getItem(this.opts.recentKey) || "[]"); }
		catch { return []; }
	}

	_saveRecent(val) {
		if (!this.opts.recentKey) return;
		this._recents = [val, ...this._recents.filter(v => v !== val)].slice(0, this.opts.maxRecent);
		try { localStorage.setItem(this.opts.recentKey, JSON.stringify(this._recents)); } catch {}
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this.opts.multi ? [...this._value] : this._value; }
	setValue(v) { this._value = this.opts.multi ? (Array.isArray(v) ? [...v] : []) : v; this._updateTrigger(); }
	clear() { this._value = this.opts.multi ? [] : null; this._updateTrigger(); if (this.opts.onChange) this.opts.onChange(this._value); }
	setOptions(opts) { this.opts.options = opts; this._filter(); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		if (this._outsideClick) document.removeEventListener("mousedown", this._outsideClick);
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ss", `fv-ss--${this.opts.theme}`, "fv-ss--disabled");
	}
}
