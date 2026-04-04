// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Notification Center Pro
 * =========================================
 * Premium grouped notification panel replacing Frappe's default
 * notification dropdown. Categories, time grouping, mark read,
 * bulk actions, real-time updates, search, and priority badges.
 *
 * Features:
 *  - Slide-in panel (sidebar or dropdown)
 *  - Grouped by: Today / Yesterday / This Week / Older
 *  - Category tabs: All, Mentions, Assignments, Alerts, System
 *  - Mark read individually or bulk
 *  - Priority indicators (info/warning/critical)
 *  - Real-time via frappe.realtime
 *  - Search / filter within notifications
 *  - Action buttons per notification (View, Dismiss, Snooze)
 *  - Sound on new notification (optional)
 *  - Badge count on navbar icon
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.NotificationCenter.create(opts)
 *   frappe.visual.notifications()  // bootstrap shorthand
 *
 * @module frappe_visual/components/notification_center
 */

const NC_CATEGORIES = [
	{ key: "all",        label: __("All"),         icon: "bell" },
	{ key: "mention",    label: __("Mentions"),    icon: "at" },
	{ key: "assignment", label: __("Assignments"), icon: "user-check" },
	{ key: "alert",      label: __("Alerts"),      icon: "alert-triangle" },
	{ key: "energy",     label: __("Energy Points"), icon: "bolt" },
	{ key: "system",     label: __("System"),      icon: "settings" },
];

const PRIORITY_COLORS = {
	info:     "#6366F1",
	warning:  "#F59E0B",
	critical: "#EF4444",
};

export class NotificationCenter {
	constructor(opts = {}) {
		this.opts = Object.assign({
			theme: "glass",
			position: "end",       // end (right/left in RTL) | start
			width: 400,
			sound: false,
			maxItems: 100,
			autoRefreshInterval: 60000,
			onNotification: null,
		}, opts);

		this.isOpen = false;
		this.notifications = [];
		this.activeCategory = "all";
		this.searchQuery = "";
		this._panel = null;
		this._backdrop = null;
		this._unreadCount = 0;

		this._init();
	}

	static create(opts = {}) {
		if (NotificationCenter._instance) return NotificationCenter._instance;
		NotificationCenter._instance = new NotificationCenter(opts);
		return NotificationCenter._instance;
	}

	/* ── Initialize ──────────────────────────────────────────── */
	_init() {
		this._createNavbarIcon();
		this._bindRealtime();
		this._loadNotifications();

		// Auto refresh
		if (this.opts.autoRefreshInterval) {
			setInterval(() => this._loadNotifications(), this.opts.autoRefreshInterval);
		}
	}

	/* ── Navbar Icon ─────────────────────────────────────────── */
	_createNavbarIcon() {
		const existing = document.querySelector(".fv-nc-trigger");
		if (existing) existing.remove();

		const trigger = document.createElement("button");
		trigger.className = "fv-nc-trigger";
		trigger.setAttribute("aria-label", __("Notifications"));
		trigger.innerHTML = `
			${this._icon("bell", 20)}
			<span class="fv-nc-badge" style="display:none">0</span>`;
		trigger.addEventListener("click", () => this.toggle());

		// Insert into navbar
		const navbar = document.querySelector(".navbar-right") || document.querySelector(".navbar .container");
		if (navbar) navbar.prepend(trigger);

		this._triggerEl = trigger;
		this._badgeEl = trigger.querySelector(".fv-nc-badge");
	}

	_updateBadge() {
		if (!this._badgeEl) return;
		this._unreadCount = this.notifications.filter(n => !n.read).length;
		this._badgeEl.textContent = this._unreadCount > 99 ? "99+" : this._unreadCount;
		this._badgeEl.style.display = this._unreadCount > 0 ? "" : "none";

		// Animate bounce
		if (this._unreadCount > 0 && typeof gsap !== "undefined") {
			gsap.fromTo(this._badgeEl, { scale: 1.4 }, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" });
		}
	}

	/* ── Open / Close ────────────────────────────────────────── */
	open() {
		if (this.isOpen) return;
		this.isOpen = true;
		this._renderPanel();
		this._animateIn();
	}

	close() {
		if (!this.isOpen) return;
		this._animateOut(() => {
			this._panel?.remove();
			this._backdrop?.remove();
			this._panel = null;
			this._backdrop = null;
			this.isOpen = false;
		});
	}

	toggle() { this.isOpen ? this.close() : this.open(); }

	/* ── Render Panel ────────────────────────────────────────── */
	_renderPanel() {
		this._panel?.remove();
		this._backdrop?.remove();

		const isRTL = document.documentElement.dir === "rtl";
		const side = this.opts.position === "end" ? (isRTL ? "left" : "right") : (isRTL ? "right" : "left");

		// Backdrop
		this._backdrop = document.createElement("div");
		this._backdrop.className = "fv-nc-backdrop";
		this._backdrop.addEventListener("click", () => this.close());
		document.body.appendChild(this._backdrop);

		// Panel
		const panel = document.createElement("div");
		panel.className = `fv-nc-panel fv-nc--${this.opts.theme}`;
		panel.style.width = `${this.opts.width}px`;
		panel.style[side] = "0";
		panel.setAttribute("dir", isRTL ? "rtl" : "ltr");

		panel.innerHTML = `
			<div class="fv-nc-header">
				<h3 class="fv-nc-title">${__("Notifications")}</h3>
				<div class="fv-nc-header-actions">
					<button class="fv-nc-btn fv-nc-mark-all" title="${__("Mark all read")}">
						${this._icon("checks", 16)}
					</button>
					<button class="fv-nc-btn fv-nc-close" title="${__("Close")}">
						${this._icon("x", 16)}
					</button>
				</div>
			</div>
			<div class="fv-nc-search-wrap">
				<input class="fv-nc-search" type="text"
					placeholder="${__("Search notifications…")}" />
			</div>
			<div class="fv-nc-tabs">
				${NC_CATEGORIES.map(c => `
					<button class="fv-nc-tab ${c.key === this.activeCategory ? "fv-nc-tab--active" : ""}"
						data-cat="${c.key}">
						${this._icon(c.icon, 14)}
						<span>${c.label}</span>
						${c.key !== "all" ? `<span class="fv-nc-tab-count">${this._countForCategory(c.key)}</span>` : ""}
					</button>
				`).join("")}
			</div>
			<div class="fv-nc-body"></div>
		`;

		document.body.appendChild(panel);
		this._panel = panel;

		// Events
		panel.querySelector(".fv-nc-close").addEventListener("click", () => this.close());
		panel.querySelector(".fv-nc-mark-all").addEventListener("click", () => this.markAllRead());
		panel.querySelector(".fv-nc-search").addEventListener("input", (e) => {
			this.searchQuery = e.target.value;
			this._renderList();
		});
		panel.querySelectorAll(".fv-nc-tab").forEach(tab => {
			tab.addEventListener("click", () => {
				this.activeCategory = tab.dataset.cat;
				panel.querySelectorAll(".fv-nc-tab").forEach(t => t.classList.remove("fv-nc-tab--active"));
				tab.classList.add("fv-nc-tab--active");
				this._renderList();
			});
		});

		this._renderList();
	}

	_renderList() {
		const body = this._panel?.querySelector(".fv-nc-body");
		if (!body) return;

		let items = this._filterItems();

		if (items.length === 0) {
			body.innerHTML = `
				<div class="fv-nc-empty">
					${this._icon("bell-off", 40)}
					<p>${__("No notifications")}</p>
				</div>`;
			return;
		}

		// Group by time
		const groups = this._groupByTime(items);
		let html = "";

		for (const [label, groupItems] of Object.entries(groups)) {
			html += `<div class="fv-nc-group">
				<div class="fv-nc-group-label">${label}</div>`;

			for (const item of groupItems) {
				const prColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.info;
				const readClass = item.read ? "fv-nc-item--read" : "";
				html += `
					<div class="fv-nc-item ${readClass}" data-name="${item.name}">
						<div class="fv-nc-item-indicator" style="background:${prColor}"></div>
						<div class="fv-nc-item-body">
							<div class="fv-nc-item-header">
								<span class="fv-nc-item-from">${this._esc(item.from_user || item.type)}</span>
								<span class="fv-nc-item-time">${this._relativeTime(item.creation)}</span>
							</div>
							<div class="fv-nc-item-subject">${item.subject || ""}</div>
							${item.document_type && item.document_name ? `
								<div class="fv-nc-item-link">${item.document_type}: ${item.document_name}</div>
							` : ""}
						</div>
						<div class="fv-nc-item-actions">
							${item.document_type ? `<button class="fv-nc-item-btn fv-nc-view" title="${__("View")}">${this._icon("eye", 14)}</button>` : ""}
							<button class="fv-nc-item-btn fv-nc-dismiss" title="${__("Dismiss")}">${this._icon("x", 14)}</button>
						</div>
					</div>`;
			}
			html += `</div>`;
		}

		body.innerHTML = html;

		// Item events
		body.querySelectorAll(".fv-nc-item").forEach(el => {
			const name = el.dataset.name;
			el.querySelector(".fv-nc-view")?.addEventListener("click", (e) => {
				e.stopPropagation();
				const item = this.notifications.find(n => n.name === name);
				if (item?.document_type && item?.document_name) {
					this.close();
					frappe.set_route("Form", item.document_type, item.document_name);
				}
			});
			el.querySelector(".fv-nc-dismiss")?.addEventListener("click", (e) => {
				e.stopPropagation();
				this.dismiss(name);
			});
			el.addEventListener("click", () => this.markRead(name));
		});
	}

	_filterItems() {
		let items = [...this.notifications];
		if (this.activeCategory !== "all") {
			items = items.filter(n => this._categorize(n) === this.activeCategory);
		}
		if (this.searchQuery) {
			const q = this.searchQuery.toLowerCase();
			items = items.filter(n =>
				(n.subject || "").toLowerCase().includes(q) ||
				(n.from_user || "").toLowerCase().includes(q) ||
				(n.document_name || "").toLowerCase().includes(q)
			);
		}
		return items;
	}

	_categorize(n) {
		const t = (n.type || "").toLowerCase();
		if (t.includes("mention")) return "mention";
		if (t.includes("assignment") || t.includes("assign")) return "assignment";
		if (t.includes("alert") || n.priority === "critical") return "alert";
		if (t.includes("energy")) return "energy";
		if (t.includes("system")) return "system";
		return "system";
	}

	_countForCategory(cat) {
		return this.notifications.filter(n => !n.read && this._categorize(n) === cat).length;
	}

	_groupByTime(items) {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
		const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

		const groups = {};
		for (const item of items) {
			const d = new Date(item.creation);
			let label;
			if (d >= today) label = __("Today");
			else if (d >= yesterday) label = __("Yesterday");
			else if (d >= weekAgo) label = __("This Week");
			else label = __("Older");

			if (!groups[label]) groups[label] = [];
			groups[label].push(item);
		}
		return groups;
	}

	/* ── Actions ─────────────────────────────────────────────── */
	markRead(name) {
		const item = this.notifications.find(n => n.name === name);
		if (item && !item.read) {
			item.read = true;
			frappe.xcall("frappe.desk.doctype.notification_log.notification_log.mark_as_read", { docnames: JSON.stringify([name]) }).catch(() => {});
			this._renderList();
			this._updateBadge();
		}
	}

	markAllRead() {
		const unread = this.notifications.filter(n => !n.read).map(n => n.name);
		if (unread.length === 0) return;
		for (const n of this.notifications) n.read = true;
		frappe.xcall("frappe.desk.doctype.notification_log.notification_log.mark_as_read", { docnames: JSON.stringify(unread) }).catch(() => {});
		this._renderList();
		this._updateBadge();
	}

	dismiss(name) {
		this.notifications = this.notifications.filter(n => n.name !== name);
		this._renderList();
		this._updateBadge();
	}

	/* ── Data Loading ────────────────────────────────────────── */
	async _loadNotifications() {
		try {
			const result = await frappe.xcall("frappe.client.get_list", {
				doctype: "Notification Log",
				fields: ["name", "subject", "type", "document_type", "document_name",
					"from_user", "read", "creation"],
				filters: { for_user: frappe.session.user },
				order_by: "creation desc",
				limit_page_length: this.opts.maxItems,
			});
			this.notifications = (result || []).map(n => ({
				...n,
				read: !!n.read,
				priority: this._inferPriority(n),
			}));
			this._updateBadge();
			if (this.isOpen) this._renderList();
		} catch { /* silent */ }
	}

	_inferPriority(n) {
		const sub = (n.subject || "").toLowerCase();
		if (sub.includes("error") || sub.includes("fail") || sub.includes("critical")) return "critical";
		if (sub.includes("warn") || sub.includes("overdue") || sub.includes("urgent")) return "warning";
		return "info";
	}

	/* ── Real-time ───────────────────────────────────────────── */
	_bindRealtime() {
		if (!frappe.realtime) return;
		frappe.realtime.on("notification", (data) => {
			this.notifications.unshift({
				name: data.name || `rt_${Date.now()}`,
				subject: data.subject || data.message || "",
				type: data.type || "Alert",
				document_type: data.document_type,
				document_name: data.document_name,
				from_user: data.from_user || "",
				read: false,
				creation: new Date().toISOString(),
				priority: "info",
			});
			this._updateBadge();
			if (this.isOpen) this._renderList();
			if (this.opts.sound) this._playSound();
			if (this.opts.onNotification) this.opts.onNotification(data);
		});
	}

	_playSound() {
		try {
			const audio = new Audio("/assets/frappe/sounds/chat-notification.mp3");
			audio.volume = 0.3;
			audio.play().catch(() => {});
		} catch { /* no sound support */ }
	}

	/* ── Animation ───────────────────────────────────────────── */
	_animateIn() {
		if (typeof gsap !== "undefined" && this._panel) {
			gsap.fromTo(this._backdrop, { opacity: 0 }, { opacity: 1, duration: 0.2 });
			gsap.fromTo(this._panel,
				{ x: this.opts.position === "end" ? 100 : -100, opacity: 0 },
				{ x: 0, opacity: 1, duration: 0.3, ease: "power3.out" });
		}
	}

	_animateOut(cb) {
		if (typeof gsap !== "undefined" && this._panel) {
			gsap.to(this._backdrop, { opacity: 0, duration: 0.15 });
			gsap.to(this._panel,
				{ x: this.opts.position === "end" ? 100 : -100, opacity: 0, duration: 0.2, onComplete: cb });
		} else { cb?.(); }
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_relativeTime(dateStr) {
		if (!dateStr) return "";
		const d = new Date(dateStr);
		const now = new Date();
		const diff = (now - d) / 1000;
		if (diff < 60) return __("just now");
		if (diff < 3600) return `${Math.floor(diff / 60)}${__("m")}`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}${__("h")}`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}${__("d")}`;
		return d.toLocaleDateString();
	}

	_icon(name, size = 16) {
		if (frappe.visual?.icons?.render) return frappe.visual.icons.render(name, { size });
		return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
			stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
		</svg>`;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.close();
		this._triggerEl?.remove();
		NotificationCenter._instance = null;
	}
}
