// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Command Palette (Cmd+K / Ctrl+K)
 * ===================================================
 * Spotlight-style navigation: fuzzy search doctypes, pages, recent docs,
 * quick actions, settings, reports — all from a single keyboard shortcut.
 *
 * Features:
 *  - Global Cmd+K / Ctrl+K trigger (configurable)
 *  - Fuzzy matching with highlight
 *  - Category sections: Recent, DocTypes, Pages, Actions, Reports, Settings
 *  - Keyboard navigation (↑ ↓ Enter Esc Tab)
 *  - Frecency-based ranking (frequency × recency)
 *  - Command actions (create, search, navigate, run)
 *  - RTL / dark mode / glass theme
 *  - GSAP entrance animation
 *
 * API:
 *   frappe.visual.CommandPalette.create(opts)
 *   frappe.visual.commandPalette()        // bootstrap shorthand
 *
 * @module frappe_visual/components/command_palette
 */

const PALETTE_CATEGORIES = {
	recent:   { label: __("Recent"),   icon: "clock",        order: 0 },
	navigate: { label: __("Navigate"), icon: "compass",      order: 1 },
	create:   { label: __("Create"),   icon: "plus",         order: 2 },
	search:   { label: __("Search"),   icon: "search",       order: 3 },
	action:   { label: __("Actions"),  icon: "bolt",         order: 4 },
	report:   { label: __("Reports"),  icon: "chart-bar",    order: 5 },
	settings: { label: __("Settings"), icon: "settings",     order: 6 },
};

const MAX_RESULTS = 50;
const MAX_RECENT = 8;
const FRECENCY_DECAY = 0.95;
const STORAGE_KEY = "fv_cmd_frecency";

export class CommandPalette {
	constructor(opts = {}) {
		this.opts = Object.assign({
			shortcut: "k",            // key with Cmd/Ctrl
			placeholder: __("Type a command or search…"),
			theme: "glass",           // glass | flat | minimal
			maxResults: MAX_RESULTS,
			categories: Object.keys(PALETTE_CATEGORIES),
			onSelect: null,
		}, opts);

		this.isOpen = false;
		this.query = "";
		this.results = [];
		this.activeIdx = 0;
		this.frecency = this._loadFrecency();
		this._commands = [];
		this._overlay = null;
		this._input = null;

		this._buildCommands();
		this._bindGlobalShortcut();
	}

	/* ── Static Factory ──────────────────────────────────────── */
	static create(opts = {}) {
		if (CommandPalette._instance) return CommandPalette._instance;
		CommandPalette._instance = new CommandPalette(opts);
		return CommandPalette._instance;
	}

	/* ── Open / Close ────────────────────────────────────────── */
	open() {
		if (this.isOpen) return;
		this.isOpen = true;
		this.query = "";
		this.activeIdx = 0;
		this._render();
		this._animateIn();
		setTimeout(() => this._input?.focus(), 50);
	}

	close() {
		if (!this.isOpen) return;
		this._animateOut(() => {
			this._overlay?.remove();
			this._overlay = null;
			this.isOpen = false;
		});
	}

	toggle() { this.isOpen ? this.close() : this.open(); }

	/* ── Build Command Registry ──────────────────────────────── */
	_buildCommands() {
		this._commands = [];

		// Recent documents
		this._addRecentDocs();

		// Navigation: all doctypes
		this._addDoctypeNavigation();

		// Create: new document shortcuts
		this._addCreateCommands();

		// Reports
		this._addReportCommands();

		// Settings
		this._addSettingsCommands();

		// Quick actions
		this._addQuickActions();
	}

	_addRecentDocs() {
		const route_history = (frappe.route_history || []).slice(-30).reverse();
		const seen = new Set();
		for (const r of route_history) {
			if (!r || r.length < 2) continue;
			const [type, doctype, name] = r;
			if (type === "Form" && doctype && name && !seen.has(`${doctype}/${name}`)) {
				seen.add(`${doctype}/${name}`);
				this._commands.push({
					category: "recent",
					label: `${name}`,
					description: doctype,
					icon: "file-text",
					action: () => frappe.set_route("Form", doctype, name),
					keywords: `${doctype} ${name}`.toLowerCase(),
				});
				if (seen.size >= MAX_RECENT) break;
			}
		}
	}

	_addDoctypeNavigation() {
		const doctypes = Object.keys(frappe.boot?.user?.can_read || {}).filter(d => !d.startsWith("_"));
		for (const dt of doctypes) {
			this._commands.push({
				category: "navigate",
				label: __(dt),
				description: __("Open list"),
				icon: "list",
				action: () => frappe.set_route("List", dt),
				keywords: dt.toLowerCase().replace(/ /g, ""),
			});
		}
	}

	_addCreateCommands() {
		const doctypes = Object.keys(frappe.boot?.user?.can_create || {}).filter(d => !d.startsWith("_"));
		for (const dt of doctypes) {
			this._commands.push({
				category: "create",
				label: `${__("New")} ${__(dt)}`,
				description: __("Create new document"),
				icon: "plus",
				action: () => frappe.new_doc(dt),
				keywords: `new create ${dt.toLowerCase().replace(/ /g, "")}`,
			});
		}
	}

	_addReportCommands() {
		const reports = frappe.boot?.user?.can_get_report || [];
		for (const r of (Array.isArray(reports) ? reports : [])) {
			this._commands.push({
				category: "report",
				label: __(r),
				description: __("Open report"),
				icon: "chart-bar",
				action: () => frappe.set_route("query-report", r),
				keywords: `report ${r.toLowerCase().replace(/ /g, "")}`,
			});
		}
	}

	_addSettingsCommands() {
		const settings = [
			{ label: __("System Settings"), route: "Form/System Settings" },
			{ label: __("Website Settings"), route: "Form/Website Settings" },
			{ label: __("Email Account"), route: "List/Email Account" },
			{ label: __("Print Settings"), route: "Form/Print Settings" },
			{ label: __("User"), route: "List/User" },
		];
		for (const s of settings) {
			this._commands.push({
				category: "settings",
				label: s.label,
				description: __("Settings"),
				icon: "settings",
				action: () => frappe.set_route(...s.route.split("/")),
				keywords: `settings ${s.label.toLowerCase()}`,
			});
		}
	}

	_addQuickActions() {
		const actions = [
			{ label: __("Clear Cache"), icon: "trash", action: () => { frappe.xcall("frappe.client.clear_cache"); frappe.show_alert(__("Cache cleared")); } },
			{ label: __("Reload Page"), icon: "refresh", action: () => location.reload() },
			{ label: __("Toggle Dark Mode"), icon: "moon", action: () => { document.documentElement.setAttribute("data-theme", frappe.visual?.isDarkMode?.() ? "light" : "dark"); } },
			{ label: __("Toggle Full Screen"), icon: "maximize", action: () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } },
			{ label: __("Background Jobs"), icon: "activity", action: () => frappe.set_route("List", "RQ Job") },
			{ label: __("Error Log"), icon: "alert-triangle", action: () => frappe.set_route("List", "Error Log") },
		];
		for (const a of actions) {
			this._commands.push({
				category: "action",
				label: a.label,
				description: __("Quick action"),
				icon: a.icon,
				action: a.action,
				keywords: `action ${a.label.toLowerCase()}`,
			});
		}
	}

	/** Allow external registration of commands */
	register(cmd) {
		this._commands.push({
			category: cmd.category || "action",
			label: cmd.label,
			description: cmd.description || "",
			icon: cmd.icon || "terminal",
			action: cmd.action,
			keywords: (cmd.keywords || cmd.label).toLowerCase(),
		});
	}

	/* ── Fuzzy Search ────────────────────────────────────────── */
	_search(q) {
		if (!q) {
			// Show recent + top frecency
			const sorted = [...this._commands].sort((a, b) => {
				const fa = this.frecency[a.label] || 0;
				const fb = this.frecency[b.label] || 0;
				const catA = PALETTE_CATEGORIES[a.category]?.order ?? 99;
				const catB = PALETTE_CATEGORIES[b.category]?.order ?? 99;
				if (a.category === "recent" && b.category !== "recent") return -1;
				if (b.category === "recent" && a.category !== "recent") return 1;
				if (fb !== fa) return fb - fa;
				return catA - catB;
			});
			return sorted.slice(0, this.opts.maxResults);
		}

		const terms = q.toLowerCase().split(/\s+/);
		const scored = [];

		for (const cmd of this._commands) {
			const hay = `${cmd.label} ${cmd.description} ${cmd.keywords}`.toLowerCase();
			let match = true;
			let score = 0;

			for (const term of terms) {
				const idx = hay.indexOf(term);
				if (idx === -1) { match = false; break; }
				// Bonus for earlier match
				score += (100 - idx);
				// Bonus for start-of-word match
				if (idx === 0 || hay[idx - 1] === " ") score += 50;
			}

			if (!match) continue;

			// Frecency bonus
			score += (this.frecency[cmd.label] || 0) * 10;

			scored.push({ cmd, score });
		}

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, this.opts.maxResults).map(s => s.cmd);
	}

	_highlightMatch(text, query) {
		if (!query) return this._esc(text);
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		let html = this._esc(text);
		for (const term of terms) {
			const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
			html = html.replace(re, `<mark class="fv-cp-match">$1</mark>`);
		}
		return html;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	/* ── Frecency ────────────────────────────────────────────── */
	_loadFrecency() {
		try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
		catch { return {}; }
	}

	_saveFrecency() {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.frecency)); }
		catch { /* quota */ }
	}

	_bumpFrecency(label) {
		// Decay all
		for (const k of Object.keys(this.frecency)) {
			this.frecency[k] *= FRECENCY_DECAY;
			if (this.frecency[k] < 0.01) delete this.frecency[k];
		}
		this.frecency[label] = (this.frecency[label] || 0) + 1;
		this._saveFrecency();
	}

	/* ── Render ──────────────────────────────────────────────── */
	_render() {
		this._overlay?.remove();

		const isRTL = document.documentElement.dir === "rtl";
		const theme = this.opts.theme;

		const overlay = document.createElement("div");
		overlay.className = `fv-cp-overlay fv-cp--${theme}`;
		overlay.setAttribute("dir", isRTL ? "rtl" : "ltr");

		overlay.innerHTML = `
			<div class="fv-cp-backdrop"></div>
			<div class="fv-cp-dialog" role="dialog" aria-label="${__("Command Palette")}">
				<div class="fv-cp-header">
					<span class="fv-cp-icon">${this._icon("search")}</span>
					<input class="fv-cp-input" type="text"
						placeholder="${this.opts.placeholder}"
						autocomplete="off" spellcheck="false" />
					<kbd class="fv-cp-kbd">ESC</kbd>
				</div>
				<div class="fv-cp-results"></div>
				<div class="fv-cp-footer">
					<span class="fv-cp-hint">
						<kbd>↑↓</kbd> ${__("navigate")} &nbsp;
						<kbd>↵</kbd> ${__("select")} &nbsp;
						<kbd>esc</kbd> ${__("close")}
					</span>
				</div>
			</div>
		`;

		document.body.appendChild(overlay);
		this._overlay = overlay;

		this._input = overlay.querySelector(".fv-cp-input");
		this._resultsEl = overlay.querySelector(".fv-cp-results");

		// Events
		overlay.querySelector(".fv-cp-backdrop").addEventListener("click", () => this.close());
		this._input.addEventListener("input", () => this._onInput());
		this._input.addEventListener("keydown", (e) => this._onKeydown(e));

		// Initial results
		this._updateResults();
	}

	_onInput() {
		this.query = this._input.value;
		this.activeIdx = 0;
		this._updateResults();
	}

	_onKeydown(e) {
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				this.activeIdx = Math.min(this.activeIdx + 1, this.results.length - 1);
				this._updateActive();
				break;
			case "ArrowUp":
				e.preventDefault();
				this.activeIdx = Math.max(this.activeIdx - 1, 0);
				this._updateActive();
				break;
			case "Enter":
				e.preventDefault();
				this._selectCurrent();
				break;
			case "Escape":
				e.preventDefault();
				this.close();
				break;
			case "Tab":
				e.preventDefault();
				// Tab cycles through categories
				this._cycleCategory(e.shiftKey ? -1 : 1);
				break;
		}
	}

	_updateResults() {
		this.results = this._search(this.query);
		if (!this._resultsEl) return;

		if (this.results.length === 0) {
			this._resultsEl.innerHTML = `
				<div class="fv-cp-empty">
					${this._icon("search-off")}
					<p>${__("No results found")}</p>
				</div>`;
			return;
		}

		// Group by category
		const groups = {};
		for (const r of this.results) {
			if (!groups[r.category]) groups[r.category] = [];
			groups[r.category].push(r);
		}

		const sortedCats = Object.keys(groups).sort((a, b) =>
			(PALETTE_CATEGORIES[a]?.order ?? 99) - (PALETTE_CATEGORIES[b]?.order ?? 99));

		let html = "";
		let globalIdx = 0;

		for (const cat of sortedCats) {
			const catInfo = PALETTE_CATEGORIES[cat] || { label: cat, icon: "folder" };
			html += `<div class="fv-cp-category">
				<div class="fv-cp-cat-label">
					${this._icon(catInfo.icon, 14)} ${catInfo.label}
				</div>`;

			for (const item of groups[cat]) {
				const active = globalIdx === this.activeIdx ? "fv-cp-item--active" : "";
				html += `<div class="fv-cp-item ${active}" data-idx="${globalIdx}"
					role="option" aria-selected="${globalIdx === this.activeIdx}">
					<span class="fv-cp-item-icon">${this._icon(item.icon, 18)}</span>
					<div class="fv-cp-item-text">
						<span class="fv-cp-item-label">${this._highlightMatch(item.label, this.query)}</span>
						${item.description ? `<span class="fv-cp-item-desc">${this._esc(item.description)}</span>` : ""}
					</div>
					<span class="fv-cp-item-shortcut"></span>
				</div>`;
				globalIdx++;
			}
			html += `</div>`;
		}

		this._resultsEl.innerHTML = html;

		// Click handlers
		this._resultsEl.querySelectorAll(".fv-cp-item").forEach(el => {
			el.addEventListener("click", () => {
				this.activeIdx = parseInt(el.dataset.idx);
				this._selectCurrent();
			});
			el.addEventListener("mouseenter", () => {
				this.activeIdx = parseInt(el.dataset.idx);
				this._updateActive();
			});
		});
	}

	_updateActive() {
		if (!this._resultsEl) return;
		this._resultsEl.querySelectorAll(".fv-cp-item").forEach((el, i) => {
			el.classList.toggle("fv-cp-item--active", i === this.activeIdx);
			el.setAttribute("aria-selected", i === this.activeIdx);
		});

		// Scroll into view
		const active = this._resultsEl.querySelector(".fv-cp-item--active");
		active?.scrollIntoView({ block: "nearest" });
	}

	_selectCurrent() {
		const item = this.results[this.activeIdx];
		if (!item) return;

		this._bumpFrecency(item.label);
		this.close();

		// Execute after close animation
		setTimeout(() => {
			if (typeof item.action === "function") item.action();
		}, 150);
	}

	_cycleCategory(dir) {
		if (this.results.length === 0) return;
		const currentCat = this.results[this.activeIdx]?.category;
		const cats = [...new Set(this.results.map(r => r.category))];
		const curIdx = cats.indexOf(currentCat);
		const nextCat = cats[(curIdx + dir + cats.length) % cats.length];
		const nextItem = this.results.findIndex(r => r.category === nextCat);
		if (nextItem >= 0) {
			this.activeIdx = nextItem;
			this._updateActive();
		}
	}

	/* ── Animation ───────────────────────────────────────────── */
	_animateIn() {
		const dialog = this._overlay?.querySelector(".fv-cp-dialog");
		const backdrop = this._overlay?.querySelector(".fv-cp-backdrop");
		if (!dialog) return;

		if (typeof gsap !== "undefined") {
			gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2 });
			gsap.fromTo(dialog,
				{ opacity: 0, y: -20, scale: 0.95 },
				{ opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "back.out(1.5)" });
		} else {
			dialog.style.opacity = "1";
		}
	}

	_animateOut(cb) {
		const dialog = this._overlay?.querySelector(".fv-cp-dialog");
		const backdrop = this._overlay?.querySelector(".fv-cp-backdrop");
		if (!dialog) { cb?.(); return; }

		if (typeof gsap !== "undefined") {
			gsap.to(backdrop, { opacity: 0, duration: 0.15 });
			gsap.to(dialog, { opacity: 0, y: -10, scale: 0.97, duration: 0.15, onComplete: cb });
		} else {
			cb?.();
		}
	}

	/* ── Global Shortcut ─────────────────────────────────────── */
	_bindGlobalShortcut() {
		document.addEventListener("keydown", (e) => {
			const isMod = e.metaKey || e.ctrlKey;
			if (isMod && e.key.toLowerCase() === this.opts.shortcut) {
				e.preventDefault();
				e.stopPropagation();
				this.toggle();
			}
		});
	}

	/* ── Icon Helper ─────────────────────────────────────────── */
	_icon(name, size = 16) {
		if (frappe.visual?.icons?.render) {
			return frappe.visual.icons.render(name, { size });
		}
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
			stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
		</svg>`;
	}

	/* ── Cleanup ─────────────────────────────────────────────── */
	destroy() {
		this.close();
		CommandPalette._instance = null;
	}
}
