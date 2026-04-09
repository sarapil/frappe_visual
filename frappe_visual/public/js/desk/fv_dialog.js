// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0

/**
 * FVDialog — Visual Dialog System
 * ===================================
 * Modern dialog/modal system with glassmorphism, GSAP animations,
 * multiple sizes, and built-in form support.
 *
 * Replaces or enhances frappe.ui.Dialog with:
 * - Glassmorphism backdrop & card
 * - Slide-in/scale entrance animations
 * - Multiple sizes: sm, md, lg, xl, fullscreen
 * - Built-in form field rendering
 * - Bottom sheet mode for mobile
 * - Confirmation/prompt/alert presets
 *
 * Usage:
 *   const dialog = FVDialog.show({
 *     title: __("Create Item"),
 *     size: "lg",
 *     fields: [
 *       { fieldname: "name", label: __("Name"), fieldtype: "Data", reqd: 1 },
 *       { fieldname: "rate", label: __("Rate"), fieldtype: "Currency" },
 *     ],
 *     primaryAction: (values) => console.log(values),
 *     primaryActionLabel: __("Create"),
 *   });
 *
 *   // Quick helpers:
 *   FVDialog.confirm(__("Delete?"), () => frappe.call(...));
 *   FVDialog.alert(__("Success!"));
 *   const name = await FVDialog.prompt(__("Name"), __("Enter item name"));
 */

export class FVDialog {
	static show(opts) {
		return new FVDialog(opts);
	}

	static confirm(message, onConfirm, opts = {}) {
		return new FVDialog({
			title: opts.title || __("Confirm"),
			size: "sm",
			icon: "alert-circle",
			message,
			primaryAction: onConfirm,
			primaryActionLabel: opts.confirmLabel || __("Confirm"),
			secondaryActionLabel: opts.cancelLabel || __("Cancel"),
			...opts,
		});
	}

	static alert(message, opts = {}) {
		return new FVDialog({
			title: opts.title || __("Alert"),
			size: "sm",
			icon: "info-circle",
			message,
			primaryActionLabel: __("OK"),
			primaryAction: () => {},
			hideSecondary: true,
			...opts,
		});
	}

	static async prompt(title, placeholder = "", opts = {}) {
		return new Promise(resolve => {
			new FVDialog({
				title,
				size: "sm",
				fields: [
					{ fieldname: "value", label: title, fieldtype: "Data", placeholder, reqd: 1 },
				],
				primaryActionLabel: opts.submitLabel || __("Submit"),
				primaryAction: (values) => resolve(values.value),
				onClose: () => resolve(null),
				...opts,
			});
		});
	}

	constructor(opts = {}) {
		this.opts = Object.assign({
			title: "",
			subtitle: "",
			icon: null,
			message: null,
			size: "md",
			fields: [],
			primaryAction: null,
			primaryActionLabel: __("Save"),
			secondaryActionLabel: __("Cancel"),
			hideSecondary: false,
			onClose: null,
			cssClass: "",
			animate: true,
			closeOnBackdrop: true,
			closeOnEscape: true,
		}, opts);

		this._values = {};
		this._fieldElements = {};
		this._overlay = null;
		this._dialog = null;
		this._open();
	}

	_open() {
		// Overlay
		this._overlay = document.createElement("div");
		this._overlay.className = "fv-dialog__overlay";
		if (this.opts.closeOnBackdrop) {
			this._overlay.addEventListener("click", (e) => {
				if (e.target === this._overlay) this.close();
			});
		}

		// Dialog
		this._dialog = document.createElement("div");
		this._dialog.className = `fv-dialog fv-dialog--${this.opts.size} fv-fx-glass ${this.opts.cssClass}`.trim();
		this._dialog.setAttribute("role", "dialog");
		this._dialog.setAttribute("aria-modal", "true");
		this._dialog.setAttribute("dir", "auto");

		this._dialog.innerHTML = `
			<div class="fv-dialog__header">
				<div class="fv-dialog__header-left">
					${this.opts.icon ? `<i class="ti ti-${this.opts.icon} fv-dialog__icon"></i>` : ""}
					<div>
						<h3 class="fv-dialog__title">${frappe.utils.escape_html(this.opts.title)}</h3>
						${this.opts.subtitle ? `<p class="fv-dialog__subtitle">${frappe.utils.escape_html(this.opts.subtitle)}</p>` : ""}
					</div>
				</div>
				<button class="fv-dialog__close" aria-label="${__("Close")}">
					<i class="ti ti-x"></i>
				</button>
			</div>
			<div class="fv-dialog__body">
				${this.opts.message ? `<p class="fv-dialog__message">${frappe.utils.escape_html(this.opts.message)}</p>` : ""}
				<div class="fv-dialog__fields"></div>
			</div>
			<div class="fv-dialog__footer">
				${!this.opts.hideSecondary ? `
					<button class="fv-btn fv-btn--secondary fv-dialog__cancel">
						${frappe.utils.escape_html(this.opts.secondaryActionLabel)}
					</button>
				` : ""}
				${this.opts.primaryAction ? `
					<button class="fv-btn fv-btn--primary fv-dialog__primary fv-fx-hover-lift">
						${frappe.utils.escape_html(this.opts.primaryActionLabel)}
					</button>
				` : ""}
			</div>
		`;

		// Render fields
		this._renderFields();

		// Events
		this._dialog.querySelector(".fv-dialog__close").addEventListener("click", () => this.close());
		this._dialog.querySelector(".fv-dialog__cancel")?.addEventListener("click", () => this.close());
		this._dialog.querySelector(".fv-dialog__primary")?.addEventListener("click", () => this._submit());

		// Escape key
		this._escHandler = (e) => {
			if (e.key === "Escape" && this.opts.closeOnEscape) this.close();
		};
		document.addEventListener("keydown", this._escHandler);

		this._overlay.appendChild(this._dialog);
		document.body.appendChild(this._overlay);

		// Animation
		if (this.opts.animate) {
			requestAnimationFrame(() => {
				this._overlay.classList.add("fv-dialog__overlay--visible");
				this._dialog.classList.add("fv-dialog--visible");
			});
		} else {
			this._overlay.classList.add("fv-dialog__overlay--visible");
			this._dialog.classList.add("fv-dialog--visible");
		}

		// Focus trap
		this._dialog.querySelector("input, button.fv-dialog__primary, button.fv-dialog__close")?.focus();
	}

	_renderFields() {
		const container = this._dialog.querySelector(".fv-dialog__fields");
		if (!this.opts.fields.length) return;

		this.opts.fields.forEach(field => {
			const wrapper = document.createElement("div");
			wrapper.className = `fv-dialog__field fv-dialog__field--${field.fieldtype?.toLowerCase() || "data"}`;

			const id = `fv-dialog-field-${field.fieldname}`;
			let inputHtml = "";

			switch (field.fieldtype) {
				case "Text":
				case "Small Text":
				case "Long Text":
					inputHtml = `<textarea id="${id}" class="fv-input fv-input--textarea" rows="4"
						placeholder="${frappe.utils.escape_html(field.placeholder || "")}"
						${field.reqd ? "required" : ""}></textarea>`;
					break;
				case "Select":
					inputHtml = `<select id="${id}" class="fv-input fv-input--select" ${field.reqd ? "required" : ""}>
						<option value="">${__("Select")}...</option>
						${(field.options || "").split("\n").filter(Boolean).map(o =>
							`<option value="${frappe.utils.escape_html(o)}">${frappe.utils.escape_html(__(o))}</option>`
						).join("")}
					</select>`;
					break;
				case "Check":
					inputHtml = `<label class="fv-checkbox">
						<input type="checkbox" id="${id}" ${field.default ? "checked" : ""} />
						<span>${frappe.utils.escape_html(__(field.label))}</span>
					</label>`;
					break;
				case "Int":
				case "Float":
				case "Currency":
				case "Percent":
					inputHtml = `<input id="${id}" type="number" class="fv-input"
						placeholder="${frappe.utils.escape_html(field.placeholder || "")}"
						step="${field.fieldtype === "Int" ? "1" : "any"}"
						${field.reqd ? "required" : ""} />`;
					break;
				case "Date":
					inputHtml = `<input id="${id}" type="date" class="fv-input" ${field.reqd ? "required" : ""} />`;
					break;
				case "Section Break":
					wrapper.className = "fv-dialog__section-break";
					wrapper.innerHTML = field.label ? `<h4>${frappe.utils.escape_html(__(field.label))}</h4><hr/>` : "<hr/>";
					container.appendChild(wrapper);
					return;
				case "Column Break":
					wrapper.className = "fv-dialog__column-break";
					container.appendChild(wrapper);
					return;
				default:
					inputHtml = `<input id="${id}" type="text" class="fv-input"
						placeholder="${frappe.utils.escape_html(field.placeholder || "")}"
						${field.reqd ? "required" : ""}
						value="${frappe.utils.escape_html(field.default || "")}" />`;
			}

			if (field.fieldtype !== "Check") {
				wrapper.innerHTML = `<label class="fv-dialog__label" for="${id}">
					${frappe.utils.escape_html(__(field.label))}${field.reqd ? " <span class='fv-required'>*</span>" : ""}
				</label>${inputHtml}`;
			} else {
				wrapper.innerHTML = inputHtml;
			}

			container.appendChild(wrapper);
			this._fieldElements[field.fieldname] = wrapper.querySelector(`#${id}`);
		});
	}

	_getValues() {
		const values = {};
		this.opts.fields.forEach(field => {
			const el = this._fieldElements[field.fieldname];
			if (!el) return;
			if (field.fieldtype === "Check") {
				values[field.fieldname] = el.checked ? 1 : 0;
			} else {
				values[field.fieldname] = el.value;
			}
		});
		return values;
	}

	_submit() {
		const values = this._getValues();
		// Validate required
		for (const field of this.opts.fields) {
			if (field.reqd && !values[field.fieldname]) {
				const el = this._fieldElements[field.fieldname];
				if (el) {
					el.classList.add("fv-input--error");
					el.focus();
				}
				frappe.show_alert({ message: __("{0} is required", [__(field.label)]), indicator: "red" });
				return;
			}
		}
		if (this.opts.primaryAction) {
			this.opts.primaryAction(values);
		}
		this.close();
	}

	close() {
		if (this.opts.onClose) this.opts.onClose();
		document.removeEventListener("keydown", this._escHandler);

		if (this.opts.animate) {
			this._overlay.classList.remove("fv-dialog__overlay--visible");
			this._dialog.classList.remove("fv-dialog--visible");
			setTimeout(() => this._overlay.remove(), 300);
		} else {
			this._overlay.remove();
		}
	}

	/** Set a field's value programmatically */
	setValue(fieldname, value) {
		const el = this._fieldElements[fieldname];
		if (!el) return;
		if (el.type === "checkbox") {
			el.checked = !!value;
		} else {
			el.value = value;
		}
	}

	getValue(fieldname) {
		return this._getValues()[fieldname];
	}
}
