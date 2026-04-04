/**
 * MentionPopup — @mention autocomplete popup for users, roles, and groups
 *
 * Attaches to a textarea/input and shows a filtered dropdown when the user
 * types @. Supports searching by name, email, role, or custom entities.
 *
 * frappe.visual.MentionPopup.create({
 *   input: "textarea.comment-input", sources: ["users", "roles"]
 * })
 */
export class MentionPopup {
	static create(opts = {}) { return new MentionPopup(opts); }

	constructor(opts) {
		this.opts = Object.assign({
			input: null, trigger: "@", sources: ["users"],
			maxResults: 8, minChars: 0, onSelect: null,
			insertFormat: "@{name}", customSources: []
		}, opts);
		this._items = [];
		this._filtered = [];
		this._index = 0;
		this._open = false;
		this._query = "";
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Manually close the popup */
	close() { this._hide(); }

	/** Refresh available items */
	async refresh() { this._items = await this._loadSources(); }

	destroy() {
		this._input?.removeEventListener("input", this._inputHandler);
		this._input?.removeEventListener("keydown", this._keyHandler);
		this._popup?.remove();
		document.removeEventListener("click", this._outsideHandler);
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		this._input = typeof this.opts.input === "string"
			? document.querySelector(this.opts.input) : this.opts.input;
		if (!this._input) return;

		// Create popup element
		this._popup = document.createElement("div");
		this._popup.className = "fv-mention-popup";
		this._popup.setAttribute("role", "listbox");
		this._popup.style.display = "none";
		document.body.appendChild(this._popup);

		// Event handlers
		this._inputHandler = () => this._onInput();
		this._keyHandler = (e) => this._onKey(e);
		this._outsideHandler = (e) => {
			if (!this._popup.contains(e.target) && e.target !== this._input) this._hide();
		};
		this._input.addEventListener("input", this._inputHandler);
		this._input.addEventListener("keydown", this._keyHandler);
		document.addEventListener("click", this._outsideHandler);

		// Pre-load sources
		this.refresh();
	}

	async _loadSources() {
		let items = [];
		for (const source of this.opts.sources) {
			if (source === "users") items = items.concat(await this._loadUsers());
			else if (source === "roles") items = items.concat(await this._loadRoles());
		}
		for (const custom of this.opts.customSources) {
			if (typeof custom.load === "function") {
				const result = await custom.load();
				items = items.concat(result.map(r => ({ ...r, type: custom.type || "custom" })));
			}
		}
		return items;
	}

	async _loadUsers() {
		if (typeof frappe === "undefined" || !frappe.xcall) return [];
		try {
			const users = await frappe.xcall("frappe.client.get_list", {
				doctype: "User", filters: { enabled: 1, user_type: "System User" },
				fields: ["name", "full_name", "user_image"], limit_page_length: 100
			});
			return (users || []).map(u => ({
				id: u.name, name: u.full_name || u.name, email: u.name,
				avatar: u.user_image, type: "user"
			}));
		} catch { return []; }
	}

	async _loadRoles() {
		if (typeof frappe === "undefined" || !frappe.xcall) return [];
		try {
			const roles = await frappe.xcall("frappe.client.get_list", {
				doctype: "Role", filters: { disabled: 0 },
				fields: ["name"], limit_page_length: 50
			});
			return (roles || []).map(r => ({
				id: r.name, name: r.name, type: "role", icon: "👥"
			}));
		} catch { return []; }
	}

	_onInput() {
		const val = this._input.value || "";
		const pos = this._input.selectionStart || 0;
		// Find trigger character
		const before = val.substring(0, pos);
		const triggerIdx = before.lastIndexOf(this.opts.trigger);
		if (triggerIdx === -1 || (triggerIdx > 0 && before[triggerIdx - 1] !== " " && before[triggerIdx - 1] !== "\n")) {
			this._hide();
			return;
		}
		this._query = before.substring(triggerIdx + this.opts.trigger.length).toLowerCase();
		if (this._query.includes(" ")) { this._hide(); return; }
		if (this._query.length < this.opts.minChars && this._query.length > 0) return;
		this._filter();
		if (this._filtered.length) this._show(); else this._hide();
	}

	_filter() {
		const q = this._query;
		this._filtered = this._items
			.filter(item => {
				const name = (item.name || "").toLowerCase();
				const email = (item.email || "").toLowerCase();
				return name.includes(q) || email.includes(q);
			})
			.slice(0, this.opts.maxResults);
		this._index = 0;
	}

	_show() {
		this._open = true;
		this._popup.style.display = "block";
		this._position();
		this._renderList();
	}

	_hide() {
		this._open = false;
		this._popup.style.display = "none";
	}

	_position() {
		const rect = this._input.getBoundingClientRect();
		const lineHeight = parseInt(getComputedStyle(this._input).lineHeight) || 20;
		Object.assign(this._popup.style, {
			position: "fixed", left: rect.left + "px",
			top: (rect.top + lineHeight + 4) + "px",
			zIndex: "99999", minWidth: "240px", maxWidth: "360px"
		});
	}

	_renderList() {
		this._popup.innerHTML = this._filtered.map((item, i) => {
			const active = i === this._index ? " fv-mention--active" : "";
			const avatar = item.avatar
				? `<img src="${item.avatar}" alt="" class="fv-mention-avatar">`
				: `<span class="fv-mention-icon">${item.icon || (item.type === "user" ? "👤" : "👥")}</span>`;
			return `<div class="fv-mention-item${active}" data-index="${i}"
				role="option" aria-selected="${i === this._index}">
				${avatar}
				<div class="fv-mention-info">
					<span class="fv-mention-name">${this._esc(item.name)}</span>
					${item.email ? `<span class="fv-mention-email">${this._esc(item.email)}</span>` : ""}
				</div>
				<span class="fv-mention-type">${item.type}</span>
			</div>`;
		}).join("");
		// Click handler
		this._popup.querySelectorAll(".fv-mention-item").forEach(el => {
			el.addEventListener("click", () => this._select(parseInt(el.dataset.index)));
			el.addEventListener("mouseenter", () => {
				this._index = parseInt(el.dataset.index);
				this._updateActive();
			});
		});
	}

	_onKey(e) {
		if (!this._open) return;
		if (e.key === "ArrowDown") { e.preventDefault(); this._index = (this._index + 1) % this._filtered.length; this._updateActive(); }
		else if (e.key === "ArrowUp") { e.preventDefault(); this._index = (this._index - 1 + this._filtered.length) % this._filtered.length; this._updateActive(); }
		else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); this._select(this._index); }
		else if (e.key === "Escape") { this._hide(); }
	}

	_select(idx) {
		const item = this._filtered[idx];
		if (!item) return;
		// Replace trigger + query with formatted mention
		const val = this._input.value;
		const pos = this._input.selectionStart;
		const before = val.substring(0, pos);
		const triggerIdx = before.lastIndexOf(this.opts.trigger);
		const after = val.substring(pos);
		const mention = this.opts.insertFormat.replace("{name}", item.name).replace("{id}", item.id);
		this._input.value = before.substring(0, triggerIdx) + mention + " " + after;
		const newPos = triggerIdx + mention.length + 1;
		this._input.setSelectionRange(newPos, newPos);
		this._input.focus();
		this._hide();
		this.opts.onSelect?.(item);
	}

	_updateActive() {
		this._popup.querySelectorAll(".fv-mention-item").forEach((el, i) => {
			el.classList.toggle("fv-mention--active", i === this._index);
			el.setAttribute("aria-selected", String(i === this._index));
		});
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
