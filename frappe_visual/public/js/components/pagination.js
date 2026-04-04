// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Pagination
 * ============================
 * Full-featured pagination control with page numbers, ellipsis,
 * per-page selector, jump-to-page, keyboard navigation.
 *
 * Usage:
 *   const pager = Pagination.create(container, {
 *     total: 500,
 *     pageSize: 20,
 *     current: 1,
 *     maxVisible: 7,             // max page buttons visible
 *     showSizeChanger: true,
 *     pageSizes: [10, 20, 50, 100],
 *     showJumper: true,
 *     showTotal: true,
 *     size: 'md',                // 'sm' | 'md' | 'lg'
 *     theme: 'glass',            // 'glass' | 'flat' | 'minimal' | 'bordered'
 *     onChange: (page, pageSize) => {},
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

export class Pagination {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				total: 0,
				pageSize: 20,
				current: 1,
				maxVisible: 7,
				showSizeChanger: true,
				pageSizes: [10, 20, 50, 100],
				showJumper: false,
				showTotal: true,
				size: "md",
				theme: "glass",
				onChange: null,
			},
			opts
		);

		this._current = this.opts.current;
		this._pageSize = this.opts.pageSize;
		this._init();
	}

	static create(container, opts = {}) {
		return new Pagination(container, opts);
	}

	/* ── Helpers ────────────────────────────────────────── */

	get _totalPages() {
		return Math.max(1, Math.ceil(this.opts.total / this._pageSize));
	}

	_getPageRange() {
		const { maxVisible } = this.opts;
		const total = this._totalPages;
		const current = this._current;

		if (total <= maxVisible) {
			return Array.from({ length: total }, (_, i) => i + 1);
		}

		const half = Math.floor(maxVisible / 2);
		let start = Math.max(1, current - half);
		let end = Math.min(total, start + maxVisible - 1);

		if (end - start + 1 < maxVisible) {
			start = Math.max(1, end - maxVisible + 1);
		}

		const pages = [];

		if (start > 1) {
			pages.push(1);
			if (start > 2) pages.push("...");
		}

		for (let i = start; i <= end; i++) {
			if (!pages.includes(i)) pages.push(i);
		}

		if (end < total) {
			if (end < total - 1) pages.push("...");
			pages.push(total);
		}

		return pages;
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { showSizeChanger, showJumper, showTotal, size, theme, pageSizes } = this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-pg fv-pg-${size} fv-pg-${theme}`;

		// Total info
		if (showTotal) {
			const totalEl = document.createElement("span");
			totalEl.className = "fv-pg-total";
			const start = (this._current - 1) * this._pageSize + 1;
			const end = Math.min(this._current * this._pageSize, this.opts.total);
			totalEl.textContent =
				typeof __ !== "undefined"
					? __("{0}-{1} of {2}", [start, end, this.opts.total])
					: `${start}-${end} of ${this.opts.total}`;
			wrap.appendChild(totalEl);
		}

		// Page size selector
		if (showSizeChanger) {
			const sizer = document.createElement("div");
			sizer.className = "fv-pg-sizer";

			const select = document.createElement("select");
			select.className = "fv-pg-size-select";
			pageSizes.forEach((s) => {
				const opt = document.createElement("option");
				opt.value = s;
				opt.textContent = `${s} / ${typeof __ !== "undefined" ? __("page") : "page"}`;
				if (s === this._pageSize) opt.selected = true;
				select.appendChild(opt);
			});

			select.addEventListener("change", (e) => {
				this._pageSize = parseInt(e.target.value);
				this._current = 1;
				this._render();
				this._fireChange();
			});

			sizer.appendChild(select);
			wrap.appendChild(sizer);
		}

		// Navigation
		const nav = document.createElement("nav");
		nav.className = "fv-pg-nav";
		nav.setAttribute("aria-label", typeof __ !== "undefined" ? __("Pagination") : "Pagination");

		// Prev button
		const prev = document.createElement("button");
		prev.className = "fv-pg-btn fv-pg-prev";
		prev.disabled = this._current <= 1;
		prev.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`;
		prev.addEventListener("click", () => this.goTo(this._current - 1));
		nav.appendChild(prev);

		// Page buttons
		const pages = this._getPageRange();
		pages.forEach((page) => {
			if (page === "...") {
				const ellipsis = document.createElement("span");
				ellipsis.className = "fv-pg-ellipsis";
				ellipsis.textContent = "…";
				nav.appendChild(ellipsis);
			} else {
				const btn = document.createElement("button");
				btn.className = "fv-pg-btn fv-pg-page";
				if (page === this._current) btn.classList.add("fv-pg-active");
				btn.textContent = page;
				btn.setAttribute("aria-label", `Page ${page}`);
				if (page === this._current) btn.setAttribute("aria-current", "page");
				btn.addEventListener("click", () => this.goTo(page));
				nav.appendChild(btn);
			}
		});

		// Next button
		const next = document.createElement("button");
		next.className = "fv-pg-btn fv-pg-next";
		next.disabled = this._current >= this._totalPages;
		next.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
		next.addEventListener("click", () => this.goTo(this._current + 1));
		nav.appendChild(next);

		wrap.appendChild(nav);

		// Jump to page
		if (showJumper) {
			const jumper = document.createElement("div");
			jumper.className = "fv-pg-jumper";

			const label = document.createElement("span");
			label.textContent = typeof __ !== "undefined" ? __("Go to") : "Go to";
			jumper.appendChild(label);

			const input = document.createElement("input");
			input.type = "number";
			input.className = "fv-pg-jump-input";
			input.min = 1;
			input.max = this._totalPages;
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					const page = parseInt(input.value);
					if (page >= 1 && page <= this._totalPages) {
						this.goTo(page);
					}
					input.value = "";
				}
			});
			jumper.appendChild(input);

			wrap.appendChild(jumper);
		}

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;

		// Keyboard nav
		this._bindKeyboard();
	}

	_bindKeyboard() {
		this.container.addEventListener("keydown", (e) => {
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				this.prev();
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				this.next();
			}
		});
	}

	_fireChange() {
		if (this.opts.onChange) this.opts.onChange(this._current, this._pageSize);
	}

	/* ── Public API ─────────────────────────────────────── */

	goTo(page) {
		page = Math.max(1, Math.min(page, this._totalPages));
		if (page === this._current) return;
		this._current = page;
		this._render();
		this._fireChange();
	}

	next() {
		this.goTo(this._current + 1);
	}

	prev() {
		this.goTo(this._current - 1);
	}

	setTotal(total) {
		this.opts.total = total;
		if (this._current > this._totalPages) this._current = this._totalPages;
		this._render();
	}

	setPageSize(size) {
		this._pageSize = size;
		this._current = 1;
		this._render();
		this._fireChange();
	}

	getCurrent() {
		return this._current;
	}

	getPageSize() {
		return this._pageSize;
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
