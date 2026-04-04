/**
 * InlineEditor — Click-to-edit inline text editor
 *
 * Converts static text into an editable field on click. Supports text,
 * textarea, number, and select modes. Shows save/cancel buttons with
 * keyboard shortcuts.
 *
 * frappe.visual.InlineEditor.create({
 *   container: ".editable-field", value: "Hello",
 *   onSave: (newValue) => {}
 * })
 */
export class InlineEditor {
	static create(opts = {}) { return new InlineEditor(opts); }

	constructor(opts) {
		this.opts = Object.assign({
			container: null, value: "", type: "text", placeholder: "Click to edit",
			options: [], maxLength: null, required: false,
			onSave: null, onCancel: null, validate: null
		}, opts);
		this._value = this.opts.value;
		this._editing = false;
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	get value() { return this._value; }
	set value(v) { this._value = v; this._renderDisplay(); }
	get isEditing() { return this._editing; }

	edit() { this._startEdit(); }
	cancel() { this._cancelEdit(); }

	save(newValue) {
		if (this.opts.validate && !this.opts.validate(newValue)) return false;
		if (this.opts.required && !newValue?.toString().trim()) return false;
		this._value = newValue;
		this._editing = false;
		this._renderDisplay();
		this.opts.onSave?.(this._value);
		return true;
	}

	destroy() { this._el?.remove(); }

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;
		this._el = document.createElement("div");
		this._el.className = "fv-inline-editor";
		parent.appendChild(this._el);
		this._renderDisplay();
	}

	_renderDisplay() {
		if (!this._el) return;
		const display = this._value || this.opts.placeholder;
		const isEmpty = !this._value;
		this._el.innerHTML = `<span class="fv-ie-display${isEmpty ? " fv-ie-placeholder" : ""}"
			tabindex="0" role="button" aria-label="${__("Click to edit")}">
			${this._esc(display)}
			<span class="fv-ie-edit-icon">✏️</span>
		</span>`;
		const span = this._el.querySelector(".fv-ie-display");
		span.addEventListener("click", () => this._startEdit());
		span.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._startEdit(); }
		});
	}

	_startEdit() {
		this._editing = true;
		if (!this._el) return;
		let inputHtml;
		if (this.opts.type === "textarea") {
			inputHtml = `<textarea class="fv-ie-input" rows="3"
				${this.opts.maxLength ? `maxlength="${this.opts.maxLength}"` : ""}>${this._esc(this._value)}</textarea>`;
		} else if (this.opts.type === "select") {
			inputHtml = `<select class="fv-ie-input">
				${this.opts.options.map(o =>
					`<option value="${this._esc(typeof o === "object" ? o.value : o)}"
						${(typeof o === "object" ? o.value : o) === this._value ? "selected" : ""}>
						${this._esc(typeof o === "object" ? o.label : o)}</option>`
				).join("")}
			</select>`;
		} else {
			inputHtml = `<input class="fv-ie-input" type="${this.opts.type}" value="${this._esc(this._value)}"
				${this.opts.maxLength ? `maxlength="${this.opts.maxLength}"` : ""}
				placeholder="${this._esc(this.opts.placeholder)}">`;
		}
		this._el.innerHTML = `<div class="fv-ie-edit-wrap">
			${inputHtml}
			<div class="fv-ie-actions">
				<button class="fv-ie-save" aria-label="${__("Save")}">✓</button>
				<button class="fv-ie-cancel" aria-label="${__("Cancel")}">✕</button>
			</div>
		</div>`;
		const input = this._el.querySelector(".fv-ie-input");
		input.focus();
		if (input.setSelectionRange && this.opts.type !== "select") {
			input.setSelectionRange(input.value.length, input.value.length);
		}
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && this.opts.type !== "textarea") {
				e.preventDefault(); this.save(input.value);
			} else if (e.key === "Enter" && e.ctrlKey && this.opts.type === "textarea") {
				e.preventDefault(); this.save(input.value);
			} else if (e.key === "Escape") {
				this._cancelEdit();
			}
		});
		this._el.querySelector(".fv-ie-save")?.addEventListener("click", () => this.save(input.value));
		this._el.querySelector(".fv-ie-cancel")?.addEventListener("click", () => this._cancelEdit());
	}

	_cancelEdit() {
		this._editing = false;
		this._renderDisplay();
		this.opts.onCancel?.();
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
