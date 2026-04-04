// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualGallery — Masonry Image Grid with Lightbox
 * ==================================================
 * Animated masonry grid with GSAP stagger entrance, lightbox
 * modal with keyboard navigation, lazy-load via IntersectionObserver,
 * and glassmorphism caption overlays.
 *
 * Usage:
 *   frappe.visual.gallery('#container', {
 *     doctype: 'Item',
 *     imageField: 'image',
 *     titleField: 'item_name',
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class VisualGallery {
	static create(container, opts) {
		return new VisualGallery(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign(
			{
				doctype: null,
				imageField: "image",
				titleField: "name",
				descriptionField: null,
				filters: {},
				columns: 4,
				gap: 12,
				lightbox: true,
				animate: true,
				onItemClick: null,
			},
			opts
		);

		this._items = [];
		this._lightboxEl = null;
		this._currentIdx = 0;
		this._observer = null;
		this._gsap = null;
		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		this._build();
		if (this.opts.doctype) await this._fetchData();
		this._render();
	}

	/* ── DOM Structure ─────────────────────────────────────────── */
	_build() {
		this.container.classList.add("fv-gallery", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Toolbar
		const toolbar = this._el("div", "fv-gallery-toolbar fv-fx-glass");
		toolbar.innerHTML = `
			<div class="fv-gallery-title-wrap">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
					<polyline points="21 15 16 10 5 21"/>
				</svg>
				<h3 class="fv-gallery-title fv-fx-gradient-text">${this.opts.doctype ? __(this.opts.doctype) : __("Gallery")}</h3>
				<span class="fv-gallery-count"></span>
			</div>
			<div class="fv-gallery-actions">
				<div class="fv-gallery-cols-control">
					<button class="fv-gallery-btn fv-fx-hover-scale" data-cols="3">▫▫▫</button>
					<button class="fv-gallery-btn fv-fx-hover-scale active" data-cols="4">▫▫▫▫</button>
					<button class="fv-gallery-btn fv-fx-hover-scale" data-cols="6">▫▫▫▫▫▫</button>
				</div>
			</div>`;
		this.container.appendChild(toolbar);

		toolbar.querySelectorAll("[data-cols]").forEach((btn) => {
			btn.addEventListener("click", () => {
				this.opts.columns = parseInt(btn.dataset.cols);
				toolbar.querySelectorAll("[data-cols]").forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");
				this._render();
			});
		});

		// Grid
		this._gridEl = this._el("div", "fv-gallery-grid");
		this.container.appendChild(this._gridEl);
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	/* ── Data ──────────────────────────────────────────────────── */
	async _fetchData() {
		if (!this.opts.doctype) return;

		const fields = [...new Set([
			"name", this.opts.imageField, this.opts.titleField,
			this.opts.descriptionField,
		].filter(Boolean))];

		try {
			const all = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields,
				filters: this.opts.filters || {},
				limit_page_length: 200,
				order_by: "modified desc",
			});
			// Filter to only items that have images
			this._items = all.filter((r) => r[this.opts.imageField]);
		} catch (e) {
			console.error("VisualGallery: fetch failed", e);
			this._items = [];
		}
	}

	/* ── Render ────────────────────────────────────────────────── */
	_render() {
		const countEl = this.container.querySelector(".fv-gallery-count");
		if (countEl) countEl.textContent = this._items.length ? `(${this._items.length})` : "";

		if (!this._items.length) {
			this._gridEl.innerHTML = `<div class="fv-gallery-empty">${__("No images found")}</div>`;
			return;
		}

		this._gridEl.style.setProperty("--fv-gallery-cols", this.opts.columns);
		this._gridEl.style.setProperty("--fv-gallery-gap", `${this.opts.gap}px`);

		let html = "";
		this._items.forEach((item, idx) => {
			const title = frappe.utils.escape_html(item[this.opts.titleField] || item.name);
			const desc = this.opts.descriptionField
				? frappe.utils.escape_html(item[this.opts.descriptionField] || "")
				: "";
			const imgUrl = item[this.opts.imageField];
			const color = ColorSystem.autoColor(title).border;

			html += `
				<div class="fv-gallery-item fv-fx-hover-lift" data-idx="${idx}" data-name="${item.name}">
					<div class="fv-gallery-img-wrap">
						<img class="fv-gallery-img fv-lazy" data-src="${imgUrl}" alt="${title}" loading="lazy" />
						<div class="fv-gallery-overlay fv-fx-glass">
							<span class="fv-gallery-item-title">${title}</span>
							${desc ? `<span class="fv-gallery-item-desc">${desc}</span>` : ""}
						</div>
						<div class="fv-gallery-color-bar" style="background:${color}"></div>
					</div>
				</div>`;
		});

		this._gridEl.innerHTML = html;
		this._setupLazyLoad();
		this._bindInteractions();
	}

	/* ── Lazy Loading ─────────────────────────────────────────── */
	_setupLazyLoad() {
		if (this._observer) this._observer.disconnect();

		this._observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const img = entry.target;
						img.src = img.dataset.src;
						img.classList.remove("fv-lazy");
						img.classList.add("fv-loaded");
						this._observer.unobserve(img);

						// GSAP fade in
						if (this._gsap && this.opts.animate) {
							this._gsap.from(img.closest(".fv-gallery-item"), {
								opacity: 0, y: 20, scale: 0.95,
								duration: 0.4, ease: "power2.out",
							});
						}
					}
				});
			},
			{ rootMargin: "100px" }
		);

		this._gridEl.querySelectorAll(".fv-lazy").forEach((img) => {
			this._observer.observe(img);
		});
	}

	/* ── Interactions ──────────────────────────────────────────── */
	_bindInteractions() {
		this._gridEl.querySelectorAll(".fv-gallery-item").forEach((el) => {
			el.addEventListener("click", () => {
				const idx = parseInt(el.dataset.idx);
				const item = this._items[idx];

				if (this.opts.onItemClick) {
					this.opts.onItemClick(item, el);
				} else if (this.opts.lightbox) {
					this._openLightbox(idx);
				} else if (this.opts.doctype) {
					frappe.set_route("Form", this.opts.doctype, item.name);
				}
			});
		});
	}

	/* ── Lightbox ─────────────────────────────────────────────── */
	_openLightbox(idx) {
		this._currentIdx = idx;
		this._removeLightbox();

		this._lightboxEl = document.createElement("div");
		this._lightboxEl.className = "fv-gallery-lightbox";
		this._lightboxEl.innerHTML = `
			<div class="fv-gallery-lb-backdrop"></div>
			<div class="fv-gallery-lb-content fv-fx-glass-strong">
				<img class="fv-gallery-lb-img" src="${this._items[idx][this.opts.imageField]}" alt="" />
				<div class="fv-gallery-lb-info">
					<span class="fv-gallery-lb-title">${frappe.utils.escape_html(this._items[idx][this.opts.titleField] || "")}</span>
					<span class="fv-gallery-lb-counter">${idx + 1} / ${this._items.length}</span>
				</div>
				<button class="fv-gallery-lb-close fv-fx-hover-scale">✕</button>
				<button class="fv-gallery-lb-prev fv-fx-hover-scale">‹</button>
				<button class="fv-gallery-lb-next fv-fx-hover-scale">›</button>
			</div>`;
		document.body.appendChild(this._lightboxEl);

		// Events
		this._lightboxEl.querySelector(".fv-gallery-lb-close").addEventListener("click", () => this._closeLightbox());
		this._lightboxEl.querySelector(".fv-gallery-lb-backdrop").addEventListener("click", () => this._closeLightbox());
		this._lightboxEl.querySelector(".fv-gallery-lb-prev").addEventListener("click", () => this._lbNav(-1));
		this._lightboxEl.querySelector(".fv-gallery-lb-next").addEventListener("click", () => this._lbNav(1));

		this._lbKeyHandler = (e) => {
			if (e.key === "Escape") this._closeLightbox();
			else if (e.key === "ArrowLeft") this._lbNav(-1);
			else if (e.key === "ArrowRight") this._lbNav(1);
		};
		document.addEventListener("keydown", this._lbKeyHandler);

		// GSAP entrance
		if (this._gsap) {
			this._gsap.from(this._lightboxEl.querySelector(".fv-gallery-lb-content"), {
				scale: 0.9, opacity: 0, duration: 0.3, ease: "power2.out",
			});
		}
	}

	_lbNav(dir) {
		this._currentIdx = (this._currentIdx + dir + this._items.length) % this._items.length;
		const item = this._items[this._currentIdx];
		const content = this._lightboxEl.querySelector(".fv-gallery-lb-content");
		const img = content.querySelector(".fv-gallery-lb-img");

		if (this._gsap) {
			this._gsap.to(img, {
				opacity: 0, x: dir * -30, duration: 0.15,
				onComplete: () => {
					img.src = item[this.opts.imageField];
					content.querySelector(".fv-gallery-lb-title").textContent = item[this.opts.titleField] || "";
					content.querySelector(".fv-gallery-lb-counter").textContent = `${this._currentIdx + 1} / ${this._items.length}`;
					this._gsap.fromTo(img, { opacity: 0, x: dir * 30 }, { opacity: 1, x: 0, duration: 0.25 });
				},
			});
		} else {
			img.src = item[this.opts.imageField];
			content.querySelector(".fv-gallery-lb-title").textContent = item[this.opts.titleField] || "";
			content.querySelector(".fv-gallery-lb-counter").textContent = `${this._currentIdx + 1} / ${this._items.length}`;
		}
	}

	_closeLightbox() {
		if (this._lbKeyHandler) document.removeEventListener("keydown", this._lbKeyHandler);
		if (this._gsap && this._lightboxEl) {
			this._gsap.to(this._lightboxEl, {
				opacity: 0, duration: 0.2,
				onComplete: () => this._removeLightbox(),
			});
		} else {
			this._removeLightbox();
		}
	}

	_removeLightbox() {
		if (this._lightboxEl) {
			this._lightboxEl.remove();
			this._lightboxEl = null;
		}
	}

	/* ── Public API ────────────────────────────────────────────── */
	setItems(items) { this._items = items; this._render(); }
	refresh() { this._fetchData().then(() => this._render()); }
	setColumns(n) { this.opts.columns = n; this._render(); }
	destroy() {
		if (this._observer) this._observer.disconnect();
		this._removeLightbox();
		this.container.innerHTML = "";
		this.container.classList.remove("fv-gallery");
	}
}
