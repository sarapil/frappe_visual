// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — FormBuilder
 * =============================
 * Visual drag-and-drop form layout designer for creating custom forms.
 * Supports field types, sections, columns, tabs, validation rules,
 * conditional visibility, and JSON export for Frappe DocType definition.
 *
 * Usage:
 *   frappe.visual.FormBuilder.create('#el', {
 *     fields: [...],     // initial field definitions
 *     fieldTypes: [...], // available field types
 *     onSave: (schema) => {},
 *   })
 *
 * @module frappe_visual/components/form_builder
 */

const FIELD_TYPES = [
	{ type: "Data", icon: "Aa", label: "Text", category: "basic" },
	{ type: "Int", icon: "#", label: "Integer", category: "basic" },
	{ type: "Float", icon: "#.#", label: "Decimal", category: "basic" },
	{ type: "Currency", icon: "$", label: "Currency", category: "basic" },
	{ type: "Date", icon: "📅", label: "Date", category: "basic" },
	{ type: "Datetime", icon: "🕐", label: "Date & Time", category: "basic" },
	{ type: "Time", icon: "⏰", label: "Time", category: "basic" },
	{ type: "Check", icon: "☑", label: "Checkbox", category: "basic" },
	{ type: "Select", icon: "▼", label: "Dropdown", category: "basic" },
	{ type: "Link", icon: "🔗", label: "Link", category: "advanced" },
	{ type: "Dynamic Link", icon: "⇄", label: "Dynamic Link", category: "advanced" },
	{ type: "Text", icon: "¶", label: "Text Area", category: "text" },
	{ type: "Text Editor", icon: "📝", label: "Rich Text", category: "text" },
	{ type: "Code", icon: "<>", label: "Code", category: "text" },
	{ type: "HTML", icon: "⬡", label: "HTML", category: "text" },
	{ type: "Small Text", icon: "📃", label: "Small Text", category: "text" },
	{ type: "Long Text", icon: "📄", label: "Long Text", category: "text" },
	{ type: "Attach", icon: "📎", label: "Attach File", category: "media" },
	{ type: "Attach Image", icon: "🖼", label: "Attach Image", category: "media" },
	{ type: "Table", icon: "▦", label: "Table", category: "layout" },
	{ type: "Section Break", icon: "━", label: "Section", category: "layout" },
	{ type: "Column Break", icon: "┃", label: "Column", category: "layout" },
	{ type: "Tab Break", icon: "⊞", label: "Tab", category: "layout" },
];

export class FormBuilder {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("FormBuilder: container not found");

		this.opts = Object.assign({
			theme: "glass",
			fields: [],
			fieldTypes: FIELD_TYPES,
			showPreview: true,
			showJSON: false,
			onSave: null,
			onChange: null,
		}, opts);

		this._fields = JSON.parse(JSON.stringify(this.opts.fields));
		this._selectedIdx = -1;
		this._idCounter = Date.now();
		this._init();
	}

	static create(container, opts = {}) { return new FormBuilder(container, opts); }

	_uid() { return `fb_${++this._idCounter}`; }

	_init() {
		this.container.classList.add("fv-fb", `fv-fb--${this.opts.theme}`);
		this.container.innerHTML = "";

		const layout = document.createElement("div");
		layout.className = "fv-fb-layout";

		// Left: field palette
		layout.appendChild(this._buildPalette());

		// Center: form canvas
		layout.appendChild(this._buildCanvas());

		// Right: field properties
		layout.appendChild(this._buildPropsPanel());

		this.container.appendChild(layout);

		// Toolbar
		this._renderToolbar();

		this._redraw();
	}

	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-fb-toolbar";
		bar.innerHTML = `
			<div class="fv-fb-toolbar-title">${__("Form Builder")}</div>
			<div class="fv-fb-toolbar-actions">
				${this.opts.showPreview ? `<button class="fv-fb-btn" data-act="preview">${__("Preview")}</button>` : ""}
				${this.opts.showJSON ? `<button class="fv-fb-btn" data-act="json">${__("JSON")}</button>` : ""}
				<button class="fv-fb-btn fv-fb-btn--primary" data-act="save">${__("Save")}</button>
			</div>`;

		bar.querySelectorAll(".fv-fb-btn").forEach(btn => {
			btn.addEventListener("click", () => this._handleAction(btn.dataset.act));
		});

		this.container.insertBefore(bar, this.container.firstChild);
	}

	_buildPalette() {
		const pal = document.createElement("div");
		pal.className = "fv-fb-palette";

		const categories = { basic: __("Basic"), advanced: __("Advanced"), text: __("Text"), media: __("Media"), layout: __("Layout") };

		for (const [cat, label] of Object.entries(categories)) {
			const group = document.createElement("div");
			group.className = "fv-fb-pal-group";
			group.innerHTML = `<div class="fv-fb-pal-title">${label}</div>`;

			const items = this.opts.fieldTypes.filter(f => f.category === cat);
			for (const ft of items) {
				const item = document.createElement("div");
				item.className = "fv-fb-pal-item";
				item.draggable = true;
				item.innerHTML = `<span class="fv-fb-pal-icon">${ft.icon}</span><span>${this._esc(__(ft.label))}</span>`;
				item.addEventListener("dragstart", e => {
					e.dataTransfer.setData("application/fv-fieldtype", JSON.stringify(ft));
				});
				item.addEventListener("click", () => this._addField(ft));
				group.appendChild(item);
			}
			pal.appendChild(group);
		}
		return pal;
	}

	_buildCanvas() {
		const canvas = document.createElement("div");
		canvas.className = "fv-fb-canvas";
		canvas.addEventListener("dragover", e => e.preventDefault());
		canvas.addEventListener("drop", e => {
			e.preventDefault();
			const raw = e.dataTransfer.getData("application/fv-fieldtype");
			if (raw) this._addField(JSON.parse(raw));
		});
		this._canvasEl = canvas;
		return canvas;
	}

	_buildPropsPanel() {
		const panel = document.createElement("div");
		panel.className = "fv-fb-props";
		panel.innerHTML = `<div class="fv-fb-props-title">${__("Properties")}</div>
			<div class="fv-fb-props-body"><p class="fv-fb-props-hint">${__("Select a field to edit")}</p></div>`;
		this._propsPanel = panel;
		return panel;
	}

	/* ── Field Management ────────────────────────────────────── */
	_addField(ft, idx) {
		const field = {
			_id: this._uid(),
			fieldtype: ft.type,
			fieldname: this._genFieldname(ft),
			label: ft.label,
			options: "",
			reqd: 0,
			hidden: 0,
			read_only: 0,
			default: "",
			description: "",
			depends_on: "",
		};
		if (idx !== undefined) {
			this._fields.splice(idx, 0, field);
		} else {
			this._fields.push(field);
		}
		this._redraw();
		this._selectField(this._fields.indexOf(field));
		this._emitChange();
	}

	_genFieldname(ft) {
		const base = ft.type.toLowerCase().replace(/\s+/g, "_");
		const count = this._fields.filter(f => f.fieldtype === ft.type).length + 1;
		return `${base}_${count}`;
	}

	_removeField(idx) {
		this._fields.splice(idx, 1);
		this._selectedIdx = -1;
		this._redraw();
		this._clearProps();
		this._emitChange();
	}

	_moveField(fromIdx, dir) {
		const toIdx = fromIdx + dir;
		if (toIdx < 0 || toIdx >= this._fields.length) return;
		[this._fields[fromIdx], this._fields[toIdx]] = [this._fields[toIdx], this._fields[fromIdx]];
		this._selectedIdx = toIdx;
		this._redraw();
		this._emitChange();
	}

	_selectField(idx) {
		this._selectedIdx = idx;
		this._canvasEl.querySelectorAll(".fv-fb-field").forEach((f, i) =>
			f.classList.toggle("fv-fb-field--selected", i === idx));
		if (idx >= 0 && idx < this._fields.length) {
			this._showProps(this._fields[idx], idx);
		} else {
			this._clearProps();
		}
	}

	/* ── Canvas Rendering ────────────────────────────────────── */
	_redraw() {
		this._canvasEl.innerHTML = "";
		if (this._fields.length === 0) {
			this._canvasEl.innerHTML = `<div class="fv-fb-empty">
				<p>${__("Drag fields from the palette or click to add")}</p>
			</div>`;
			return;
		}

		for (let i = 0; i < this._fields.length; i++) {
			const f = this._fields[i];
			const el = document.createElement("div");
			const isLayout = ["Section Break", "Column Break", "Tab Break"].includes(f.fieldtype);
			el.className = `fv-fb-field ${isLayout ? "fv-fb-field--layout" : ""} ${i === this._selectedIdx ? "fv-fb-field--selected" : ""}`;
			el.dataset.idx = i;

			const ft = this.opts.fieldTypes.find(t => t.type === f.fieldtype) || {};

			el.innerHTML = `
				<div class="fv-fb-field-handle" title="${__("Drag to reorder")}">⠿</div>
				<div class="fv-fb-field-body">
					<div class="fv-fb-field-top">
						<span class="fv-fb-field-icon">${ft.icon || "?"}</span>
						<span class="fv-fb-field-label">${this._esc(f.label || f.fieldname)}</span>
						<span class="fv-fb-field-type">${f.fieldtype}</span>
						${f.reqd ? '<span class="fv-fb-field-req">*</span>' : ""}
					</div>
					<div class="fv-fb-field-name">${f.fieldname}</div>
				</div>
				<div class="fv-fb-field-actions">
					<button class="fv-fb-field-act" data-act="up" title="${__("Move Up")}">↑</button>
					<button class="fv-fb-field-act" data-act="down" title="${__("Move Down")}">↓</button>
					<button class="fv-fb-field-act fv-fb-field-act--del" data-act="delete" title="${__("Delete")}">✕</button>
				</div>`;

			el.addEventListener("click", (e) => {
				if (!e.target.closest(".fv-fb-field-act")) this._selectField(i);
			});
			el.querySelectorAll(".fv-fb-field-act").forEach(btn => {
				btn.addEventListener("click", () => {
					if (btn.dataset.act === "up") this._moveField(i, -1);
					else if (btn.dataset.act === "down") this._moveField(i, 1);
					else if (btn.dataset.act === "delete") this._removeField(i);
				});
			});

			// Drag reorder
			el.draggable = true;
			el.addEventListener("dragstart", e => {
				e.dataTransfer.setData("text/plain", String(i));
				el.classList.add("fv-fb-field--dragging");
			});
			el.addEventListener("dragend", () => el.classList.remove("fv-fb-field--dragging"));
			el.addEventListener("dragover", e => e.preventDefault());
			el.addEventListener("drop", e => {
				e.preventDefault();
				e.stopPropagation();
				const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
				if (!isNaN(fromIdx) && fromIdx !== i) {
					const [moved] = this._fields.splice(fromIdx, 1);
					this._fields.splice(i, 0, moved);
					this._selectedIdx = i;
					this._redraw();
					this._emitChange();
				}
			});

			this._canvasEl.appendChild(el);
		}
	}

	/* ── Properties Panel ────────────────────────────────────── */
	_showProps(field, idx) {
		const body = this._propsPanel.querySelector(".fv-fb-props-body");
		body.innerHTML = "";

		const rows = [
			{ key: "label", label: __("Label"), type: "text" },
			{ key: "fieldname", label: __("Field Name"), type: "text" },
			{ key: "fieldtype", label: __("Type"), type: "text", readonly: true },
			{ key: "options", label: __("Options"), type: "text" },
			{ key: "default", label: __("Default"), type: "text" },
			{ key: "description", label: __("Description"), type: "text" },
			{ key: "depends_on", label: __("Depends On"), type: "text" },
			{ key: "reqd", label: __("Mandatory"), type: "check" },
			{ key: "hidden", label: __("Hidden"), type: "check" },
			{ key: "read_only", label: __("Read Only"), type: "check" },
		];

		for (const row of rows) {
			const div = document.createElement("div");
			div.className = "fv-fb-prop-row";

			if (row.type === "check") {
				div.innerHTML = `<label class="fv-fb-prop-check">
					<input type="checkbox" data-key="${row.key}" ${field[row.key] ? "checked" : ""}>
					<span>${row.label}</span>
				</label>`;
				div.querySelector("input").addEventListener("change", e => {
					field[row.key] = e.target.checked ? 1 : 0;
					this._redraw();
					this._emitChange();
				});
			} else {
				div.innerHTML = `<label class="fv-fb-prop-label">${row.label}</label>
					<input type="text" class="fv-fb-prop-input" data-key="${row.key}"
						value="${this._esc(String(field[row.key] || ""))}" ${row.readonly ? "readonly" : ""}>`;
				div.querySelector("input").addEventListener("change", e => {
					field[row.key] = e.target.value;
					this._redraw();
					this._emitChange();
				});
			}
			body.appendChild(div);
		}
	}

	_clearProps() {
		const body = this._propsPanel.querySelector(".fv-fb-props-body");
		body.innerHTML = `<p class="fv-fb-props-hint">${__("Select a field to edit")}</p>`;
	}

	/* ── Actions ─────────────────────────────────────────────── */
	_handleAction(act) {
		if (act === "save" && this.opts.onSave) {
			this.opts.onSave(this.getSchema());
		} else if (act === "json") {
			const blob = new Blob([JSON.stringify(this.getSchema(), null, 2)], { type: "application/json" });
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = "form_schema.json";
			a.click();
		} else if (act === "preview") {
			this._showPreview();
		}
	}

	_showPreview() {
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			const html = this._fields.map(f => {
				if (["Section Break", "Column Break", "Tab Break"].includes(f.fieldtype)) {
					return `<hr><b>${f.label || f.fieldtype}</b>`;
				}
				return `<div style="margin:8px 0"><label><b>${this._esc(f.label)}</b> (${f.fieldtype})</label>
					<input type="text" style="width:100%;padding:4px;border:1px solid #ddd;border-radius:4px" placeholder="${this._esc(f.fieldname)}" ${f.reqd ? 'required' : ''}></div>`;
			}).join("");
			frappe.msgprint({ title: __("Form Preview"), message: html, indicator: "blue", wide: true });
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	getSchema() {
		return this._fields.map(f => {
			const out = { ...f };
			delete out._id;
			return out;
		});
	}

	setSchema(fields) {
		this._fields = fields.map(f => ({ ...f, _id: f._id || this._uid() }));
		this._selectedIdx = -1;
		this._redraw();
		this._clearProps();
	}

	getFields() { return this.getSchema(); }

	_emitChange() { if (this.opts.onChange) this.opts.onChange(this.getSchema()); }
	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-fb", `fv-fb--${this.opts.theme}`);
	}
}
