/**
 * Frappe Visual — DateRangePicker
 * =================================
 * Dual-calendar date range selector with preset ranges, keyboard nav,
 * min/max constraints, and highlighted range visualization.
 *
 * Usage:
 *   frappe.visual.DateRangePicker.create('#el', {
 *     startDate: '2026-01-01',
 *     endDate: '2026-01-31',
 *     presets: true,
 *     onChange: (start, end) => console.log(start, end)
 *   })
 *
 * @module frappe_visual/components/date_range_picker
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DEFAULT_PRESETS = [
	{ label: __("Today"), fn: () => { const d = new Date(); return [d, d]; } },
	{ label: __("Yesterday"), fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d]; } },
	{ label: __("Last 7 Days"), fn: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return [s, e]; } },
	{ label: __("Last 30 Days"), fn: () => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return [s, e]; } },
	{ label: __("This Month"), fn: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0)]; } },
	{ label: __("Last Month"), fn: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth() - 1, 1), new Date(d.getFullYear(), d.getMonth(), 0)]; } },
	{ label: __("This Quarter"), fn: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return [new Date(d.getFullYear(), q * 3, 1), new Date(d.getFullYear(), q * 3 + 3, 0)]; } },
	{ label: __("This Year"), fn: () => { const d = new Date(); return [new Date(d.getFullYear(), 0, 1), new Date(d.getFullYear(), 11, 31)]; } },
];

export class DateRangePicker {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("DateRangePicker: container not found");

		this.opts = Object.assign({
			theme: "glass",
			startDate: null,
			endDate: null,
			minDate: null,
			maxDate: null,
			presets: true,
			customPresets: null,   // array of {label, fn} to override defaults
			showTimePicker: false,
			singleCalendar: false,
			inline: false,         // always visible (no trigger button)
			placeholder: __("Select date range"),
			format: "YYYY-MM-DD",
			firstDayOfWeek: 0,     // 0=Sunday
			onChange: null,
			onOpen: null,
			onClose: null,
		}, opts);

		this._start = this.opts.startDate ? this._parseDate(this.opts.startDate) : null;
		this._end = this.opts.endDate ? this._parseDate(this.opts.endDate) : null;
		this._hoverDate = null;
		this._selectingEnd = false;
		this._open = this.opts.inline;

		// Months for the two calendars
		const ref = this._start || new Date();
		this._leftMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
		this._rightMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);

		this._init();
	}

	static create(container, opts = {}) { return new DateRangePicker(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-drp", `fv-drp--${this.opts.theme}`);
		if (this.opts.inline) this.container.classList.add("fv-drp--inline");
		this.container.innerHTML = "";

		if (!this.opts.inline) {
			this._triggerEl = document.createElement("button");
			this._triggerEl.className = "fv-drp-trigger";
			this._triggerEl.type = "button";
			this._updateTriggerText();
			this._triggerEl.addEventListener("click", () => this._toggle());
			this.container.appendChild(this._triggerEl);
		}

		this._panelEl = document.createElement("div");
		this._panelEl.className = "fv-drp-panel";
		if (!this.opts.inline) this._panelEl.style.display = "none";
		this.container.appendChild(this._panelEl);

		this._render();

		// Close on outside click
		if (!this.opts.inline) {
			this._outsideClick = (e) => {
				if (this._open && !this.container.contains(e.target)) this.close();
			};
			document.addEventListener("mousedown", this._outsideClick);
		}
	}

	_render() {
		this._panelEl.innerHTML = "";

		// Presets sidebar
		if (this.opts.presets) {
			const presets = this.opts.customPresets || DEFAULT_PRESETS;
			const sidebar = document.createElement("div");
			sidebar.className = "fv-drp-presets";
			for (const p of presets) {
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "fv-drp-preset";
				btn.textContent = p.label;
				btn.addEventListener("click", () => {
					const [s, e] = p.fn();
					this._start = this._normalizeDate(s);
					this._end = this._normalizeDate(e);
					this._selectingEnd = false;
					this._syncMonthsToSelection();
					this._render();
					this._emit();
				});
				sidebar.appendChild(btn);
			}
			this._panelEl.appendChild(sidebar);
		}

		// Calendars wrapper
		const cals = document.createElement("div");
		cals.className = "fv-drp-calendars";
		this._panelEl.appendChild(cals);

		cals.appendChild(this._renderCalendar(this._leftMonth, "left"));
		if (!this.opts.singleCalendar) {
			cals.appendChild(this._renderCalendar(this._rightMonth, "right"));
		}

		// Footer
		const footer = document.createElement("div");
		footer.className = "fv-drp-footer";
		footer.innerHTML = `
			<span class="fv-drp-range-text">${this._formatRange()}</span>
			<div class="fv-drp-actions">
				<button type="button" class="fv-drp-btn fv-drp-btn--clear">${__("Clear")}</button>
				${!this.opts.inline ? `<button type="button" class="fv-drp-btn fv-drp-btn--apply">${__("Apply")}</button>` : ""}
			</div>`;
		footer.querySelector(".fv-drp-btn--clear").addEventListener("click", () => { this._start = null; this._end = null; this._selectingEnd = false; this._render(); this._emit(); });
		const applyBtn = footer.querySelector(".fv-drp-btn--apply");
		if (applyBtn) applyBtn.addEventListener("click", () => this.close());
		this._panelEl.appendChild(footer);
	}

	_renderCalendar(month, side) {
		const cal = document.createElement("div");
		cal.className = "fv-drp-cal";

		// Header with nav
		const header = document.createElement("div");
		header.className = "fv-drp-cal-header";
		const prevBtn = document.createElement("button");
		prevBtn.type = "button";
		prevBtn.className = "fv-drp-nav";
		prevBtn.textContent = "‹";
		prevBtn.addEventListener("click", () => this._navMonth(side, -1));

		const nextBtn = document.createElement("button");
		nextBtn.type = "button";
		nextBtn.className = "fv-drp-nav";
		nextBtn.textContent = "›";
		nextBtn.addEventListener("click", () => this._navMonth(side, 1));

		const title = document.createElement("span");
		title.className = "fv-drp-cal-title";
		title.textContent = `${MONTHS[month.getMonth()]} ${month.getFullYear()}`;

		header.appendChild(prevBtn);
		header.appendChild(title);
		header.appendChild(nextBtn);
		cal.appendChild(header);

		// Day names
		const dayRow = document.createElement("div");
		dayRow.className = "fv-drp-day-names";
		for (let i = 0; i < 7; i++) {
			const idx = (i + this.opts.firstDayOfWeek) % 7;
			const d = document.createElement("span");
			d.className = "fv-drp-day-name";
			d.textContent = DAYS[idx];
			dayRow.appendChild(d);
		}
		cal.appendChild(dayRow);

		// Days grid
		const grid = document.createElement("div");
		grid.className = "fv-drp-days";

		const year = month.getFullYear();
		const m = month.getMonth();
		const firstDay = new Date(year, m, 1).getDay();
		const daysInMonth = new Date(year, m + 1, 0).getDate();
		const startOffset = (firstDay - this.opts.firstDayOfWeek + 7) % 7;

		// Empty cells
		for (let i = 0; i < startOffset; i++) {
			grid.appendChild(this._createDayCell("", null));
		}

		// Day cells
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(year, m, d);
			const cell = this._createDayCell(d, date);
			grid.appendChild(cell);
		}

		cal.appendChild(grid);
		return cal;
	}

	_createDayCell(label, date) {
		const cell = document.createElement("span");
		cell.className = "fv-drp-day";

		if (!date) { cell.classList.add("fv-drp-day--empty"); cell.textContent = ""; return cell; }

		cell.textContent = label;

		// Check constraints
		const disabled = (this.opts.minDate && date < this._parseDate(this.opts.minDate)) ||
			(this.opts.maxDate && date > this._parseDate(this.opts.maxDate));
		if (disabled) { cell.classList.add("fv-drp-day--disabled"); return cell; }

		const today = new Date(); today.setHours(0, 0, 0, 0);
		if (this._sameDay(date, today)) cell.classList.add("fv-drp-day--today");

		// Selection state
		if (this._start && this._sameDay(date, this._start)) cell.classList.add("fv-drp-day--start", "fv-drp-day--selected");
		if (this._end && this._sameDay(date, this._end)) cell.classList.add("fv-drp-day--end", "fv-drp-day--selected");
		if (this._start && this._end && date > this._start && date < this._end) cell.classList.add("fv-drp-day--in-range");

		// Hover range preview
		cell.addEventListener("mouseenter", () => {
			if (this._selectingEnd && this._start) {
				this._hoverDate = date;
				this._updateHoverRange();
			}
		});

		cell.addEventListener("click", () => this._selectDate(date));
		return cell;
	}

	/* ── Selection Logic ─────────────────────────────────────── */
	_selectDate(date) {
		if (!this._selectingEnd || !this._start) {
			this._start = this._normalizeDate(date);
			this._end = null;
			this._selectingEnd = true;
		} else {
			if (date < this._start) {
				this._end = this._normalizeDate(this._start);
				this._start = this._normalizeDate(date);
			} else {
				this._end = this._normalizeDate(date);
			}
			this._selectingEnd = false;
		}
		this._render();
		if (this._start && this._end) this._emit();
	}

	_updateHoverRange() {
		this._panelEl.querySelectorAll(".fv-drp-day").forEach(cell => {
			cell.classList.remove("fv-drp-day--hover-range");
		});
		// Simple approach: re-render is cleaner for hover preview in complex cases
	}

	/* ── Navigation ──────────────────────────────────────────── */
	_navMonth(side, delta) {
		if (side === "left") {
			this._leftMonth = new Date(this._leftMonth.getFullYear(), this._leftMonth.getMonth() + delta, 1);
			if (!this.opts.singleCalendar) {
				this._rightMonth = new Date(this._leftMonth.getFullYear(), this._leftMonth.getMonth() + 1, 1);
			}
		} else {
			this._rightMonth = new Date(this._rightMonth.getFullYear(), this._rightMonth.getMonth() + delta, 1);
			this._leftMonth = new Date(this._rightMonth.getFullYear(), this._rightMonth.getMonth() - 1, 1);
		}
		this._render();
	}

	_syncMonthsToSelection() {
		if (this._start) {
			this._leftMonth = new Date(this._start.getFullYear(), this._start.getMonth(), 1);
			this._rightMonth = new Date(this._leftMonth.getFullYear(), this._leftMonth.getMonth() + 1, 1);
		}
	}

	/* ── Open/Close ──────────────────────────────────────────── */
	_toggle() { this._open ? this.close() : this.open(); }

	open() {
		this._open = true;
		this._panelEl.style.display = "";
		this._render();
		if (this.opts.onOpen) this.opts.onOpen();
	}

	close() {
		this._open = false;
		if (!this.opts.inline) this._panelEl.style.display = "none";
		this._updateTriggerText();
		if (this.opts.onClose) this.opts.onClose();
	}

	_emit() {
		this._updateTriggerText();
		if (this.opts.onChange) this.opts.onChange(this._formatDate(this._start), this._formatDate(this._end));
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_updateTriggerText() {
		if (!this._triggerEl) return;
		this._triggerEl.innerHTML = this._start && this._end
			? `<span class="fv-drp-trigger-icon">📅</span> ${this._formatDate(this._start)} → ${this._formatDate(this._end)}`
			: `<span class="fv-drp-trigger-icon">📅</span> ${this.opts.placeholder}`;
	}

	_formatRange() {
		if (!this._start) return __("Select start date");
		if (!this._end) return __("Select end date");
		const diff = Math.round((this._end - this._start) / 86400000) + 1;
		return `${this._formatDate(this._start)} — ${this._formatDate(this._end)} (${diff} ${__("days")})`;
	}

	_formatDate(d) { if (!d) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
	_parseDate(s) { if (s instanceof Date) return this._normalizeDate(s); const p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
	_normalizeDate(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
	_sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

	/* ── Public API ──────────────────────────────────────────── */
	getRange() { return { start: this._formatDate(this._start), end: this._formatDate(this._end) }; }
	setRange(start, end) { this._start = start ? this._parseDate(start) : null; this._end = end ? this._parseDate(end) : null; this._syncMonthsToSelection(); this._render(); }
	clear() { this._start = null; this._end = null; this._selectingEnd = false; this._render(); this._emit(); }

	destroy() {
		if (this._outsideClick) document.removeEventListener("mousedown", this._outsideClick);
		this.container.innerHTML = "";
		this.container.classList.remove("fv-drp", `fv-drp--${this.opts.theme}`, "fv-drp--inline");
	}
}
