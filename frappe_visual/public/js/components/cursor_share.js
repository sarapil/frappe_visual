/**
 * CursorShare — Show other users' cursors in real-time on shared documents
 *
 * Renders coloured cursor markers with user names that follow other users'
 * mouse positions. Integrates with frappe.realtime for live updates.
 *
 * frappe.visual.CursorShare.create({
 *   container: ".form-layout", room: "SO-001"
 * })
 */
export class CursorShare {
	static create(opts = {}) { return new CursorShare(opts); }

	static CURSOR_COLORS = [
		"#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
		"#ef4444", "#06b6d4", "#22c55e", "#e11d48", "#0ea5e9"
	];

	constructor(opts) {
		this.opts = Object.assign({
			container: null, room: "", throttleMs: 50, fadeAfterMs: 5000,
			showName: true, cursorSize: 18
		}, opts);
		this._cursors = new Map();
		this._colorIndex = 0;
		this._lastSend = 0;
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Start sharing cursor position */
	start() { this._container?.addEventListener("mousemove", this._moveHandler); }

	/** Stop sharing cursor position */
	stop() { this._container?.removeEventListener("mousemove", this._moveHandler); }

	/** Get all active cursors */
	get activeCursors() { return Array.from(this._cursors.keys()); }

	destroy() {
		this.stop();
		this._cursors.forEach(c => c.el?.remove());
		this._cursors.clear();
		clearInterval(this._fadeTimer);
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.off("fv_cursor_move");
			frappe.realtime.off("fv_cursor_leave");
		}
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		this._container = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!this._container) return;
		this._container.style.position = this._container.style.position || "relative";

		this._moveHandler = (e) => this._onMove(e);
		this.start();

		// Listen for other users' cursor updates
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.on("fv_cursor_move", (data) => {
				if (data.room === this.opts.room && data.user !== frappe.session?.user) {
					this._updateCursor(data.user, data.x, data.y);
				}
			});
			frappe.realtime.on("fv_cursor_leave", (data) => {
				if (data.room === this.opts.room) this._removeCursor(data.user);
			});
		}

		// Fade timer
		this._fadeTimer = setInterval(() => this._checkFade(), 1000);
	}

	_onMove(e) {
		const now = Date.now();
		if (now - this._lastSend < this.opts.throttleMs) return;
		this._lastSend = now;
		const rect = this._container.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
		const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
		if (typeof frappe !== "undefined" && frappe.publish_realtime) {
			frappe.publish_realtime("fv_cursor_move", {
				room: this.opts.room, user: frappe.session?.user, x, y
			});
		}
	}

	_updateCursor(user, xPct, yPct) {
		let cursor = this._cursors.get(user);
		if (!cursor) {
			cursor = this._createCursor(user);
			this._cursors.set(user, cursor);
		}
		cursor.lastUpdate = Date.now();
		cursor.el.style.opacity = "1";
		cursor.el.style.left = xPct + "%";
		cursor.el.style.top = yPct + "%";
	}

	_createCursor(user) {
		const color = CursorShare.CURSOR_COLORS[this._colorIndex++ % CursorShare.CURSOR_COLORS.length];
		const el = document.createElement("div");
		el.className = "fv-cursor-share";
		el.style.cssText = `position:absolute;pointer-events:none;z-index:9999;
			transition:left .08s linear,top .08s linear,opacity .3s;`;

		// SVG cursor arrow
		const size = this.opts.cursorSize;
		el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
			<path d="M5 3l14 8-6.5 2L9 19.5z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
		</svg>
		${this.opts.showName ? `<span class="fv-cursor-name" style="background:${color};
			color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;
			white-space:nowrap;margin-inline-start:${size - 4}px;margin-top:-4px;
			position:absolute;top:${size}px;left:0">${this._esc(user.split("@")[0])}</span>` : ""}`;

		this._container.appendChild(el);
		return { el, color, lastUpdate: Date.now() };
	}

	_removeCursor(user) {
		const cursor = this._cursors.get(user);
		if (cursor) { cursor.el.remove(); this._cursors.delete(user); }
	}

	_checkFade() {
		const now = Date.now();
		this._cursors.forEach((cursor, user) => {
			if (now - cursor.lastUpdate > this.opts.fadeAfterMs) {
				cursor.el.style.opacity = "0";
				setTimeout(() => this._removeCursor(user), 300);
			}
		});
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
