// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Accordion
 * ===========================
 * Collapsible content panels with smooth animations,
 * exclusive/multiple mode, nested support, icons, and search.
 *
 * Usage:
 *   const acc = Accordion.create(container, {
 *     items: [
 *       { id: 'faq1', title: 'What is...?', content: '<p>Answer</p>', icon: 'help' },
 *       { id: 'faq2', title: 'How to...?', content: 'Answer text' },
 *     ],
 *     multiple: false,          // allow multiple open panels
 *     defaultOpen: ['faq1'],    // initially open panels
 *     searchable: false,
 *     bordered: true,
 *     flush: false,             // remove outer borders
 *     size: 'md',               // 'sm' | 'md' | 'lg'
 *     theme: 'glass',           // 'glass' | 'flat' | 'minimal'
 *     onChange: (openIds) => {},
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

export class Accordion {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				items: [],
				multiple: false,
				defaultOpen: [],
				searchable: false,
				bordered: true,
				flush: false,
				size: "md",
				theme: "glass",
				onChange: null,
			},
			opts
		);

		this._open = new Set(this.opts.defaultOpen);
		this._filter = "";
		this._init();
	}

	static create(container, opts = {}) {
		return new Accordion(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { items, searchable, bordered, flush, size, theme } = this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-acc fv-acc-${size} fv-acc-${theme}`;
		if (bordered) wrap.classList.add("fv-acc-bordered");
		if (flush) wrap.classList.add("fv-acc-flush");

		if (searchable) {
			const search = document.createElement("div");
			search.className = "fv-acc-search";
			const input = document.createElement("input");
			input.type = "text";
			input.placeholder =
				typeof __ !== "undefined" ? __("Search...") : "Search...";
			input.className = "fv-acc-search-input";
			input.addEventListener("input", (e) => {
				this._filter = e.target.value.toLowerCase();
				this._renderItems(wrap);
			});
			search.appendChild(input);
			wrap.appendChild(search);
		}

		this._itemsWrap = document.createElement("div");
		this._itemsWrap.className = "fv-acc-items";
		wrap.appendChild(this._itemsWrap);

		this._renderItems(wrap);

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;
	}

	_renderItems() {
		const { items } = this.opts;
		const filtered = this._filter
			? items.filter(
					(it) =>
						it.title.toLowerCase().includes(this._filter) ||
						(typeof it.content === "string" &&
							it.content.toLowerCase().includes(this._filter))
				)
			: items;

		this._itemsWrap.innerHTML = "";

		filtered.forEach((item) => {
			const panel = document.createElement("div");
			panel.className = "fv-acc-panel";
			if (this._open.has(item.id)) panel.classList.add("fv-acc-open");

			// Header
			const header = document.createElement("button");
			header.className = "fv-acc-header";
			header.setAttribute("aria-expanded", this._open.has(item.id) ? "true" : "false");

			const headerContent = [];
			if (item.icon) {
				headerContent.push(`<span class="fv-acc-icon">${_esc(item.icon)}</span>`);
			}
			headerContent.push(`<span class="fv-acc-title">${_esc(item.title)}</span>`);
			if (item.badge !== undefined) {
				headerContent.push(`<span class="fv-acc-badge">${_esc(String(item.badge))}</span>`);
			}
			headerContent.push(`<span class="fv-acc-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>`);

			header.innerHTML = headerContent.join("");

			header.addEventListener("click", () => this.toggle(item.id));

			// Content
			const body = document.createElement("div");
			body.className = "fv-acc-body";

			const inner = document.createElement("div");
			inner.className = "fv-acc-content";

			if (typeof item.content === "string") {
				inner.innerHTML = item.content;
			} else if (item.content instanceof HTMLElement) {
				inner.appendChild(item.content);
			} else if (typeof item.render === "function") {
				item.render(inner);
			}

			body.appendChild(inner);

			// Animate height
			if (this._open.has(item.id)) {
				body.style.maxHeight = "none";
			} else {
				body.style.maxHeight = "0";
			}

			panel.appendChild(header);
			panel.appendChild(body);
			this._itemsWrap.appendChild(panel);
		});
	}

	_animateToggle(panel, opening) {
		const body = panel.querySelector(".fv-acc-body");
		if (!body) return;

		if (opening) {
			body.style.maxHeight = body.scrollHeight + "px";
			body.addEventListener(
				"transitionend",
				() => {
					if (panel.classList.contains("fv-acc-open")) {
						body.style.maxHeight = "none";
					}
				},
				{ once: true }
			);
		} else {
			body.style.maxHeight = body.scrollHeight + "px";
			// Force reflow
			body.offsetHeight;
			body.style.maxHeight = "0";
		}
	}

	/* ── Public API ─────────────────────────────────────── */

	toggle(id) {
		if (this._open.has(id)) {
			this._open.delete(id);
		} else {
			if (!this.opts.multiple) {
				// Close others
				this._open.forEach((openId) => {
					const panel = this._findPanel(openId);
					if (panel) {
						panel.classList.remove("fv-acc-open");
						this._animateToggle(panel, false);
						const header = panel.querySelector(".fv-acc-header");
						if (header) header.setAttribute("aria-expanded", "false");
					}
				});
				this._open.clear();
			}
			this._open.add(id);
		}

		const panel = this._findPanel(id);
		if (panel) {
			const isOpen = this._open.has(id);
			panel.classList.toggle("fv-acc-open", isOpen);
			this._animateToggle(panel, isOpen);
			const header = panel.querySelector(".fv-acc-header");
			if (header) header.setAttribute("aria-expanded", isOpen ? "true" : "false");
		}

		if (this.opts.onChange) this.opts.onChange([...this._open]);
	}

	_findPanel(id) {
		const idx = this.opts.items.findIndex((it) => it.id === id);
		if (idx === -1 || !this._itemsWrap) return null;
		return this._itemsWrap.children[idx];
	}

	open(id) {
		if (!this._open.has(id)) this.toggle(id);
	}

	close(id) {
		if (this._open.has(id)) this.toggle(id);
	}

	openAll() {
		this.opts.items.forEach((it) => this.open(it.id));
	}

	closeAll() {
		[...this._open].forEach((id) => this.close(id));
	}

	getOpen() {
		return [...this._open];
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
