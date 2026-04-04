/**
 * Frappe Visual — ToggleGroup
 * ==============================
 * Segmented control / button group with single or multi-select,
 * animated indicator, icon support, and badges.
 *
 * Usage:
 *   frappe.visual.ToggleGroup.create('#el', {
 *     options: [
 *       { value: 'list', label: 'List', icon: '☰' },
 *       { value: 'grid', label: 'Grid', icon: '⊞' },
 *       { value: 'calendar', label: 'Calendar', icon: '📅' },
 *     ],
 *     value: 'list',
 *     onChange: v => console.log(v)
 *   })
 *
 * @module frappe_visual/components/toggle_group
 */

export class ToggleGroup {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("ToggleGroup: container not found");

		this.opts = Object.assign({
			theme: "glass",
			options: [],            // [{value, label, icon?, badge?, disabled?}]
			value: null,            // string (single) or array (multi)
			multi: false,
			size: "md",             // sm | md | lg
			color: "#6366f1",
			fullWidth: false,
			disabled: false,
			onChange: null,
		}, opts);

		this._value = this.opts.multi
			? (Array.isArray(this.opts.value) ? [...this.opts.value] : [])
			: this.opts.value;

		this._init();
	}

	static create(container, opts = {}) { return new ToggleGroup(container, opts); }

	_init() {
		this.container.classList.add("fv-tg", `fv-tg--${this.opts.theme}`, `fv-tg--${this.opts.size}`);
		if (this.opts.fullWidth) this.container.classList.add("fv-tg--full");
		if (this.opts.disabled) this.container.classList.add("fv-tg--disabled");
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		const wrap = document.createElement("div");
		wrap.className = "fv-tg-wrap";
		wrap.setAttribute("role", "group");

		// Sliding indicator
		this._indicatorEl = document.createElement("div");
		this._indicatorEl.className = "fv-tg-indicator";
		this._indicatorEl.style.background = this.opts.color;
		wrap.appendChild(this._indicatorEl);

		for (let i = 0; i < this.opts.options.length; i++) {
			const opt = this.opts.options[i];
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "fv-tg-btn";
			btn.dataset.value = opt.value;
			btn.dataset.index = i;
			if (opt.disabled) btn.disabled = true;

			const isActive = this._isActive(opt.value);
			if (isActive) btn.classList.add("fv-tg-btn--active");

			let html = "";
			if (opt.icon) html += `<span class="fv-tg-icon">${this._esc(opt.icon)}</span>`;
			if (opt.label) html += `<span class="fv-tg-label">${this._esc(opt.label)}</span>`;
			if (opt.badge != null) html += `<span class="fv-tg-badge">${this._esc(String(opt.badge))}</span>`;
			btn.innerHTML = html;

			if (!this.opts.disabled && !opt.disabled) {
				btn.addEventListener("click", () => this._toggle(opt.value));
			}

			wrap.appendChild(btn);
		}

		this.container.appendChild(wrap);
		this._wrapEl = wrap;

		// Position indicator after layout
		requestAnimationFrame(() => this._positionIndicator());
	}

	_isActive(value) {
		if (this.opts.multi) return this._value.includes(value);
		return this._value === value;
	}

	_toggle(value) {
		if (this.opts.multi) {
			const idx = this._value.indexOf(value);
			if (idx >= 0) this._value.splice(idx, 1);
			else this._value.push(value);
		} else {
			this._value = value;
		}

		// Update active states
		this._wrapEl.querySelectorAll(".fv-tg-btn").forEach(btn => {
			btn.classList.toggle("fv-tg-btn--active", this._isActive(btn.dataset.value));
		});
		this._positionIndicator();

		if (this.opts.onChange) {
			this.opts.onChange(this.opts.multi ? [...this._value] : this._value);
		}
	}

	_positionIndicator() {
		if (!this._wrapEl || !this._indicatorEl) return;

		if (this.opts.multi) {
			// Hide indicator for multi-select (use active class styling instead)
			this._indicatorEl.style.opacity = "0";
			return;
		}

		const activeBtn = this._wrapEl.querySelector(".fv-tg-btn--active");
		if (!activeBtn) { this._indicatorEl.style.opacity = "0"; return; }

		const wrapRect = this._wrapEl.getBoundingClientRect();
		const btnRect = activeBtn.getBoundingClientRect();

		this._indicatorEl.style.opacity = "1";
		this._indicatorEl.style.left = (btnRect.left - wrapRect.left) + "px";
		this._indicatorEl.style.width = btnRect.width + "px";
		this._indicatorEl.style.height = btnRect.height + "px";
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this.opts.multi ? [...this._value] : this._value; }
	setValue(v) { this._value = this.opts.multi ? (Array.isArray(v) ? [...v] : []) : v; this._render(); }
	setOptions(opts) { this.opts.options = opts; this._render(); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-tg", `fv-tg--${this.opts.theme}`, `fv-tg--${this.opts.size}`, "fv-tg--full", "fv-tg--disabled");
	}
}
