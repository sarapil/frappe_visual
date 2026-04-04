/**
 * AutoSave — Automatic form/input persistence with debounce and indicator
 *
 * Watches form fields for changes and auto-saves with debounce. Shows a
 * subtle status indicator (saving… / saved / error). Supports localStorage
 * draft recovery and server-side save via frappe.xcall.
 *
 * frappe.visual.AutoSave.create({
 *   form: "form#my-form", debounceMs: 2000,
 *   onSave: (data) => frappe.xcall("myapp.save", { data })
 * })
 */
export class AutoSave {
	static create(opts = {}) { return new AutoSave(opts); }

	constructor(opts) {
		this.opts = Object.assign({
			form: null, debounceMs: 2000, draftKey: "",
			showIndicator: true, saveDraft: true,
			onSave: null, onRestore: null, fields: null
		}, opts);
		this._status = "idle"; // idle | saving | saved | error
		this._timer = null;
		this._lastSaved = null;
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	get status() { return this._status; }
	get lastSaved() { return this._lastSaved; }
	get isDirty() { return this._isDirty(); }

	/** Manually trigger save */
	async save() {
		this._setStatus("saving");
		try {
			const data = this._collectData();
			if (this.opts.onSave) await this.opts.onSave(data);
			if (this.opts.saveDraft) this._saveDraft(data);
			this._lastSaved = Date.now();
			this._setStatus("saved");
			setTimeout(() => { if (this._status === "saved") this._setStatus("idle"); }, 3000);
		} catch (e) {
			this._setStatus("error");
			console.error("AutoSave error:", e);
		}
	}

	/** Restore from draft */
	restore() {
		if (!this.opts.draftKey) return null;
		const draft = localStorage.getItem(`fv_draft_${this.opts.draftKey}`);
		if (!draft) return null;
		try {
			const data = JSON.parse(draft);
			this._applyData(data);
			this.opts.onRestore?.(data);
			return data;
		} catch { return null; }
	}

	/** Clear draft */
	clearDraft() {
		if (this.opts.draftKey) localStorage.removeItem(`fv_draft_${this.opts.draftKey}`);
	}

	/** Check if a draft exists */
	hasDraft() {
		if (!this.opts.draftKey) return false;
		return !!localStorage.getItem(`fv_draft_${this.opts.draftKey}`);
	}

	/** Pause auto-saving */
	pause() { this._paused = true; }
	resume() { this._paused = false; }

	destroy() {
		clearTimeout(this._timer);
		this._form?.removeEventListener("input", this._changeHandler);
		this._form?.removeEventListener("change", this._changeHandler);
		this._indicator?.remove();
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		this._form = typeof this.opts.form === "string"
			? document.querySelector(this.opts.form) : this.opts.form;
		if (!this._form) return;

		if (this.opts.showIndicator) this._createIndicator();

		this._changeHandler = () => {
			if (this._paused) return;
			clearTimeout(this._timer);
			this._setStatus("idle");
			this._timer = setTimeout(() => this.save(), this.opts.debounceMs);
		};
		this._form.addEventListener("input", this._changeHandler);
		this._form.addEventListener("change", this._changeHandler);

		// Check for existing draft
		if (this.opts.saveDraft && this.hasDraft()) {
			this._showDraftBanner();
		}
	}

	_collectData() {
		const data = {};
		const inputs = this._form.querySelectorAll("input, textarea, select");
		inputs.forEach(input => {
			const name = input.name || input.dataset.fieldname;
			if (!name) return;
			if (this.opts.fields && !this.opts.fields.includes(name)) return;
			if (input.type === "checkbox") data[name] = input.checked;
			else if (input.type === "radio") { if (input.checked) data[name] = input.value; }
			else data[name] = input.value;
		});
		return data;
	}

	_applyData(data) {
		if (!data || !this._form) return;
		Object.entries(data).forEach(([name, value]) => {
			const input = this._form.querySelector(`[name="${name}"], [data-fieldname="${name}"]`);
			if (!input) return;
			if (input.type === "checkbox") input.checked = !!value;
			else if (input.type === "radio") {
				const radio = this._form.querySelector(`[name="${name}"][value="${value}"]`);
				if (radio) radio.checked = true;
			} else { input.value = value; }
		});
	}

	_isDirty() {
		if (!this._lastSaved) return true;
		return Date.now() - this._lastSaved > this.opts.debounceMs;
	}

	_saveDraft(data) {
		if (!this.opts.draftKey) return;
		try {
			localStorage.setItem(`fv_draft_${this.opts.draftKey}`, JSON.stringify(data));
		} catch { /* quota exceeded */ }
	}

	_createIndicator() {
		this._indicator = document.createElement("div");
		this._indicator.className = "fv-autosave-indicator";
		this._indicator.setAttribute("role", "status");
		this._indicator.setAttribute("aria-live", "polite");
		this._form.style.position = this._form.style.position || "relative";
		this._form.appendChild(this._indicator);
	}

	_setStatus(status) {
		this._status = status;
		if (!this._indicator) return;
		const labels = {
			idle: "", saving: __("Saving…"), saved: __("Saved ✓"),
			error: __("Save failed ✕")
		};
		const colors = { idle: "", saving: "#f59e0b", saved: "#22c55e", error: "#ef4444" };
		this._indicator.textContent = labels[status] || "";
		this._indicator.style.color = colors[status] || "";
		this._indicator.style.opacity = status === "idle" ? "0" : "1";
	}

	_showDraftBanner() {
		const banner = document.createElement("div");
		banner.className = "fv-autosave-draft-banner";
		banner.innerHTML = `<span>${__("You have an unsaved draft.")}</span>
			<button class="fv-as-restore">${__("Restore")}</button>
			<button class="fv-as-discard">${__("Discard")}</button>`;
		banner.querySelector(".fv-as-restore")?.addEventListener("click", () => {
			this.restore(); banner.remove();
		});
		banner.querySelector(".fv-as-discard")?.addEventListener("click", () => {
			this.clearDraft(); banner.remove();
		});
		this._form.insertBefore(banner, this._form.firstChild);
	}
}
