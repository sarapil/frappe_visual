/**
 * CellEditor — In-place cell editing with type-aware inputs
 *
 * frappe.visual.CellEditor.create({
 *   cell: tdElement,
 *   type: "text",              // text | number | select | date | checkbox | link
 *   value: "current value",
 *   options: ["A","B","C"],    // for select type
 *   min: 0, max: 100,         // for number type
 *   linkDoctype: "Customer",   // for link type
 *   onSave: (newValue, oldValue) => {},
 *   onCancel: () => {},
 *   validate: (val) => true,   // return true or error string
 *   theme: "glass",
 * })
 */
export class CellEditor {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static create(opts = {}) {
		const o = Object.assign({
			cell: null,
			type: "text",
			value: "",
			options: [],
			min: null,
			max: null,
			step: null,
			linkDoctype: null,
			onSave: null,
			onCancel: null,
			validate: null,
			placeholder: "",
			theme: "glass",
		}, opts);

		if (!o.cell) return null;

		const cell = typeof o.cell === "string" ? document.querySelector(o.cell) : o.cell;
		const originalContent = cell.innerHTML;
		const oldValue = o.value ?? cell.textContent.trim();

		cell.classList.add("fv-cell-editor__cell", `fv-cell-editor--${o.theme}`);

		const wrapper = document.createElement("div");
		wrapper.className = "fv-cell-editor__wrapper";

		let input;

		switch (o.type) {
			case "select":
				input = document.createElement("select");
				input.className = "fv-cell-editor__select";
				o.options.forEach(opt => {
					const option = document.createElement("option");
					if (typeof opt === "object") {
						option.value = opt.value;
						option.textContent = opt.label || opt.value;
					} else {
						option.value = opt;
						option.textContent = opt;
					}
					if (String(opt.value || opt) === String(oldValue)) option.selected = true;
					input.appendChild(option);
				});
				break;

			case "checkbox":
				input = document.createElement("input");
				input.type = "checkbox";
				input.className = "fv-cell-editor__checkbox";
				input.checked = !!oldValue;
				break;

			case "date":
				input = document.createElement("input");
				input.type = "date";
				input.className = "fv-cell-editor__input";
				input.value = oldValue;
				break;

			case "number":
				input = document.createElement("input");
				input.type = "number";
				input.className = "fv-cell-editor__input";
				input.value = oldValue;
				if (o.min !== null) input.min = o.min;
				if (o.max !== null) input.max = o.max;
				if (o.step !== null) input.step = o.step;
				break;

			case "link":
				input = document.createElement("input");
				input.type = "text";
				input.className = "fv-cell-editor__input fv-cell-editor__link";
				input.value = oldValue;
				input.placeholder = o.placeholder || `Search ${o.linkDoctype || ""}...`;
				// In a real Frappe context, we'd use frappe.ui.form.make_control
				break;

			default: // text
				input = document.createElement("input");
				input.type = "text";
				input.className = "fv-cell-editor__input";
				input.value = oldValue;
				if (o.placeholder) input.placeholder = o.placeholder;
		}

		wrapper.appendChild(input);

		// Action buttons
		const actions = document.createElement("div");
		actions.className = "fv-cell-editor__actions";

		const saveBtn = document.createElement("button");
		saveBtn.type = "button";
		saveBtn.className = "fv-cell-editor__btn fv-cell-editor__btn--save";
		saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;
		saveBtn.title = "Save (Enter)";

		const cancelBtn = document.createElement("button");
		cancelBtn.type = "button";
		cancelBtn.className = "fv-cell-editor__btn fv-cell-editor__btn--cancel";
		cancelBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
		cancelBtn.title = "Cancel (Esc)";

		actions.appendChild(saveBtn);
		actions.appendChild(cancelBtn);
		wrapper.appendChild(actions);

		const errorEl = document.createElement("div");
		errorEl.className = "fv-cell-editor__error";
		errorEl.style.display = "none";
		wrapper.appendChild(errorEl);

		cell.innerHTML = "";
		cell.appendChild(wrapper);

		function getInputValue() {
			if (o.type === "checkbox") return input.checked;
			return input.value;
		}

		function save() {
			const newVal = getInputValue();
			if (o.validate) {
				const result = o.validate(newVal);
				if (result !== true) {
					errorEl.textContent = typeof result === "string" ? result : "Invalid value";
					errorEl.style.display = "block";
					input.classList.add("fv-cell-editor__input--error");
					return;
				}
			}
			cell.classList.remove("fv-cell-editor__cell");
			cell.innerHTML = originalContent;
			cell.textContent = o.type === "checkbox" ? (newVal ? "✓" : "✗") : String(newVal);
			if (o.onSave) o.onSave(newVal, oldValue);
		}

		function cancel() {
			cell.classList.remove("fv-cell-editor__cell");
			cell.innerHTML = originalContent;
			if (o.onCancel) o.onCancel();
		}

		saveBtn.addEventListener("click", save);
		cancelBtn.addEventListener("click", cancel);

		input.addEventListener("keydown", e => {
			if (e.key === "Enter") { e.preventDefault(); save(); }
			if (e.key === "Escape") { e.preventDefault(); cancel(); }
			if (e.key === "Tab") { e.preventDefault(); save(); }
		});

		// For checkbox, save on change
		if (o.type === "checkbox") {
			input.addEventListener("change", save);
		}

		// Focus
		requestAnimationFrame(() => {
			input.focus();
			if (input.select) input.select();
		});

		return {
			el: wrapper,
			save,
			cancel,
			getValue: getInputValue,
			destroy: cancel,
		};
	}
}
