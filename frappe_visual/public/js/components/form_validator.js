/**
 * FormValidator — Declarative form validation engine
 *
 * frappe.visual.FormValidator.create({
 *   container: formEl,
 *   rules: {
 *     email:    { required:true, pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message:"Invalid email" },
 *     password: { required:true, minLength:8, custom:(v) => /[A-Z]/.test(v) || "Must contain uppercase" },
 *     age:      { type:"number", min:18, max:120 },
 *     confirm:  { match:"password", message:"Passwords don't match" },
 *   },
 *   mode: "onBlur",              // onBlur|onChange|onSubmit
 *   showInline: true,            // show error messages inline
 *   scrollToError: true,
 *   onValidate: (errors) => {},
 *   onSubmit: (data) => {},
 * })
 */
export class FormValidator {
	static _esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

	static RULES = {
		required:  (v) => (v !== null && v !== undefined && String(v).trim() !== "") || "This field is required",
		minLength: (v, len) => String(v).length >= len || `Minimum ${len} characters`,
		maxLength: (v, len) => String(v).length <= len || `Maximum ${len} characters`,
		min:       (v, n) => Number(v) >= n || `Minimum value is ${n}`,
		max:       (v, n) => Number(v) <= n || `Maximum value is ${n}`,
		pattern:   (v, re) => re.test(String(v)) || "Invalid format",
		email:     (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Invalid email address",
		url:       (v) => { try { new URL(v); return true; } catch { return "Invalid URL"; } },
		number:    (v) => !isNaN(Number(v)) || "Must be a number",
	};

	static create(opts = {}) {
		const o = Object.assign({
			container: null,
			rules: {},
			mode: "onBlur",
			showInline: true,
			scrollToError: true,
			onValidate: null,
			onSubmit: null,
		}, opts);

		const errors = {};
		const touched = new Set();

		function getField(name) {
			return o.container?.querySelector(`[name="${name}"], [data-fieldname="${name}"]`);
		}

		function getValue(name) {
			const el = getField(name);
			if (!el) return "";
			if (el.type === "checkbox") return el.checked;
			if (el.type === "radio") {
				const checked = o.container.querySelector(`[name="${name}"]:checked`);
				return checked ? checked.value : "";
			}
			return el.value;
		}

		function validateField(name) {
			const rule = o.rules[name];
			if (!rule) return null;
			const value = getValue(name);
			const fieldErrors = [];

			// Required
			if (rule.required) {
				const res = FormValidator.RULES.required(value);
				if (res !== true) fieldErrors.push(rule.message || res);
			}

			// Skip other validations if empty and not required
			if (!rule.required && (value === "" || value === null || value === undefined)) {
				errors[name] = [];
				showError(name, []);
				return [];
			}

			// Built-in rules
			["minLength", "maxLength", "min", "max", "pattern", "email", "url", "number"].forEach(rk => {
				if (rule[rk] !== undefined) {
					const validator = rk === "type" ? FormValidator.RULES[rule[rk]] : FormValidator.RULES[rk];
					if (validator) {
						const res = validator(value, rule[rk]);
						if (res !== true) fieldErrors.push(typeof res === "string" ? res : rule.message || "Invalid");
					}
				}
			});

			// Match another field
			if (rule.match) {
				const other = getValue(rule.match);
				if (value !== other) fieldErrors.push(rule.message || "Fields don't match");
			}

			// Custom validator
			if (rule.custom) {
				const res = rule.custom(value, getAllValues());
				if (res !== true && res !== undefined && res !== null) {
					fieldErrors.push(typeof res === "string" ? res : rule.message || "Invalid");
				}
			}

			errors[name] = fieldErrors;
			showError(name, fieldErrors);
			return fieldErrors;
		}

		function showError(name, errs) {
			if (!o.showInline) return;
			const field = getField(name);
			if (!field) return;
			const wrap = field.closest(".form-group, .frappe-control") || field.parentElement;
			if (!wrap) return;

			const existing = wrap.querySelector(".fv-form-error");
			if (existing) existing.remove();
			field.classList.toggle("fv-form-field--error", errs.length > 0);

			if (errs.length > 0) {
				const msg = document.createElement("div");
				msg.className = "fv-form-error";
				msg.textContent = errs[0];
				wrap.appendChild(msg);
			}
		}

		function getAllValues() {
			const data = {};
			Object.keys(o.rules).forEach(name => { data[name] = getValue(name); });
			return data;
		}

		function validate() {
			const allErrors = {};
			let hasError = false;
			Object.keys(o.rules).forEach(name => {
				const errs = validateField(name);
				if (errs && errs.length) { allErrors[name] = errs; hasError = true; }
			});
			if (o.onValidate) o.onValidate(allErrors);
			if (hasError && o.scrollToError) {
				const firstErr = Object.keys(allErrors)[0];
				const field = getField(firstErr);
				if (field) field.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			return { valid: !hasError, errors: allErrors, data: getAllValues() };
		}

		// Attach listeners
		if (o.container) {
			Object.keys(o.rules).forEach(name => {
				const field = getField(name);
				if (!field) return;
				const eventType = o.mode === "onChange" ? "input" : o.mode === "onBlur" ? "blur" : null;
				if (eventType) {
					field.addEventListener(eventType, () => { touched.add(name); validateField(name); });
				}
			});

			// Intercept form submit
			o.container.addEventListener("submit", (e) => {
				e.preventDefault();
				const result = validate();
				if (result.valid && o.onSubmit) o.onSubmit(result.data);
			});
		}

		return {
			validate,
			validateField,
			getErrors: () => ({ ...errors }),
			isValid: () => Object.values(errors).every(e => !e || e.length === 0),
			reset() {
				Object.keys(errors).forEach(k => { errors[k] = []; showError(k, []); });
				touched.clear();
			},
			setRule(name, rule) { o.rules[name] = rule; },
			destroy() { /* listeners are on the container, will GC */ },
		};
	}
}
