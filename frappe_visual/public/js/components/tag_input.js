/**
 * Frappe Visual — TagInput
 * ==========================
 * Multi-tag input with autocomplete suggestions, create-on-enter,
 * backspace-to-delete, drag-reorder, paste-split, and character limits.
 *
 * Usage:
 *   frappe.visual.TagInput.create('#el', {
 *     tags: ['JavaScript', 'Python'],
 *     suggestions: ['JavaScript','Python','Go','Rust','TypeScript'],
 *     maxTags: 10,
 *     placeholder: 'Add tag…',
 *     onChange: tags => console.log(tags)
 *   })
 *
 * @module frappe_visual/components/tag_input
 */

const TAG_COLORS = [
	"#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
	"#ec4899", "#0ea5e9", "#14b8a6", "#f97316", "#64748b",
];

export class TagInput {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("TagInput: container not found");

		this.opts = Object.assign({
			theme: "glass",
			tags: [],
			suggestions: [],
			maxTags: 50,
			maxLength: 40,
			allowCreate: true,
			allowDuplicates: false,
			placeholder: __("Add tag…"),
			separator: ",",           // split pasted text by this
			colorful: true,
			removable: true,
			draggable: true,
			disabled: false,
			onChange: null,
			onAdd: null,
			onRemove: null,
		}, opts);

		this._tags = [...this.opts.tags];
		this._filteredSuggestions = [];
		this._selectedSuggestionIdx = -1;
		this._init();
	}

	static create(container, opts = {}) { return new TagInput(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-ti", `fv-ti--${this.opts.theme}`);
		if (this.opts.disabled) this.container.classList.add("fv-ti--disabled");
		this.container.innerHTML = "";

		// Wrapper
		this._wrapEl = document.createElement("div");
		this._wrapEl.className = "fv-ti-wrap";
		this.container.appendChild(this._wrapEl);

		// Tags container
		this._tagsEl = document.createElement("div");
		this._tagsEl.className = "fv-ti-tags";
		this._wrapEl.appendChild(this._tagsEl);

		// Input
		this._inputEl = document.createElement("input");
		this._inputEl.type = "text";
		this._inputEl.className = "fv-ti-input";
		this._inputEl.placeholder = this._tags.length ? "" : this.opts.placeholder;
		this._inputEl.maxLength = this.opts.maxLength;
		this._inputEl.disabled = this.opts.disabled;
		this._wrapEl.appendChild(this._inputEl);

		// Suggestions dropdown
		this._dropEl = document.createElement("div");
		this._dropEl.className = "fv-ti-dropdown";
		this._dropEl.style.display = "none";
		this.container.appendChild(this._dropEl);

		// Render initial tags
		this._renderTags();

		// Events
		this._bindEvents();
	}

	_bindEvents() {
		this._inputEl.addEventListener("input", () => this._onInput());
		this._inputEl.addEventListener("keydown", (e) => this._onKeydown(e));
		this._inputEl.addEventListener("focus", () => { this._wrapEl.classList.add("fv-ti--focused"); this._onInput(); });
		this._inputEl.addEventListener("blur", () => {
			this._wrapEl.classList.remove("fv-ti--focused");
			setTimeout(() => this._closeDrop(), 150);
		});
		this._inputEl.addEventListener("paste", (e) => this._onPaste(e));
		this._wrapEl.addEventListener("click", () => this._inputEl.focus());
	}

	_onInput() {
		const query = this._inputEl.value.trim().toLowerCase();
		if (!query && this.opts.suggestions.length === 0) { this._closeDrop(); return; }

		this._filteredSuggestions = this.opts.suggestions.filter(s => {
			const match = s.toLowerCase().includes(query);
			const notAdded = this.opts.allowDuplicates || !this._tags.includes(s);
			return match && notAdded;
		}).slice(0, 20);

		if (this._filteredSuggestions.length === 0) { this._closeDrop(); return; }

		this._selectedSuggestionIdx = -1;
		this._renderDrop();
	}

	_onKeydown(e) {
		const val = this._inputEl.value.trim();

		if (e.key === "Enter" || e.key === this.opts.separator) {
			e.preventDefault();
			if (this._selectedSuggestionIdx >= 0 && this._filteredSuggestions.length) {
				this.addTag(this._filteredSuggestions[this._selectedSuggestionIdx]);
			} else if (val && this.opts.allowCreate) {
				this.addTag(val);
			}
			this._inputEl.value = "";
			this._closeDrop();
		} else if (e.key === "Backspace" && !val && this._tags.length) {
			this.removeTag(this._tags.length - 1);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			this._selectedSuggestionIdx = Math.min(this._selectedSuggestionIdx + 1, this._filteredSuggestions.length - 1);
			this._highlightSuggestion();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			this._selectedSuggestionIdx = Math.max(this._selectedSuggestionIdx - 1, 0);
			this._highlightSuggestion();
		} else if (e.key === "Escape") {
			this._closeDrop();
		}
	}

	_onPaste(e) {
		e.preventDefault();
		const text = (e.clipboardData || window.clipboardData).getData("text");
		const parts = text.split(new RegExp(`[${this.opts.separator}\\n]+`)).map(s => s.trim()).filter(Boolean);
		for (const part of parts) {
			this.addTag(part);
		}
	}

	/* ── Rendering ───────────────────────────────────────────── */
	_renderTags() {
		this._tagsEl.innerHTML = "";
		for (let i = 0; i < this._tags.length; i++) {
			const tag = this._tags[i];
			const el = document.createElement("span");
			el.className = "fv-ti-tag";
			if (this.opts.colorful) {
				const color = TAG_COLORS[i % TAG_COLORS.length];
				el.style.background = color + "18";
				el.style.color = color;
				el.style.borderColor = color + "30";
			}

			el.innerHTML = `<span class="fv-ti-tag-text">${this._esc(tag)}</span>`;

			if (this.opts.removable && !this.opts.disabled) {
				const btn = document.createElement("button");
				btn.className = "fv-ti-tag-remove";
				btn.innerHTML = "×";
				btn.type = "button";
				btn.addEventListener("click", (e) => { e.stopPropagation(); this.removeTag(i); });
				el.appendChild(btn);
			}

			if (this.opts.draggable && !this.opts.disabled) {
				el.draggable = true;
				el.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", i); el.classList.add("fv-ti-tag--dragging"); });
				el.addEventListener("dragend", () => el.classList.remove("fv-ti-tag--dragging"));
				el.addEventListener("dragover", (e) => e.preventDefault());
				el.addEventListener("drop", (e) => {
					e.preventDefault();
					const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
					this._moveTag(fromIdx, i);
				});
			}

			this._tagsEl.appendChild(el);
		}
		this._inputEl.placeholder = this._tags.length ? "" : this.opts.placeholder;
	}

	_renderDrop() {
		this._dropEl.innerHTML = "";
		this._dropEl.style.display = "block";
		for (let i = 0; i < this._filteredSuggestions.length; i++) {
			const item = document.createElement("div");
			item.className = "fv-ti-suggestion" + (i === this._selectedSuggestionIdx ? " fv-ti-suggestion--active" : "");
			item.textContent = this._filteredSuggestions[i];
			item.addEventListener("mousedown", (e) => { e.preventDefault(); this.addTag(this._filteredSuggestions[i]); this._inputEl.value = ""; this._closeDrop(); });
			this._dropEl.appendChild(item);
		}
	}

	_highlightSuggestion() {
		this._dropEl.querySelectorAll(".fv-ti-suggestion").forEach((el, i) => {
			el.classList.toggle("fv-ti-suggestion--active", i === this._selectedSuggestionIdx);
		});
	}

	_closeDrop() { this._dropEl.style.display = "none"; this._filteredSuggestions = []; }

	/* ── Public API ──────────────────────────────────────────── */
	addTag(tag) {
		tag = tag.trim();
		if (!tag) return false;
		if (tag.length > this.opts.maxLength) tag = tag.slice(0, this.opts.maxLength);
		if (!this.opts.allowDuplicates && this._tags.includes(tag)) return false;
		if (this._tags.length >= this.opts.maxTags) return false;

		this._tags.push(tag);
		this._renderTags();
		if (this.opts.onAdd) this.opts.onAdd(tag);
		if (this.opts.onChange) this.opts.onChange([...this._tags]);
		return true;
	}

	removeTag(index) {
		if (index < 0 || index >= this._tags.length) return;
		const removed = this._tags.splice(index, 1)[0];
		this._renderTags();
		if (this.opts.onRemove) this.opts.onRemove(removed);
		if (this.opts.onChange) this.opts.onChange([...this._tags]);
	}

	_moveTag(from, to) {
		if (from === to) return;
		const tag = this._tags.splice(from, 1)[0];
		this._tags.splice(to, 0, tag);
		this._renderTags();
		if (this.opts.onChange) this.opts.onChange([...this._tags]);
	}

	getTags() { return [...this._tags]; }
	setTags(tags) { this._tags = [...tags]; this._renderTags(); }
	clear() { this._tags = []; this._renderTags(); if (this.opts.onChange) this.opts.onChange([]); }
	setSuggestions(s) { this.opts.suggestions = s; }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ti", `fv-ti--${this.opts.theme}`, "fv-ti--disabled");
	}
}
