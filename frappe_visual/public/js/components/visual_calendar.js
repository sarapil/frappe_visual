/**
 * VisualCalendar — Enhanced Calendar View
 * =========================================
 * Replaces standard FullCalendar with a visually-rich calendar
 * that integrates ColorSystem for event coloring, GSAP for
 * smooth transitions, and glassmorphism effects.
 *
 * Usage:
 *   frappe.visual.calendar('#container', {
 *     doctype: 'Event',
 *     fieldMap: { start: 'starts_on', end: 'ends_on', title: 'subject' },
 *   });
 */

import { ColorSystem } from "../utils/color_system";

export class VisualCalendar {
	static create(container, opts) {
		return new VisualCalendar(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign(
			{
				doctype: null,
				fieldMap: {
					start: "starts_on",
					end: "ends_on",
					title: "subject",
					allDay: "all_day",
					color: "color",
				},
				view: "month",
				filters: {},
				onEventClick: null,
				onDateClick: null,
				animate: true,
			},
			opts
		);

		this._currentDate = new Date();
		this._events = [];
		this._gsap = null;
		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		this._build();
		if (this.opts.doctype) await this._fetchEvents();
		this._render();
	}

	/* ── DOM Structure ─────────────────────────────────────────── */
	_build() {
		this.container.classList.add("fv-calendar", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Header
		this._header = this._el("div", "fv-calendar-header fv-fx-glass");
		this._header.innerHTML = `
			<div class="fv-calendar-nav">
				<button class="fv-calendar-nav-btn fv-cal-prev fv-fx-hover-scale" title="${__("Previous")}">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
				</button>
				<button class="fv-calendar-nav-btn fv-cal-today fv-fx-hover-glow">${__("Today")}</button>
				<button class="fv-calendar-nav-btn fv-cal-next fv-fx-hover-scale" title="${__("Next")}">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
				</button>
				<h3 class="fv-calendar-title fv-fx-gradient-text"></h3>
			</div>
			<div class="fv-calendar-views">
				${["month", "week", "day"].map(
					(v) =>
						`<button class="fv-cal-view-btn fv-fx-hover-scale ${
							this.opts.view === v ? "active" : ""
						}" data-view="${v}">${__(v.charAt(0).toUpperCase() + v.slice(1))}</button>`
				).join("")}
			</div>`;
		this.container.appendChild(this._header);

		// Body
		this._body = this._el("div", "fv-calendar-body");
		this.container.appendChild(this._body);

		// Events
		this._header.querySelector(".fv-cal-prev").addEventListener("click", () => this._nav(-1));
		this._header.querySelector(".fv-cal-next").addEventListener("click", () => this._nav(1));
		this._header.querySelector(".fv-cal-today").addEventListener("click", () => this._goToday());
		this._header.querySelectorAll(".fv-cal-view-btn").forEach((b) =>
			b.addEventListener("click", () => this._setView(b.dataset.view))
		);
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	/* ── Navigation ────────────────────────────────────────────── */
	_nav(dir) {
		const d = this._currentDate;
		if (this.opts.view === "month") d.setMonth(d.getMonth() + dir);
		else if (this.opts.view === "week") d.setDate(d.getDate() + dir * 7);
		else d.setDate(d.getDate() + dir);
		this._transition(() => this._render());
		this._fetchEvents();
	}

	_goToday() {
		this._currentDate = new Date();
		this._transition(() => this._render());
		this._fetchEvents();
	}

	_setView(view) {
		this.opts.view = view;
		this._header.querySelectorAll(".fv-cal-view-btn").forEach((b) =>
			b.classList.toggle("active", b.dataset.view === view)
		);
		this._transition(() => this._render());
	}

	_transition(cb) {
		if (!this._gsap || !this.opts.animate) return cb();
		this._gsap.to(this._body, {
			opacity: 0, y: 10, duration: 0.15, ease: "power2.in",
			onComplete: () => {
				cb();
				this._gsap.fromTo(
					this._body,
					{ opacity: 0, y: -10 },
					{ opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
				);
			},
		});
	}

	/* ── Render ────────────────────────────────────────────────── */
	_render() {
		this._header.querySelector(".fv-calendar-title").textContent = this._title();
		if (this.opts.view === "month") this._renderMonth();
		else if (this.opts.view === "week") this._renderWeek();
		else this._renderDay();
	}

	_title() {
		const d = this._currentDate;
		const m = [
			__("January"), __("February"), __("March"), __("April"),
			__("May"), __("June"), __("July"), __("August"),
			__("September"), __("October"), __("November"), __("December"),
		];
		if (this.opts.view === "month") return `${m[d.getMonth()]} ${d.getFullYear()}`;
		if (this.opts.view === "week") return `${__("Week")} — ${m[d.getMonth()]} ${d.getFullYear()}`;
		return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
	}

	/* ── Month View ────────────────────────────────────────────── */
	_renderMonth() {
		const d = this._currentDate;
		const y = d.getFullYear(), mo = d.getMonth();
		const first = new Date(y, mo, 1);
		const last = new Date(y, mo + 1, 0);
		const startDow = first.getDay();
		const total = last.getDate();
		const today = new Date();

		const days = [__("Sun"), __("Mon"), __("Tue"), __("Wed"), __("Thu"), __("Fri"), __("Sat")];
		let h = '<div class="fv-cal-grid fv-cal-month">';
		h += '<div class="fv-cal-day-headers">';
		days.forEach((n) => (h += `<div class="fv-cal-day-hdr">${n}</div>`));
		h += "</div><div class=\"fv-cal-days\">";

		const cells = Math.ceil((startDow + total) / 7) * 7;
		for (let i = 0; i < cells; i++) {
			const dn = i - startDow + 1;
			const curr = dn >= 1 && dn <= total;
			const ds = curr ? `${y}-${String(mo + 1).padStart(2, "0")}-${String(dn).padStart(2, "0")}` : "";
			const isToday = curr && dn === today.getDate() && mo === today.getMonth() && y === today.getFullYear();
			const evts = curr ? this._eventsForDate(ds) : [];

			h += `<div class="fv-cal-cell fv-fx-hover-glow ${!curr ? "fv-cal-cell-other" : ""} ${isToday ? "fv-cal-cell-today" : ""}" data-date="${ds}">`;
			h += `<span class="fv-cal-cell-num ${isToday ? "fv-cal-today-num" : ""}">${curr ? dn : ""}</span>`;

			evts.slice(0, 3).forEach((ev) => {
				const c = this._eventColor(ev);
				h += `<div class="fv-cal-event fv-fx-hover-lift" style="--fv-ev-color:${c}" data-name="${ev.name}">
					<span class="fv-cal-event-dot" style="background:${c}"></span>
					<span class="fv-cal-event-text">${frappe.utils.escape_html(this._evTitle(ev))}</span>
				</div>`;
			});
			if (evts.length > 3) h += `<div class="fv-cal-more">+${evts.length - 3} ${__("more")}</div>`;
			h += "</div>";
		}
		h += "</div></div>";
		this._body.innerHTML = h;
		this._bindEvents();
	}

	/* ── Week View ─────────────────────────────────────────────── */
	_renderWeek() {
		const d = this._currentDate;
		const sow = new Date(d);
		sow.setDate(d.getDate() - d.getDay());
		const today = new Date();
		const dayN = [__("Sun"), __("Mon"), __("Tue"), __("Wed"), __("Thu"), __("Fri"), __("Sat")];
		const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

		let h = '<div class="fv-cal-grid fv-cal-week">';
		h += '<div class="fv-cal-week-hdr"><div class="fv-cal-time-gutter"></div>';
		for (let i = 0; i < 7; i++) {
			const dd = new Date(sow);
			dd.setDate(sow.getDate() + i);
			const t = dd.toDateString() === today.toDateString();
			h += `<div class="fv-cal-week-day ${t ? "fv-cal-cell-today" : ""}">
				<span class="fv-cal-wday-name">${dayN[i]}</span>
				<span class="fv-cal-wday-num ${t ? "fv-cal-today-num" : ""}">${dd.getDate()}</span>
			</div>`;
		}
		h += "</div><div class=\"fv-cal-week-body\">";
		h += '<div class="fv-cal-time-col">';
		hours.forEach((hr) => (h += `<div class="fv-cal-time-slot">${hr}</div>`));
		h += "</div>";

		for (let i = 0; i < 7; i++) {
			const dd = new Date(sow);
			dd.setDate(sow.getDate() + i);
			const ds = dd.toISOString().slice(0, 10);
			const evts = this._eventsForDate(ds);
			h += `<div class="fv-cal-week-col" data-date="${ds}">`;
			hours.forEach(() => (h += '<div class="fv-cal-hour-cell"></div>'));
			evts.forEach((ev) => {
				const c = this._eventColor(ev);
				h += `<div class="fv-cal-week-event fv-fx-glass fv-fx-hover-lift" style="--fv-ev-color:${c}" data-name="${ev.name}">
					${frappe.utils.escape_html(this._evTitle(ev))}
				</div>`;
			});
			h += "</div>";
		}
		h += "</div></div>";
		this._body.innerHTML = h;
		this._bindEvents();
	}

	/* ── Day View ──────────────────────────────────────────────── */
	_renderDay() {
		const d = this._currentDate;
		const ds = d.toISOString().slice(0, 10);
		const evts = this._eventsForDate(ds);
		const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

		let h = '<div class="fv-cal-grid fv-cal-day-view">';
		hours.forEach((hr, idx) => {
			h += `<div class="fv-cal-day-row">
				<div class="fv-cal-time-label fv-fx-vertical-text">${hr}</div>
				<div class="fv-cal-day-cell" data-date="${ds}">`;
			// Place events at approximate positions
			evts.forEach((ev) => {
				const evHour = parseInt((ev[this.opts.fieldMap.start] || "").split(" ")[1] || "0");
				if (evHour === idx) {
					const c = this._eventColor(ev);
					h += `<div class="fv-cal-day-event fv-fx-glass fv-fx-hover-lift" style="--fv-ev-color:${c}" data-name="${ev.name}">
						<strong>${frappe.utils.escape_html(this._evTitle(ev))}</strong>
					</div>`;
				}
			});
			h += "</div></div>";
		});
		h += "</div>";
		this._body.innerHTML = h;
		this._bindEvents();
	}

	/* ── Interactions ──────────────────────────────────────────── */
	_bindEvents() {
		// Event click → Form or callback
		this._body.querySelectorAll("[data-name]").forEach((el) => {
			el.addEventListener("click", (e) => {
				e.stopPropagation();
				const ev = this._events.find((x) => x.name === el.dataset.name);
				if (ev && this.opts.onEventClick) this.opts.onEventClick(ev, el);
				else if (ev && this.opts.doctype) frappe.set_route("Form", this.opts.doctype, ev.name);
			});
		});

		// Date click → New doc or callback
		this._body.querySelectorAll("[data-date]").forEach((cell) => {
			cell.addEventListener("click", () => {
				const dt = cell.dataset.date;
				if (!dt) return;
				if (this.opts.onDateClick) this.opts.onDateClick(dt);
				else if (this.opts.doctype) frappe.new_doc(this.opts.doctype, { [this.opts.fieldMap.start]: dt });
			});
		});

		// GSAP stagger entrance
		if (this._gsap && this.opts.animate) {
			const items = this._body.querySelectorAll(".fv-cal-event, .fv-cal-week-event, .fv-cal-day-event");
			if (items.length) {
				this._gsap.from(items, { opacity: 0, y: 6, scale: 0.95, duration: 0.3, stagger: 0.02, ease: "power2.out" });
			}
		}
	}

	/* ── Data ──────────────────────────────────────────────────── */
	async _fetchEvents() {
		if (!this.opts.doctype) return;
		const fm = this.opts.fieldMap;
		const d = this._currentDate;
		const start = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
		const end = new Date(d.getFullYear(), d.getMonth() + 2, 0).toISOString().slice(0, 10);

		const fields = [...new Set(["name", fm.start, fm.title, fm.end, fm.color].filter(Boolean))];
		try {
			this._events = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields,
				filters: { ...this.opts.filters, [fm.start]: ["between", [start, end]] },
				limit_page_length: 500,
				order_by: `${fm.start} asc`,
			});
		} catch (e) {
			console.error("VisualCalendar: fetch failed", e);
			this._events = [];
		}
	}

	_eventsForDate(ds) {
		if (!ds) return [];
		const fm = this.opts.fieldMap;
		return this._events.filter((ev) => {
			const s = (ev[fm.start] || "").slice(0, 10);
			const e = ev[fm.end] ? ev[fm.end].slice(0, 10) : s;
			return ds >= s && ds <= e;
		});
	}

	_eventColor(ev) {
		if (ev[this.opts.fieldMap.color]) return ev[this.opts.fieldMap.color];
		return ColorSystem.autoColor(this._evTitle(ev)).border;
	}

	_evTitle(ev) { return ev[this.opts.fieldMap.title] || ev.name; }

	/* ── Public API ────────────────────────────────────────────── */
	setEvents(events) { this._events = events; this._render(); }
	refresh() { this._fetchEvents().then(() => this._render()); }
	setView(v) { this._setView(v); }
	goToDate(d) { this._currentDate = new Date(d); this._render(); this._fetchEvents(); }
	destroy() { this.container.innerHTML = ""; this.container.classList.remove("fv-calendar"); }
}
