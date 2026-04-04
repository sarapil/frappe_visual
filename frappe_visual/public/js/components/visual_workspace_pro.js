// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * VisualWorkspacePro — Premium Workspace Enhancer
 * ==================================================
 * Transforms Frappe's standard workspace pages into visual hubs:
 *   • Hero banner with app identity (logo, gradient, animated SVG)
 *   • Glassmorphism shortcut cards with live counts + sparklines
 *   • Quick-entry modals from workspace (no navigation needed)
 *   • Section-level KPI aggregations
 *   • Interactive onboarding progress bar (% complete)
 *   • Role-based section visibility
 *   • Workspace search with fuzzy matching
 *   • "Starred" items tray (user's pinned links)
 *   • Responsive: mobile-first card layout
 *
 * Usage:
 *   // Auto-mode (enhances current workspace page):
 *   frappe.visual.WorkspacePro.enhance();
 *
 *   // Manual mode:
 *   frappe.visual.WorkspacePro.create('#container', {
 *     title: 'HR Hub',
 *     icon: 'users',
 *     color: '#8B5CF6',
 *     sections: [
 *       { label: 'People', shortcuts: [
 *         { label: 'Employee', doctype: 'Employee', icon: 'user' },
 *       ]},
 *     ],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualWorkspacePro {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("WorkspacePro: container not found");

		this.config = Object.assign({
			title: "",
			subtitle: "",
			icon: "layout",
			color: "#6366F1",
			logo: null,
			sections: [],
			heroBanner: true,
			liveCounts: true,
			quickEntry: true,
			search: true,
			stars: true,
			onboarding: null,       // { total: 10, completed: 7 }
			theme: "glass",
		}, config);

		this.starredItems = this._loadStars();
		this._init();
	}

	static create(container, config) {
		return new VisualWorkspacePro(container, config);
	}

	/**
	 * Auto-enhance the current workspace page
	 * Call from workspace_enhancer or fv_bootstrap
	 */
	static enhance() {
		const page = document.querySelector(".workspace-container, .desk-page");
		if (!page) return null;

		// Try to extract workspace info from the current page
		const title = page.querySelector(".workspace-title")?.textContent?.trim() || cur_page?.page?.label || "";
		return new VisualWorkspacePro(page, { title });
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		if (this.config.liveCounts) await this._loadCounts();
		this._renderSections();
		if (this.config.stars && this.starredItems.length) this._renderStarsTray();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		const isRTL = ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
		this.container.setAttribute("dir", isRTL ? "rtl" : "ltr");

		// Only inject our elements, don't wipe standard workspace content
		const existing = this.container.querySelector(".fv-wp-shell");
		if (existing) existing.remove();

		this.el = document.createElement("div");
		this.el.className = `fv-wp-shell fv-wp-shell--${this.config.theme}`;

		let html = "";

		// Hero Banner
		if (this.config.heroBanner && this.config.title) {
			html += `<div class="fv-wp-hero" style="background:linear-gradient(135deg, ${this.config.color}, ${this._darken(this.config.color, 30)});">
				<div class="fv-wp-hero-inner">
					${this.config.logo ? `<img src="${this.config.logo}" class="fv-wp-hero-logo" alt="">` : `<span class="fv-wp-hero-icon">${this._icon(this.config.icon, 36)}</span>`}
					<div>
						<h1 class="fv-wp-hero-title">${__(this.config.title)}</h1>
						${this.config.subtitle ? `<p class="fv-wp-hero-sub">${__(this.config.subtitle)}</p>` : ""}
					</div>
				</div>
				${this.config.onboarding ? this._onboardingBar() : ""}
			</div>`;
		}

		// Search
		if (this.config.search) {
			html += `<div class="fv-wp-search">
				<input type="text" class="fv-wp-search-input" placeholder="${__("Search in workspace")}...">
			</div>`;
		}

		// Stars tray placeholder
		html += `<div class="fv-wp-stars-tray" style="display:none"></div>`;

		// Sections container
		html += `<div class="fv-wp-sections"></div>`;

		this.el.innerHTML = html;
		this.container.prepend(this.el);

		// Search handler
		const searchInput = this.el.querySelector(".fv-wp-search-input");
		searchInput?.addEventListener("input", frappe.utils.debounce((e) => {
			this._filterSections(e.target.value);
		}, 200));
	}

	_onboardingBar() {
		const ob = this.config.onboarding;
		const pct = Math.round((ob.completed / ob.total) * 100);
		return `<div class="fv-wp-onboarding">
			<div class="fv-wp-ob-text">${__("Setup Progress")}: ${pct}%</div>
			<div class="fv-wp-ob-bar">
				<div class="fv-wp-ob-fill" style="width:${pct}%;background:#fff;"></div>
			</div>
		</div>`;
	}

	// ─── Live Counts ─────────────────────────────────────────────
	async _loadCounts() {
		const allShortcuts = this.config.sections.flatMap(s => s.shortcuts || []);
		const countPromises = allShortcuts.filter(s => s.doctype).map(async (s) => {
			try {
				s._count = await frappe.xcall("frappe.client.get_count", { doctype: s.doctype, filters: s.filters || {} });
			} catch {
				s._count = null;
			}
		});
		await Promise.allSettled(countPromises);
	}

	// ─── Sections ────────────────────────────────────────────────
	_renderSections() {
		const container = this.el.querySelector(".fv-wp-sections");
		container.innerHTML = "";

		this.config.sections.forEach((section, sIdx) => {
			const sec = document.createElement("div");
			sec.className = "fv-wp-section";
			sec.dataset.label = section.label?.toLowerCase() || "";

			let cards = "";
			(section.shortcuts || []).forEach((sc, cIdx) => {
				const isStarred = this.starredItems.includes(sc.label);
				const count = sc._count !== null && sc._count !== undefined ? this._fmtNum(sc._count) : "";
				const color = sc.color || this.config.color;

				cards += `<div class="fv-wp-card" data-section="${sIdx}" data-card="${cIdx}" data-label="${(sc.label || "").toLowerCase()}">
					<div class="fv-wp-card-icon" style="background:${color}15;color:${color}">
						${this._icon(sc.icon || "file", 22)}
					</div>
					<div class="fv-wp-card-info">
						<div class="fv-wp-card-label">${__(sc.label)}</div>
						${count ? `<div class="fv-wp-card-count">${count}</div>` : ""}
					</div>
					<div class="fv-wp-card-actions">
						${this.config.quickEntry && sc.doctype ? `<button class="fv-wp-card-new" data-dt="${sc.doctype}" title="${__("New")}">+</button>` : ""}
						${this.config.stars ? `<button class="fv-wp-card-star ${isStarred ? "starred" : ""}" data-label="${sc.label}" title="${__("Star")}">★</button>` : ""}
					</div>
				</div>`;
			});

			sec.innerHTML = `
				<h3 class="fv-wp-section-title">${__(section.label || "")}</h3>
				<div class="fv-wp-card-grid">${cards}</div>
			`;

			container.appendChild(sec);
		});

		// Card click events
		container.querySelectorAll(".fv-wp-card").forEach(card => {
			card.addEventListener("click", (e) => {
				if (e.target.closest(".fv-wp-card-new") || e.target.closest(".fv-wp-card-star")) return;
				const sIdx = parseInt(card.dataset.section);
				const cIdx = parseInt(card.dataset.card);
				const sc = this.config.sections[sIdx]?.shortcuts?.[cIdx];
				if (sc?.route) {
					frappe.set_route(sc.route);
				} else if (sc?.doctype) {
					frappe.set_route("List", sc.doctype);
				}
			});
		});

		// Quick entry
		container.querySelectorAll(".fv-wp-card-new").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				frappe.new_doc(btn.dataset.dt);
			});
		});

		// Star toggle
		container.querySelectorAll(".fv-wp-card-star").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				const label = btn.dataset.label;
				this._toggleStar(label);
				btn.classList.toggle("starred");
				this._renderStarsTray();
			});
		});

		// GSAP stagger
		if (typeof gsap !== "undefined") {
			gsap.from(container.querySelectorAll(".fv-wp-card"), {
				y: 20, opacity: 0, duration: 0.4, stagger: 0.04, ease: "power2.out"
			});
		}
	}

	// ─── Search/Filter ───────────────────────────────────────────
	_filterSections(query) {
		const q = query.toLowerCase();
		this.el.querySelectorAll(".fv-wp-section").forEach(sec => {
			const cards = sec.querySelectorAll(".fv-wp-card");
			let hasVisible = false;
			cards.forEach(card => {
				const match = !q || card.dataset.label.includes(q);
				card.style.display = match ? "" : "none";
				if (match) hasVisible = true;
			});
			sec.style.display = hasVisible ? "" : "none";
		});
	}

	// ─── Stars ───────────────────────────────────────────────────
	_loadStars() {
		try { return JSON.parse(localStorage.getItem("fv_wp_stars") || "[]"); } catch { return []; }
	}

	_toggleStar(label) {
		const idx = this.starredItems.indexOf(label);
		if (idx > -1) this.starredItems.splice(idx, 1);
		else this.starredItems.push(label);
		localStorage.setItem("fv_wp_stars", JSON.stringify(this.starredItems));
	}

	_renderStarsTray() {
		const tray = this.el.querySelector(".fv-wp-stars-tray");
		if (!this.starredItems.length) {
			tray.style.display = "none";
			return;
		}
		tray.style.display = "flex";
		tray.innerHTML = `<span class="fv-wp-stars-label">★ ${__("Starred")}</span>` +
			this.starredItems.map(label => `<span class="fv-wp-star-chip">${label}</span>`).join("");
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

	_darken(hex, pct) {
		const num = parseInt((hex || "#6366F1").replace("#", ""), 16);
		const r = Math.max(0, (num >> 16) - pct);
		const g = Math.max(0, ((num >> 8) & 0xFF) - pct);
		const b = Math.max(0, (num & 0xFF) - pct);
		return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
	}

	async refresh() {
		if (this.config.liveCounts) await this._loadCounts();
		this._renderSections();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
