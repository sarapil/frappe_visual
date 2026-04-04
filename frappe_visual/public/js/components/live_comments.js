/**
 * LiveComments — Real-time inline comments on any element
 *
 * Allows users to attach threaded comments to specific elements on a page.
 * Comments appear as floating bubbles and support replies, reactions,
 * and resolution. Integrates with frappe.realtime.
 *
 * frappe.visual.LiveComments.create({
 *   container: ".form-layout", doctype: "Sales Order", docname: "SO-001"
 * })
 */
export class LiveComments {
	static create(opts = {}) { return new LiveComments(opts); }

	constructor(opts) {
		this.opts = Object.assign({
			container: null, doctype: "", docname: "", commentable: "[data-fieldname]",
			position: "inline-end", maxVisible: 20
		}, opts);
		this._comments = [];
		this._activeThread = null;
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Add a comment to a target element */
	addComment(targetSelector, text, user) {
		const target = this._container?.querySelector(targetSelector);
		if (!target || !text) return null;
		const comment = {
			id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
			target: targetSelector, text, user: user || frappe.session?.user || "Guest",
			timestamp: Date.now(), replies: [], resolved: false
		};
		this._comments.push(comment);
		this._renderMarker(target, comment);
		this._broadcast("fv_comment_add", comment);
		return comment;
	}

	/** Reply to an existing comment */
	reply(commentId, text, user) {
		const comment = this._comments.find(c => c.id === commentId);
		if (!comment) return;
		const reply = {
			id: "r_" + Date.now(), text, user: user || frappe.session?.user || "Guest",
			timestamp: Date.now()
		};
		comment.replies.push(reply);
		this._renderThread(comment);
		this._broadcast("fv_comment_reply", { commentId, reply });
	}

	/** Resolve a comment thread */
	resolve(commentId) {
		const comment = this._comments.find(c => c.id === commentId);
		if (!comment) return;
		comment.resolved = true;
		const marker = this._container?.querySelector(`[data-fv-comment-id="${commentId}"]`);
		if (marker) marker.classList.add("fv-comment-resolved");
		this._broadcast("fv_comment_resolve", { commentId });
	}

	get comments() { return this._comments; }
	get unresolvedCount() { return this._comments.filter(c => !c.resolved).length; }

	destroy() {
		this._container?.querySelectorAll(".fv-comment-marker, .fv-comment-thread").forEach(el => el.remove());
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.off("fv_comment_add");
			frappe.realtime.off("fv_comment_reply");
			frappe.realtime.off("fv_comment_resolve");
		}
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		this._container = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!this._container) return;
		// Enable comment mode on commentable elements
		this._container.querySelectorAll(this.opts.commentable).forEach(el => {
			el.classList.add("fv-commentable");
			el.addEventListener("dblclick", (e) => this._onDoubleClick(e, el));
		});
		// Realtime listeners
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.on("fv_comment_add", (data) => {
				if (data.doctype === this.opts.doctype && data.docname === this.opts.docname) {
					if (!this._comments.find(c => c.id === data.id)) {
						this._comments.push(data);
						const target = this._container?.querySelector(data.target);
						if (target) this._renderMarker(target, data);
					}
				}
			});
		}
	}

	_onDoubleClick(e, el) {
		e.preventDefault();
		const selector = el.dataset.fieldname
			? `[data-fieldname="${el.dataset.fieldname}"]`
			: this._getSelector(el);
		this._showCommentInput(el, selector);
	}

	_showCommentInput(target, selector) {
		// Remove existing input
		this._container?.querySelector(".fv-comment-input-wrap")?.remove();
		const wrap = document.createElement("div");
		wrap.className = "fv-comment-input-wrap";
		wrap.innerHTML = `<div class="fv-comment-input">
			<textarea class="fv-ci-textarea" placeholder="${__("Add a comment...")}" rows="2"></textarea>
			<div class="fv-ci-actions">
				<button class="fv-ci-cancel">${__("Cancel")}</button>
				<button class="fv-ci-submit">${__("Comment")}</button>
			</div>
		</div>`;
		const textarea = wrap.querySelector(".fv-ci-textarea");
		wrap.querySelector(".fv-ci-cancel").addEventListener("click", () => wrap.remove());
		wrap.querySelector(".fv-ci-submit").addEventListener("click", () => {
			const text = textarea.value.trim();
			if (text) { this.addComment(selector, text); wrap.remove(); }
		});
		textarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				const text = textarea.value.trim();
				if (text) { this.addComment(selector, text); wrap.remove(); }
			}
			if (e.key === "Escape") wrap.remove();
		});
		target.style.position = target.style.position || "relative";
		target.appendChild(wrap);
		textarea.focus();
	}

	_renderMarker(target, comment) {
		target.style.position = target.style.position || "relative";
		const marker = document.createElement("div");
		marker.className = "fv-comment-marker" + (comment.resolved ? " fv-comment-resolved" : "");
		marker.dataset.fvCommentId = comment.id;
		marker.setAttribute("role", "button");
		marker.setAttribute("aria-label", __("Comment by {0}", [comment.user.split("@")[0]]));
		marker.innerHTML = `<span class="fv-cm-dot">💬</span>
			${comment.replies.length ? `<span class="fv-cm-count">${comment.replies.length + 1}</span>` : ""}`;
		marker.addEventListener("click", () => this._toggleThread(comment, marker));
		target.appendChild(marker);
	}

	_toggleThread(comment, marker) {
		const existing = this._container?.querySelector(`.fv-comment-thread[data-fv-thread="${comment.id}"]`);
		if (existing) { existing.remove(); this._activeThread = null; return; }
		this._activeThread = comment.id;
		this._renderThread(comment, marker);
	}

	_renderThread(comment, anchor) {
		const existing = this._container?.querySelector(`.fv-comment-thread[data-fv-thread="${comment.id}"]`);
		if (existing) existing.remove();
		anchor = anchor || this._container?.querySelector(`[data-fv-comment-id="${comment.id}"]`);
		if (!anchor) return;
		const thread = document.createElement("div");
		thread.className = "fv-comment-thread";
		thread.dataset.fvThread = comment.id;
		const allMsgs = [{ user: comment.user, text: comment.text, timestamp: comment.timestamp },
			...comment.replies];
		thread.innerHTML = `<div class="fv-ct-messages">${allMsgs.map(m =>
			`<div class="fv-ct-msg"><strong>${this._esc(m.user.split("@")[0])}</strong>
			<span class="fv-ct-time">${this._timeAgo(m.timestamp)}</span>
			<p>${this._esc(m.text)}</p></div>`).join("")}
		</div>
		<div class="fv-ct-reply">
			<input class="fv-ct-input" placeholder="${__("Reply...")}">
			${!comment.resolved ? `<button class="fv-ct-resolve">${__("Resolve")}</button>` : ""}
		</div>`;
		thread.querySelector(".fv-ct-input")?.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const text = e.target.value.trim();
				if (text) { this.reply(comment.id, text); e.target.value = ""; }
			}
		});
		thread.querySelector(".fv-ct-resolve")?.addEventListener("click", () => this.resolve(comment.id));
		anchor.parentElement?.appendChild(thread);
	}

	_broadcast(event, data) {
		if (typeof frappe !== "undefined" && frappe.publish_realtime) {
			frappe.publish_realtime(event, {
				...data, doctype: this.opts.doctype, docname: this.opts.docname
			});
		}
	}

	_getSelector(el) {
		if (el.id) return "#" + el.id;
		return el.tagName.toLowerCase() + (el.className ? "." + el.className.split(" ")[0] : "");
	}

	_timeAgo(ts) {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return __("just now");
		if (s < 3600) return __("{0}m ago", [Math.floor(s / 60)]);
		if (s < 86400) return __("{0}h ago", [Math.floor(s / 3600)]);
		return __("{0}d ago", [Math.floor(s / 86400)]);
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
