/**
 * Frappe Visual — AuditTrail
 * ============================
 * Visual version history / audit trail timeline showing document changes,
 * user actions, field diffs, and version comparisons.
 * Integrates with Frappe's Version doctype for automatic history.
 *
 * Usage:
 *   frappe.visual.AuditTrail.create('#el', {
 *     doctype: 'Sales Order',
 *     docname: 'SO-00001',
 *   })
 *
 * @module frappe_visual/components/audit_trail
 */

const ACTION_ICONS = {
	Created:    { icon: "➕", color: "#10b981" },
	Updated:    { icon: "✏️", color: "#6366f1" },
	Submitted:  { icon: "✓",  color: "#f59e0b" },
	Cancelled:  { icon: "✕",  color: "#ef4444" },
	Amended:    { icon: "⟳",  color: "#0ea5e9" },
	Deleted:    { icon: "🗑",  color: "#ef4444" },
	Commented:  { icon: "💬", color: "#8b5cf6" },
	Assigned:   { icon: "👤", color: "#14b8a6" },
	Shared:     { icon: "🔗", color: "#64748b" },
	Attachment: { icon: "📎", color: "#a855f7" },
};

export class AuditTrail {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("AuditTrail: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctype: null,
			docname: null,
			entries: [],           // pre-loaded entries
			showDiffs: true,
			showComments: true,
			showAssignments: true,
			groupByDate: true,
			maxEntries: 100,
			onEntryClick: null,
		}, opts);

		this._entries = JSON.parse(JSON.stringify(this.opts.entries));
		this._filterAction = null;
		this._init();
	}

	static create(container, opts = {}) { return new AuditTrail(container, opts); }

	async _init() {
		this.container.classList.add("fv-at", `fv-at--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (this.opts.doctype && this.opts.docname && this._entries.length === 0) {
			await this._loadFromServer();
		}

		this._renderToolbar();
		this._renderTimeline();
	}

	async _loadFromServer() {
		try {
			// Load Versions
			const versions = await frappe.xcall("frappe.client.get_list", {
				doctype: "Version",
				filters: { ref_doctype: this.opts.doctype, docname: this.opts.docname },
				fields: ["name", "owner", "creation", "data"],
				order_by: "creation desc",
				limit_page_length: this.opts.maxEntries,
			});

			for (const v of (versions || [])) {
				let data = {};
				try { data = JSON.parse(v.data || "{}"); } catch (e) { /* skip */ }

				const changes = (data.changed || []).map(([field, old, new_]) => ({
					field, old: String(old ?? ""), new: String(new_ ?? ""),
				}));

				this._entries.push({
					id: v.name,
					action: changes.length > 0 ? "Updated" : "Created",
					user: v.owner,
					timestamp: v.creation,
					changes,
					added: data.added || [],
					removed: data.removed || [],
				});
			}

			// Load Comments if enabled
			if (this.opts.showComments) {
				const comments = await frappe.xcall("frappe.client.get_list", {
					doctype: "Comment",
					filters: {
						reference_doctype: this.opts.doctype,
						reference_name: this.opts.docname,
						comment_type: "Comment",
					},
					fields: ["name", "owner", "creation", "content"],
					order_by: "creation desc",
					limit_page_length: 50,
				});

				for (const c of (comments || [])) {
					this._entries.push({
						id: c.name,
						action: "Commented",
						user: c.owner,
						timestamp: c.creation,
						content: c.content,
						changes: [],
					});
				}
			}

			// Sort by timestamp descending
			this._entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
		} catch (e) {
			console.error("AuditTrail: load error", e);
		}
	}

	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-at-toolbar";

		bar.innerHTML = `
			<span class="fv-at-title">${__("Audit Trail")} ${this.opts.docname ? `— ${this._esc(this.opts.docname)}` : ""}</span>
			<div class="fv-at-filters">
				<button class="fv-at-filter-btn active" data-action="">${__("All")} (${this._entries.length})</button>
				${Object.entries(ACTION_ICONS).map(([a, cfg]) => {
					const count = this._entries.filter(e => e.action === a).length;
					return count > 0 ? `<button class="fv-at-filter-btn" data-action="${a}">
						${cfg.icon} ${__(a)} (${count})
					</button>` : "";
				}).join("")}
			</div>`;

		bar.querySelectorAll(".fv-at-filter-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				bar.querySelectorAll(".fv-at-filter-btn").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this._filterAction = btn.dataset.action || null;
				this._renderTimeline();
			});
		});

		this.container.appendChild(bar);
	}

	_renderTimeline() {
		if (this._timelineEl) this._timelineEl.remove();

		const timeline = document.createElement("div");
		timeline.className = "fv-at-timeline";
		this.container.appendChild(timeline);
		this._timelineEl = timeline;

		let entries = this._entries;
		if (this._filterAction) {
			entries = entries.filter(e => e.action === this._filterAction);
		}

		if (entries.length === 0) {
			timeline.innerHTML = `<div class="fv-at-empty">${__("No audit entries found")}</div>`;
			return;
		}

		let lastDate = "";

		for (const entry of entries) {
			const date = entry.timestamp ? entry.timestamp.split(" ")[0] : "";

			// Date separator
			if (this.opts.groupByDate && date !== lastDate) {
				const sep = document.createElement("div");
				sep.className = "fv-at-date-sep";
				sep.textContent = this._formatDate(date);
				timeline.appendChild(sep);
				lastDate = date;
			}

			timeline.appendChild(this._renderEntry(entry));
		}
	}

	_renderEntry(entry) {
		const cfg = ACTION_ICONS[entry.action] || ACTION_ICONS.Updated;
		const el = document.createElement("div");
		el.className = "fv-at-entry";

		let detailHtml = "";

		// Field changes
		if (this.opts.showDiffs && entry.changes && entry.changes.length > 0) {
			detailHtml += `<div class="fv-at-changes">`;
			for (const ch of entry.changes) {
				detailHtml += `<div class="fv-at-change">
					<span class="fv-at-change-field">${this._esc(ch.field)}</span>
					${ch.old ? `<span class="fv-at-change-old">${this._esc(this._truncate(ch.old, 60))}</span>` : ""}
					<span class="fv-at-change-arrow">→</span>
					<span class="fv-at-change-new">${this._esc(this._truncate(ch.new, 60))}</span>
				</div>`;
			}
			detailHtml += "</div>";
		}

		// Comment content
		if (entry.action === "Commented" && entry.content) {
			detailHtml += `<div class="fv-at-comment">${entry.content}</div>`;
		}

		// Added/removed rows
		if (entry.added && entry.added.length > 0) {
			detailHtml += `<div class="fv-at-rows-added">${entry.added.length} ${__("rows added")}</div>`;
		}
		if (entry.removed && entry.removed.length > 0) {
			detailHtml += `<div class="fv-at-rows-removed">${entry.removed.length} ${__("rows removed")}</div>`;
		}

		el.innerHTML = `
			<div class="fv-at-entry-icon" style="background:${cfg.color}">${cfg.icon}</div>
			<div class="fv-at-entry-body">
				<div class="fv-at-entry-header">
					<span class="fv-at-entry-action" style="color:${cfg.color}">${__(entry.action)}</span>
					<span class="fv-at-entry-user">${this._esc(entry.user || "")}</span>
					<span class="fv-at-entry-time">${this._formatTime(entry.timestamp)}</span>
				</div>
				${detailHtml}
			</div>`;

		if (this.opts.onEntryClick) {
			el.addEventListener("click", () => this.opts.onEntryClick(entry));
		}

		return el;
	}

	/* ── Public API ──────────────────────────────────────────── */
	setEntries(entries) { this._entries = JSON.parse(JSON.stringify(entries)); this._renderTimeline(); }
	addEntry(entry) { this._entries.unshift(entry); this._renderTimeline(); }
	getEntries() { return JSON.parse(JSON.stringify(this._entries)); }

	async refresh() {
		this._entries = [];
		await this._loadFromServer();
		this._renderTimeline();
	}

	/* ── Helpers ─────────────────────────────────────────────── */
	_formatDate(dateStr) {
		if (!dateStr) return "";
		try {
			return new Date(dateStr).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
		} catch { return dateStr; }
	}

	_formatTime(ts) {
		if (!ts) return "";
		try {
			const d = new Date(ts);
			return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
		} catch { return ts; }
	}

	_truncate(s, len) { return s && s.length > len ? s.slice(0, len) + "…" : s; }
	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-at", `fv-at--${this.opts.theme}`);
	}
}
