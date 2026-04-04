/**
 * Reactions — Emoji reactions on any element
 *
 * Adds a reaction bar to any element, supporting emoji selection,
 * animated reaction bubbles, and real-time sync. Each reaction shows
 * count and reacting users on hover.
 *
 * frappe.visual.Reactions.create({
 *   container: ".comment-card", id: "comment-123",
 *   emojis: ["👍", "❤️", "🎉", "😂", "🤔", "👀"]
 * })
 */
export class Reactions {
	static create(opts = {}) { return new Reactions(opts); }

	static DEFAULT_EMOJIS = ["👍", "❤️", "🎉", "😂", "🤔", "👀", "🚀", "💯"];

	constructor(opts) {
		this.opts = Object.assign({
			container: null, id: "", emojis: Reactions.DEFAULT_EMOJIS,
			maxDisplay: 6, animate: true, allowMultiple: false
		}, opts);
		this._reactions = new Map(); // emoji → Set of users
		this._currentUser = (typeof frappe !== "undefined" && frappe.session?.user) || "Guest";
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Toggle a reaction for the current user */
	toggle(emoji) {
		if (!this.opts.emojis.includes(emoji)) return;
		let users = this._reactions.get(emoji);
		if (!users) { users = new Set(); this._reactions.set(emoji, users); }
		if (users.has(this._currentUser)) {
			users.delete(this._currentUser);
			if (users.size === 0) this._reactions.delete(emoji);
		} else {
			if (!this.opts.allowMultiple) {
				// Remove user from other reactions
				this._reactions.forEach((set) => set.delete(this._currentUser));
			}
			users.add(this._currentUser);
		}
		this._render();
		if (this.opts.animate) this._animateBubble(emoji);
		this._broadcast();
	}

	/** Get reaction counts */
	get counts() {
		const result = {};
		this._reactions.forEach((users, emoji) => { result[emoji] = users.size; });
		return result;
	}

	/** Set reactions from external data */
	setReactions(data) {
		this._reactions.clear();
		if (data && typeof data === "object") {
			Object.entries(data).forEach(([emoji, users]) => {
				this._reactions.set(emoji, new Set(Array.isArray(users) ? users : [users]));
			});
		}
		this._render();
	}

	/** Check if current user reacted with specific emoji */
	hasReacted(emoji) {
		return this._reactions.get(emoji)?.has(this._currentUser) || false;
	}

	destroy() {
		this._el?.remove();
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.off("fv_reaction_update");
		}
	}

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;
		this._el = document.createElement("div");
		this._el.className = "fv-reactions";
		this._el.setAttribute("role", "group");
		this._el.setAttribute("aria-label", __("Reactions"));
		parent.appendChild(this._el);
		this._render();
		// Realtime
		if (typeof frappe !== "undefined" && frappe.realtime) {
			frappe.realtime.on("fv_reaction_update", (data) => {
				if (data.id === this.opts.id) this.setReactions(data.reactions);
			});
		}
	}

	_render() {
		if (!this._el) return;
		let html = '<div class="fv-reactions-list">';
		// Active reactions
		const sorted = Array.from(this._reactions.entries())
			.filter(([, users]) => users.size > 0)
			.sort((a, b) => b[1].size - a[1].size);
		sorted.slice(0, this.opts.maxDisplay).forEach(([emoji, users]) => {
			const mine = users.has(this._currentUser);
			html += `<button class="fv-reaction-btn${mine ? " fv-reaction--mine" : ""}"
				data-emoji="${emoji}" aria-label="${emoji} ${users.size}"
				aria-pressed="${mine}" title="${Array.from(users).join(", ")}">
				<span class="fv-reaction-emoji">${emoji}</span>
				<span class="fv-reaction-count">${users.size}</span>
			</button>`;
		});
		// Add reaction button
		html += `<button class="fv-reaction-add" aria-label="${__("Add reaction")}">
			<span class="fv-reaction-plus">+</span>
		</button>`;
		html += "</div>";
		// Emoji picker (hidden by default)
		html += `<div class="fv-reaction-picker" style="display:none">
			${this.opts.emojis.map(e =>
				`<button class="fv-reaction-pick" data-emoji="${e}" aria-label="${e}">${e}</button>`
			).join("")}
		</div>`;
		this._el.innerHTML = html;
		// Event binding
		this._el.querySelectorAll(".fv-reaction-btn").forEach(btn => {
			btn.addEventListener("click", () => this.toggle(btn.dataset.emoji));
		});
		this._el.querySelector(".fv-reaction-add")?.addEventListener("click", () => {
			const picker = this._el.querySelector(".fv-reaction-picker");
			picker.style.display = picker.style.display === "none" ? "flex" : "none";
		});
		this._el.querySelectorAll(".fv-reaction-pick").forEach(btn => {
			btn.addEventListener("click", () => {
				this.toggle(btn.dataset.emoji);
				this._el.querySelector(".fv-reaction-picker").style.display = "none";
			});
		});
	}

	_animateBubble(emoji) {
		const bubble = document.createElement("span");
		bubble.className = "fv-reaction-bubble";
		bubble.textContent = emoji;
		bubble.style.cssText = "position:absolute;font-size:24px;pointer-events:none;z-index:9999;";
		this._el.appendChild(bubble);
		const anim = bubble.animate([
			{ transform: "translateY(0) scale(1)", opacity: 1 },
			{ transform: "translateY(-40px) scale(1.3)", opacity: 0 }
		], { duration: 600, easing: "ease-out" });
		anim.onfinish = () => bubble.remove();
	}

	_broadcast() {
		if (typeof frappe !== "undefined" && frappe.publish_realtime) {
			const reactions = {};
			this._reactions.forEach((users, emoji) => { reactions[emoji] = Array.from(users); });
			frappe.publish_realtime("fv_reaction_update", { id: this.opts.id, reactions });
		}
	}
}
