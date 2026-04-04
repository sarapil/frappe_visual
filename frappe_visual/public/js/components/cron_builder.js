/**
 * Frappe Visual — CronBuilder
 * ==============================
 * Visual cron expression builder with interactive selectors for
 * minute, hour, day-of-month, month, day-of-week, and a
 * human-readable preview of the schedule.
 *
 * Usage:
 *   frappe.visual.CronBuilder.create('#el', {
 *     value: '0 9 * * 1-5',
 *     onChange: expr => console.log(expr)
 *   })
 *
 * @module frappe_visual/components/cron_builder
 */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESETS = [
	{ label: __("Every minute"), value: "* * * * *" },
	{ label: __("Every hour"), value: "0 * * * *" },
	{ label: __("Every day at midnight"), value: "0 0 * * *" },
	{ label: __("Every day at 9 AM"), value: "0 9 * * *" },
	{ label: __("Weekdays at 9 AM"), value: "0 9 * * 1-5" },
	{ label: __("Every Monday at 9 AM"), value: "0 9 * * 1" },
	{ label: __("First of month at midnight"), value: "0 0 1 * *" },
	{ label: __("Every Sunday at midnight"), value: "0 0 * * 0" },
];

export class CronBuilder {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("CronBuilder: container not found");

		this.opts = Object.assign({
			theme: "glass",
			value: "* * * * *",
			showPresets: true,
			showPreview: true,
			showExpression: true,
			use24Hour: true,
			disabled: false,
			onChange: null,
		}, opts);

		this._parts = this._parse(this.opts.value);
		this._init();
	}

	static create(container, opts = {}) { return new CronBuilder(container, opts); }

	_parse(expr) {
		const parts = (expr || "* * * * *").split(/\s+/);
		return {
			minute: parts[0] || "*",
			hour: parts[1] || "*",
			dayOfMonth: parts[2] || "*",
			month: parts[3] || "*",
			dayOfWeek: parts[4] || "*",
		};
	}

	_toString() {
		return `${this._parts.minute} ${this._parts.hour} ${this._parts.dayOfMonth} ${this._parts.month} ${this._parts.dayOfWeek}`;
	}

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-cron", `fv-cron--${this.opts.theme}`);
		if (this.opts.disabled) this.container.classList.add("fv-cron--disabled");
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		// Expression display
		if (this.opts.showExpression) {
			const exprEl = document.createElement("div");
			exprEl.className = "fv-cron-expr";
			const input = document.createElement("input");
			input.type = "text";
			input.className = "fv-cron-expr-input";
			input.value = this._toString();
			input.disabled = this.opts.disabled;
			input.addEventListener("change", () => {
				this._parts = this._parse(input.value);
				this._render();
				this._emit();
			});
			exprEl.appendChild(input);
			this.container.appendChild(exprEl);
		}

		// Human preview
		if (this.opts.showPreview) {
			const preview = document.createElement("div");
			preview.className = "fv-cron-preview";
			preview.innerHTML = `📅 ${this._humanize()}`;
			this.container.appendChild(preview);
		}

		// Presets
		if (this.opts.showPresets) {
			const presetsWrap = document.createElement("div");
			presetsWrap.className = "fv-cron-presets";
			const label = document.createElement("div");
			label.className = "fv-cron-section-label";
			label.textContent = __("Quick Presets");
			presetsWrap.appendChild(label);

			const grid = document.createElement("div");
			grid.className = "fv-cron-preset-grid";
			for (const p of PRESETS) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "fv-cron-preset-btn";
				if (this._toString() === p.value) btn.classList.add("fv-cron-preset-btn--active");
				btn.textContent = p.label;
				btn.addEventListener("click", () => {
					this._parts = this._parse(p.value);
					this._render();
					this._emit();
				});
				grid.appendChild(btn);
			}
			presetsWrap.appendChild(grid);
			this.container.appendChild(presetsWrap);
		}

		// Field builders
		const fields = document.createElement("div");
		fields.className = "fv-cron-fields";

		fields.appendChild(this._buildField("minute", __("Minute"), 0, 59, null, 5));
		fields.appendChild(this._buildField("hour", __("Hour"), 0, 23, null, 1));
		fields.appendChild(this._buildField("dayOfMonth", __("Day of Month"), 1, 31, null, 1));
		fields.appendChild(this._buildField("month", __("Month"), 1, 12, MONTH_NAMES, 1));
		fields.appendChild(this._buildField("dayOfWeek", __("Day of Week"), 0, 6, DAY_NAMES, 1));

		this.container.appendChild(fields);
	}

	_buildField(key, label, min, max, names, step) {
		const section = document.createElement("div");
		section.className = "fv-cron-field";

		const header = document.createElement("div");
		header.className = "fv-cron-field-header";
		header.innerHTML = `<span class="fv-cron-field-label">${label}</span>
			<span class="fv-cron-field-value">${this._parts[key]}</span>`;
		section.appendChild(header);

		// Mode selector
		const modes = document.createElement("div");
		modes.className = "fv-cron-modes";

		const currentVal = this._parts[key];
		const isEvery = currentVal === "*";
		const isRange = currentVal.includes("-") && !currentVal.includes("/");
		const isStep = currentVal.includes("/");
		const isList = currentVal.includes(",");

		// Every
		modes.appendChild(this._modeBtn(__("Every"), isEvery, () => {
			this._parts[key] = "*";
			this._render();
			this._emit();
		}));

		// Specific values — chip selector
		const chipWrap = document.createElement("div");
		chipWrap.className = "fv-cron-chips";

		const selectedValues = this._parseField(currentVal, min, max);

		// For minutes, show step groups
		const displayStep = key === "minute" ? step : 1;
		for (let v = min; v <= max; v += displayStep) {
			const chip = document.createElement("button");
			chip.type = "button";
			chip.className = "fv-cron-chip";
			if (selectedValues.includes(v)) chip.classList.add("fv-cron-chip--active");
			chip.textContent = names ? names[v - min] || v : String(v).padStart(2, "0");
			chip.disabled = this.opts.disabled;
			chip.addEventListener("click", () => {
				chip.classList.toggle("fv-cron-chip--active");
				const active = chipWrap.querySelectorAll(".fv-cron-chip--active");
				if (active.length === 0) {
					this._parts[key] = "*";
				} else {
					const vals = Array.from(active).map(c => {
						const idx = Array.from(chipWrap.children).indexOf(c);
						return min + idx * displayStep;
					}).sort((a, b) => a - b);
					this._parts[key] = this._compressValues(vals);
				}
				this._render();
				this._emit();
			});
			chipWrap.appendChild(chip);
		}
		section.appendChild(modes);
		section.appendChild(chipWrap);

		return section;
	}

	_modeBtn(label, active, onClick) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "fv-cron-mode-btn";
		if (active) btn.classList.add("fv-cron-mode-btn--active");
		btn.textContent = label;
		btn.disabled = this.opts.disabled;
		btn.addEventListener("click", onClick);
		return btn;
	}

	_parseField(expr, min, max) {
		if (expr === "*") return [];
		const values = new Set();
		const parts = expr.split(",");
		for (const part of parts) {
			if (part.includes("/")) {
				const [range, step] = part.split("/");
				const s = parseInt(step) || 1;
				const base = range === "*" ? min : parseInt(range);
				for (let v = base; v <= max; v += s) values.add(v);
			} else if (part.includes("-")) {
				const [a, b] = part.split("-").map(Number);
				for (let v = a; v <= b; v++) values.add(v);
			} else {
				values.add(parseInt(part));
			}
		}
		return [...values].filter(v => v >= min && v <= max).sort((a, b) => a - b);
	}

	_compressValues(vals) {
		if (vals.length === 0) return "*";

		// Try to detect ranges
		const parts = [];
		let i = 0;
		while (i < vals.length) {
			let j = i;
			while (j < vals.length - 1 && vals[j + 1] - vals[j] === 1) j++;
			if (j - i >= 2) {
				parts.push(`${vals[i]}-${vals[j]}`);
			} else {
				for (let k = i; k <= j; k++) parts.push(String(vals[k]));
			}
			i = j + 1;
		}
		return parts.join(",");
	}

	/* ── Human Readable ──────────────────────────────────────── */
	_humanize() {
		const p = this._parts;
		const parts = [];

		// Minute
		if (p.minute === "*") parts.push(__("every minute"));
		else if (p.minute === "0") { /* on the hour */ }
		else parts.push(__("at minute") + " " + p.minute);

		// Hour
		if (p.hour === "*" && p.minute !== "*") parts.push(__("of every hour"));
		else if (p.hour !== "*") {
			const hours = this._parseField(p.hour, 0, 23);
			const labels = hours.map(h => this.opts.use24Hour ? `${h}:00` : `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`);
			parts.push(__("at") + " " + labels.join(", "));
		}

		// Day of Week
		if (p.dayOfWeek !== "*") {
			const days = this._parseField(p.dayOfWeek, 0, 6);
			parts.push(__("on") + " " + days.map(d => DAY_NAMES[d]).join(", "));
		}

		// Day of Month
		if (p.dayOfMonth !== "*") {
			parts.push(__("on day") + " " + p.dayOfMonth);
		}

		// Month
		if (p.month !== "*") {
			const months = this._parseField(p.month, 1, 12);
			parts.push(__("in") + " " + months.map(m => MONTH_NAMES[m - 1]).join(", "));
		}

		return parts.join(", ") || __("every minute");
	}

	_emit() {
		if (this.opts.onChange) this.opts.onChange(this._toString());
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this._toString(); }
	setValue(expr) { this._parts = this._parse(expr); this._render(); }
	getHumanReadable() { return this._humanize(); }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-cron", `fv-cron--${this.opts.theme}`, "fv-cron--disabled");
	}
}
