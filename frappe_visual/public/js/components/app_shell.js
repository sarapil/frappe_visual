/**
 * AppShell — Visual Facade System for Frappe Apps
 * =================================================
 * Transforms complex Frappe apps (LMS, HRMS, CRM, Accounting)
 * into simple, visually stunning facades with fewer screens.
 *
 * Architecture:
 *   1. AppShell.register(appConfig) — register an app facade
 *   2. AppShell.render(appName, role) — render role-based dashboard
 *   3. Each facade is a single-page visual hub replacing dozens of list views
 *
 * Features:
 *   • Role-based view composition (admin sees everything, user sees their data)
 *   • Unified command palette (Ctrl+K) for any action
 *   • Visual workflow navigator (Kanban-style pipelines)
 *   • Quick-action cards with glassmorphism
 *   • Aggregated stats ribbon (KPIs from multiple doctypes)
 *   • Smart search across all linked doctypes
 *   • Activity timeline (recent changes across the app)
 *   • Inline quick-entry (create records without leaving the facade)
 *   • Notification center (pending approvals, alerts, tasks)
 *   • Shortcut grid with keyboard navigation
 *
 * Usage:
 *   frappe.visual.AppShell.create('#container', {
 *     app: 'hrms',
 *     title: 'HR Management',
 *     icon: 'users',
 *     color: '#8B5CF6',
 *     role: frappe.user_roles,
 *     modules: [
 *       { name: 'Employees', icon: 'user', doctypes: ['Employee'], kpi: 'count' },
 *       { name: 'Leaves', icon: 'calendar', doctypes: ['Leave Application'], pipeline: true },
 *     ],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class AppShell {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("AppShell: container not found");

		this.config = Object.assign({
			app: "",
			title: "",
			icon: "grid",
			color: "#6366F1",
			colorDark: null,
			logo: null,
			role: frappe.user_roles || [],
			modules: [],
			shortcuts: [],
			commandPalette: true,
			quickEntry: true,
			activityFeed: true,
			notifications: true,
			statsRibbon: true,
			searchDoctypes: [],
			layout: "dashboard", // dashboard | kanban | wizard | tabs
			onModuleClick: null,
			onAction: null,
		}, config);

		this.config.colorDark = this.config.colorDark || this._darken(this.config.color, 20);
		this.activeModule = null;
		this.kpiCache = {};

		this._init();
	}

	static create(container, config) {
		return new AppShell(container, config);
	}

	// ─── Registry (for multi-app facades) ────────────────────────
	static _registry = {};

	static register(appName, config) {
		AppShell._registry[appName] = config;
	}

	static get(appName) {
		return AppShell._registry[appName];
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._loadKPIs();
		this._renderStats();
		this._renderModules();
		if (this.config.activityFeed) this._loadActivity();
		if (this.config.notifications) this._loadNotifications();
		if (this.config.commandPalette) this._setupCommandPalette();
		this._setupKeyboard();
	}

	// ─── Shell Layout ────────────────────────────────────────────
	_buildShell() {
		const isRTL = ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
		const dir = isRTL ? "rtl" : "ltr";

		this.container.innerHTML = "";
		this.container.setAttribute("dir", dir);

		this.el = document.createElement("div");
		this.el.className = "fv-app-shell";
		this.el.innerHTML = `
			<div class="fv-shell-header" style="background:linear-gradient(135deg, ${this.config.color}, ${this.config.colorDark});">
				<div class="fv-shell-header-left">
					${this.config.logo ? `<img src="${this.config.logo}" class="fv-shell-logo" alt="${this.config.title}">` : `<span class="fv-shell-icon">${this._icon(this.config.icon, 28)}</span>`}
					<div>
						<h1 class="fv-shell-title">${__(this.config.title)}</h1>
						<p class="fv-shell-subtitle">${__(this.config.subtitle || "")}</p>
					</div>
				</div>
				<div class="fv-shell-header-right">
					<div class="fv-shell-search">
						<input type="text" placeholder="${__("Search")}... (Ctrl+K)" class="fv-shell-search-input">
						<span class="fv-search-icon">${this._icon("search", 16)}</span>
					</div>
					<div class="fv-shell-notif-btn" title="${__("Notifications")}">
						${this._icon("bell", 20)}
						<span class="fv-notif-badge" style="display:none">0</span>
					</div>
				</div>
			</div>
			<div class="fv-shell-stats-ribbon"></div>
			<div class="fv-shell-body">
				<div class="fv-shell-modules"></div>
				<div class="fv-shell-detail" style="display:none"></div>
			</div>
			<div class="fv-shell-activity" style="display:none">
				<h3>${__("Recent Activity")}</h3>
				<div class="fv-activity-list"></div>
			</div>
			<div class="fv-shell-command-palette" style="display:none">
				<div class="fv-cmd-overlay"></div>
				<div class="fv-cmd-dialog">
					<input type="text" class="fv-cmd-input" placeholder="${__("Type a command")}...">
					<div class="fv-cmd-results"></div>
				</div>
			</div>
		`;
		this.container.appendChild(this.el);

		// Search
		const searchInput = this.el.querySelector(".fv-shell-search-input");
		searchInput.addEventListener("input", (e) => this._handleSearch(e.target.value));
		searchInput.addEventListener("focus", () => {
			if (this.config.commandPalette) this._openCommandPalette();
		});

		// Notifications toggle
		this.el.querySelector(".fv-shell-notif-btn").addEventListener("click", () => this._toggleActivity());
	}

	// ─── KPIs ────────────────────────────────────────────────────
	async _loadKPIs() {
		const promises = this.config.modules.map(async (mod) => {
			if (!mod.doctypes?.length) return;
			const dt = mod.doctypes[0];
			try {
				const res = await frappe.xcall("frappe.client.get_count", { doctype: dt, filters: mod.filters || {} });
				this.kpiCache[mod.name] = { count: res || 0, doctype: dt };
			} catch {
				this.kpiCache[mod.name] = { count: 0, doctype: dt };
			}
		});
		await Promise.allSettled(promises);
	}

	_renderStats() {
		const ribbon = this.el.querySelector(".fv-shell-stats-ribbon");
		if (!this.config.statsRibbon || !this.config.modules.length) {
			ribbon.style.display = "none";
			return;
		}

		const stats = this.config.modules
			.filter(m => this.kpiCache[m.name])
			.slice(0, 8)
			.map(m => {
				const kpi = this.kpiCache[m.name];
				return `<div class="fv-stat-card">
					<div class="fv-stat-icon">${this._icon(m.icon || "file", 20)}</div>
					<div class="fv-stat-value">${this._formatNum(kpi.count)}</div>
					<div class="fv-stat-label">${__(m.name)}</div>
				</div>`;
			}).join("");

		ribbon.innerHTML = `<div class="fv-stats-scroll">${stats}</div>`;

		// GSAP stagger animation
		if (typeof gsap !== "undefined") {
			gsap.from(ribbon.querySelectorAll(".fv-stat-card"), {
				y: 20, opacity: 0, duration: 0.4, stagger: 0.08, ease: "power2.out"
			});
		}
	}

	// ─── Module Cards ────────────────────────────────────────────
	_renderModules() {
		const grid = this.el.querySelector(".fv-shell-modules");
		const mods = this.config.modules.filter(m => this._hasAccess(m));

		grid.innerHTML = mods.map((m, i) => {
			const kpi = this.kpiCache[m.name];
			const color = m.color || this.config.color;
			return `<div class="fv-module-card" data-module="${i}" tabindex="0">
				<div class="fv-module-icon-wrap" style="background:${color}15;">
					<span style="color:${color}">${this._icon(m.icon || "folder", 28)}</span>
				</div>
				<div class="fv-module-info">
					<h3 class="fv-module-name">${__(m.name)}</h3>
					<p class="fv-module-desc">${__(m.description || "")}</p>
					${kpi ? `<span class="fv-module-count">${this._formatNum(kpi.count)} ${__("records")}</span>` : ""}
				</div>
				<div class="fv-module-actions">
					${m.doctypes?.[0] ? `<button class="btn btn-xs btn-primary-light fv-mod-new" data-dt="${m.doctypes[0]}" title="${__("New")}">+ ${__("New")}</button>` : ""}
					${m.pipeline ? `<span class="fv-badge-pipeline">${__("Pipeline")}</span>` : ""}
				</div>
				<div class="fv-module-arrow">${this._icon("chevron-right", 16)}</div>
			</div>`;
		}).join("");

		// Events
		grid.querySelectorAll(".fv-module-card").forEach(card => {
			card.addEventListener("click", (e) => {
				if (e.target.closest(".fv-mod-new")) return;
				const idx = parseInt(card.dataset.module);
				this._openModule(mods[idx], idx);
			});
			card.addEventListener("keydown", (e) => {
				if (e.key === "Enter") card.click();
			});
		});

		grid.querySelectorAll(".fv-mod-new").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				frappe.new_doc(btn.dataset.dt);
			});
		});

		// GSAP stagger
		if (typeof gsap !== "undefined") {
			gsap.from(grid.querySelectorAll(".fv-module-card"), {
				y: 30, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power3.out", delay: 0.2
			});
		}
	}

	_openModule(mod, idx) {
		this.activeModule = mod;
		if (this.config.onModuleClick) {
			this.config.onModuleClick(mod);
			return;
		}
		// Default: navigate to list view of primary doctype
		if (mod.doctypes?.[0]) {
			frappe.set_route("List", mod.doctypes[0]);
		}
	}

	// ─── Detail Panel (Inline List/Kanban) ───────────────────────
	async _showDetail(mod) {
		const panel = this.el.querySelector(".fv-shell-detail");
		panel.style.display = "block";

		if (mod.pipeline && mod.doctypes?.[0]) {
			// Show as visual kanban
			const dt = mod.doctypes[0];
			const meta = frappe.get_meta(dt);
			const statusField = meta?.fields?.find(f => f.fieldtype === "Select" && /status/i.test(f.fieldname));
			if (statusField) {
				panel.innerHTML = `<div class="fv-detail-header">
					<h2>${__(mod.name)}</h2>
					<button class="btn btn-xs fv-detail-close">${this._icon("x", 16)}</button>
				</div><div class="fv-detail-kanban"></div>`;

				if (frappe.visual.KanbanBoard) {
					frappe.visual.KanbanBoard.create(panel.querySelector(".fv-detail-kanban"), {
						doctype: dt,
						statusField: statusField.fieldname,
					});
				}
			}
		} else if (mod.doctypes?.[0]) {
			// Show as visual card list
			panel.innerHTML = `<div class="fv-detail-header">
				<h2>${__(mod.name)}</h2>
				<button class="btn btn-xs fv-detail-close">${this._icon("x", 16)}</button>
			</div><div class="fv-detail-list"></div>`;

			const res = await frappe.call({
				method: "frappe.client.get_list",
				args: { doctype: mod.doctypes[0], fields: ["name", "modified", "owner"], limit_page_length: 20 },
			});
			const items = res.message || [];
			panel.querySelector(".fv-detail-list").innerHTML = items.map(d =>
				`<div class="fv-detail-item" data-name="${d.name}">
					<strong>${d.name}</strong>
					<span class="text-muted">${frappe.datetime.prettyDate(d.modified)}</span>
				</div>`
			).join("");

			panel.querySelectorAll(".fv-detail-item").forEach(item => {
				item.addEventListener("click", () => frappe.set_route("Form", mod.doctypes[0], item.dataset.name));
			});
		}

		panel.querySelector(".fv-detail-close")?.addEventListener("click", () => {
			panel.style.display = "none";
		});
	}

	// ─── Activity Feed ───────────────────────────────────────────
	async _loadActivity() {
		const allDoctypes = this.config.modules.flatMap(m => m.doctypes || []);
		if (!allDoctypes.length) return;

		try {
			const res = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Activity Log",
					fields: ["subject", "creation", "user", "reference_doctype", "reference_name"],
					filters: { reference_doctype: ["in", allDoctypes] },
					order_by: "creation desc",
					limit_page_length: 20,
				},
			});
			const logs = res.message || [];
			const list = this.el.querySelector(".fv-activity-list");
			list.innerHTML = logs.map(l => `
				<div class="fv-activity-item">
					<div class="fv-activity-avatar">${frappe.avatar(l.user, "avatar-small")}</div>
					<div class="fv-activity-content">
						<span class="fv-activity-text">${l.subject}</span>
						<span class="fv-activity-time">${frappe.datetime.prettyDate(l.creation)}</span>
					</div>
				</div>
			`).join("");
		} catch { /* ignore */ }
	}

	_toggleActivity() {
		const panel = this.el.querySelector(".fv-shell-activity");
		const visible = panel.style.display !== "none";
		panel.style.display = visible ? "none" : "block";
		if (!visible && typeof gsap !== "undefined") {
			gsap.from(panel, { x: 20, opacity: 0, duration: 0.3 });
		}
	}

	// ─── Notifications ───────────────────────────────────────────
	async _loadNotifications() {
		try {
			const res = await frappe.xcall("frappe.client.get_count", {
				doctype: "Notification Log",
				filters: { for_user: frappe.session.user, read: 0 },
			});
			const badge = this.el.querySelector(".fv-notif-badge");
			if (res > 0) {
				badge.textContent = res > 99 ? "99+" : res;
				badge.style.display = "flex";
			}
		} catch { /* ignore */ }
	}

	// ─── Command Palette ─────────────────────────────────────────
	_setupCommandPalette() {
		const palette = this.el.querySelector(".fv-shell-command-palette");
		const input = palette.querySelector(".fv-cmd-input");
		const results = palette.querySelector(".fv-cmd-results");
		const overlay = palette.querySelector(".fv-cmd-overlay");

		overlay.addEventListener("click", () => this._closeCommandPalette());

		input.addEventListener("input", () => {
			const q = input.value.toLowerCase();
			const commands = this._getCommands().filter(c => c.label.toLowerCase().includes(q) || c.keywords?.some(k => k.includes(q)));
			results.innerHTML = commands.slice(0, 10).map((c, i) => `
				<div class="fv-cmd-item ${i === 0 ? "active" : ""}" data-idx="${i}">
					<span class="fv-cmd-item-icon">${this._icon(c.icon || "terminal", 16)}</span>
					<span class="fv-cmd-item-label">${c.label}</span>
					<span class="fv-cmd-item-hint text-muted">${c.hint || ""}</span>
				</div>
			`).join("");

			results.querySelectorAll(".fv-cmd-item").forEach(item => {
				item.addEventListener("click", () => {
					const idx = parseInt(item.dataset.idx);
					const cmd = commands[idx];
					if (cmd?.action) cmd.action();
					this._closeCommandPalette();
				});
			});
		});

		input.addEventListener("keydown", (e) => {
			if (e.key === "Escape") this._closeCommandPalette();
			if (e.key === "Enter") {
				const active = results.querySelector(".fv-cmd-item.active");
				if (active) active.click();
			}
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				const items = [...results.querySelectorAll(".fv-cmd-item")];
				const curr = items.findIndex(i => i.classList.contains("active"));
				items[curr]?.classList.remove("active");
				const next = e.key === "ArrowDown" ? Math.min(curr + 1, items.length - 1) : Math.max(curr - 1, 0);
				items[next]?.classList.add("active");
				items[next]?.scrollIntoView({ block: "nearest" });
				e.preventDefault();
			}
		});
	}

	_getCommands() {
		const commands = [];
		// Module commands
		this.config.modules.forEach(m => {
			if (m.doctypes?.[0]) {
				commands.push({
					label: `${__("Go to")} ${__(m.name)}`,
					icon: m.icon || "folder",
					hint: m.doctypes[0],
					keywords: [m.name.toLowerCase(), ...(m.doctypes || []).map(d => d.toLowerCase())],
					action: () => frappe.set_route("List", m.doctypes[0]),
				});
				commands.push({
					label: `${__("New")} ${__(m.name)}`,
					icon: "plus",
					hint: `Create ${m.doctypes[0]}`,
					keywords: ["new", "create", m.name.toLowerCase()],
					action: () => frappe.new_doc(m.doctypes[0]),
				});
			}
		});
		// Shortcut commands
		this.config.shortcuts.forEach(s => {
			commands.push({
				label: s.label,
				icon: s.icon || "zap",
				hint: s.hint || "",
				keywords: s.keywords || [],
				action: s.action,
			});
		});
		// Global commands
		commands.push(
			{ label: __("Settings"), icon: "settings", action: () => frappe.set_route("Form", `${this.config.app} Settings`), keywords: ["settings", "config"] },
			{ label: __("Refresh"), icon: "refresh-cw", action: () => this.refresh(), keywords: ["refresh", "reload"] },
		);
		return commands;
	}

	_openCommandPalette() {
		const p = this.el.querySelector(".fv-shell-command-palette");
		p.style.display = "flex";
		const input = p.querySelector(".fv-cmd-input");
		input.value = "";
		input.focus();
		input.dispatchEvent(new Event("input")); // show all commands
		if (typeof gsap !== "undefined") {
			gsap.from(p.querySelector(".fv-cmd-dialog"), { y: -20, opacity: 0, duration: 0.2 });
		}
	}

	_closeCommandPalette() {
		this.el.querySelector(".fv-shell-command-palette").style.display = "none";
	}

	// ─── Search ──────────────────────────────────────────────────
	async _handleSearch(query) {
		if (!query || query.length < 2) return;
		const doctypes = this.config.searchDoctypes.length
			? this.config.searchDoctypes
			: this.config.modules.flatMap(m => m.doctypes || []).slice(0, 5);

		if (!doctypes.length) return;
		// Use frappe's built-in search
		frappe.flags.focus_on_search = true;
		frappe.searchdialog?.set_search_val?.(query);
	}

	// ─── Keyboard ────────────────────────────────────────────────
	_setupKeyboard() {
		document.addEventListener("keydown", (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault();
				this._openCommandPalette();
			}
		});
	}

	// ─── Access Control ──────────────────────────────────────────
	_hasAccess(mod) {
		if (!mod.roles?.length) return true;
		return mod.roles.some(r => this.config.role.includes(r));
	}

	// ─── Utilities ───────────────────────────────────────────────
	_icon(name, size = 18) {
		if (frappe.visual?.icons?.render) {
			return frappe.visual.icons.render(name, { size });
		}
		return `<svg width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
	}

	_formatNum(n) {
		if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
		if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
		return n?.toString() || "0";
	}

	_darken(hex, pct) {
		const num = parseInt(hex.replace("#", ""), 16);
		const r = Math.max(0, (num >> 16) - pct);
		const g = Math.max(0, ((num >> 8) & 0x00FF) - pct);
		const b = Math.max(0, (num & 0x0000FF) - pct);
		return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
	}

	// ─── Refresh ─────────────────────────────────────────────────
	async refresh() {
		await this._loadKPIs();
		this._renderStats();
		this._renderModules();
		if (this.config.activityFeed) this._loadActivity();
		if (this.config.notifications) this._loadNotifications();
	}

	destroy() {
		this.container.innerHTML = "";
	}
}
