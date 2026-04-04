/**
 * ChangeTracker — Visual diff & change tracker for document fields
 *
 * Highlights changed fields on a form, shows before/after values,
 * and provides an audit-trail sidebar. Integrates with Frappe's
 * Version doctype for historical change data.
 *
 * frappe.visual.ChangeTracker.create({
 *   container: ".form-layout", doctype: "Sales Order", docname: "SO-001"
 * })
 */
export class ChangeTracker {
	static create(opts = {}) { return new ChangeTracker(opts); }

	constructor(opts) {
		this.opts = Object.assign({
			container: null, doctype: "", docname: "", highlightChanges: true,
			showSidebar: false, maxVersions: 20
		}, opts);
		this._versions = [];
		this._changes = [];
		this._init();
	}

	/* ── public ─────────────────────────────────────────────── */

	/** Load version history from Frappe */
	async loadVersions() {
		if (typeof frappe === "undefined" || !frappe.xcall) return;
		try {
			const versions = await frappe.xcall("frappe.client.get_list", {
				doctype: "Version",
				filters: { ref_doctype: this.opts.doctype, docname: this.opts.docname },
				fields: ["name", "owner", "creation", "data"],
				order_by: "creation desc",
				limit_page_length: this.opts.maxVersions
			});
			this._versions = (versions || []).map(v => {
				let data = {};
				try { data = JSON.parse(v.data || "{}"); } catch { /* ignore */ }
				return { id: v.name, user: v.owner, timestamp: new Date(v.creation).getTime(), data };
			});
			this._extractChanges();
			if (this.opts.highlightChanges) this._highlightFields();
			if (this.opts.showSidebar) this._renderSidebar();
		} catch { /* silently fail */ }
	}

	/** Get changes for a specific field */
	getFieldHistory(fieldname) {
		return this._changes.filter(c => c.field === fieldname);
	}

	/** Get all changes grouped by version */
	get versionHistory() { return this._versions; }

	/** Highlight a specific version's changes */
	showVersion(versionIdx) {
		this._clearHighlights();
		const version = this._versions[versionIdx];
		if (!version || !version.data.changed) return;
		version.data.changed.forEach(([field, oldVal, newVal]) => {
			this._highlightField(field, oldVal, newVal);
		});
	}

	/** Compare two versions */
	diff(versionIdx1, versionIdx2) {
		const v1 = this._versions[versionIdx1];
		const v2 = this._versions[versionIdx2];
		if (!v1 || !v2) return [];
		const changes1 = new Map((v1.data.changed || []).map(c => [c[0], c]));
		const changes2 = new Map((v2.data.changed || []).map(c => [c[0], c]));
		const allFields = new Set([...changes1.keys(), ...changes2.keys()]);
		return Array.from(allFields).map(field => ({
			field,
			v1: changes1.get(field) ? { old: changes1.get(field)[1], new: changes1.get(field)[2] } : null,
			v2: changes2.get(field) ? { old: changes2.get(field)[1], new: changes2.get(field)[2] } : null,
		}));
	}

	/** Create a visual diff panel */
	renderDiff(container, versionIdx) {
		const wrap = typeof container === "string" ? document.querySelector(container) : container;
		if (!wrap) return;
		const version = this._versions[versionIdx];
		if (!version) { wrap.innerHTML = `<p>${__("No version data")}</p>`; return; }
		const changed = version.data.changed || [];
		let html = `<div class="fv-ct-diff">
			<div class="fv-ct-diff-header">
				<span>${this._esc((version.user || "").split("@")[0])}</span>
				<span class="fv-ct-diff-time">${this._timeAgo(version.timestamp)}</span>
				<span class="fv-ct-diff-count">${changed.length} ${__("changes")}</span>
			</div>
			<div class="fv-ct-diff-list">`;
		changed.forEach(([field, oldVal, newVal]) => {
			html += `<div class="fv-ct-diff-row">
				<div class="fv-ct-diff-field">${this._esc(field)}</div>
				<div class="fv-ct-diff-old">${this._formatVal(oldVal)}</div>
				<div class="fv-ct-diff-arrow">→</div>
				<div class="fv-ct-diff-new">${this._formatVal(newVal)}</div>
			</div>`;
		});
		html += "</div></div>";
		wrap.innerHTML = html;
	}

	destroy() {
		this._clearHighlights();
		this._sidebarEl?.remove();
	}

	/* ── private ────────────────────────────────────────────── */

	_init() {
		this._container = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		this.loadVersions();
	}

	_extractChanges() {
		this._changes = [];
		this._versions.forEach(v => {
			(v.data.changed || []).forEach(([field, oldVal, newVal]) => {
				this._changes.push({ field, oldVal, newVal, user: v.user, timestamp: v.timestamp, versionId: v.id });
			});
		});
	}

	_highlightFields() {
		if (!this._container || !this._versions.length) return;
		const latest = this._versions[0];
		(latest.data.changed || []).forEach(([field, oldVal, newVal]) => {
			this._highlightField(field, oldVal, newVal);
		});
	}

	_highlightField(fieldname, oldVal, newVal) {
		const el = this._container?.querySelector(`[data-fieldname="${fieldname}"]`);
		if (!el) return;
		el.classList.add("fv-ct-changed");
		// Add change indicator
		const existing = el.querySelector(".fv-ct-indicator");
		if (existing) existing.remove();
		const indicator = document.createElement("div");
		indicator.className = "fv-ct-indicator";
		indicator.title = `${__("Changed")}: ${this._truncate(String(oldVal))} → ${this._truncate(String(newVal))}`;
		indicator.innerHTML = `<span class="fv-ct-badge">✏️</span>`;
		indicator.addEventListener("click", (e) => {
			e.stopPropagation();
			this._showFieldPopover(el, fieldname, oldVal, newVal);
		});
		el.style.position = el.style.position || "relative";
		el.appendChild(indicator);
	}

	_showFieldPopover(anchor, fieldname, oldVal, newVal) {
		document.querySelectorAll(".fv-ct-popover").forEach(p => p.remove());
		const pop = document.createElement("div");
		pop.className = "fv-ct-popover";
		pop.innerHTML = `<div class="fv-ct-pop-header">${this._esc(fieldname)}</div>
			<div class="fv-ct-pop-row"><span class="fv-ct-pop-label">${__("Before")}:</span>
				<span class="fv-ct-pop-old">${this._formatVal(oldVal)}</span></div>
			<div class="fv-ct-pop-row"><span class="fv-ct-pop-label">${__("After")}:</span>
				<span class="fv-ct-pop-new">${this._formatVal(newVal)}</span></div>`;
		anchor.appendChild(pop);
		setTimeout(() => { document.addEventListener("click", () => pop.remove(), { once: true }); }, 100);
	}

	_clearHighlights() {
		this._container?.querySelectorAll(".fv-ct-changed").forEach(el => {
			el.classList.remove("fv-ct-changed");
			el.querySelector(".fv-ct-indicator")?.remove();
		});
	}

	_renderSidebar() {
		this._sidebarEl?.remove();
		const el = document.createElement("div");
		el.className = "fv-ct-sidebar";
		el.innerHTML = `<div class="fv-ct-sidebar-header">
			<strong>${__("Change History")}</strong>
			<span class="fv-ct-sidebar-count">${this._versions.length} ${__("versions")}</span>
		</div>
		<div class="fv-ct-sidebar-list">${this._versions.map((v, i) =>
			`<div class="fv-ct-sidebar-item" data-idx="${i}">
				<span class="fv-ct-si-user">${this._esc((v.user || "").split("@")[0])}</span>
				<span class="fv-ct-si-time">${this._timeAgo(v.timestamp)}</span>
				<span class="fv-ct-si-count">${(v.data.changed || []).length} ${__("fields")}</span>
			</div>`).join("")}
		</div>`;
		el.querySelectorAll(".fv-ct-sidebar-item").forEach(item => {
			item.addEventListener("click", () => this.showVersion(parseInt(item.dataset.idx)));
		});
		this._container?.appendChild(el);
		this._sidebarEl = el;
	}

	_formatVal(v) {
		if (v === null || v === undefined) return `<em>${__("empty")}</em>`;
		if (typeof v === "object") return `<code>${this._esc(JSON.stringify(v).slice(0, 80))}</code>`;
		return this._esc(this._truncate(String(v), 60));
	}

	_truncate(s, max = 30) { return s.length > max ? s.slice(0, max) + "…" : s; }
	_timeAgo(ts) {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 60) return __("just now");
		if (s < 3600) return __("{0}m", [Math.floor(s / 60)]);
		if (s < 86400) return __("{0}h", [Math.floor(s / 3600)]);
		return __("{0}d", [Math.floor(s / 86400)]);
	}
	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
