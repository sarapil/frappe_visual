// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVFieldRenderer — Visual Field Component System
 * ==================================================
 * Provides visual field components for building custom forms
 * outside Frappe's default form engine. Each field type renders
 * a self-contained, styleable, RTL-aware input component.
 *
 * Supports all standard Frappe field types with visual enhancements:
 * - Data, Int, Float, Currency, Percent, Date, Datetime, Time
 * - Select, Link, Dynamic Link, Check, Text, Small Text, Long Text
 * - Table, Attach, Attach Image, Color, Rating, Signature, Code, HTML
 * - Section Break, Column Break, Tab Break
 *
 * Usage:
 *   // Single field
 *   const field = FVFieldRenderer.render(container, {
 *     fieldname: "customer",
 *     fieldtype: "Link",
 *     options: "Customer",
 *     label: __("Customer"),
 *     reqd: 1,
 *     onChange: (value) => console.log(value),
 *   });
 *
 *   // Form layout from DocType meta
 *   const form = FVFieldRenderer.renderForm(container, "Sales Order", { mode: "new" });
 */

export class FVFieldRenderer {
	/** Render a single field into a container */
	static render(container, fieldDef, value = null) {
		const renderer = new FVFieldRenderer(container, fieldDef);
		if (value != null) renderer.setValue(value);
		return renderer;
	}

	/** Render a full form from DocType meta fields */
	static async renderForm(container, doctype, opts = {}) {
		const target = typeof container === "string"
			? document.querySelector(container) : container;

		const meta = frappe.get_meta(doctype) || await frappe.xcall("frappe.client.get_list", {
			doctype: "DocField",
			filters: { parent: doctype, parenttype: "DocType" },
			fields: ["*"],
			order_by: "idx asc",
			limit_page_length: 0,
		});

		const fields = meta.fields || meta;
		const form = document.createElement("div");
		form.className = "fv-field-form fv-fx-page-enter";

		let currentRow = null;
		let currentSection = null;
		let currentTab = null;
		const fieldInstances = {};

		fields.forEach(f => {
			if (f.fieldtype === "Tab Break") {
				currentTab = document.createElement("div");
				currentTab.className = "fv-field-form__tab";
				if (f.label) {
					currentTab.dataset.tabLabel = __(f.label);
				}
				form.appendChild(currentTab);
				currentSection = null;
				currentRow = null;
				return;
			}

			if (f.fieldtype === "Section Break") {
				currentSection = document.createElement("div");
				currentSection.className = "fv-field-form__section fv-fx-glass";
				if (f.label) {
					const header = document.createElement("div");
					header.className = "fv-field-form__section-header";
					header.textContent = __(f.label);
					currentSection.appendChild(header);
				}
				currentRow = document.createElement("div");
				currentRow.className = "fv-field-form__row";
				currentSection.appendChild(currentRow);

				const target_container = currentTab || form;
				target_container.appendChild(currentSection);
				return;
			}

			if (f.fieldtype === "Column Break") {
				if (currentSection) {
					currentRow = document.createElement("div");
					currentRow.className = "fv-field-form__row";
					currentSection.appendChild(currentRow);
				}
				return;
			}

			// Skip hidden fields
			if (f.hidden || f.fieldtype === "Button") return;

			const wrapper = document.createElement("div");
			wrapper.className = "fv-field-form__field";

			const targetRow = currentRow || (() => {
				if (!currentSection) {
					currentSection = document.createElement("div");
					currentSection.className = "fv-field-form__section fv-fx-glass";
					const target_container = currentTab || form;
					target_container.appendChild(currentSection);
				}
				currentRow = document.createElement("div");
				currentRow.className = "fv-field-form__row";
				currentSection.appendChild(currentRow);
				return currentRow;
			})();

			const instance = FVFieldRenderer.render(wrapper, f, opts.values?.[f.fieldname]);
			fieldInstances[f.fieldname] = instance;
			targetRow.appendChild(wrapper);
		});

		target.innerHTML = "";
		target.appendChild(form);

		return {
			element: form,
			fields: fieldInstances,
			getValues() {
				const values = {};
				Object.entries(fieldInstances).forEach(([name, inst]) => {
					values[name] = inst.getValue();
				});
				return values;
			},
			setValue(fieldname, value) {
				fieldInstances[fieldname]?.setValue(value);
			},
			validate() {
				let valid = true;
				Object.entries(fieldInstances).forEach(([name, inst]) => {
					if (!inst.validate()) valid = false;
				});
				return valid;
			},
		};
	}

	constructor(container, fieldDef) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		this.def = Object.assign({
			fieldname: "",
			fieldtype: "Data",
			label: "",
			options: "",
			reqd: 0,
			read_only: 0,
			default: null,
			placeholder: "",
			description: "",
			onChange: null,
		}, fieldDef);

		this._value = this.def.default || null;
		this._inputEl = null;
		this._render();
	}

	_render() {
		const wrapper = document.createElement("div");
		wrapper.className = `fv-field fv-field--${this.def.fieldtype.toLowerCase().replace(/ /g, "-")}`;
		wrapper.dataset.fieldname = this.def.fieldname;

		// Label
		if (this.def.label && !["Section Break", "Column Break", "Tab Break"].includes(this.def.fieldtype)) {
			const label = document.createElement("label");
			label.className = "fv-field__label";
			label.setAttribute("for", `fv-f-${this.def.fieldname}`);
			label.innerHTML = `${frappe.utils.escape_html(__(this.def.label))}${this.def.reqd ? " <span class='fv-required'>*</span>" : ""}`;
			wrapper.appendChild(label);
		}

		// Input
		const input = this._createInput();
		if (input) {
			wrapper.appendChild(input);
			this._inputEl = input.querySelector("input, select, textarea") || input;
		}

		// Description
		if (this.def.description) {
			const desc = document.createElement("div");
			desc.className = "fv-field__description";
			desc.textContent = __(this.def.description);
			wrapper.appendChild(desc);
		}

		this.container.appendChild(wrapper);
		this._wrapper = wrapper;
	}

	_createInput() {
		const id = `fv-f-${this.def.fieldname}`;
		const ro = this.def.read_only ? "readonly" : "";
		const req = this.def.reqd ? "required" : "";
		const ph = frappe.utils.escape_html(this.def.placeholder || "");

		const wrap = document.createElement("div");
		wrap.className = "fv-field__input-wrap";

		switch (this.def.fieldtype) {
			case "Data":
			case "Phone":
			case "Barcode":
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="text" placeholder="${ph}" ${ro} ${req} />`;
				break;

			case "Password":
				wrap.innerHTML = `<div class="fv-input-group">
					<input id="${id}" class="fv-input" type="password" placeholder="${ph}" ${ro} ${req} />
					<button type="button" class="fv-input-group__btn" tabindex="-1"><i class="ti ti-eye"></i></button>
				</div>`;
				const toggleBtn = wrap.querySelector(".fv-input-group__btn");
				toggleBtn?.addEventListener("click", () => {
					const inp = wrap.querySelector("input");
					inp.type = inp.type === "password" ? "text" : "password";
					toggleBtn.querySelector("i").className = inp.type === "password" ? "ti ti-eye" : "ti ti-eye-off";
				});
				break;

			case "Int":
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="number" step="1" placeholder="${ph}" ${ro} ${req} />`;
				break;

			case "Float":
			case "Percent":
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="number" step="any" placeholder="${ph}" ${ro} ${req} />`;
				break;

			case "Currency":
				wrap.innerHTML = `<div class="fv-input-group">
					<span class="fv-input-group__prefix">${frappe.boot?.sysdefaults?.currency || "$"}</span>
					<input id="${id}" class="fv-input" type="number" step="0.01" placeholder="${ph}" ${ro} ${req} />
				</div>`;
				break;

			case "Date":
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="date" ${ro} ${req} />`;
				break;

			case "Datetime":
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="datetime-local" ${ro} ${req} />`;
				break;

			case "Time":
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="time" ${ro} ${req} />`;
				break;

			case "Select": {
				const options = (this.def.options || "").split("\n").filter(Boolean);
				wrap.innerHTML = `<select id="${id}" class="fv-input fv-input--select" ${ro} ${req}>
					<option value="">${__("Select")}...</option>
					${options.map(o => `<option value="${frappe.utils.escape_html(o)}">${frappe.utils.escape_html(__(o))}</option>`).join("")}
				</select>`;
				break;
			}

			case "Link": {
				wrap.innerHTML = `<div class="fv-input-group fv-field--link">
					<input id="${id}" class="fv-input" type="text" placeholder="${ph || this.def.options || ""}" ${ro} ${req}
						data-doctype="${frappe.utils.escape_html(this.def.options || "")}" />
					<button type="button" class="fv-input-group__btn" tabindex="-1"><i class="ti ti-link"></i></button>
				</div>`;
				// Wire up Frappe link field awesomebar on focus
				const linkInput = wrap.querySelector("input");
				linkInput?.addEventListener("focus", () => {
					if (typeof frappe.ui?.form?.ControlLink !== "undefined") {
						// Leverage Frappe's existing awesomplete if available
					}
				});
				break;
			}

			case "Check":
				wrap.innerHTML = `<label class="fv-checkbox">
					<input id="${id}" type="checkbox" ${this.def.default ? "checked" : ""} ${ro ? "disabled" : ""} />
					<span class="fv-checkbox__mark"></span>
					<span class="fv-checkbox__label">${frappe.utils.escape_html(__(this.def.label))}</span>
				</label>`;
				break;

			case "Text":
			case "Small Text":
			case "Long Text":
			case "Text Editor":
				wrap.innerHTML = `<textarea id="${id}" class="fv-input fv-input--textarea"
					rows="${this.def.fieldtype === "Long Text" ? 8 : 4}" placeholder="${ph}" ${ro} ${req}></textarea>`;
				break;

			case "Code":
				wrap.innerHTML = `<textarea id="${id}" class="fv-input fv-input--code"
					rows="6" placeholder="${ph}" ${ro} ${req} spellcheck="false"></textarea>`;
				break;

			case "Color":
				wrap.innerHTML = `<div class="fv-input-group">
					<input id="${id}" class="fv-input" type="color" ${ro} />
					<input class="fv-input fv-field__color-hex" type="text" placeholder="#000000" maxlength="7" />
				</div>`;
				const colorInput = wrap.querySelector('input[type="color"]');
				const hexInput = wrap.querySelector(".fv-field__color-hex");
				colorInput?.addEventListener("input", () => { hexInput.value = colorInput.value; });
				hexInput?.addEventListener("input", () => {
					if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) colorInput.value = hexInput.value;
				});
				break;

			case "Rating":
				wrap.innerHTML = `<div class="fv-field__rating" id="${id}">
					${[1,2,3,4,5].map(n => `<button type="button" class="fv-field__star" data-value="${n}"><i class="ti ti-star"></i></button>`).join("")}
				</div>`;
				wrap.querySelectorAll(".fv-field__star").forEach(star => {
					star.addEventListener("click", () => {
						const val = parseInt(star.dataset.value);
						this._value = val;
						this._updateStars(wrap, val);
						if (this.def.onChange) this.def.onChange(val);
					});
				});
				break;

			case "Attach":
			case "Attach Image":
				wrap.innerHTML = `<div class="fv-field__attach">
					<input id="${id}" type="file" class="fv-input" ${this.def.fieldtype === "Attach Image" ? 'accept="image/*"' : ""} ${ro} />
					<div class="fv-field__attach-preview"></div>
				</div>`;
				break;

			case "HTML":
				wrap.innerHTML = `<div id="${id}" class="fv-field__html">${this.def.options || ""}</div>`;
				break;

			case "Read Only":
				wrap.innerHTML = `<div id="${id}" class="fv-field__readonly fv-input" style="background:var(--subtle-fg)">${frappe.utils.escape_html(String(this._value || "—"))}</div>`;
				break;

			default:
				wrap.innerHTML = `<input id="${id}" class="fv-input" type="text" placeholder="${ph}" ${ro} ${req} />`;
		}

		// Attach change event
		const inputEl = wrap.querySelector("input:not([type='file']):not([type='color']):not([type='checkbox']), select, textarea");
		if (inputEl) {
			inputEl.addEventListener("change", () => {
				this._value = inputEl.value;
				if (this.def.onChange) this.def.onChange(this._value);
			});
		}

		const checkbox = wrap.querySelector('input[type="checkbox"]');
		if (checkbox) {
			checkbox.addEventListener("change", () => {
				this._value = checkbox.checked ? 1 : 0;
				if (this.def.onChange) this.def.onChange(this._value);
			});
		}

		return wrap;
	}

	_updateStars(wrap, value) {
		wrap.querySelectorAll(".fv-field__star").forEach(star => {
			const v = parseInt(star.dataset.value);
			star.querySelector("i").className = v <= value ? "ti ti-star-filled" : "ti ti-star";
		});
	}

	setValue(value) {
		this._value = value;
		if (!this._inputEl) return;

		if (this.def.fieldtype === "Check") {
			this._inputEl.checked = !!value;
		} else if (this.def.fieldtype === "Rating") {
			this._updateStars(this._wrapper, value);
		} else if (this._inputEl.tagName === "DIV") {
			this._inputEl.textContent = value || "—";
		} else {
			this._inputEl.value = value || "";
		}
	}

	getValue() {
		if (this.def.fieldtype === "Check") {
			return this._inputEl?.checked ? 1 : 0;
		}
		return this._value;
	}

	validate() {
		if (this.def.reqd && !this.getValue()) {
			this._wrapper?.classList.add("fv-field--error");
			return false;
		}
		this._wrapper?.classList.remove("fv-field--error");
		return true;
	}

	setReadOnly(readonly) {
		if (!this._inputEl) return;
		if (readonly) {
			this._inputEl.setAttribute("readonly", "");
			this._inputEl.setAttribute("disabled", "");
		} else {
			this._inputEl.removeAttribute("readonly");
			this._inputEl.removeAttribute("disabled");
		}
	}

	destroy() {
		this._wrapper?.remove();
	}
}
