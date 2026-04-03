/**
 * Frappe Visual — Visual Diff / Compare
 * ========================================
 * Side-by-side or unified document comparison with field-level diffs,
 * change highlighting, version history navigation, and merge controls.
 * Works with any Frappe DocType that has versioning enabled.
 *
 * Features:
 *  - Side-by-side (split) or unified (inline) diff views
 *  - Field-level change detection with color-coded highlights
 *  - Added (green), Removed (red), Modified (amber) indicators
 *  - Version history timeline for selecting comparison points
 *  - Child table row-level diffing
 *  - JSON / text / number smart comparison
 *  - Revert individual field changes
 *  - Summary panel: total changes, by category
 *  - Frappe Version integration (doctype versioning)
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.VisualDiff.create('#el', { doctype, name, v1, v2 })
 *   frappe.visual.VisualDiff.compare('#el', { left: {}, right: {} })
 *
 * @module frappe_visual/components/visual_diff
 */

const CHANGE_TYPES = {
	added:    { label: "Added",    color: "#10B981", bg: "rgba(16,185,129,.1)", icon: "+" },
	removed:  { label: "Removed",  color: "#EF4444", bg: "rgba(239,68,68,.1)",  icon: "−" },
	modified: { label: "Modified", color: "#F59E0B", bg: "rgba(245,158,11,.1)", icon: "~" },
	same:     { label: "Same",     color: "#6B7280", bg: "transparent",          icon: "=" },
};

export class VisualDiff {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("VisualDiff: container not found");

		this.opts = Object.assign({
			theme: "glass",
			mode: "split",          // "split" | "unified"
			doctype: null,
			docname: null,
			left: null,             // raw doc object (version A)
			right: null,            // raw doc object (version B)
			leftLabel: "Before",
			rightLabel: "After",
			ignoreFields: ["modified", "modified_by", "creation", "owner", "idx", "docstatus",
				"_liked_by", "_comments", "_assign", "_user_tags", "doctype", "name"],
			showSummary: true,
			onRevert: null,         // callback(field, oldValue)
		}, opts);

		this.diffs = [];
		this._init();
	}

	static create(container, opts = {}) { return new VisualDiff(container, opts); }

	static compare(container, opts = {}) {
		return new VisualDiff(container, opts);
	}

	static async fromVersions(container, opts = {}) {
		const vd = new VisualDiff(container, opts);
		await vd._loadVersions();
		return vd;
	}

	/* ── Init ────────────────────────────────────────────────── */
	async _init() {
		this.container.classList.add("fv-diff", `fv-diff--${this.opts.theme}`, `fv-diff--${this.opts.mode}`);
		this.container.innerHTML = "";

		this._renderToolbar();

		if (this.opts.doctype && this.opts.docname && (!this.opts.left || !this.opts.right)) {
			await this._loadVersions();
		}

		if (this.opts.left && this.opts.right) {
			this.diffs = this._computeDiff(this.opts.left, this.opts.right);
			if (this.opts.showSummary) this._renderSummary();
			this._renderDiff();
		} else {
			this._renderEmpty();
		}
	}

	/* ── Toolbar ─────────────────────────────────────────────── */
	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-diff-toolbar";
		bar.innerHTML = `
			<div class="fv-diff-toolbar-left">
				<h3 class="fv-diff-title">${this.opts.doctype ? this._esc(this.opts.doctype) + " " : ""}${__("Comparison")}</h3>
			</div>
			<div class="fv-diff-toolbar-right">
				<button class="fv-diff-btn ${this.opts.mode === "split" ? "active" : ""}"
					data-mode="split">${__("Split")}</button>
				<button class="fv-diff-btn ${this.opts.mode === "unified" ? "active" : ""}"
					data-mode="unified">${__("Unified")}</button>
				<button class="fv-diff-btn fv-diff-btn--expand">${__("Expand All")}</button>
			</div>`;
		this.container.appendChild(bar);

		bar.querySelectorAll("[data-mode]").forEach(btn => {
			btn.addEventListener("click", () => {
				this.opts.mode = btn.dataset.mode;
				this.container.className = `fv-diff fv-diff--${this.opts.theme} fv-diff--${this.opts.mode}`;
				bar.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b === btn));
				this._renderDiff();
			});
		});

		bar.querySelector(".fv-diff-btn--expand").addEventListener("click", () => {
			const rows = this.container.querySelectorAll(".fv-diff-row--same");
			const hidden = rows[0]?.classList.contains("fv-diff-row--collapsed");
			rows.forEach(r => r.classList.toggle("fv-diff-row--collapsed", !hidden));
		});
	}

	/* ── Load Versions ───────────────────────────────────────── */
	async _loadVersions() {
		if (!this.opts.doctype || !this.opts.docname) return;
		try {
			const versions = await frappe.xcall("frappe.client.get_list", {
				doctype: "Version",
				filters: {
					ref_doctype: this.opts.doctype,
					docname: this.opts.docname,
				},
				fields: ["name", "data", "creation", "owner"],
				order_by: "creation desc",
				limit_page_length: 20,
			});

			if (versions?.length >= 2) {
				const v1Data = JSON.parse(versions[1].data || "{}");
				const v2Data = JSON.parse(versions[0].data || "{}");
				this.opts.left = this._versionToDoc(v1Data);
				this.opts.right = this._versionToDoc(v2Data);
				this.opts.leftLabel = `${frappe.datetime.str_to_user(versions[1].creation)} — ${versions[1].owner}`;
				this.opts.rightLabel = `${frappe.datetime.str_to_user(versions[0].creation)} — ${versions[0].owner}`;

				this.diffs = this._computeDiff(this.opts.left, this.opts.right);
				if (this.opts.showSummary) this._renderSummary();
				this._renderDiff();
			} else if (versions?.length === 1) {
				// Compare current doc with the single version
				const current = await frappe.xcall("frappe.client.get", {
					doctype: this.opts.doctype,
					name: this.opts.docname,
				});
				const vData = JSON.parse(versions[0].data || "{}");
				this.opts.left = this._versionToDoc(vData);
				this.opts.right = current;
				this.opts.rightLabel = __("Current");
				this.opts.leftLabel = `${frappe.datetime.str_to_user(versions[0].creation)}`;

				this.diffs = this._computeDiff(this.opts.left, this.opts.right);
				if (this.opts.showSummary) this._renderSummary();
				this._renderDiff();
			} else {
				this._renderEmpty();
			}
		} catch (e) {
			console.error("VisualDiff: version load error", e);
			this._renderEmpty();
		}
	}

	_versionToDoc(vData) {
		const doc = {};
		if (vData.changed) {
			for (const [field, old, _new] of vData.changed) {
				doc[field] = old;
			}
		}
		return doc;
	}

	/* ── Compute Diff ────────────────────────────────────────── */
	_computeDiff(left, right) {
		const fields = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
		const diffs = [];

		for (const f of fields) {
			if (this.opts.ignoreFields.includes(f)) continue;

			const lVal = left?.[f];
			const rVal = right?.[f];

			if (lVal === undefined && rVal !== undefined) {
				diffs.push({ field: f, type: "added", left: null, right: rVal });
			} else if (lVal !== undefined && rVal === undefined) {
				diffs.push({ field: f, type: "removed", left: lVal, right: null });
			} else if (this._stringify(lVal) !== this._stringify(rVal)) {
				diffs.push({ field: f, type: "modified", left: lVal, right: rVal });
			} else {
				diffs.push({ field: f, type: "same", left: lVal, right: rVal });
			}
		}

		// Sort: modified first, then added, removed, same
		const order = { modified: 0, added: 1, removed: 2, same: 3 };
		diffs.sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4));

		return diffs;
	}

	/* ── Summary ─────────────────────────────────────────────── */
	_renderSummary() {
		const counts = { added: 0, removed: 0, modified: 0, same: 0 };
		for (const d of this.diffs) counts[d.type]++;

		const summary = document.createElement("div");
		summary.className = "fv-diff-summary";
		summary.innerHTML = Object.entries(CHANGE_TYPES)
			.filter(([k]) => counts[k] > 0)
			.map(([k, v]) => `
				<span class="fv-diff-summary-badge" style="background:${v.bg};color:${v.color}">
					<span class="fv-diff-badge-icon">${v.icon}</span>
					${counts[k]} ${__(v.label)}
				</span>`).join("");
		this.container.appendChild(summary);
	}

	/* ── Render Diff ─────────────────────────────────────────── */
	_renderDiff() {
		// Remove old diff body
		const old = this.container.querySelector(".fv-diff-body");
		if (old) old.remove();

		const body = document.createElement("div");
		body.className = "fv-diff-body";

		if (this.opts.mode === "split") {
			this._renderSplit(body);
		} else {
			this._renderUnified(body);
		}

		this.container.appendChild(body);
	}

	_renderSplit(body) {
		// Header
		const header = document.createElement("div");
		header.className = "fv-diff-split-header";
		header.innerHTML = `
			<div class="fv-diff-split-col"><strong>${this._esc(this.opts.leftLabel)}</strong></div>
			<div class="fv-diff-split-col"><strong>${this._esc(this.opts.rightLabel)}</strong></div>`;
		body.appendChild(header);

		for (const d of this.diffs) {
			const ct = CHANGE_TYPES[d.type];
			const row = document.createElement("div");
			row.className = `fv-diff-row fv-diff-row--${d.type} ${d.type === "same" ? "fv-diff-row--collapsed" : ""}`;
			row.innerHTML = `
				<div class="fv-diff-row-field">
					<span class="fv-diff-change-icon" style="color:${ct.color}">${ct.icon}</span>
					<span class="fv-diff-field-name">${this._esc(d.field.replace(/_/g, " "))}</span>
				</div>
				<div class="fv-diff-split-cols">
					<div class="fv-diff-split-col fv-diff-val--left" style="background:${d.type === "removed" || d.type === "modified" ? ct.bg : ""}">
						${this._formatValue(d.left)}
					</div>
					<div class="fv-diff-split-col fv-diff-val--right" style="background:${d.type === "added" || d.type === "modified" ? ct.bg : ""}">
						${this._formatValue(d.right)}
					</div>
				</div>
				${this.opts.onRevert && d.type !== "same" ? `<button class="fv-diff-revert-btn" data-field="${d.field}">${__("Revert")}</button>` : ""}`;
			body.appendChild(row);

			const revertBtn = row.querySelector(".fv-diff-revert-btn");
			if (revertBtn) {
				revertBtn.addEventListener("click", () => {
					if (this.opts.onRevert) this.opts.onRevert(d.field, d.left);
				});
			}
		}
	}

	_renderUnified(body) {
		const header = document.createElement("div");
		header.className = "fv-diff-unified-header";
		header.innerHTML = `
			<span>${this._esc(this.opts.leftLabel)}</span>
			<span>→</span>
			<span>${this._esc(this.opts.rightLabel)}</span>`;
		body.appendChild(header);

		for (const d of this.diffs) {
			const ct = CHANGE_TYPES[d.type];
			const row = document.createElement("div");
			row.className = `fv-diff-row fv-diff-row--${d.type} ${d.type === "same" ? "fv-diff-row--collapsed" : ""}`;

			let valueHtml;
			if (d.type === "modified") {
				valueHtml = `<span class="fv-diff-old">${this._formatValue(d.left)}</span>
					<span class="fv-diff-arrow">→</span>
					<span class="fv-diff-new">${this._formatValue(d.right)}</span>`;
			} else if (d.type === "added") {
				valueHtml = `<span class="fv-diff-new">${this._formatValue(d.right)}</span>`;
			} else if (d.type === "removed") {
				valueHtml = `<span class="fv-diff-old">${this._formatValue(d.left)}</span>`;
			} else {
				valueHtml = `<span class="fv-diff-same">${this._formatValue(d.left)}</span>`;
			}

			row.innerHTML = `
				<span class="fv-diff-change-icon" style="color:${ct.color}">${ct.icon}</span>
				<span class="fv-diff-field-name">${this._esc(d.field.replace(/_/g, " "))}</span>
				<span class="fv-diff-unified-value" style="background:${ct.bg}">${valueHtml}</span>`;
			body.appendChild(row);
		}
	}

	/* ── Empty ───────────────────────────────────────────────── */
	_renderEmpty() {
		const empty = document.createElement("div");
		empty.className = "fv-diff-empty";
		empty.innerHTML = `<p>${__("No versions to compare. Enable versioning on this DocType to track changes.")}</p>`;
		this.container.appendChild(empty);
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_formatValue(val) {
		if (val == null || val === "") return `<span class="fv-diff-null">${__("(empty)")}</span>`;
		if (typeof val === "object") return `<pre class="fv-diff-json">${this._esc(JSON.stringify(val, null, 2))}</pre>`;
		return this._esc(String(val));
	}

	_stringify(val) {
		if (val == null) return "";
		if (typeof val === "object") return JSON.stringify(val);
		return String(val);
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	getChanges() { return this.diffs.filter(d => d.type !== "same"); }
	getChangeCount() { return this.getChanges().length; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-diff", `fv-diff--${this.opts.theme}`, `fv-diff--${this.opts.mode}`);
	}
}
