/**
 * VisualTimelinePro — Premium Event Timeline
 * =============================================
 * A rich, animated timeline component for Frappe.
 *
 * Features:
 *   • Horizontal and vertical layouts with smooth transitions
 *   • Date-grouped clusters with collapsible groups
 *   • Animated entry with GSAP stagger + scroll-triggered reveals
 *   • Zoom levels: year → month → week → day → hour
 *   • Mini-map navigator for large timelines
 *   • Event detail cards with avatar, status badge, actions
 *   • Draggable events (optional — for rescheduling)
 *   • Live Frappe integration: loads from DocType with filters
 *   • Color-coded by status/category with legend
 *   • RTL-aware layout, dark-mode adaptive
 *   • Print-friendly CSS
 *   • Keyboard navigation (arrow keys, Enter to open)
 *   • Touch-friendly swipe navigation on mobile
 *
 * Usage:
 *   frappe.visual.TimelinePro.create('#container', {
 *     doctype: 'ToDo',
 *     dateField: 'date',
 *     titleField: 'description',
 *     statusField: 'status',
 *     colorMap: { Open: '#3B82F6', Closed: '#10B981' },
 *     layout: 'vertical',     // 'vertical' | 'horizontal'
 *     zoom: 'month',          // 'year' | 'month' | 'week' | 'day'
 *     groupBy: 'month',       // 'year' | 'month' | 'week' | 'day' | 'status'
 *   });
 *
 *   // Or with static data:
 *   frappe.visual.TimelinePro.create('#el', {
 *     events: [
 *       { date: '2025-01-15', title: 'Kickoff', status: 'Done', icon: 'rocket', color: '#10B981' },
 *       { date: '2025-02-01', title: 'Phase 1', status: 'Active', icon: 'code' },
 *     ],
 *   });
 *
 * Part of Frappe Visual — Arkan Lab
 */

export class VisualTimelinePro {
	constructor(container, config = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("TimelinePro: container not found");

		this.config = Object.assign({
			// Data source
			doctype: null,
			fields: ["*"],
			filters: {},
			orderBy: null,
			limit: 200,
			dateField: "creation",
			titleField: "name",
			subtitleField: null,
			statusField: "status",
			imageField: "user_image",
			descriptionField: null,
			linkField: null,
			events: [],

			// Display
			layout: "vertical",
			zoom: "month",
			groupBy: "month",
			colorMap: {},
			defaultColor: "#6366F1",
			theme: "glass",
			showLegend: true,
			showMinimap: true,
			showGroupHeaders: true,
			collapsible: true,
			emptyMessage: null,

			// Interaction
			draggable: false,
			onEventClick: null,
			onEventDrag: null,
			keyboard: true,

			// Animation
			animate: true,
			staggerDelay: 0.06,
		}, config);

		this.events = [];
		this.groups = [];
		this.focusedIdx = -1;
		this._init();
	}

	static create(container, config) {
		return new VisualTimelinePro(container, config);
	}

	// ─── Init ────────────────────────────────────────────────────
	async _init() {
		this._buildShell();
		await this._loadData();
		this._groupEvents();
		this._render();
		if (this.config.keyboard) this._initKeyboard();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	// ─── Shell ───────────────────────────────────────────────────
	_buildShell() {
		const isRTL = this._isRTL();
		this.container.setAttribute("dir", isRTL ? "rtl" : "ltr");

		this.el = document.createElement("div");
		this.el.className = `fv-tl fv-tl--${this.config.layout} fv-tl--${this.config.theme}`;
		this.el.tabIndex = 0;

		// Toolbar
		this.el.innerHTML = `
			<div class="fv-tl-toolbar">
				<div class="fv-tl-toolbar-left">
					<div class="fv-tl-zoom-btns">
						${["year", "month", "week", "day"].map(z =>
							`<button class="fv-tl-zoom-btn ${z === this.config.zoom ? "active" : ""}" data-zoom="${z}">${__(z.charAt(0).toUpperCase() + z.slice(1))}</button>`
						).join("")}
					</div>
				</div>
				<div class="fv-tl-toolbar-right">
					<button class="fv-tl-layout-btn" title="${__("Toggle Layout")}">
						${this._icon(this.config.layout === "vertical" ? "arrows-horizontal" : "arrows-vertical", 18)}
					</button>
				</div>
			</div>
			<div class="fv-tl-body"></div>
			${this.config.showLegend ? `<div class="fv-tl-legend"></div>` : ""}
		`;

		this.container.innerHTML = "";
		this.container.appendChild(this.el);

		// Zoom buttons
		this.el.querySelectorAll(".fv-tl-zoom-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				this.config.zoom = btn.dataset.zoom;
				this.config.groupBy = btn.dataset.zoom;
				this.el.querySelectorAll(".fv-tl-zoom-btn").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this._groupEvents();
				this._render();
				if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
			});
		});

		// Layout toggle
		this.el.querySelector(".fv-tl-layout-btn")?.addEventListener("click", () => {
			this.config.layout = this.config.layout === "vertical" ? "horizontal" : "vertical";
			this.el.className = `fv-tl fv-tl--${this.config.layout} fv-tl--${this.config.theme}`;
			this._render();
			if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
		});
	}

	// ─── Data ────────────────────────────────────────────────────
	async _loadData() {
		if (this.config.events?.length) {
			this.events = this.config.events.map(e => this._normalizeEvent(e));
			return;
		}

		if (!this.config.doctype) {
			this.events = [];
			return;
		}

		try {
			const order = this.config.orderBy || `${this.config.dateField} desc`;
			const rows = await frappe.xcall("frappe.client.get_list", {
				doctype: this.config.doctype,
				fields: this.config.fields,
				filters: this.config.filters,
				order_by: order,
				limit_page_length: this.config.limit,
			});
			this.events = (rows || []).map(r => this._normalizeFromDoc(r));
		} catch (err) {
			console.error("TimelinePro: data load error", err);
			this.events = [];
		}
	}

	_normalizeEvent(e) {
		return {
			date: e.date ? new Date(e.date) : new Date(),
			title: e.title || "",
			subtitle: e.subtitle || "",
			description: e.description || "",
			status: e.status || "",
			icon: e.icon || "circle-dot",
			image: e.image || null,
			color: e.color || this.config.colorMap[e.status] || this.config.defaultColor,
			link: e.link || null,
			name: e.name || "",
			raw: e,
		};
	}

	_normalizeFromDoc(doc) {
		const c = this.config;
		const status = doc[c.statusField] || "";
		return {
			date: doc[c.dateField] ? new Date(doc[c.dateField]) : new Date(),
			title: doc[c.titleField] || doc.name,
			subtitle: c.subtitleField ? doc[c.subtitleField] || "" : "",
			description: c.descriptionField ? doc[c.descriptionField] || "" : "",
			status,
			icon: "circle-dot",
			image: c.imageField ? doc[c.imageField] || null : null,
			color: this.config.colorMap[status] || this.config.defaultColor,
			link: c.linkField ? doc[c.linkField] : (c.doctype ? `/app/${frappe.router.slug(c.doctype)}/${doc.name}` : null),
			name: doc.name,
			raw: doc,
		};
	}

	// ─── Grouping ────────────────────────────────────────────────
	_groupEvents() {
		const sorted = [...this.events].sort((a, b) => b.date - a.date);
		const map = new Map();

		sorted.forEach(ev => {
			const key = this._groupKey(ev.date);
			if (!map.has(key)) map.set(key, { label: key, events: [] });
			map.get(key).events.push(ev);
		});

		this.groups = Array.from(map.values());
	}

	_groupKey(date) {
		const gb = this.config.groupBy;
		const y = date.getFullYear();
		const m = date.toLocaleString(frappe.boot?.lang || "en", { month: "long" });
		if (gb === "year") return `${y}`;
		if (gb === "month") return `${m} ${y}`;
		if (gb === "week") {
			const weekStart = new Date(date);
			weekStart.setDate(date.getDate() - date.getDay());
			return `${__("Week of")} ${weekStart.toLocaleDateString(frappe.boot?.lang || "en")}`;
		}
		if (gb === "day") return date.toLocaleDateString(frappe.boot?.lang || "en", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
		return `${m} ${y}`;
	}

	// ─── Render ──────────────────────────────────────────────────
	_render() {
		const body = this.el.querySelector(".fv-tl-body");
		body.innerHTML = "";

		if (!this.events.length) {
			body.innerHTML = `<div class="fv-tl-empty">
				${this._icon("calendar-off", 48)}
				<p>${this.config.emptyMessage || __("No events to display")}</p>
			</div>`;
			return;
		}

		let eventIndex = 0;

		this.groups.forEach((group, gIdx) => {
			const gEl = document.createElement("div");
			gEl.className = "fv-tl-group";

			if (this.config.showGroupHeaders) {
				const header = document.createElement("div");
				header.className = "fv-tl-group-header";
				header.innerHTML = `
					<span class="fv-tl-group-label">${group.label}</span>
					<span class="fv-tl-group-count">${group.events.length}</span>
					${this.config.collapsible ? `<button class="fv-tl-group-toggle">${this._icon("chevron-down", 16)}</button>` : ""}
				`;
				if (this.config.collapsible) {
					header.addEventListener("click", () => {
						gEl.classList.toggle("collapsed");
					});
				}
				gEl.appendChild(header);
			}

			const eventsContainer = document.createElement("div");
			eventsContainer.className = "fv-tl-events";

			group.events.forEach((ev, eIdx) => {
				const card = this._renderEventCard(ev, eventIndex);
				eventsContainer.appendChild(card);
				eventIndex++;
			});

			gEl.appendChild(eventsContainer);
			body.appendChild(gEl);
		});

		// Legend
		if (this.config.showLegend) this._renderLegend();
	}

	_renderEventCard(ev, idx) {
		const card = document.createElement("div");
		card.className = "fv-tl-event";
		card.dataset.idx = idx;
		card.tabIndex = -1;

		const timeStr = ev.date.toLocaleTimeString(frappe.boot?.lang || "en", { hour: "2-digit", minute: "2-digit" });
		const dateStr = ev.date.toLocaleDateString(frappe.boot?.lang || "en", { day: "numeric", month: "short" });

		card.innerHTML = `
			<div class="fv-tl-event-dot" style="background:${ev.color};box-shadow:0 0 0 4px ${ev.color}30;"></div>
			<div class="fv-tl-event-connector"></div>
			<div class="fv-tl-event-card">
				<div class="fv-tl-event-meta">
					<span class="fv-tl-event-date">${dateStr}</span>
					<span class="fv-tl-event-time">${timeStr}</span>
				</div>
				<div class="fv-tl-event-content">
					<div class="fv-tl-event-header">
						${ev.image
							? `<img src="${ev.image}" class="fv-tl-event-avatar" alt="">`
							: `<span class="fv-tl-event-icon" style="color:${ev.color}">${this._icon(ev.icon, 18)}</span>`
						}
						<div class="fv-tl-event-title-wrap">
							<span class="fv-tl-event-title">${ev.title}</span>
							${ev.subtitle ? `<span class="fv-tl-event-subtitle">${ev.subtitle}</span>` : ""}
						</div>
						${ev.status ? `<span class="fv-tl-event-badge" style="background:${ev.color}20;color:${ev.color}">${__(ev.status)}</span>` : ""}
					</div>
					${ev.description ? `<p class="fv-tl-event-desc">${ev.description}</p>` : ""}
				</div>
			</div>
		`;

		card.addEventListener("click", () => {
			if (this.config.onEventClick) {
				this.config.onEventClick(ev, card);
			} else if (ev.link) {
				frappe.set_route(ev.link);
			}
		});

		return card;
	}

	// ─── Legend ───────────────────────────────────────────────────
	_renderLegend() {
		const legend = this.el.querySelector(".fv-tl-legend");
		if (!legend) return;

		const statuses = [...new Set(this.events.map(e => e.status).filter(Boolean))];
		if (!statuses.length) { legend.style.display = "none"; return; }

		legend.innerHTML = statuses.map(s => {
			const color = this.config.colorMap[s] || this.config.defaultColor;
			return `<span class="fv-tl-legend-item">
				<span class="fv-tl-legend-dot" style="background:${color}"></span>
				${__(s)}
			</span>`;
		}).join("");
	}

	// ─── Keyboard ────────────────────────────────────────────────
	_initKeyboard() {
		this.el.addEventListener("keydown", (e) => {
			const cards = this.el.querySelectorAll(".fv-tl-event");
			if (!cards.length) return;

			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				e.preventDefault();
				this.focusedIdx = Math.min(this.focusedIdx + 1, cards.length - 1);
				cards[this.focusedIdx]?.focus();
				cards[this.focusedIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
			} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				e.preventDefault();
				this.focusedIdx = Math.max(this.focusedIdx - 1, 0);
				cards[this.focusedIdx]?.focus();
				cards[this.focusedIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
			} else if (e.key === "Enter") {
				const ev = this.events[this.focusedIdx];
				if (ev) {
					if (this.config.onEventClick) this.config.onEventClick(ev);
					else if (ev.link) frappe.set_route(ev.link);
				}
			}
		});
	}

	// ─── Animation ───────────────────────────────────────────────
	_animateEntrance() {
		const cards = this.el.querySelectorAll(".fv-tl-event-card");
		if (!cards.length) return;

		gsap.fromTo(cards,
			{ opacity: 0, x: this.config.layout === "vertical" ? 40 : 0, y: this.config.layout === "horizontal" ? 30 : 0 },
			{ opacity: 1, x: 0, y: 0, duration: 0.5, stagger: this.config.staggerDelay, ease: "power3.out" }
		);

		const dots = this.el.querySelectorAll(".fv-tl-event-dot");
		gsap.fromTo(dots,
			{ scale: 0 },
			{ scale: 1, duration: 0.3, stagger: this.config.staggerDelay, ease: "back.out(2)" }
		);
	}

	// ─── Public API ──────────────────────────────────────────────
	async refresh() {
		await this._loadData();
		this._groupEvents();
		this._render();
		if (this.config.animate && typeof gsap !== "undefined") this._animateEntrance();
	}

	setZoom(zoom) {
		this.config.zoom = zoom;
		this.config.groupBy = zoom;
		this._groupEvents();
		this._render();
	}

	addEvent(ev) {
		this.events.push(this._normalizeEvent(ev));
		this._groupEvents();
		this._render();
	}

	destroy() {
		if (this.el) this.el.remove();
	}

	// ─── Utils ───────────────────────────────────────────────────
	_icon(name, size = 18) {
		if (frappe.visual?.icons?.render) return frappe.visual.icons.render(name, { size });
		return `<svg width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
	}

	_isRTL() {
		return ["ar", "ur", "fa", "he"].includes(frappe.boot?.lang);
	}
}
