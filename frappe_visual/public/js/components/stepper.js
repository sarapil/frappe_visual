/**
 * Frappe Visual — Stepper
 * =========================
 * Multi-step progress indicator with horizontal/vertical layouts,
 * clickable steps, validation hooks, animated transitions.
 *
 * Usage:
 *   const stepper = Stepper.create(container, {
 *     steps: [
 *       { label: 'Details', icon: 'file-text', description: 'Enter basic info' },
 *       { label: 'Review', icon: 'eye' },
 *       { label: 'Confirm', icon: 'check' }
 *     ],
 *     current: 0,
 *     direction: 'horizontal',  // 'horizontal' | 'vertical'
 *     clickable: true,
 *     showDescription: true,
 *     theme: 'glass',           // 'glass' | 'flat' | 'minimal' | 'dots'
 *     size: 'md',               // 'sm' | 'md' | 'lg'
 *     onStepChange: (from, to) => {},
 *     onValidate: (from) => true,   // return false to prevent step change
 *   });
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
};

export class Stepper {
	constructor(container, opts = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		if (!this.container) return;

		this.opts = Object.assign(
			{
				steps: [],
				current: 0,
				direction: "horizontal",
				clickable: true,
				showDescription: true,
				theme: "glass",
				size: "md",
				onStepChange: null,
				onValidate: null,
			},
			opts
		);

		this._current = this.opts.current;
		this._completed = new Set();
		this._errors = new Set();
		this._init();
	}

	static create(container, opts = {}) {
		return new Stepper(container, opts);
	}

	/* ── Lifecycle ─────────────────────────────────────── */

	_init() {
		this._render();
	}

	_render() {
		const { steps, direction, theme, size, showDescription, clickable } =
			this.opts;

		const wrap = document.createElement("div");
		wrap.className = `fv-step fv-step-${direction} fv-step-${theme} fv-step-${size}`;

		steps.forEach((step, idx) => {
			if (idx > 0) {
				const conn = document.createElement("div");
				conn.className = "fv-step-connector";
				if (idx <= this._current) conn.classList.add("fv-step-conn-active");
				wrap.appendChild(conn);
			}

			const el = document.createElement("div");
			el.className = "fv-step-item";

			if (idx < this._current || this._completed.has(idx))
				el.classList.add("fv-step-done");
			if (idx === this._current) el.classList.add("fv-step-active");
			if (this._errors.has(idx)) el.classList.add("fv-step-error");

			if (clickable) {
				el.style.cursor = "pointer";
				el.addEventListener("click", () => this.goTo(idx));
			}

			// Number / icon circle
			const circle = document.createElement("div");
			circle.className = "fv-step-circle";

			if (this._completed.has(idx) || idx < this._current) {
				circle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
			} else if (this._errors.has(idx)) {
				circle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
			} else if (step.icon) {
				circle.textContent = step.icon.length <= 2 ? step.icon : "";
				if (step.icon.length > 2) circle.innerHTML = `<span>${_esc(step.icon)}</span>`;
			} else {
				circle.textContent = idx + 1;
			}

			el.appendChild(circle);

			// Label + description
			const info = document.createElement("div");
			info.className = "fv-step-info";

			const label = document.createElement("div");
			label.className = "fv-step-label";
			label.textContent = step.label;
			info.appendChild(label);

			if (showDescription && step.description) {
				const desc = document.createElement("div");
				desc.className = "fv-step-desc";
				desc.textContent = step.description;
				info.appendChild(desc);
			}

			el.appendChild(info);
			wrap.appendChild(el);
		});

		this.container.innerHTML = "";
		this.container.appendChild(wrap);
		this.el = wrap;
	}

	/* ── Public API ─────────────────────────────────────── */

	goTo(idx) {
		if (idx === this._current || idx < 0 || idx >= this.opts.steps.length)
			return;

		if (this.opts.onValidate) {
			const valid = this.opts.onValidate(this._current);
			if (valid === false) {
				this._errors.add(this._current);
				this._render();
				return;
			}
		}

		this._errors.delete(this._current);
		const from = this._current;
		this._current = idx;

		// Mark all steps before current as completed
		for (let i = 0; i < idx; i++) this._completed.add(i);

		this._render();
		if (this.opts.onStepChange) this.opts.onStepChange(from, idx);
	}

	next() {
		this.goTo(this._current + 1);
	}

	prev() {
		this.goTo(this._current - 1);
	}

	complete(idx) {
		if (idx === undefined) idx = this._current;
		this._completed.add(idx);
		this._errors.delete(idx);
		this._render();
	}

	setError(idx) {
		if (idx === undefined) idx = this._current;
		this._errors.add(idx);
		this._render();
	}

	clearError(idx) {
		if (idx === undefined) idx = this._current;
		this._errors.delete(idx);
		this._render();
	}

	getCurrent() {
		return this._current;
	}

	reset() {
		this._current = 0;
		this._completed.clear();
		this._errors.clear();
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}
}
