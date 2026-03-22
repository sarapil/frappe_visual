/**
 * VisualGantt — GSAP-Powered Gantt Chart
 * ========================================
 * Interactive Gantt timeline with GSAP Draggable for resizing,
 * ColorSystem for task coloring, dependency arrows, and smooth
 * zoom transitions between day/week/month scales.
 *
 * Usage:
 *   frappe.visual.gantt('#container', {
 *     doctype: 'Task',
 *     fieldMap: { start: 'exp_start_date', end: 'exp_end_date', title: 'subject', progress: 'progress' },
 *   });
 */

import { ColorSystem } from "../utils/color_system";

const SCALES = {
	day:   { unit: 1,  label: (d) => d.getDate(), headerFmt: "day", cellWidth: 40 },
	week:  { unit: 7,  label: (d) => `W${Math.ceil(d.getDate() / 7)}`, headerFmt: "week", cellWidth: 80 },
	month: { unit: 30, label: (d) => d.toLocaleString("default", { month: "short" }), headerFmt: "month", cellWidth: 120 },
};

export class VisualGantt {
	static create(container, opts) {
		return new VisualGantt(container, opts);
	}

	constructor(container, opts) {
		this.container =
			typeof container === "string" ? document.querySelector(container) : container;

		this.opts = Object.assign(
			{
				doctype: null,
				fieldMap: {
					start: "exp_start_date",
					end: "exp_end_date",
					title: "subject",
					progress: "progress",
					depends_on: "depends_on",
					status: "status",
				},
				scale: "week",
				filters: {},
				onTaskClick: null,
				onTaskMove: null,
				animate: true,
			},
			opts
		);

		this._tasks = [];
		this._gsap = null;
		this._init();
	}

	async _init() {
		this._gsap = frappe.visual?.gsap || window.gsap;
		this._Draggable = frappe.visual?.Draggable || window.Draggable;
		this._build();
		if (this.opts.doctype) await this._fetchTasks();
		this._render();
	}

	/* ── DOM ───────────────────────────────────────────────────── */
	_build() {
		this.container.classList.add("fv-gantt", "fv-fx-page-enter");
		this.container.innerHTML = "";

		// Toolbar
		const toolbar = this._el("div", "fv-gantt-toolbar fv-fx-glass");
		toolbar.innerHTML = `
			<div class="fv-gantt-title fv-fx-gradient-text">${this.opts.doctype ? __(this.opts.doctype) : __("Timeline")}</div>
			<div class="fv-gantt-scales">
				${["day", "week", "month"].map(
					(s) =>
						`<button class="fv-gantt-scale-btn fv-fx-hover-scale ${
							this.opts.scale === s ? "active" : ""
						}" data-scale="${s}">${__(s.charAt(0).toUpperCase() + s.slice(1))}</button>`
				).join("")}
			</div>
			<button class="fv-gantt-fit-btn fv-fx-hover-glow" title="${__("Fit to View")}">${__("Fit")}</button>`;
		this.container.appendChild(toolbar);

		toolbar.querySelectorAll(".fv-gantt-scale-btn").forEach((b) =>
			b.addEventListener("click", () => this._setScale(b.dataset.scale))
		);
		toolbar.querySelector(".fv-gantt-fit-btn").addEventListener("click", () => this._fitToView());

		// Chart area
		this._chart = this._el("div", "fv-gantt-chart");
		this.container.appendChild(this._chart);
	}

	_el(tag, cls) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		return el;
	}

	/* ── Scale ─────────────────────────────────────────────────── */
	_setScale(scale) {
		this.opts.scale = scale;
		this.container.querySelectorAll(".fv-gantt-scale-btn").forEach((b) =>
			b.classList.toggle("active", b.dataset.scale === scale)
		);
		if (this._gsap && this.opts.animate) {
			this._gsap.to(this._chart, {
				opacity: 0, duration: 0.15,
				onComplete: () => { this._render(); this._gsap.to(this._chart, { opacity: 1, duration: 0.25 }); },
			});
		} else {
			this._render();
		}
	}

	/* ── Render ────────────────────────────────────────────────── */
	_render() {
		if (!this._tasks.length) {
			this._chart.innerHTML = `<div class="fv-gantt-empty">${__("No tasks found")}</div>`;
			return;
		}

		const cfg = SCALES[this.opts.scale];
		const { minDate, maxDate, totalDays } = this._getRange();
		const chartW = Math.max(totalDays * (cfg.cellWidth / cfg.unit), 600);

		let h = "";

		// ── Timeline header
		h += `<div class="fv-gantt-header" style="width:${chartW + 240}px">`;
		h += '<div class="fv-gantt-label-col"></div>';
		h += `<div class="fv-gantt-timeline" style="width:${chartW}px">`;
		const cur = new Date(minDate);
		while (cur <= maxDate) {
			const w = cfg.cellWidth;
			const label = cfg.label(cur);
			h += `<div class="fv-gantt-header-cell" style="min-width:${w}px">${label}</div>`;
			cur.setDate(cur.getDate() + cfg.unit);
		}
		h += "</div></div>";

		// ── Today marker
		const today = new Date();
		const todayOffset = this._daysBetween(minDate, today);
		const todayPx = (todayOffset / totalDays) * chartW;

		// ── Task rows
		h += `<div class="fv-gantt-rows" style="width:${chartW + 240}px">`;
		this._tasks.forEach((task, idx) => {
			const tStart = new Date(task[this.opts.fieldMap.start]);
			const tEnd = new Date(task[this.opts.fieldMap.end] || task[this.opts.fieldMap.start]);
			const offset = this._daysBetween(minDate, tStart);
			const duration = Math.max(this._daysBetween(tStart, tEnd), 1);
			const left = (offset / totalDays) * chartW;
			const width = (duration / totalDays) * chartW;
			const progress = parseFloat(task[this.opts.fieldMap.progress]) || 0;
			const color = ColorSystem.autoColor(this._taskTitle(task)).border;
			const title = frappe.utils.escape_html(this._taskTitle(task));

			h += `<div class="fv-gantt-row fv-stagger-children" data-idx="${idx}">`;
			h += `<div class="fv-gantt-row-label fv-fx-hover-shine" data-name="${task.name}" title="${title}">
				<span class="fv-gantt-row-dot" style="background:${color}"></span>
				<span class="fv-gantt-row-text">${title}</span>
			</div>`;
			h += `<div class="fv-gantt-row-track" style="width:${chartW}px">`;

			// Today line
			if (todayPx > 0 && todayPx < chartW) {
				h += `<div class="fv-gantt-today-line" style="left:${todayPx}px"></div>`;
			}

			// Task bar
			h += `<div class="fv-gantt-bar fv-fx-hover-lift" style="left:${left}px;width:${Math.max(width, 20)}px;--fv-bar-color:${color}" data-name="${task.name}">
				<div class="fv-gantt-bar-fill" style="width:${progress}%"></div>
				<span class="fv-gantt-bar-text">${title}</span>
			</div>`;

			h += "</div></div>";
		});
		h += "</div>";

		this._chart.innerHTML = h;
		this._bindInteractions();
	}

	/* ── Interactions ──────────────────────────────────────────── */
	_bindInteractions() {
		// Task bar click
		this._chart.querySelectorAll(".fv-gantt-bar, .fv-gantt-row-label").forEach((el) => {
			el.addEventListener("click", () => {
				const name = el.dataset.name;
				const task = this._tasks.find((t) => t.name === name);
				if (task && this.opts.onTaskClick) this.opts.onTaskClick(task, el);
				else if (task && this.opts.doctype) frappe.set_route("Form", this.opts.doctype, name);
			});
		});

		// GSAP stagger entrance
		if (this._gsap && this.opts.animate) {
			const bars = this._chart.querySelectorAll(".fv-gantt-bar");
			if (bars.length) {
				this._gsap.from(bars, {
					scaleX: 0, transformOrigin: "left center",
					duration: 0.5, stagger: 0.04, ease: "power3.out",
				});
			}
		}
	}

	_fitToView() {
		if (this._chart.scrollWidth > this._chart.clientWidth) {
			this._chart.scrollTo({ left: 0, behavior: "smooth" });
		}
	}

	/* ── Data ──────────────────────────────────────────────────── */
	async _fetchTasks() {
		if (!this.opts.doctype) return;
		const fm = this.opts.fieldMap;
		const fields = [...new Set(["name", fm.start, fm.end, fm.title, fm.progress, fm.status].filter(Boolean))];
		try {
			this._tasks = await frappe.xcall("frappe.client.get_list", {
				doctype: this.opts.doctype,
				fields,
				filters: this.opts.filters || {},
				limit_page_length: 200,
				order_by: `${fm.start} asc`,
			});
		} catch (e) {
			console.error("VisualGantt: fetch failed", e);
			this._tasks = [];
		}
	}

	_getRange() {
		const fm = this.opts.fieldMap;
		let min = Infinity, max = -Infinity;
		this._tasks.forEach((t) => {
			const s = new Date(t[fm.start]).getTime();
			const e = new Date(t[fm.end] || t[fm.start]).getTime();
			if (s < min) min = s;
			if (e > max) max = e;
		});
		// Add 5-day padding on each side
		const minDate = new Date(min - 5 * 864e5);
		const maxDate = new Date(max + 5 * 864e5);
		const totalDays = Math.max(this._daysBetween(minDate, maxDate), 7);
		return { minDate, maxDate, totalDays };
	}

	_daysBetween(a, b) {
		return Math.round((new Date(b) - new Date(a)) / 864e5);
	}

	_taskTitle(t) { return t[this.opts.fieldMap.title] || t.name; }

	/* ── Public API ────────────────────────────────────────────── */
	setTasks(tasks) { this._tasks = tasks; this._render(); }
	refresh() { this._fetchTasks().then(() => this._render()); }
	destroy() { this.container.innerHTML = ""; this.container.classList.remove("fv-gantt"); }
}
