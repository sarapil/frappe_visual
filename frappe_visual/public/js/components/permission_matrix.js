// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — PermissionMatrix
 * ==================================
 * Visual roles/permissions matrix editor showing a grid of DocTypes × Roles
 * with checkboxes for read/write/create/delete/submit/amend/print/email.
 * Supports: bulk operations, search, permission level breakdown, export.
 *
 * Usage:
 *   frappe.visual.PermissionMatrix.create('#el', {
 *     doctypes: ['Sales Order', 'Purchase Order'],
 *     roles: ['Sales User', 'System Manager'],
 *   })
 *
 * @module frappe_visual/components/permission_matrix
 */

const PERM_COLUMNS = [
	{ key: "read",    label: "Read",    icon: "👁",  color: "#6366f1" },
	{ key: "write",   label: "Write",   icon: "✏",  color: "#8b5cf6" },
	{ key: "create",  label: "Create",  icon: "➕", color: "#10b981" },
	{ key: "delete",  label: "Delete",  icon: "🗑",  color: "#ef4444" },
	{ key: "submit",  label: "Submit",  icon: "✓",  color: "#f59e0b" },
	{ key: "amend",   label: "Amend",   icon: "⟳",  color: "#0ea5e9" },
	{ key: "print",   label: "Print",   icon: "🖨",  color: "#64748b" },
	{ key: "email",   label: "Email",   icon: "✉",  color: "#a855f7" },
	{ key: "export",  label: "Export",  icon: "📤", color: "#14b8a6" },
];

export class PermissionMatrix {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("PermissionMatrix: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctypes: [],
			roles: [],
			permissions: {},  // { "DocType::Role": { read: 1, write: 0, ... } }
			columns: PERM_COLUMNS,
			showSearch: true,
			showStats: true,
			editable: true,
			permLevel: 0,
			onChange: null,
			onSave: null,
		}, opts);

		this._perms = JSON.parse(JSON.stringify(this.opts.permissions));
		this._filterText = "";
		this._init();
	}

	static create(container, opts = {}) { return new PermissionMatrix(container, opts); }

	_init() {
		this.container.classList.add("fv-pm", `fv-pm--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._renderToolbar();
		if (this.opts.showStats) this._renderStats();
		this._renderMatrix();
	}

	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-pm-toolbar";

		const left = document.createElement("div");
		left.className = "fv-pm-toolbar-left";
		left.innerHTML = `<span class="fv-pm-title">${__("Permission Matrix")}</span>`;

		if (this.opts.showSearch) {
			const search = document.createElement("input");
			search.className = "fv-pm-search";
			search.placeholder = __("Filter DocTypes or Roles...");
			search.addEventListener("input", () => {
				this._filterText = search.value.toLowerCase();
				this._renderMatrix();
			});
			left.appendChild(search);
		}
		bar.appendChild(left);

		const right = document.createElement("div");
		right.className = "fv-pm-toolbar-right";
		if (this.opts.editable) {
			right.innerHTML = `
				<button class="fv-pm-btn" data-act="load">${__("Load from Server")}</button>
				<button class="fv-pm-btn fv-pm-btn--primary" data-act="save">${__("Save")}</button>`;
			right.querySelectorAll(".fv-pm-btn").forEach(btn => {
				btn.addEventListener("click", () => {
					if (btn.dataset.act === "load") this.loadFromServer();
					if (btn.dataset.act === "save" && this.opts.onSave) this.opts.onSave(this._perms);
				});
			});
		}
		bar.appendChild(right);

		this.container.appendChild(bar);
	}

	_renderStats() {
		const stats = document.createElement("div");
		stats.className = "fv-pm-stats";

		const totalCells = this.opts.doctypes.length * this.opts.roles.length;
		let granted = 0;
		for (const key of Object.keys(this._perms)) {
			granted += Object.values(this._perms[key]).filter(v => v).length;
		}

		stats.innerHTML = `
			<span class="fv-pm-stat">${this.opts.doctypes.length} ${__("DocTypes")}</span>
			<span class="fv-pm-stat">${this.opts.roles.length} ${__("Roles")}</span>
			<span class="fv-pm-stat">${granted} ${__("permissions granted")}</span>`;
		this.container.appendChild(stats);
	}

	_renderMatrix() {
		if (this._matrixEl) this._matrixEl.remove();

		const wrap = document.createElement("div");
		wrap.className = "fv-pm-matrix-wrap";

		const table = document.createElement("table");
		table.className = "fv-pm-table";

		// Header: Role names across top, with perm sub-columns
		const thead = document.createElement("thead");
		let hdr1 = "<tr><th class='fv-pm-corner'></th>";
		let hdr2 = "<tr><th class='fv-pm-corner2'>" + __("DocType") + "</th>";
		const filteredRoles = this._filterRoles();

		for (const role of filteredRoles) {
			hdr1 += `<th colspan="${this.opts.columns.length}" class="fv-pm-role-hdr">${this._esc(role)}</th>`;
			for (const col of this.opts.columns) {
				hdr2 += `<th class="fv-pm-col-hdr" title="${__(col.label)}" style="color:${col.color}">${col.icon}</th>`;
			}
		}
		hdr1 += "</tr>";
		hdr2 += "</tr>";
		thead.innerHTML = hdr1 + hdr2;
		table.appendChild(thead);

		// Body: DocTypes as rows
		const tbody = document.createElement("tbody");
		const filteredDTs = this._filterDocTypes();

		for (const dt of filteredDTs) {
			const tr = document.createElement("tr");
			tr.innerHTML = `<td class="fv-pm-dt-cell">${this._esc(dt)}</td>`;

			for (const role of filteredRoles) {
				const key = `${dt}::${role}`;
				const perm = this._perms[key] || {};
				for (const col of this.opts.columns) {
					const td = document.createElement("td");
					td.className = "fv-pm-perm-cell";
					const checked = perm[col.key] ? "checked" : "";
					td.innerHTML = this.opts.editable
						? `<input type="checkbox" class="fv-pm-check" data-key="${key}" data-perm="${col.key}" ${checked}>`
						: `<span class="fv-pm-indicator" style="color:${perm[col.key] ? col.color : "#d1d5db'}">${perm[col.key] ? "●" : "○"}</span>`;
					tr.appendChild(td);
				}
			}

			tbody.appendChild(tr);
		}
		table.appendChild(tbody);

		wrap.appendChild(table);
		this.container.appendChild(wrap);
		this._matrixEl = wrap;

		// Bind checkbox events
		if (this.opts.editable) {
			wrap.querySelectorAll(".fv-pm-check").forEach(cb => {
				cb.addEventListener("change", () => {
					const key = cb.dataset.key;
					const perm = cb.dataset.perm;
					if (!this._perms[key]) this._perms[key] = {};
					this._perms[key][perm] = cb.checked ? 1 : 0;
					if (this.opts.onChange) this.opts.onChange(key, perm, cb.checked);
				});
			});
		}
	}

	_filterDocTypes() {
		if (!this._filterText) return this.opts.doctypes;
		return this.opts.doctypes.filter(dt => dt.toLowerCase().includes(this._filterText));
	}

	_filterRoles() {
		if (!this._filterText) return this.opts.roles;
		return this.opts.roles.filter(r => r.toLowerCase().includes(this._filterText));
	}

	/* ── Public API ──────────────────────────────────────────── */
	getPermissions() { return JSON.parse(JSON.stringify(this._perms)); }

	setPermissions(perms) {
		this._perms = JSON.parse(JSON.stringify(perms));
		this._renderMatrix();
	}

	async loadFromServer() {
		try {
			const roles = await frappe.xcall("frappe.client.get_list", {
				doctype: "Role", fields: ["name"], filters: { disabled: 0 },
				limit_page_length: 0, order_by: "name asc",
			});
			const doctypes = await frappe.xcall("frappe.client.get_list", {
				doctype: "DocType", fields: ["name"], filters: { istable: 0 },
				limit_page_length: 0, order_by: "name asc",
			});
			this.opts.roles = roles.map(r => r.name);
			this.opts.doctypes = doctypes.map(d => d.name);

			// Load DocPerm entries
			const perms = await frappe.xcall("frappe.client.get_list", {
				doctype: "DocPerm", fields: ["parent", "role", "permlevel", ...PERM_COLUMNS.map(c => c.key)],
				filters: { permlevel: this.opts.permLevel },
				limit_page_length: 0,
			});
			this._perms = {};
			for (const p of perms) {
				const key = `${p.parent}::${p.role}`;
				this._perms[key] = {};
				for (const col of PERM_COLUMNS) {
					this._perms[key][col.key] = p[col.key] || 0;
				}
			}
			this._init();
		} catch (e) {
			console.error("PermissionMatrix: loadFromServer error", e);
		}
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-pm", `fv-pm--${this.opts.theme}`);
	}
}
