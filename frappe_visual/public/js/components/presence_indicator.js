/**
 * PresenceIndicator — Show who is currently viewing / editing a document
 *
 * Renders avatar dots with online/away/busy status, integrates with
 * frappe.realtime for live presence updates. Shows user list on hover.
 *
 * frappe.visual.PresenceIndicator.create({
 *   container: "#form-toolbar", doctype: "Sales Order", docname: "SO-001"
 * })
 */
export class PresenceIndicator {
	static create(opts = {}) { return new PresenceIndicator(opts); }

	static STATUS_COLORS = {
		online: "#22c55e", away: "#f59e0b", busy: "#ef4444", offline: "#94a3b8"
	};

	constructor(opts) {
		this.opts = Object.assign({
			container: null, doctype: "", docname: "", maxAvatars: 5,
			showTooltip: true, size: 28, heartbeatInterval: 15000
		}, opts);
		this._users = new Map();
		this._build();
		this._subscribe();
		this._heartbeat();
	}

	/* ── public ─────────────────────────────────────────────── */

	get viewers() { return Array.from(this._users.values()); }
	get count() { return this._users.size; }

	/** Manually add a user */
	addUser(user, status = "online") {
		this._users.set(user, {
			user, status, name: user.split("@")[0],
			avatar: this._getAvatar(user), lastSeen: Date.now()
		});
		this._render();
	}

	/** Remove a user */
	removeUser(user) { this._users.delete(user); this._render(); }

	destroy() {
		clearInterval(this._hbTimer);
		this._el?.remove();
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.off("fv_presence_join");
			frappe.realtime.off("fv_presence_leave");
			frappe.realtime.off("fv_presence_heartbeat");
		}
	}

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;
		this._el = document.createElement("div");
		this._el.className = "fv-presence";
		this._el.setAttribute("role", "status");
		this._el.setAttribute("aria-label", __("People viewing"));
		parent.appendChild(this._el);
	}

	_subscribe() {
		if (typeof frappe === "undefined" || !frappe.realtime) return;
		const room = `presence:${this.opts.doctype}:${this.opts.docname}`;
		frappe.realtime.on("fv_presence_join", (data) => {
			if (data.room === room && data.user !== frappe.session.user) {
				this.addUser(data.user, "online");
			}
		});
		frappe.realtime.on("fv_presence_leave", (data) => {
			if (data.room === room) this.removeUser(data.user);
		});
		frappe.realtime.on("fv_presence_heartbeat", (data) => {
			if (data.room === room && this._users.has(data.user)) {
				const u = this._users.get(data.user);
				u.lastSeen = Date.now();
				u.status = data.status || "online";
			}
		});
		// Announce self
		frappe.publish_realtime("fv_presence_join", { room, user: frappe.session.user });
	}

	_heartbeat() {
		this._hbTimer = setInterval(() => {
			// Prune stale users (no heartbeat in 45s)
			const now = Date.now();
			for (const [user, info] of this._users) {
				if (now - info.lastSeen > 45000) { this._users.delete(user); }
			}
			this._render();
			// Send heartbeat
			if (typeof frappe !== "undefined" && frappe.publish_realtime) {
				frappe.publish_realtime("fv_presence_heartbeat", {
					room: `presence:${this.opts.doctype}:${this.opts.docname}`,
					user: frappe.session?.user, status: "online"
				});
			}
		}, this.opts.heartbeatInterval);
	}

	_render() {
		if (!this._el) return;
		const users = this.viewers;
		if (!users.length) { this._el.innerHTML = ""; return; }
		const shown = users.slice(0, this.opts.maxAvatars);
		const extra = users.length - shown.length;
		let html = '<div class="fv-presence-stack">';
		shown.forEach((u, i) => {
			const color = PresenceIndicator.STATUS_COLORS[u.status] || "#94a3b8";
			html += `<div class="fv-presence-avatar" style="z-index:${10 - i}"
				title="${this._esc(u.name)} (${u.status})"
				aria-label="${this._esc(u.name)}">
				<img src="${this._esc(u.avatar)}" alt="" width="${this.opts.size}" height="${this.opts.size}">
				<span class="fv-presence-dot" style="background:${color}"></span>
			</div>`;
		});
		if (extra > 0) {
			html += `<div class="fv-presence-extra" title="${__("{0} more", [extra])}">+${extra}</div>`;
		}
		html += "</div>";
		if (this.opts.showTooltip) {
			html += `<span class="fv-presence-count">${users.length} ${__("viewing")}</span>`;
		}
		this._el.innerHTML = html;
	}

	_getAvatar(user) {
		if (typeof frappe !== "undefined" && frappe.get_avatar) return frappe.get_avatar(user);
		return `https://ui-avatars.com/api/?name=${encodeURIComponent(user)}&size=${this.opts.size * 2}&background=6366f1&color=fff`;
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
