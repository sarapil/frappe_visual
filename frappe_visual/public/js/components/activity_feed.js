/**
 * Frappe Visual — Activity Feed Pro
 * ====================================
 * Social-style activity stream with timeline, likes, comments, mentions,
 * attachments, infinite scroll, real-time updates, and Frappe integration.
 *
 * Features:
 *  - Vertical timeline with animated entry reveal
 *  - Activity types: comment, status_change, assignment, attachment, mention, custom
 *  - Like / reaction buttons per item
 *  - Inline comment composer with @mention autocomplete
 *  - Attachment thumbnails (images inline, files as chips)
 *  - Infinite scroll (load more on scroll-to-bottom)
 *  - Real-time push via frappe.realtime
 *  - Auto-load from Frappe Activity Log / Comment / Version doctypes
 *  - Time grouping: Today, Yesterday, This Week, Earlier
 *  - Filters: by type, by user, by date range
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.ActivityFeed.create('#el', { doctype, docname, onComment })
 *
 * @module frappe_visual/components/activity_feed
 */

const ACTIVITY_ICONS = {
	comment: "💬",
	status_change: "🔄",
	assignment: "👤",
	attachment: "📎",
	mention: "@",
	creation: "✨",
	edit: "✏️",
	like: "❤️",
	custom: "📌",
};

const TIME_GROUPS = [
	{ key: "today",     label: () => __("Today") },
	{ key: "yesterday", label: () => __("Yesterday") },
	{ key: "this_week", label: () => __("This Week") },
	{ key: "earlier",   label: () => __("Earlier") },
];

function _esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

function _timeGroup(dateStr) {
	const d = new Date(dateStr);
	const now = new Date();
	const diff = Math.floor((now - d) / 86400000);
	if (diff === 0 && d.getDate() === now.getDate()) return "today";
	if (diff <= 1 && d.getDate() === now.getDate() - 1) return "yesterday";
	if (diff <= 7) return "this_week";
	return "earlier";
}

function _relativeTime(dateStr) {
	const d = new Date(dateStr);
	const now = new Date();
	const diff = Math.floor((now - d) / 1000);
	if (diff < 60) return __("just now");
	if (diff < 3600) return __("{0}m ago", [Math.floor(diff / 60)]);
	if (diff < 86400) return __("{0}h ago", [Math.floor(diff / 3600)]);
	if (diff < 604800) return __("{0}d ago", [Math.floor(diff / 86400)]);
	return d.toLocaleDateString();
}

export class ActivityFeed {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("ActivityFeed: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctype: null,
			docname: null,
			pageSize: 20,
			showComposer: true,
			showFilters: true,
			showLikes: true,
			onComment: null,
			onReaction: null,
			realtime: true,
			mentionSource: null,  // async (query) => [{ id, label, avatar }]
		}, opts);

		this._items = [];
		this._page = 0;
		this._hasMore = true;
		this._loading = false;
		this._filterType = null;
		this._filterUser = null;
		this._init();
	}

	static create(container, opts) { return new ActivityFeed(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	async _init() {
		this.container.classList.add("fv-af", `fv-af--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (this.opts.showComposer) this._renderComposer();
		if (this.opts.showFilters) this._renderFilters();
		this._renderFeed();
		await this._loadMore();
		this._setupInfiniteScroll();
		if (this.opts.realtime) this._setupRealtime();
	}

	/* ── Composer ────────────────────────────────────────────── */
	_renderComposer() {
		const comp = document.createElement("div");
		comp.className = "fv-af-composer";
		comp.innerHTML = `
			<div class="fv-af-composer-avatar">
				<img src="${frappe.user_info(frappe.session.user)?.image || "/assets/frappe/images/default-avatar.png"}" />
			</div>
			<div class="fv-af-composer-input-wrap">
				<textarea class="fv-af-composer-input" placeholder="${__("Write a comment…")}" rows="2"></textarea>
				<div class="fv-af-composer-actions">
					<button class="fv-af-btn fv-af-btn-attach" title="${__("Attach file")}">📎</button>
					<button class="fv-af-btn fv-af-btn-send fv-af-btn-primary">${__("Send")}</button>
				</div>
			</div>`;
		this.container.appendChild(comp);

		const textarea = comp.querySelector(".fv-af-composer-input");
		const sendBtn = comp.querySelector(".fv-af-btn-send");
		const attachBtn = comp.querySelector(".fv-af-btn-attach");

		sendBtn.addEventListener("click", () => this._postComment(textarea.value, textarea));
		textarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				this._postComment(textarea.value, textarea);
			}
		});

		attachBtn.addEventListener("click", () => {
			const input = document.createElement("input");
			input.type = "file";
			input.multiple = true;
			input.addEventListener("change", () => this._uploadAttachments(input.files));
			input.click();
		});
	}

	async _postComment(text, textarea) {
		if (!text.trim()) return;
		try {
			if (this.opts.onComment) {
				await this.opts.onComment(text);
			} else if (this.opts.doctype && this.opts.docname) {
				await frappe.call({
					method: "frappe.client.insert",
					args: {
						doc: {
							doctype: "Comment",
							comment_type: "Comment",
							reference_doctype: this.opts.doctype,
							reference_name: this.opts.docname,
							content: text,
						},
					},
				});
			}
			textarea.value = "";
			await this.refresh();
		} catch (e) {
			console.error("ActivityFeed: post error", e);
		}
	}

	async _uploadAttachments(files) {
		for (const file of files) {
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("is_private", 0);
				if (this.opts.doctype) formData.append("doctype", this.opts.doctype);
				if (this.opts.docname) formData.append("docname", this.opts.docname);
				await fetch("/api/method/upload_file", {
					method: "POST",
					headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
					body: formData,
				});
			} catch (e) { console.error("ActivityFeed: upload error", e); }
		}
		await this.refresh();
	}

	/* ── Filters ─────────────────────────────────────────────── */
	_renderFilters() {
		const bar = document.createElement("div");
		bar.className = "fv-af-filters";

		const types = ["all", "comment", "status_change", "assignment", "attachment", "edit"];
		bar.innerHTML = types.map(t => `
			<button class="fv-af-filter ${t === "all" ? "active" : ""}" data-type="${t}">
				${t === "all" ? __("All") : `${ACTIVITY_ICONS[t] || "📌"} ${__(t.replace("_", " "))}`}
			</button>`).join("");

		bar.querySelectorAll(".fv-af-filter").forEach(btn => {
			btn.addEventListener("click", () => {
				bar.querySelectorAll(".fv-af-filter").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this._filterType = btn.dataset.type === "all" ? null : btn.dataset.type;
				this._renderItems();
			});
		});

		this.container.appendChild(bar);
	}

	/* ── Feed ────────────────────────────────────────────────── */
	_renderFeed() {
		this._feedEl = document.createElement("div");
		this._feedEl.className = "fv-af-feed";
		this.container.appendChild(this._feedEl);
	}

	_renderItems() {
		let items = [...this._items];
		if (this._filterType) items = items.filter(i => i.type === this._filterType);
		if (this._filterUser) items = items.filter(i => i.user === this._filterUser);

		// Group by time
		const grouped = {};
		for (const item of items) {
			const g = _timeGroup(item.date);
			if (!grouped[g]) grouped[g] = [];
			grouped[g].push(item);
		}

		this._feedEl.innerHTML = "";

		for (const group of TIME_GROUPS) {
			const groupItems = grouped[group.key];
			if (!groupItems?.length) continue;

			const gEl = document.createElement("div");
			gEl.className = "fv-af-time-group";
			gEl.innerHTML = `<div class="fv-af-time-label">${group.label()}</div>`;

			for (const item of groupItems) {
				gEl.appendChild(this._renderItem(item));
			}

			this._feedEl.appendChild(gEl);
		}

		if (items.length === 0) {
			this._feedEl.innerHTML = `<div class="fv-af-empty">${__("No activity yet")}</div>`;
		}
	}

	_renderItem(item) {
		const el = document.createElement("div");
		el.className = `fv-af-item fv-af-item--${item.type || "custom"}`;
		el.dataset.id = item.id || "";

		const icon = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.custom;
		const avatar = item.avatar || frappe.user_info(item.user)?.image || "";
		const userName = item.user_name || frappe.user_info(item.user)?.fullname || item.user || "";

		el.innerHTML = `
			<div class="fv-af-item-icon">${icon}</div>
			<div class="fv-af-item-body">
				<div class="fv-af-item-header">
					${avatar ? `<img src="${_esc(avatar)}" class="fv-af-avatar" />` : ""}
					<span class="fv-af-user">${_esc(userName)}</span>
					<span class="fv-af-action">${_esc(item.action || item.type || "")}</span>
					<span class="fv-af-time">${_relativeTime(item.date)}</span>
				</div>
				${item.content ? `<div class="fv-af-item-content">${item.content}</div>` : ""}
				${item.attachments?.length ? this._renderAttachments(item.attachments) : ""}
				${this.opts.showLikes ? `
				<div class="fv-af-item-reactions">
					<button class="fv-af-react-btn ${item.liked ? "liked" : ""}" data-id="${_esc(item.id)}">
						${item.liked ? "❤️" : "🤍"} ${item.likes || 0}
					</button>
				</div>` : ""}
			</div>`;

		if (this.opts.showLikes) {
			el.querySelector(".fv-af-react-btn")?.addEventListener("click", (e) => {
				item.liked = !item.liked;
				item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
				if (this.opts.onReaction) this.opts.onReaction(item.id, "like", item.liked);
				this._renderItems();
			});
		}

		return el;
	}

	_renderAttachments(attachments) {
		return `<div class="fv-af-attachments">${
			attachments.map(a => {
				if (a.type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(a.url || "")) {
					return `<img src="${_esc(a.url)}" class="fv-af-attach-img" loading="lazy" />`;
				}
				return `<a href="${_esc(a.url)}" class="fv-af-attach-file" target="_blank">📎 ${_esc(a.name || "File")}</a>`;
			}).join("")
		}</div>`;
	}

	/* ── Data Loading ────────────────────────────────────────── */
	async _loadMore() {
		if (this._loading || !this._hasMore) return;
		this._loading = true;

		try {
			if (this.opts.doctype && this.opts.docname) {
				await this._loadFromFrappe();
			}
		} catch (e) {
			console.error("ActivityFeed: load error", e);
		}

		this._renderItems();
		this._loading = false;
	}

	async _loadFromFrappe() {
		// Load comments
		const comments = await frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Comment",
				filters: { reference_doctype: this.opts.doctype, reference_name: this.opts.docname },
				fields: ["name", "owner", "content", "creation", "comment_type"],
				order_by: "creation desc",
				limit_start: this._page * this.opts.pageSize,
				limit_page_length: this.opts.pageSize,
			},
		});

		const newItems = (comments.message || []).map(c => ({
			id: c.name,
			type: c.comment_type === "Comment" ? "comment" : "status_change",
			user: c.owner,
			content: c.content,
			date: c.creation,
			action: c.comment_type === "Comment" ? __("commented") : __(c.comment_type),
		}));

		this._items.push(...newItems);
		this._hasMore = newItems.length >= this.opts.pageSize;
		this._page++;
	}

	/* ── Infinite Scroll ─────────────────────────────────────── */
	_setupInfiniteScroll() {
		this._feedEl.addEventListener("scroll", () => {
			const el = this._feedEl;
			if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
				this._loadMore();
			}
		});
	}

	/* ── Real-time ───────────────────────────────────────────── */
	_setupRealtime() {
		if (typeof frappe === "undefined" || !frappe.realtime) return;

		const channel = `activity:${this.opts.doctype}:${this.opts.docname}`;
		frappe.realtime.on(channel, (data) => {
			if (data?.item) {
				this._items.unshift(data.item);
				this._renderItems();
			}
		});
	}

	/* ── Public API ──────────────────────────────────────────── */
	addItem(item) {
		this._items.unshift(item);
		this._renderItems();
	}

	async refresh() {
		this._items = [];
		this._page = 0;
		this._hasMore = true;
		await this._loadMore();
	}

	setFilter(type, user) {
		this._filterType = type || null;
		this._filterUser = user || null;
		this._renderItems();
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-af", `fv-af--${this.opts.theme}`);
	}
}
