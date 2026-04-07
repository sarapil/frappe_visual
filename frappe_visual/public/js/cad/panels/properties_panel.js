// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * PropertiesPanel — Side panel for editing selected object properties
 * ====================================================================
 * Dynamically builds a property editor form for the currently selected
 * object on the 2D CAD canvas.
 */

export class PropertiesPanel {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			fields: [],
			onChange: null,
			onDelete: null,
			title: __("Properties"),
			emptyMessage: __("Select an item to edit"),
			showDelete: true,
			showLock: true,
		}, opts);
		this._selectedObject = null;
		this._fieldMap = new Map();
	}

	init() {
		this.container.classList.add("fv-properties-panel");
		this._buildUI();
		return this;
	}

	setObject(obj) {
		this._selectedObject = obj;
		this._updateUI();
	}

	clearSelection() {
		this._selectedObject = null;
		this._updateUI();
	}

	/** Register custom field type renderer */
	registerFieldType(type, renderer) {
		this._customRenderers = this._customRenderers || {};
		this._customRenderers[type] = renderer;
	}

	_buildUI() {
		this.container.innerHTML = "";

		const header = document.createElement("div");
		header.className = "fv-prop-header";
		header.innerHTML = `<h6 class="fv-prop-title">${this.opts.title}</h6>`;
		this.container.appendChild(header);

		this._body = document.createElement("div");
		this._body.className = "fv-prop-body";
		this.container.appendChild(this._body);

		this._actions = document.createElement("div");
		this._actions.className = "fv-prop-actions";
		this._actions.style.cssText = "padding:8px;border-top:1px solid var(--border-color, #e0e0e0);display:none;";
		this.container.appendChild(this._actions);

		this._updateUI();
	}

	_updateUI() {
		this._fieldMap.clear();
		if (!this._selectedObject) {
			this._body.innerHTML = `<div class="text-muted text-center" style="padding:24px;">${this.opts.emptyMessage}</div>`;
			this._actions.style.display = "none";
			return;
		}

		this._body.innerHTML = "";
		const obj = this._selectedObject;
		const fields = this.opts.fields.length ? this.opts.fields : this._autoDetectFields(obj);

		for (const field of fields) {
			const row = this._createFieldRow(field, obj);
			if (row) this._body.appendChild(row);
		}

		// Action buttons
		this._actions.innerHTML = "";
		this._actions.style.display = "flex";
		this._actions.style.gap = "6px";

		if (this.opts.showLock) {
			const lockBtn = document.createElement("button");
			lockBtn.className = "btn btn-xs btn-default";
			lockBtn.innerHTML = obj.locked ? `<i class="ti ti-lock"></i> ${__("Unlock")}` : `<i class="ti ti-lock-open"></i> ${__("Lock")}`;
			lockBtn.addEventListener("click", () => {
				obj.locked = !obj.locked;
				this._emitChange("locked", obj.locked);
				this._updateUI();
			});
			this._actions.appendChild(lockBtn);
		}

		if (this.opts.showDelete) {
			const delBtn = document.createElement("button");
			delBtn.className = "btn btn-xs btn-danger";
			delBtn.innerHTML = `<i class="ti ti-trash"></i> ${__("Delete")}`;
			delBtn.addEventListener("click", () => {
				if (this.opts.onDelete) this.opts.onDelete(this._selectedObject);
			});
			this._actions.appendChild(delBtn);
		}
	}

	_createFieldRow(field, obj) {
		const row = document.createElement("div");
		row.className = "fv-prop-row";
		row.style.cssText = "padding:4px 8px;display:flex;align-items:center;gap:6px;";

		const label = document.createElement("label");
		label.className = "fv-prop-label";
		label.textContent = __(field.label || field.name);
		label.style.cssText = "flex:0 0 80px;font-size:11px;color:var(--text-muted);";
		row.appendChild(label);

		const input = this._createInput(field, obj);
		if (!input) return null;
		input.style.cssText = (input.style.cssText || "") + "flex:1;";
		row.appendChild(input);

		this._fieldMap.set(field.name, input);
		return row;
	}

	_createInput(field, obj) {
		const value = obj[field.name];
		const type = field.type || this._guessType(field.name, value);

		if (this._customRenderers?.[type]) {
			return this._customRenderers[type](field, obj, (v) => this._emitChange(field.name, v));
		}

		let input;
		switch (type) {
			case "number": {
				input = document.createElement("input");
				input.type = "number";
				input.className = "form-control input-xs";
				input.value = value ?? 0;
				input.step = field.step || 1;
				if (field.min !== undefined) input.min = field.min;
				if (field.max !== undefined) input.max = field.max;
				input.addEventListener("change", () => this._emitChange(field.name, parseFloat(input.value)));
				break;
			}
			case "text": {
				input = document.createElement("input");
				input.type = "text";
				input.className = "form-control input-xs";
				input.value = value ?? "";
				input.addEventListener("change", () => this._emitChange(field.name, input.value));
				break;
			}
			case "select": {
				input = document.createElement("select");
				input.className = "form-control input-xs";
				for (const opt of field.options || []) {
					const o = document.createElement("option");
					o.value = typeof opt === "string" ? opt : opt.value;
					o.textContent = typeof opt === "string" ? __(opt) : __(opt.label);
					if (o.value === String(value)) o.selected = true;
					input.appendChild(o);
				}
				input.addEventListener("change", () => this._emitChange(field.name, input.value));
				break;
			}
			case "color": {
				input = document.createElement("input");
				input.type = "color";
				input.value = value || "#000000";
				input.style.cssText = "width:32px;height:24px;padding:0;border:none;cursor:pointer;";
				input.addEventListener("input", () => this._emitChange(field.name, input.value));
				break;
			}
			case "checkbox": {
				input = document.createElement("input");
				input.type = "checkbox";
				input.checked = !!value;
				input.addEventListener("change", () => this._emitChange(field.name, input.checked));
				break;
			}
			default: {
				input = document.createElement("span");
				input.className = "text-muted";
				input.textContent = String(value ?? "—");
			}
		}
		return input;
	}

	_emitChange(fieldName, value) {
		if (this._selectedObject) {
			this._selectedObject[fieldName] = value;
		}
		if (this.opts.onChange) {
			this.opts.onChange(this._selectedObject, fieldName, value);
		}
	}

	_autoDetectFields(obj) {
		const skip = new Set(["id", "_id", "type", "locked"]);
		return Object.keys(obj)
			.filter(k => !k.startsWith("_") && !skip.has(k))
			.map(k => ({ name: k, label: k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }));
	}

	_guessType(name, value) {
		if (typeof value === "boolean") return "checkbox";
		if (typeof value === "number") return "number";
		if (name.includes("color") || name.includes("colour")) return "color";
		return "text";
	}

	dispose() {
		this._fieldMap.clear();
		this._selectedObject = null;
		this.container.innerHTML = "";
	}
}
