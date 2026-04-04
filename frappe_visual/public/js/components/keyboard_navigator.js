/**
 * KeyboardNavigator — Enhanced keyboard navigation for custom components
 *
 * Provides arrow-key, Home/End, Page Up/Down navigation patterns for
 * lists, grids, trees, and menus. Implements WAI-ARIA keyboard patterns.
 *
 * frappe.visual.KeyboardNavigator.create({
 *   container: ".my-list", items: ".list-item", orientation: "vertical"
 * })
 */
export class KeyboardNavigator {
	static create(opts = {}) { return new KeyboardNavigator(opts); }

	static PATTERNS = {
		list:     { orientation: "vertical",   wrap: true,  homeEnd: true },
		grid:     { orientation: "both",       wrap: true,  homeEnd: true,  columns: 3 },
		menu:     { orientation: "vertical",   wrap: true,  homeEnd: true,  typeahead: true },
		tabs:     { orientation: "horizontal", wrap: true,  homeEnd: true,  activation: "manual" },
		toolbar:  { orientation: "horizontal", wrap: true,  homeEnd: false },
		tree:     { orientation: "vertical",   wrap: false, homeEnd: true,  expandCollapse: true },
	};

	constructor(opts) {
		this.opts = Object.assign({
			container: null, items: "[data-fv-nav-item]", orientation: "vertical",
			wrap: true, homeEnd: true, typeahead: false, columns: 1,
			activation: "automatic", expandCollapse: false,
			onSelect: null, onActivate: null, onExpand: null, onCollapse: null
		}, opts);
		this._index = 0;
		this._typeBuffer = "";
		this._typeTimer = null;
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Apply a named pattern */
	static forPattern(name, container, opts = {}) {
		const pattern = KeyboardNavigator.PATTERNS[name];
		if (!pattern) return null;
		return new KeyboardNavigator(Object.assign({}, pattern, { container }, opts));
	}

	get currentIndex() { return this._index; }
	get currentItem() { return this._getItems()[this._index] || null; }

	focusIndex(i) {
		const items = this._getItems();
		if (i < 0 || i >= items.length) return;
		this._setFocus(i, items);
	}

	focusFirst() { this.focusIndex(0); }
	focusLast() { this.focusIndex(this._getItems().length - 1); }

	/** Refresh when DOM items change */
	refresh() {
		const items = this._getItems();
		if (this._index >= items.length) this._index = Math.max(0, items.length - 1);
		this._updateTabindex(items);
	}

	destroy() {
		this._container?.removeEventListener("keydown", this._keyHandler);
		clearTimeout(this._typeTimer);
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		this._container = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!this._container) return;
		this._keyHandler = (e) => this._onKey(e);
		this._container.addEventListener("keydown", this._keyHandler);
		// Set initial tabindex
		const items = this._getItems();
		this._updateTabindex(items);
		// Click handling for focus
		this._container.addEventListener("click", (e) => {
			const item = e.target.closest(this.opts.items);
			if (!item) return;
			const idx = Array.from(this._getItems()).indexOf(item);
			if (idx >= 0) this._setFocus(idx);
		});
	}

	_getItems() {
		return this._container ? this._container.querySelectorAll(this.opts.items) : [];
	}

	_onKey(e) {
		const items = this._getItems();
		if (!items.length) return;
		const len = items.length;
		let handled = false;
		switch (e.key) {
			case "ArrowDown":
				if (this.opts.orientation !== "horizontal") { this._move(1, items); handled = true; }
				break;
			case "ArrowUp":
				if (this.opts.orientation !== "horizontal") { this._move(-1, items); handled = true; }
				break;
			case "ArrowRight":
				if (this.opts.orientation !== "vertical") { this._move(1, items); handled = true; }
				else if (this.opts.expandCollapse) { this._expand(items[this._index]); handled = true; }
				break;
			case "ArrowLeft":
				if (this.opts.orientation !== "vertical") { this._move(-1, items); handled = true; }
				else if (this.opts.expandCollapse) { this._collapse(items[this._index]); handled = true; }
				break;
			case "Home":
				if (this.opts.homeEnd) { this._setFocus(0, items); handled = true; }
				break;
			case "End":
				if (this.opts.homeEnd) { this._setFocus(len - 1, items); handled = true; }
				break;
			case "PageDown":
				this._setFocus(Math.min(this._index + 10, len - 1), items); handled = true;
				break;
			case "PageUp":
				this._setFocus(Math.max(this._index - 10, 0), items); handled = true;
				break;
			case "Enter":
			case " ":
				this._activate(items[this._index]); handled = true;
				break;
			default:
				if (this.opts.typeahead && e.key.length === 1) { this._typeahead(e.key, items); handled = true; }
		}
		if (handled) { e.preventDefault(); e.stopPropagation(); }
	}

	_move(delta, items) {
		let next = this._index + delta;
		if (this.opts.wrap) {
			next = (next + items.length) % items.length;
		} else {
			next = Math.max(0, Math.min(next, items.length - 1));
		}
		this._setFocus(next, items);
	}

	_setFocus(idx, items) {
		items = items || this._getItems();
		if (idx < 0 || idx >= items.length) return;
		// Remove focus from old
		items[this._index]?.setAttribute("tabindex", "-1");
		items[this._index]?.classList.remove("fv-nav-current");
		// Set focus on new
		this._index = idx;
		items[idx].setAttribute("tabindex", "0");
		items[idx].classList.add("fv-nav-current");
		items[idx].focus({ preventScroll: false });
		this.opts.onSelect?.(items[idx], idx);
		if (this.opts.activation === "automatic") this._activate(items[idx]);
	}

	_activate(item) { if (item) this.opts.onActivate?.(item, this._index); }
	_expand(item) { if (item) this.opts.onExpand?.(item, this._index); }
	_collapse(item) { if (item) this.opts.onCollapse?.(item, this._index); }

	_updateTabindex(items) {
		items.forEach((el, i) => {
			el.setAttribute("tabindex", i === this._index ? "0" : "-1");
			el.classList.toggle("fv-nav-current", i === this._index);
		});
	}

	_typeahead(char, items) {
		clearTimeout(this._typeTimer);
		this._typeBuffer += char.toLowerCase();
		this._typeTimer = setTimeout(() => { this._typeBuffer = ""; }, 600);
		const match = Array.from(items).findIndex(el =>
			(el.textContent || "").trim().toLowerCase().startsWith(this._typeBuffer));
		if (match >= 0) this._setFocus(match, items);
	}
}
