// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — StatusBoard
 * ==============================
 * Multi-entity real-time status monitoring board showing service health,
 * server status, task progress, and system metrics. Think uptime monitors,
 * CI dashboards, or operational status pages.
 *
 * Usage:
 *   frappe.visual.StatusBoard.create('#el', {
 *     entities: [
 *       { id: 'web', name: 'Web Server', status: 'operational', uptime: 99.9 },
 *       { id: 'db', name: 'Database', status: 'degraded', latency: 120 },
 *     ],
 *     categories: ['Infrastructure', 'Services'],
 *   })
 *
 * @module frappe_visual/components/status_board
 */

const STATUS_CONFIGS = {
	operational:  { color: "#10b981", bg: "rgba(16,185,129,0.08)",  icon: "●", label: "Operational" },
	degraded:     { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: "◐", label: "Degraded" },
	partial:      { color: "#f97316", bg: "rgba(249,115,22,0.08)", icon: "◑", label: "Partial Outage" },
	major:        { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  icon: "◉", label: "Major Outage" },
	maintenance:  { color: "#6366f1", bg: "rgba(99,102,241,0.08)", icon: "⚙", label: "Maintenance" },
	unknown:      { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", icon: "?", label: "Unknown" },
};

export class StatusBoard {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("StatusBoard: container not found");

		this.opts = Object.assign({
			theme: "glass",
			title: "System Status",
			entities: [],
			categories: [],         // group entities by category
			showOverall: true,
			showUptimeBar: true,
			showLastChecked: true,
			showIncidents: true,
			incidents: [],           // [{ id, title, status, date, affected }]
			refreshInterval: 0,      // seconds (0 = no auto-refresh)
			onEntityClick: null,
			onRefresh: null,
		}, opts);

		this._entities = JSON.parse(JSON.stringify(this.opts.entities));
		this._incidents = JSON.parse(JSON.stringify(this.opts.incidents));
		this._refreshTimer = null;
		this._init();
	}

	static create(container, opts = {}) { return new StatusBoard(container, opts); }

	_init() {
		this.container.classList.add("fv-sb", `fv-sb--${this.opts.theme}`);
		this.container.innerHTML = "";

		if (this.opts.showOverall) this._renderOverallBanner();
		this._renderEntities();
		if (this.opts.showIncidents && this._incidents.length > 0) this._renderIncidents();
		if (this.opts.showLastChecked) this._renderFooter();

		if (this.opts.refreshInterval > 0) {
			this._refreshTimer = setInterval(() => this._refresh(), this.opts.refreshInterval * 1000);
		}
	}

	_renderOverallBanner() {
		const overall = this._getOverallStatus();
		const cfg = STATUS_CONFIGS[overall] || STATUS_CONFIGS.unknown;

		const banner = document.createElement("div");
		banner.className = "fv-sb-banner";
		banner.style.background = cfg.bg;
		banner.style.borderColor = cfg.color;
		banner.innerHTML = `
			<span class="fv-sb-banner-icon" style="color:${cfg.color}">${cfg.icon}</span>
			<span class="fv-sb-banner-text" style="color:${cfg.color}">
				${cfg.label === "Operational" ? __("All Systems Operational") : __(cfg.label)}
			</span>`;
		this.container.appendChild(banner);
	}

	_getOverallStatus() {
		if (this._entities.some(e => e.status === "major")) return "major";
		if (this._entities.some(e => e.status === "partial")) return "partial";
		if (this._entities.some(e => e.status === "degraded")) return "degraded";
		if (this._entities.some(e => e.status === "maintenance")) return "maintenance";
		if (this._entities.every(e => e.status === "operational")) return "operational";
		return "unknown";
	}

	_renderEntities() {
		const section = document.createElement("div");
		section.className = "fv-sb-entities";

		if (this.opts.categories.length > 0) {
			for (const cat of this.opts.categories) {
				const catEntities = this._entities.filter(e => e.category === cat);
				if (catEntities.length === 0) continue;

				const group = document.createElement("div");
				group.className = "fv-sb-group";
				group.innerHTML = `<div class="fv-sb-group-title">${this._esc(__(cat))}</div>`;

				for (const entity of catEntities) {
					group.appendChild(this._renderEntity(entity));
				}
				section.appendChild(group);
			}

			// Ungrouped
			const ungrouped = this._entities.filter(e => !this.opts.categories.includes(e.category));
			for (const entity of ungrouped) {
				section.appendChild(this._renderEntity(entity));
			}
		} else {
			for (const entity of this._entities) {
				section.appendChild(this._renderEntity(entity));
			}
		}

		this.container.appendChild(section);
		this._entitiesEl = section;
	}

	_renderEntity(entity) {
		const cfg = STATUS_CONFIGS[entity.status] || STATUS_CONFIGS.unknown;

		const el = document.createElement("div");
		el.className = "fv-sb-entity";
		el.dataset.id = entity.id;

		let metricsHtml = "";
		if (entity.uptime !== undefined) {
			metricsHtml += `<span class="fv-sb-metric">${entity.uptime}% ${__("uptime")}</span>`;
		}
		if (entity.latency !== undefined) {
			metricsHtml += `<span class="fv-sb-metric">${entity.latency}ms</span>`;
		}
		if (entity.responseTime !== undefined) {
			metricsHtml += `<span class="fv-sb-metric">${entity.responseTime}ms ${__("resp")}</span>`;
		}

		el.innerHTML = `
			<div class="fv-sb-entity-main">
				<span class="fv-sb-entity-name">${this._esc(entity.name || entity.id)}</span>
				${entity.description ? `<span class="fv-sb-entity-desc">${this._esc(entity.description)}</span>` : ""}
			</div>
			<div class="fv-sb-entity-status">
				${metricsHtml}
				<span class="fv-sb-status-badge" style="background:${cfg.bg};color:${cfg.color};border-color:${cfg.color}">
					${cfg.icon} ${__(cfg.label)}
				</span>
			</div>
			${this.opts.showUptimeBar && entity.uptimeHistory ? `
			<div class="fv-sb-uptime-bar">
				${this._renderUptimeBar(entity.uptimeHistory)}
			</div>` : ""}`;

		if (this.opts.onEntityClick) {
			el.addEventListener("click", () => this.opts.onEntityClick(entity));
		}

		return el;
	}

	_renderUptimeBar(history) {
		// history = array of 90 status values (last 90 days): "operational" | "degraded" | etc.
		if (!Array.isArray(history)) return "";
		return `<div class="fv-sb-uptime-days">
			${history.map((status, i) => {
				const c = STATUS_CONFIGS[status] || STATUS_CONFIGS.unknown;
				return `<div class="fv-sb-uptime-day" style="background:${c.color}" title="${__("Day")} ${i + 1}: ${__(c.label)}"></div>`;
			}).join("")}
		</div>`;
	}

	_renderIncidents() {
		const section = document.createElement("div");
		section.className = "fv-sb-incidents";
		section.innerHTML = `<div class="fv-sb-incidents-title">${__("Recent Incidents")}</div>`;

		for (const incident of this._incidents) {
			const cfg = STATUS_CONFIGS[incident.status] || STATUS_CONFIGS.unknown;
			const el = document.createElement("div");
			el.className = "fv-sb-incident";
			el.innerHTML = `
				<div class="fv-sb-incident-header">
					<span class="fv-sb-incident-status" style="color:${cfg.color}">${cfg.icon}</span>
					<span class="fv-sb-incident-title">${this._esc(incident.title)}</span>
					<span class="fv-sb-incident-date">${incident.date || ""}</span>
				</div>
				${incident.description ? `<p class="fv-sb-incident-desc">${this._esc(incident.description)}</p>` : ""}
				${incident.affected ? `<p class="fv-sb-incident-affected">${__("Affected")}: ${this._esc(incident.affected.join(", "))}</p>` : ""}`;
			section.appendChild(el);
		}

		this.container.appendChild(section);
	}

	_renderFooter() {
		const footer = document.createElement("div");
		footer.className = "fv-sb-footer";
		footer.innerHTML = `${__("Last checked")}: ${new Date().toLocaleTimeString()}
			${this.opts.refreshInterval > 0 ? ` · ${__("Auto-refresh every")} ${this.opts.refreshInterval}s` : ""}`;
		this.container.appendChild(footer);
		this._footerEl = footer;
	}

	async _refresh() {
		if (this.opts.onRefresh) {
			const data = await this.opts.onRefresh();
			if (data?.entities) this._entities = data.entities;
			if (data?.incidents) this._incidents = data.incidents;
			this.container.innerHTML = "";
			this._init();
		}
	}

	/* ── Public API ──────────────────────────────────────────── */
	setEntities(entities) {
		this._entities = JSON.parse(JSON.stringify(entities));
		this.container.innerHTML = "";
		this._init();
	}

	updateEntity(id, updates) {
		const entity = this._entities.find(e => e.id === id);
		if (entity) {
			Object.assign(entity, updates);
			this.container.innerHTML = "";
			this._init();
		}
	}

	addIncident(incident) {
		this._incidents.unshift(incident);
		this.container.innerHTML = "";
		this._init();
	}

	getEntities() { return JSON.parse(JSON.stringify(this._entities)); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		if (this._refreshTimer) clearInterval(this._refreshTimer);
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sb", `fv-sb--${this.opts.theme}`);
	}
}
