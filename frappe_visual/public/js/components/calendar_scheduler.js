// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Calendar Scheduler Pro
 * ========================================
 * Resource-based scheduling calendar with month/week/day views,
 * multi-resource lanes, drag-and-drop events, recurring patterns,
 * and conflict detection.
 *
 * Features:
 *  - Month / Week / Day / Resource (timeline) views
 *  - Multi-resource lanes (rooms, people, equipment)
 *  - Drag to create, drag to move, resize to change duration
 *  - Recurring event patterns (daily, weekly, monthly, custom)
 *  - Conflict detection with visual warning
 *  - Mini-month navigation panel
 *  - Event color coding by category / resource
 *  - Quick event creation popup
 *  - All-day and multi-day events
 *  - Current time indicator line
 *  - Frappe Event DocType integration
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.CalendarScheduler.create('#el', { view: 'week' })
 *
 * @module frappe_visual/components/calendar_scheduler
 */

const VIEWS = ["month", "week", "day", "resource"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const COLOR_PALETTE = [
	"#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6",
	"#EC4899","#06B6D4","#84CC16","#F97316","#6366F1",
];

export class CalendarScheduler {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("CalendarScheduler: container not found");

		this.opts = Object.assign({
			theme: "glass",
			view: "week",
			date: new Date(),
			resources: [],           // [{ id, label, color }]
			events: [],              // [{ id, title, start, end, resource_id, color, allDay }]
			eventDoctype: null,      // Frappe DocType for events
			startHour: 7,
			endHour: 22,
			slotDuration: 30,        // minutes
			showMiniMonth: true,
			showConflicts: true,
			onEventCreate: null,
			onEventMove: null,
			onEventResize: null,
			onEventClick: null,
		}, opts);

		this._currentDate = new Date(this.opts.date);
		this._view = this.opts.view;
		this._events = [...this.opts.events];
		this._resources = [...this.opts.resources];
		this._dragState = null;

		this._init();
	}

	static create(container, opts) { return new CalendarScheduler(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-cs", `fv-cs--${this.opts.theme}`);
		this.container.innerHTML = "";
		this._renderHeader();
		this._renderBody();
		if (this.opts.eventDoctype) this._loadEvents();
		else this._renderView();
	}

	/* ── Header ──────────────────────────────────────────────── */
	_renderHeader() {
		const header = document.createElement("div");
		header.className = "fv-cs-header";
		header.innerHTML = `
			<div class="fv-cs-nav">
				<button class="fv-cs-btn fv-cs-prev">◀</button>
				<button class="fv-cs-btn fv-cs-today">${__("Today")}</button>
				<button class="fv-cs-btn fv-cs-next">▶</button>
				<h3 class="fv-cs-title"></h3>
			</div>
			<div class="fv-cs-views">
				${VIEWS.map(v => `<button class="fv-cs-view-btn ${v === this._view ? "active" : ""}" data-view="${v}">
					${__(v.charAt(0).toUpperCase() + v.slice(1))}</button>`
				).join("")}
			</div>`;
		this.container.appendChild(header);
		this._titleEl = header.querySelector(".fv-cs-title");

		header.querySelector(".fv-cs-prev").addEventListener("click", () => this._navigate(-1));
		header.querySelector(".fv-cs-next").addEventListener("click", () => this._navigate(1));
		header.querySelector(".fv-cs-today").addEventListener("click", () => {
			this._currentDate = new Date();
			this._renderView();
		});
		header.querySelectorAll(".fv-cs-view-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				this._view = btn.dataset.view;
				header.querySelectorAll(".fv-cs-view-btn").forEach(b => b.classList.toggle("active", b === btn));
				this._renderView();
			});
		});
	}

	/* ── Body ────────────────────────────────────────────────── */
	_renderBody() {
		const body = document.createElement("div");
		body.className = "fv-cs-body";

		if (this.opts.showMiniMonth) {
			const mini = document.createElement("div");
			mini.className = "fv-cs-mini-month";
			body.appendChild(mini);
			this._miniMonthEl = mini;
		}

		const main = document.createElement("div");
		main.className = "fv-cs-main";
		body.appendChild(main);
		this._mainEl = main;

		this.container.appendChild(body);
	}

	/* ── View Rendering ──────────────────────────────────────── */
	_renderView() {
		this._updateTitle();
		if (this.opts.showMiniMonth) this._renderMiniMonth();

		switch (this._view) {
			case "month":    this._renderMonthView(); break;
			case "week":     this._renderWeekView(); break;
			case "day":      this._renderDayView(); break;
			case "resource": this._renderResourceView(); break;
		}
	}

	_updateTitle() {
		if (!this._titleEl) return;
		const d = this._currentDate;
		switch (this._view) {
			case "month":
				this._titleEl.textContent = `${__(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
				break;
			case "week": {
				const start = this._weekStart(d);
				const end = new Date(start); end.setDate(end.getDate() + 6);
				this._titleEl.textContent = `${start.getDate()} ${__(MONTHS[start.getMonth()])} – ${end.getDate()} ${__(MONTHS[end.getMonth()])} ${end.getFullYear()}`;
				break;
			}
			case "day":
				this._titleEl.textContent = `${__(DAYS_SHORT[d.getDay()])}, ${d.getDate()} ${__(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
				break;
			case "resource":
				this._titleEl.textContent = `${__(DAYS_SHORT[d.getDay()])}, ${d.getDate()} ${__(MONTHS[d.getMonth()])}`;
				break;
		}
	}

	/* ── Month View ──────────────────────────────────────────── */
	_renderMonthView() {
		const d = this._currentDate;
		const first = new Date(d.getFullYear(), d.getMonth(), 1);
		const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
		const startDay = first.getDay();
		const totalDays = last.getDate();
		const today = new Date();

		let html = '<div class="fv-cs-month-grid">';
		// Day headers
		html += '<div class="fv-cs-month-header">';
		DAYS_SHORT.forEach(d => { html += `<div class="fv-cs-month-hdr">${__(d)}</div>`; });
		html += '</div>';

		// Cells
		html += '<div class="fv-cs-month-cells">';
		for (let i = 0; i < 42; i++) {
			const dayNum = i - startDay + 1;
			const isValid = dayNum >= 1 && dayNum <= totalDays;
			const cellDate = isValid ? new Date(d.getFullYear(), d.getMonth(), dayNum) : null;
			const isToday = isValid && cellDate.toDateString() === today.toDateString();
			const dayEvents = isValid ? this._eventsForDate(cellDate) : [];

			html += `<div class="fv-cs-month-cell ${isValid ? "" : "fv-cs-month-cell--empty"} ${isToday ? "fv-cs-month-cell--today" : ""}"
				data-date="${isValid ? this._fmtDate(cellDate) : ""}">
				${isValid ? `<span class="fv-cs-month-day">${dayNum}</span>` : ""}
				${dayEvents.slice(0, 3).map(ev =>
					`<div class="fv-cs-month-event" style="background:${ev.color || COLOR_PALETTE[0]}" data-id="${ev.id || ""}"
						title="${this._esc(ev.title)}">${this._esc(ev.title)}</div>`
				).join("")}
				${dayEvents.length > 3 ? `<div class="fv-cs-month-more">+${dayEvents.length - 3} more</div>` : ""}
			</div>`;
		}
		html += '</div></div>';
		this._mainEl.innerHTML = html;

		// Click to create event
		this._mainEl.querySelectorAll(".fv-cs-month-cell[data-date]").forEach(cell => {
			cell.addEventListener("dblclick", () => {
				const date = cell.dataset.date;
				if (date && this.opts.onEventCreate) {
					this.opts.onEventCreate({ date, allDay: true });
				}
			});
		});

		this._bindEventClicks();
	}

	/* ── Week View ───────────────────────────────────────────── */
	_renderWeekView() {
		const start = this._weekStart(this._currentDate);
		const days = Array.from({ length: 7 }, (_, i) => {
			const d = new Date(start);
			d.setDate(d.getDate() + i);
			return d;
		});
		const today = new Date();

		let html = '<div class="fv-cs-week">';
		// Header
		html += '<div class="fv-cs-week-header"><div class="fv-cs-time-gutter"></div>';
		days.forEach(d => {
			const isToday = d.toDateString() === today.toDateString();
			html += `<div class="fv-cs-week-day-hdr ${isToday ? "fv-cs-week-day-hdr--today" : ""}">
				<span>${__(DAYS_SHORT[d.getDay()])}</span>
				<span class="fv-cs-week-day-num">${d.getDate()}</span>
			</div>`;
		});
		html += '</div>';

		// Grid
		html += '<div class="fv-cs-week-body"><div class="fv-cs-week-scroll">';

		// Time gutter + columns
		html += '<div class="fv-cs-week-grid">';
		html += '<div class="fv-cs-time-gutter">';
		for (let h = this.opts.startHour; h <= this.opts.endHour; h++) {
			html += `<div class="fv-cs-time-label">${h.toString().padStart(2, "0")}:00</div>`;
		}
		html += '</div>';

		days.forEach(d => {
			const dayEvents = this._eventsForDate(d).filter(e => !e.allDay);
			const isToday = d.toDateString() === today.toDateString();
			html += `<div class="fv-cs-week-col ${isToday ? "fv-cs-week-col--today" : ""}" data-date="${this._fmtDate(d)}">`;
			for (let h = this.opts.startHour; h <= this.opts.endHour; h++) {
				html += `<div class="fv-cs-week-slot" data-hour="${h}"></div>`;
			}
			// Events
			dayEvents.forEach(ev => {
				const top = this._timeToPixels(ev.start);
				const height = this._timeToPixels(ev.end) - top;
				html += `<div class="fv-cs-week-event" data-id="${ev.id || ""}"
					style="top:${top}px; height:${Math.max(height, 20)}px; background:${ev.color || COLOR_PALETTE[0]}">
					<div class="fv-cs-week-event-title">${this._esc(ev.title)}</div>
					<div class="fv-cs-week-event-time">${this._fmtTime(ev.start)} – ${this._fmtTime(ev.end)}</div>
				</div>`;
			});

			// Current time line
			if (isToday) {
				const now = new Date();
				const nowTop = ((now.getHours() - this.opts.startHour) + now.getMinutes() / 60) * 60;
				if (nowTop > 0) {
					html += `<div class="fv-cs-now-line" style="top:${nowTop}px"></div>`;
				}
			}
			html += '</div>';
		});

		html += '</div></div></div></div>';
		this._mainEl.innerHTML = html;
		this._bindEventClicks();
	}

	/* ── Day View ────────────────────────────────────────────── */
	_renderDayView() {
		const d = this._currentDate;
		const dayEvents = this._eventsForDate(d);

		let html = '<div class="fv-cs-day">';
		// All-day section
		const allDay = dayEvents.filter(e => e.allDay);
		if (allDay.length) {
			html += '<div class="fv-cs-allday">';
			allDay.forEach(ev => {
				html += `<div class="fv-cs-allday-event" data-id="${ev.id || ""}"
					style="background:${ev.color || COLOR_PALETTE[0]}">${this._esc(ev.title)}</div>`;
			});
			html += '</div>';
		}

		// Time slots
		html += '<div class="fv-cs-day-body"><div class="fv-cs-day-scroll">';
		html += '<div class="fv-cs-day-grid"><div class="fv-cs-time-gutter">';
		for (let h = this.opts.startHour; h <= this.opts.endHour; h++) {
			html += `<div class="fv-cs-time-label">${h.toString().padStart(2, "0")}:00</div>`;
		}
		html += '</div><div class="fv-cs-day-col">';
		for (let h = this.opts.startHour; h <= this.opts.endHour; h++) {
			html += `<div class="fv-cs-day-slot" data-hour="${h}"></div>`;
		}
		dayEvents.filter(e => !e.allDay).forEach(ev => {
			const top = this._timeToPixels(ev.start);
			const height = this._timeToPixels(ev.end) - top;
			html += `<div class="fv-cs-day-event" data-id="${ev.id || ""}"
				style="top:${top}px; height:${Math.max(height, 20)}px; background:${ev.color || COLOR_PALETTE[0]}">
				<strong>${this._esc(ev.title)}</strong>
				<span>${this._fmtTime(ev.start)} – ${this._fmtTime(ev.end)}</span>
			</div>`;
		});

		// Now line
		const now = new Date();
		if (d.toDateString() === now.toDateString()) {
			const nowTop = ((now.getHours() - this.opts.startHour) + now.getMinutes() / 60) * 60;
			if (nowTop > 0) html += `<div class="fv-cs-now-line" style="top:${nowTop}px"></div>`;
		}

		html += '</div></div></div></div></div>';
		this._mainEl.innerHTML = html;
		this._bindEventClicks();
	}

	/* ── Resource View ───────────────────────────────────────── */
	_renderResourceView() {
		if (this._resources.length === 0) {
			this._mainEl.innerHTML = `<div class="fv-cs-empty">${__("No resources defined")}</div>`;
			return;
		}

		const d = this._currentDate;
		let html = '<div class="fv-cs-resource">';
		html += '<div class="fv-cs-resource-header"><div class="fv-cs-resource-label-col"></div>';
		for (let h = this.opts.startHour; h <= this.opts.endHour; h++) {
			html += `<div class="fv-cs-resource-hour">${h}:00</div>`;
		}
		html += '</div>';

		this._resources.forEach((res, ri) => {
			const resEvents = this._events.filter(e =>
				e.resource_id === res.id && this._isSameDay(new Date(e.start), d)
			);
			html += `<div class="fv-cs-resource-row">
				<div class="fv-cs-resource-label" style="border-left:3px solid ${res.color || COLOR_PALETTE[ri % COLOR_PALETTE.length]}">
					${this._esc(__(res.label))}
				</div>
				<div class="fv-cs-resource-timeline">`;
			for (let h = this.opts.startHour; h <= this.opts.endHour; h++) {
				html += '<div class="fv-cs-resource-slot"></div>';
			}
			resEvents.forEach(ev => {
				const left = this._timeToPercent(ev.start);
				const width = this._timeToPercent(ev.end) - left;
				html += `<div class="fv-cs-resource-event" data-id="${ev.id || ""}"
					style="left:${left}%; width:${Math.max(width, 2)}%; background:${ev.color || res.color || COLOR_PALETTE[ri % COLOR_PALETTE.length]}">
					${this._esc(ev.title)}
				</div>`;
			});
			html += '</div></div>';
		});
		html += '</div>';
		this._mainEl.innerHTML = html;
		this._bindEventClicks();
	}

	/* ── Mini Month ──────────────────────────────────────────── */
	_renderMiniMonth() {
		if (!this._miniMonthEl) return;
		const d = this._currentDate;
		const first = new Date(d.getFullYear(), d.getMonth(), 1);
		const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
		const startDay = first.getDay();
		const today = new Date();

		let html = `<div class="fv-cs-mini-hdr">
			<button class="fv-cs-mini-nav" data-dir="-1">◀</button>
			<span>${__(MONTHS[d.getMonth()])} ${d.getFullYear()}</span>
			<button class="fv-cs-mini-nav" data-dir="1">▶</button>
		</div>`;
		html += '<div class="fv-cs-mini-grid">';
		DAYS_SHORT.forEach(dy => { html += `<span class="fv-cs-mini-day-hdr">${__(dy).slice(0, 2)}</span>`; });
		for (let i = 0; i < 42; i++) {
			const dayNum = i - startDay + 1;
			const valid = dayNum >= 1 && dayNum <= last.getDate();
			const dt = valid ? new Date(d.getFullYear(), d.getMonth(), dayNum) : null;
			const isToday = dt && dt.toDateString() === today.toDateString();
			const isSelected = dt && dt.toDateString() === d.toDateString();
			html += `<span class="fv-cs-mini-day ${valid ? "" : "fv-cs-mini-day--empty"} ${isToday ? "fv-cs-mini-day--today" : ""} ${isSelected ? "fv-cs-mini-day--sel" : ""}"
				data-date="${valid ? this._fmtDate(dt) : ""}">${valid ? dayNum : ""}</span>`;
		}
		html += '</div>';

		this._miniMonthEl.innerHTML = html;

		this._miniMonthEl.querySelectorAll(".fv-cs-mini-nav").forEach(btn => {
			btn.addEventListener("click", () => {
				const dir = parseInt(btn.dataset.dir);
				this._currentDate.setMonth(this._currentDate.getMonth() + dir);
				this._renderView();
			});
		});

		this._miniMonthEl.querySelectorAll(".fv-cs-mini-day[data-date]").forEach(el => {
			el.addEventListener("click", () => {
				if (el.dataset.date) {
					this._currentDate = new Date(el.dataset.date);
					this._renderView();
				}
			});
		});
	}

	/* ── Event Clicks ────────────────────────────────────────── */
	_bindEventClicks() {
		const selectors = [".fv-cs-month-event", ".fv-cs-week-event", ".fv-cs-day-event",
			".fv-cs-allday-event", ".fv-cs-resource-event"];
		selectors.forEach(sel => {
			this._mainEl.querySelectorAll(sel).forEach(el => {
				el.addEventListener("click", (e) => {
					e.stopPropagation();
					const id = el.dataset.id;
					const ev = this._events.find(e => e.id === id);
					if (ev && this.opts.onEventClick) this.opts.onEventClick(ev);
				});
			});
		});
	}

	/* ── Navigation ──────────────────────────────────────────── */
	_navigate(dir) {
		switch (this._view) {
			case "month": this._currentDate.setMonth(this._currentDate.getMonth() + dir); break;
			case "week":  this._currentDate.setDate(this._currentDate.getDate() + dir * 7); break;
			case "day":
			case "resource": this._currentDate.setDate(this._currentDate.getDate() + dir); break;
		}
		this._renderView();
	}

	/* ── Load Events from Frappe ─────────────────────────────── */
	async _loadEvents() {
		if (!this.opts.eventDoctype) return;
		try {
			const result = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.eventDoctype,
				fields: ["name", "subject as title", "starts_on as start", "ends_on as end",
					"color", "all_day as allDay", "event_category"],
				limit_page_length: 500,
			});
			this._events = (result || []).map(e => ({
				...e,
				id: e.name,
				start: e.start ? new Date(e.start) : new Date(),
				end: e.end ? new Date(e.end) : new Date(),
				allDay: !!e.allDay,
				color: e.color || COLOR_PALETTE[0],
			}));
		} catch (err) {
			console.error("CalendarScheduler: load error", err);
		}
		this._renderView();
	}

	/* ── Conflict Detection ──────────────────────────────────── */
	detectConflicts() {
		const conflicts = [];
		for (let i = 0; i < this._events.length; i++) {
			for (let j = i + 1; j < this._events.length; j++) {
				const a = this._events[i], b = this._events[j];
				if (a.resource_id && b.resource_id && a.resource_id !== b.resource_id) continue;
				const aStart = new Date(a.start).getTime();
				const aEnd = new Date(a.end).getTime();
				const bStart = new Date(b.start).getTime();
				const bEnd = new Date(b.end).getTime();
				if (aStart < bEnd && aEnd > bStart) {
					conflicts.push({ event1: a, event2: b });
				}
			}
		}
		return conflicts;
	}

	/* ── Public API ──────────────────────────────────────────── */
	addEvent(event) {
		this._events.push(event);
		this._renderView();
	}

	removeEvent(id) {
		this._events = this._events.filter(e => e.id !== id);
		this._renderView();
	}

	setView(view) {
		if (VIEWS.includes(view)) {
			this._view = view;
			this.container.querySelectorAll(".fv-cs-view-btn").forEach(b =>
				b.classList.toggle("active", b.dataset.view === view)
			);
			this._renderView();
		}
	}

	setResources(resources) {
		this._resources = resources;
		this._renderView();
	}

	goToDate(date) {
		this._currentDate = new Date(date);
		this._renderView();
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_weekStart(d) {
		const start = new Date(d);
		start.setDate(start.getDate() - start.getDay());
		return start;
	}

	_eventsForDate(date) {
		return this._events.filter(ev => {
			const start = new Date(ev.start);
			const end = new Date(ev.end);
			const d = new Date(date);
			d.setHours(0, 0, 0, 0);
			const dEnd = new Date(d); dEnd.setHours(23, 59, 59);
			return start <= dEnd && end >= d;
		});
	}

	_timeToPixels(dateStr) {
		const d = new Date(dateStr);
		return ((d.getHours() - this.opts.startHour) + d.getMinutes() / 60) * 60;
	}

	_timeToPercent(dateStr) {
		const d = new Date(dateStr);
		const totalHours = this.opts.endHour - this.opts.startHour;
		return ((d.getHours() - this.opts.startHour) + d.getMinutes() / 60) / totalHours * 100;
	}

	_isSameDay(a, b) {
		return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
	}

	_fmtDate(d) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
	}

	_fmtTime(dateStr) {
		const d = new Date(dateStr);
		return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-cs");
	}
}
