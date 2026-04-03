/**
 * Frappe Visual — SchemaDesigner
 * ================================
 * Visual DocType schema editor with drag-drop field reordering,
 * field type selection, link relationship arrows, and ERD preview.
 * Creates an interactive representation of a Frappe DocType's structure.
 *
 * Usage:
 *   frappe.visual.SchemaDesigner.create('#el', {
 *     doctype: 'Sales Order',
 *     onSave: (schema) => {},
 *   })
 *
 * @module frappe_visual/components/schema_designer
 */

const FIELD_TYPE_COLORS = {
	Data: "#6366f1", Int: "#8b5cf6", Float: "#a855f7", Currency: "#10b981",
	Date: "#f59e0b", Link: "#0ea5e9", Select: "#14b8a6", Check: "#64748b",
	"Text Editor": "#ec4899", Table: "#ef4444", "Section Break": "#94a3b8",
	"Column Break": "#94a3b8", "Tab Break": "#94a3b8",
};

export class SchemaDesigner {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("SchemaDesigner: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctype: null,
			fields: [],
			showRelationships: true,
			showERD: true,
			editable: true,
			onSave: null,
			onChange: null,
		}, opts);

		this._fields = JSON.parse(JSON.stringify(this.opts.fields));
		this._relationships = [];
		this._selectedIdx = -1;
		this._init();
	}

	static create(container, opts = {}) { return new SchemaDesigner(container, opts); }

	async _init() {
		this.container.classList.add("fv-sd", `fv-sd--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (this.opts.doctype && this._fields.length === 0) {
			await this._loadFromDocType();
		}

		this._renderToolbar();
		this._renderLayout();
	}

	async _loadFromDocType() {
		try {
			const meta = await frappe.xcall("frappe.client.get", {
				doctype: "DocType", name: this.opts.doctype,
			});
			this._fields = (meta.fields || []).map(f => ({
				fieldname: f.fieldname,
				fieldtype: f.fieldtype,
				label: f.label,
				options: f.options,
				reqd: f.reqd,
				hidden: f.hidden,
				read_only: f.read_only,
				in_list_view: f.in_list_view,
				in_standard_filter: f.in_standard_filter,
				default: f.default,
				description: f.description,
				depends_on: f.depends_on,
			}));

			// Extract relationships (Link fields)
			this._relationships = this._fields
				.filter(f => f.fieldtype === "Link" && f.options)
				.map(f => ({
					fieldname: f.fieldname,
					label: f.label,
					target: f.options,
				}));
		} catch (e) {
			console.error("SchemaDesigner: loadFromDocType error", e);
		}
	}

	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-sd-toolbar";
		bar.innerHTML = `
			<div class="fv-sd-toolbar-left">
				<span class="fv-sd-title">${this._esc(this.opts.doctype || __("Schema Designer"))}</span>
				<span class="fv-sd-count">${this._fields.length} ${__("fields")}</span>
			</div>
			<div class="fv-sd-toolbar-right">
				<button class="fv-sd-btn" data-act="erd" title="${__("Show ERD")}">🔗 ${__("ERD")}</button>
				<button class="fv-sd-btn" data-act="json" title="${__("Export JSON")}">📋 ${__("JSON")}</button>
				${this.opts.editable ? `<button class="fv-sd-btn fv-sd-btn--primary" data-act="save">${__("Save")}</button>` : ""}
			</div>`;

		bar.querySelectorAll(".fv-sd-btn").forEach(btn => {
			btn.addEventListener("click", () => this._handleAction(btn.dataset.act));
		});

		this.container.appendChild(bar);
	}

	_renderLayout() {
		const layout = document.createElement("div");
		layout.className = "fv-sd-layout";

		// Schema table
		const main = document.createElement("div");
		main.className = "fv-sd-main";
		layout.appendChild(main);
		this._mainEl = main;

		// Relationship sidebar
		if (this.opts.showRelationships && this._relationships.length > 0) {
			const sidebar = document.createElement("div");
			sidebar.className = "fv-sd-sidebar";
			sidebar.innerHTML = `
				<div class="fv-sd-sidebar-title">${__("Relationships")}</div>
				${this._relationships.map(r => `
					<div class="fv-sd-rel">
						<span class="fv-sd-rel-field">${this._esc(r.label || r.fieldname)}</span>
						<span class="fv-sd-rel-arrow">→</span>
						<span class="fv-sd-rel-target">${this._esc(r.target)}</span>
					</div>`).join("")}`;
			layout.appendChild(sidebar);
		}

		this.container.appendChild(layout);
		this._renderFieldTable();
	}

	_renderFieldTable() {
		this._mainEl.innerHTML = "";

		const table = document.createElement("table");
		table.className = "fv-sd-table";

		// Header
		table.innerHTML = `<thead><tr>
			<th class="fv-sd-th-drag"></th>
			<th>${__("Field Name")}</th>
			<th>${__("Label")}</th>
			<th>${__("Type")}</th>
			<th>${__("Options")}</th>
			<th class="fv-sd-th-flags">${__("Flags")}</th>
			${this.opts.editable ? `<th></th>` : ""}
		</tr></thead>`;

		const tbody = document.createElement("tbody");

		for (let i = 0; i < this._fields.length; i++) {
			const f = this._fields[i];
			const isLayout = ["Section Break", "Column Break", "Tab Break"].includes(f.fieldtype);
			const typeColor = FIELD_TYPE_COLORS[f.fieldtype] || "#64748b";
			const isSelected = i === this._selectedIdx;

			const tr = document.createElement("tr");
			tr.className = `fv-sd-row ${isLayout ? "fv-sd-row--layout" : ""} ${isSelected ? "fv-sd-row--selected" : ""}`;
			tr.dataset.idx = i;

			let flags = "";
			if (f.reqd) flags += '<span class="fv-sd-flag fv-sd-flag--req" title="Required">*</span>';
			if (f.hidden) flags += '<span class="fv-sd-flag fv-sd-flag--hid" title="Hidden">H</span>';
			if (f.read_only) flags += '<span class="fv-sd-flag fv-sd-flag--ro" title="Read Only">R</span>';
			if (f.in_list_view) flags += '<span class="fv-sd-flag fv-sd-flag--lv" title="In List View">L</span>';

			tr.innerHTML = `
				<td class="fv-sd-drag-cell">⠿</td>
				<td class="fv-sd-fname"><code>${this._esc(f.fieldname)}</code></td>
				<td>${this._esc(f.label || "")}</td>
				<td><span class="fv-sd-type-badge" style="background:${typeColor}">${f.fieldtype}</span></td>
				<td class="fv-sd-opts">${this._esc(f.options || "")}</td>
				<td class="fv-sd-flags">${flags}</td>
				${this.opts.editable ? `<td class="fv-sd-actions">
					<button class="fv-sd-act" data-act="up" title="${__("Up")}">↑</button>
					<button class="fv-sd-act" data-act="down" title="${__("Down")}">↓</button>
					<button class="fv-sd-act fv-sd-act--del" data-act="del" title="${__("Delete")}">✕</button>
				</td>` : ""}`;

			tr.addEventListener("click", (e) => {
				if (!e.target.closest(".fv-sd-act")) {
					this._selectedIdx = i;
					this._renderFieldTable();
				}
			});

			if (this.opts.editable) {
				tr.querySelectorAll(".fv-sd-act").forEach(btn => {
					btn.addEventListener("click", (e) => {
						e.stopPropagation();
						if (btn.dataset.act === "up" && i > 0) {
							[this._fields[i - 1], this._fields[i]] = [this._fields[i], this._fields[i - 1]];
							this._selectedIdx = i - 1;
						} else if (btn.dataset.act === "down" && i < this._fields.length - 1) {
							[this._fields[i], this._fields[i + 1]] = [this._fields[i + 1], this._fields[i]];
							this._selectedIdx = i + 1;
						} else if (btn.dataset.act === "del") {
							this._fields.splice(i, 1);
							this._selectedIdx = -1;
						}
						this._renderFieldTable();
						if (this.opts.onChange) this.opts.onChange(this._fields);
					});
				});

				// Drag reorder
				tr.draggable = true;
				tr.addEventListener("dragstart", e => {
					e.dataTransfer.setData("text/plain", String(i));
					tr.classList.add("fv-sd-row--dragging");
				});
				tr.addEventListener("dragend", () => tr.classList.remove("fv-sd-row--dragging"));
				tr.addEventListener("dragover", e => e.preventDefault());
				tr.addEventListener("drop", e => {
					e.preventDefault();
					const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
					if (!isNaN(fromIdx) && fromIdx !== i) {
						const [moved] = this._fields.splice(fromIdx, 1);
						this._fields.splice(i, 0, moved);
						this._renderFieldTable();
						if (this.opts.onChange) this.opts.onChange(this._fields);
					}
				});
			}

			tbody.appendChild(tr);
		}

		table.appendChild(tbody);
		this._mainEl.appendChild(table);

		if (this._fields.length === 0) {
			this._mainEl.innerHTML = `<div class="fv-sd-empty">${__("No fields found. Load a DocType or add fields.")}</div>`;
		}
	}

	_handleAction(act) {
		if (act === "save" && this.opts.onSave) {
			this.opts.onSave(this._fields);
		} else if (act === "json") {
			const blob = new Blob([JSON.stringify(this._fields, null, 2)], { type: "application/json" });
			const a = document.createElement("a");
			a.href = URL.createObjectURL(blob);
			a.download = `${this.opts.doctype || "schema"}_fields.json`;
			a.click();
		} else if (act === "erd") {
			this._showERD();
		}
	}

	_showERD() {
		if (typeof frappe !== "undefined" && frappe.msgprint) {
			const links = this._relationships.map(r =>
				`<div style="padding:4px 0;font-size:13px">
					<code>${this._esc(r.fieldname)}</code> → <b>${this._esc(r.target)}</b>
				</div>`).join("");
			frappe.msgprint({
				title: __("Entity Relationships for {0}", [this.opts.doctype]),
				message: links || __("No Link fields found"),
				indicator: "blue",
			});
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	getFields() { return JSON.parse(JSON.stringify(this._fields)); }
	setFields(fields) { this._fields = JSON.parse(JSON.stringify(fields)); this._renderFieldTable(); }
	getRelationships() { return [...this._relationships]; }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sd", `fv-sd--${this.opts.theme}`);
	}
}
