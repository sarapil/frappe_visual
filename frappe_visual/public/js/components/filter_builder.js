// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Tag / Filter Builder
 * =======================================
 * Visual query builder with AND/OR groups, field-type-aware operators,
 * tag chips, saved presets, and Frappe DocType meta auto-loading.
 *
 * Features:
 *  - AND / OR condition groups (nestable)
 *  - Field picker auto-loads from DocType meta
 *  - Type-aware operators (text: contains/=; number: >/</between; date: before/after)
 *  - Value input adapts to field type (text, number, date, select, link)
 *  - Tag chip display for active filters
 *  - Save / Load presets (localStorage + optional server)
 *  - Apply → returns Frappe-compatible filters array
 *  - Clear all / remove individual filters
 *  - Compact (inline) and expanded (panel) modes
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.FilterBuilder.create('#el', { doctype, onApply })
 *
 * @module frappe_visual/components/filter_builder
 */

const OPERATORS = {
	Data:      [["=", "equals"], ["!=", "not equals"], ["like", "contains"], ["not like", "not contains"], ["is", "is set/not set"]],
	Text:      [["=", "equals"], ["like", "contains"], ["not like", "not contains"]],
	Int:       [["=", "="], ["!=", "≠"], [">", ">"], ["<", "<"], [">=", "≥"], ["<=", "≤"], ["between", "between"]],
	Float:     [["=", "="], ["!=", "≠"], [">", ">"], ["<", "<"], [">=", "≥"], ["<=", "≤"], ["between", "between"]],
	Currency:  [["=", "="], ["!=", "≠"], [">", ">"], ["<", "<"], [">=", "≥"], ["<=", "≤"], ["between", "between"]],
	Date:      [["=", "on"], ["!=", "not on"], [">", "after"], ["<", "before"], [">=", "on/after"], ["<=", "on/before"], ["between", "between"], ["Timespan", "timespan"]],
	Datetime:  [["=", "on"], [">", "after"], ["<", "before"], ["between", "between"]],
	Select:    [["=", "equals"], ["!=", "not equals"], ["in", "in"], ["not in", "not in"]],
	Link:      [["=", "equals"], ["!=", "not equals"], ["like", "contains"], ["is", "is set/not set"]],
	Check:     [["=", "is"]],
};

const TIMESPANS = ["Last Week", "Last Month", "Last Quarter", "Last Year", "This Week", "This Month", "This Quarter", "This Year"];

function _esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

export class FilterBuilder {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("FilterBuilder: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctype: null,
			mode: "expanded",     // expanded | compact
			onApply: null,
			onChange: null,
			presetsKey: null,     // localStorage key for presets
			maxConditions: 20,
		}, opts);

		this._fields = [];
		this._groups = [this._newGroup("AND")];
		this._presets = this._loadPresets();
		this._init();
	}

	static create(container, opts) { return new FilterBuilder(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	async _init() {
		this.container.classList.add("fv-fb", `fv-fb--${this.opts.theme}`, `fv-fb--${this.opts.mode}`);
		this.container.innerHTML = "";

		if (this.opts.doctype) await this._loadFields();
		this._render();
	}

	async _loadFields() {
		try {
			const meta = await frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "DocField",
					filters: { parent: this.opts.doctype, fieldtype: ["not in", ["Section Break", "Column Break", "Tab Break", "HTML", "Button"]] },
					fields: ["fieldname", "label", "fieldtype", "options"],
					order_by: "idx asc",
					limit_page_length: 200,
				},
			});
			this._fields = (meta.message || []).map(f => ({
				value: f.fieldname,
				label: f.label || f.fieldname,
				type: f.fieldtype,
				options: f.options,
			}));
		} catch (e) {
			console.error("FilterBuilder: field load error", e);
		}
	}

	/* ── Data Model ──────────────────────────────────────────── */
	_newGroup(logic = "AND") {
		return { id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, logic, conditions: [] };
	}

	_newCondition() {
		return { id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, field: "", operator: "=", value: "" };
	}

	/* ── Render ──────────────────────────────────────────────── */
	_render() {
		this.container.innerHTML = "";

		// Tag chips (compact mode or always-visible summary)
		this._renderChips();

		// Groups
		const groupsWrap = document.createElement("div");
		groupsWrap.className = "fv-fb-groups";

		this._groups.forEach((group, gi) => {
			const gEl = document.createElement("div");
			gEl.className = "fv-fb-group";

			// Group header
			const header = document.createElement("div");
			header.className = "fv-fb-group-header";
			header.innerHTML = `
				<select class="fv-fb-logic" data-gidx="${gi}">
					<option value="AND" ${group.logic === "AND" ? "selected" : ""}>AND</option>
					<option value="OR" ${group.logic === "OR" ? "selected" : ""}>OR</option>
				</select>
				${this._groups.length > 1 ? `<button class="fv-fb-btn-icon fv-fb-remove-group" data-gidx="${gi}" title="${__("Remove group")}">✕</button>` : ""}
			`;
			gEl.appendChild(header);

			header.querySelector(".fv-fb-logic").addEventListener("change", (e) => {
				this._groups[gi].logic = e.target.value;
				this._emitChange();
			});

			const rmGroup = header.querySelector(".fv-fb-remove-group");
			if (rmGroup) rmGroup.addEventListener("click", () => { this._groups.splice(gi, 1); this._render(); this._emitChange(); });

			// Conditions
			group.conditions.forEach((cond, ci) => {
				const row = this._renderConditionRow(cond, gi, ci);
				gEl.appendChild(row);
			});

			// Add condition button
			const addBtn = document.createElement("button");
			addBtn.className = "fv-fb-btn fv-fb-add-cond";
			addBtn.textContent = `+ ${__("Add condition")}`;
			addBtn.addEventListener("click", () => {
				group.conditions.push(this._newCondition());
				this._render();
			});
			gEl.appendChild(addBtn);

			groupsWrap.appendChild(gEl);
		});

		this.container.appendChild(groupsWrap);

		// Footer
		const footer = document.createElement("div");
		footer.className = "fv-fb-footer";
		footer.innerHTML = `
			<button class="fv-fb-btn fv-fb-add-group">+ ${__("Add group")}</button>
			<div class="fv-fb-footer-right">
				${this.opts.presetsKey ? `<button class="fv-fb-btn fv-fb-save-preset">${__("Save Preset")}</button>` : ""}
				${this._presets.length ? `<select class="fv-fb-preset-select"><option value="">${__("Load preset…")}</option>${
					this._presets.map((p, i) => `<option value="${i}">${_esc(p.name)}</option>`).join("")
				}</select>` : ""}
				<button class="fv-fb-btn fv-fb-clear">${__("Clear")}</button>
				<button class="fv-fb-btn fv-fb-apply fv-fb-btn-primary">${__("Apply")}</button>
			</div>`;
		this.container.appendChild(footer);

		footer.querySelector(".fv-fb-add-group").addEventListener("click", () => {
			this._groups.push(this._newGroup("OR"));
			this._render();
		});

		footer.querySelector(".fv-fb-clear")?.addEventListener("click", () => this.clear());
		footer.querySelector(".fv-fb-apply")?.addEventListener("click", () => this.apply());

		const savePre = footer.querySelector(".fv-fb-save-preset");
		if (savePre) savePre.addEventListener("click", () => this._savePreset());

		const loadPre = footer.querySelector(".fv-fb-preset-select");
		if (loadPre) loadPre.addEventListener("change", (e) => {
			if (e.target.value !== "") this._loadPreset(parseInt(e.target.value));
		});
	}

	_renderConditionRow(cond, gi, ci) {
		const row = document.createElement("div");
		row.className = "fv-fb-condition";

		const field = this._fields.find(f => f.value === cond.field);
		const ftype = field?.type || "Data";
		const ops = OPERATORS[ftype] || OPERATORS.Data;

		row.innerHTML = `
			<select class="fv-fb-field" data-gi="${gi}" data-ci="${ci}">
				<option value="">${__("Select field…")}</option>
				${this._fields.map(f => `<option value="${_esc(f.value)}" ${f.value === cond.field ? "selected" : ""}>${_esc(f.label)}</option>`).join("")}
			</select>
			<select class="fv-fb-operator" data-gi="${gi}" data-ci="${ci}">
				${ops.map(([val, lbl]) => `<option value="${val}" ${val === cond.operator ? "selected" : ""}>${_esc(lbl)}</option>`).join("")}
			</select>
			${this._renderValueInput(cond, field, ftype)}
			<button class="fv-fb-btn-icon fv-fb-remove-cond" data-gi="${gi}" data-ci="${ci}" title="${__("Remove")}">✕</button>
		`;

		// Events
		row.querySelector(".fv-fb-field").addEventListener("change", (e) => {
			cond.field = e.target.value;
			cond.operator = "=";
			cond.value = "";
			this._render();
			this._emitChange();
		});

		row.querySelector(".fv-fb-operator").addEventListener("change", (e) => {
			cond.operator = e.target.value;
			this._emitChange();
		});

		const valInput = row.querySelector(".fv-fb-value");
		if (valInput) valInput.addEventListener("change", (e) => { cond.value = e.target.value; this._emitChange(); });
		if (valInput) valInput.addEventListener("input", (e) => { cond.value = e.target.value; });

		const valInput2 = row.querySelector(".fv-fb-value2");
		if (valInput2) valInput2.addEventListener("change", (e) => { cond.value2 = e.target.value; this._emitChange(); });

		row.querySelector(".fv-fb-remove-cond").addEventListener("click", () => {
			this._groups[gi].conditions.splice(ci, 1);
			this._render();
			this._emitChange();
		});

		return row;
	}

	_renderValueInput(cond, field, ftype) {
		if (cond.operator === "is") {
			return `<select class="fv-fb-value">
				<option value="set" ${cond.value === "set" ? "selected" : ""}>${__("Set")}</option>
				<option value="not set" ${cond.value === "not set" ? "selected" : ""}>${__("Not Set")}</option>
			</select>`;
		}

		if (cond.operator === "Timespan") {
			return `<select class="fv-fb-value">
				${TIMESPANS.map(t => `<option value="${t}" ${cond.value === t ? "selected" : ""}>${__(t)}</option>`).join("")}
			</select>`;
		}

		if (cond.operator === "between") {
			const type = ["Int", "Float", "Currency"].includes(ftype) ? "number" : "date";
			return `<input class="fv-fb-value" type="${type}" value="${_esc(cond.value)}" placeholder="${__("From")}" />
					<input class="fv-fb-value2" type="${type}" value="${_esc(cond.value2 || "")}" placeholder="${__("To")}" />`;
		}

		if (ftype === "Check") return `<select class="fv-fb-value"><option value="1" ${cond.value === "1" ? "selected" : ""}>Yes</option><option value="0" ${cond.value === "0" ? "selected" : ""}>No</option></select>`;
		if (ftype === "Select" && field?.options) {
			const opts = field.options.split("\n").filter(Boolean);
			return `<select class="fv-fb-value"><option value="">${__("Select…")}</option>${opts.map(o => `<option value="${_esc(o)}" ${o === cond.value ? "selected" : ""}>${_esc(o)}</option>`).join("")}</select>`;
		}
		if (ftype === "Date" || ftype === "Datetime") return `<input class="fv-fb-value" type="date" value="${_esc(cond.value)}" />`;
		if (["Int", "Float", "Currency"].includes(ftype)) return `<input class="fv-fb-value" type="number" value="${_esc(cond.value)}" placeholder="${__("Value")}" />`;

		return `<input class="fv-fb-value" type="text" value="${_esc(cond.value)}" placeholder="${__("Value")}" />`;
	}

	/* ── Tag Chips ───────────────────────────────────────────── */
	_renderChips() {
		const chips = document.createElement("div");
		chips.className = "fv-fb-chips";

		const allConds = this._getAllConditions();
		if (allConds.length === 0) return;

		for (const { cond, gi, ci } of allConds) {
			if (!cond.field) continue;
			const field = this._fields.find(f => f.value === cond.field);
			const label = field?.label || cond.field;
			const ops = OPERATORS[field?.type || "Data"] || OPERATORS.Data;
			const opLabel = (ops.find(o => o[0] === cond.operator) || [])[1] || cond.operator;

			const chip = document.createElement("span");
			chip.className = "fv-fb-chip";
			chip.innerHTML = `<strong>${_esc(label)}</strong> ${_esc(opLabel)} <em>${_esc(cond.value || "")}</em>
				<button class="fv-fb-chip-remove" data-gi="${gi}" data-ci="${ci}">✕</button>`;
			chip.querySelector(".fv-fb-chip-remove").addEventListener("click", () => {
				this._groups[gi].conditions.splice(ci, 1);
				this._render();
				this._emitChange();
			});
			chips.appendChild(chip);
		}

		this.container.appendChild(chips);
	}

	_getAllConditions() {
		const result = [];
		this._groups.forEach((group, gi) => {
			group.conditions.forEach((cond, ci) => result.push({ cond, gi, ci }));
		});
		return result;
	}

	/* ── Presets ──────────────────────────────────────────────── */
	_loadPresets() {
		if (!this.opts.presetsKey) return [];
		try { return JSON.parse(localStorage.getItem(`fv_fb_${this.opts.presetsKey}`) || "[]"); }
		catch { return []; }
	}

	_savePreset() {
		const name = prompt(__("Preset name:"));
		if (!name) return;
		this._presets.push({ name, groups: JSON.parse(JSON.stringify(this._groups)) });
		if (this.opts.presetsKey) {
			localStorage.setItem(`fv_fb_${this.opts.presetsKey}`, JSON.stringify(this._presets));
		}
		this._render();
	}

	_loadPreset(idx) {
		const preset = this._presets[idx];
		if (!preset) return;
		this._groups = JSON.parse(JSON.stringify(preset.groups));
		this._render();
		this._emitChange();
	}

	/* ── Apply ───────────────────────────────────────────────── */
	apply() {
		const filters = this.getFilters();
		if (this.opts.onApply) this.opts.onApply(filters);
		return filters;
	}

	getFilters() {
		// Convert to Frappe-compatible filter format: [[doctype, field, operator, value], ...]
		const filters = [];
		for (const group of this._groups) {
			for (const cond of group.conditions) {
				if (!cond.field || !cond.operator) continue;
				let val = cond.value;
				if (cond.operator === "between" && cond.value2) val = [cond.value, cond.value2];
				if (cond.operator === "like") val = `%${val}%`;
				if (cond.operator === "not like") val = `%${val}%`;
				filters.push([this.opts.doctype || "", cond.field, cond.operator, val]);
			}
		}
		return filters;
	}

	clear() {
		this._groups = [this._newGroup("AND")];
		this._render();
		this._emitChange();
	}

	_emitChange() { if (this.opts.onChange) this.opts.onChange(this.getFilters()); }

	/* ── Public API ──────────────────────────────────────────── */
	setDocType(dt) { this.opts.doctype = dt; this._init(); }
	setFilters(groups) { this._groups = groups; this._render(); }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-fb", `fv-fb--${this.opts.theme}`);
	}
}
