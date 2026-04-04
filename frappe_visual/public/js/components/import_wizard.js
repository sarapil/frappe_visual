// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — ImportWizard
 * ==============================
 * Visual data import wizard with file upload, column mapping,
 * data preview, validation, and progress tracking.
 * Supports CSV, Excel (via SheetJS), and JSON imports.
 *
 * Usage:
 *   frappe.visual.ImportWizard.create('#el', {
 *     doctype: 'Customer',
 *     onComplete: (result) => {},
 *   })
 *
 * @module frappe_visual/components/import_wizard
 */

export class ImportWizard {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("ImportWizard: container not found");

		this.opts = Object.assign({
			theme: "glass",
			doctype: null,
			fields: [],            // target fields to map to
			maxPreviewRows: 50,
			allowJSON: true,
			allowCSV: true,
			allowExcel: true,
			onComplete: null,
			onError: null,
		}, opts);

		this._step = 1;          // 1=upload, 2=map, 3=preview, 4=import, 5=done
		this._fileData = null;    // parsed rows
		this._headers = [];       // source column names
		this._mapping = {};       // source col → target field
		this._targetFields = [];
		this._errors = [];
		this._imported = 0;
		this._total = 0;
		this._init();
	}

	static create(container, opts = {}) { return new ImportWizard(container, opts); }

	async _init() {
		this.container.classList.add("fv-iw", `fv-iw--${this.opts.theme}`);
		this.container.innerHTML = "";

		// Load target fields from DocType if needed
		if (this.opts.doctype && this._targetFields.length === 0) {
			await this._loadTargetFields();
		} else {
			this._targetFields = this.opts.fields;
		}

		this._renderWizard();
	}

	async _loadTargetFields() {
		try {
			const meta = await frappe.xcall("frappe.client.get", {
				doctype: "DocType", name: this.opts.doctype,
			});
			this._targetFields = (meta.fields || [])
				.filter(f => !["Section Break", "Column Break", "Tab Break", "HTML"].includes(f.fieldtype))
				.map(f => ({
					fieldname: f.fieldname,
					label: f.label,
					fieldtype: f.fieldtype,
					reqd: f.reqd,
					options: f.options,
				}));
		} catch (e) {
			console.error("ImportWizard: failed to load target fields", e);
		}
	}

	_renderWizard() {
		this.container.innerHTML = "";

		// Step indicator
		const steps = document.createElement("div");
		steps.className = "fv-iw-steps";
		const stepLabels = [__("Upload"), __("Map"), __("Preview"), __("Import"), __("Done")];
		steps.innerHTML = stepLabels.map((l, i) =>
			`<div class="fv-iw-step ${i + 1 === this._step ? "fv-iw-step--active" : ""} ${i + 1 < this._step ? "fv-iw-step--done" : ""}">
				<span class="fv-iw-step-num">${i + 1 < this._step ? "✓" : i + 1}</span>
				<span class="fv-iw-step-label">${l}</span>
			</div>`).join('<div class="fv-iw-step-line"></div>');
		this.container.appendChild(steps);

		// Step content
		const content = document.createElement("div");
		content.className = "fv-iw-content";
		this.container.appendChild(content);
		this._contentEl = content;

		if (this._step === 1) this._renderUpload();
		else if (this._step === 2) this._renderMapping();
		else if (this._step === 3) this._renderPreview();
		else if (this._step === 4) this._renderImporting();
		else if (this._step === 5) this._renderDone();
	}

	/* ── Step 1: Upload ──────────────────────────────────────── */
	_renderUpload() {
		const accepts = [];
		if (this.opts.allowCSV) accepts.push(".csv");
		if (this.opts.allowExcel) accepts.push(".xlsx", ".xls");
		if (this.opts.allowJSON) accepts.push(".json");

		this._contentEl.innerHTML = `
			<div class="fv-iw-upload-zone">
				<div class="fv-iw-upload-icon">📁</div>
				<p class="fv-iw-upload-text">${__("Drag & drop a file here, or click to browse")}</p>
				<p class="fv-iw-upload-hint">${__("Supported formats")}: ${accepts.join(", ")}</p>
				<input type="file" class="fv-iw-file-input" accept="${accepts.join(",")}" style="display:none">
			</div>
			${this.opts.doctype ? `<p class="fv-iw-target">${__("Importing into")}: <b>${this._esc(this.opts.doctype)}</b></p>` : ""}`;

		const zone = this._contentEl.querySelector(".fv-iw-upload-zone");
		const input = this._contentEl.querySelector(".fv-iw-file-input");

		zone.addEventListener("click", () => input.click());
		zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("fv-iw-upload-zone--hover"); });
		zone.addEventListener("dragleave", () => zone.classList.remove("fv-iw-upload-zone--hover"));
		zone.addEventListener("drop", e => { e.preventDefault(); zone.classList.remove("fv-iw-upload-zone--hover"); this._handleFile(e.dataTransfer.files[0]); });
		input.addEventListener("change", () => { if (input.files[0]) this._handleFile(input.files[0]); });
	}

	_handleFile(file) {
		if (!file) return;
		const ext = file.name.split(".").pop().toLowerCase();

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				if (ext === "json") {
					const data = JSON.parse(e.target.result);
					this._fileData = Array.isArray(data) ? data : [data];
					this._headers = Object.keys(this._fileData[0] || {});
				} else if (ext === "csv") {
					this._parseCSV(e.target.result);
				} else {
					// Excel — requires SheetJS library
					if (typeof XLSX !== "undefined") {
						const wb = XLSX.read(e.target.result, { type: "binary" });
						const ws = wb.Sheets[wb.SheetNames[0]];
						const data = XLSX.utils.sheet_to_json(ws);
						this._fileData = data;
						this._headers = Object.keys(data[0] || {});
					} else {
						frappe.show_alert({ message: __("Excel support requires SheetJS library"), indicator: "red" });
						return;
					}
				}

				// Auto-map by matching header names to field names/labels
				this._autoMap();
				this._step = 2;
				this._renderWizard();
			} catch (err) {
				frappe.show_alert({ message: __("Failed to parse file: ") + err.message, indicator: "red" });
			}
		};

		if (ext === "json" || ext === "csv") reader.readAsText(file);
		else reader.readAsBinaryString(file);
	}

	_parseCSV(text) {
		const lines = text.split(/\r?\n/).filter(l => l.trim());
		if (lines.length === 0) return;

		this._headers = this._splitCSVLine(lines[0]);
		this._fileData = [];

		for (let i = 1; i < lines.length; i++) {
			const vals = this._splitCSVLine(lines[i]);
			const row = {};
			this._headers.forEach((h, j) => { row[h] = vals[j] || ""; });
			this._fileData.push(row);
		}
	}

	_splitCSVLine(line) {
		const result = [];
		let current = "";
		let inQuotes = false;
		for (const ch of line) {
			if (ch === '"') { inQuotes = !inQuotes; }
			else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
			else { current += ch; }
		}
		result.push(current.trim());
		return result;
	}

	_autoMap() {
		this._mapping = {};
		for (const h of this._headers) {
			const hl = h.toLowerCase().replace(/[\s_-]+/g, "_");
			const match = this._targetFields.find(f =>
				f.fieldname === hl || (f.label || "").toLowerCase().replace(/[\s_-]+/g, "_") === hl);
			if (match) this._mapping[h] = match.fieldname;
		}
	}

	/* ── Step 2: Mapping ─────────────────────────────────────── */
	_renderMapping() {
		let html = `<h3>${__("Column Mapping")}</h3>
			<p class="fv-iw-hint">${__("Map source columns to target fields")}</p>
			<table class="fv-iw-map-table">
				<thead><tr><th>${__("Source Column")}</th><th>→</th><th>${__("Target Field")}</th></tr></thead>
				<tbody>`;

		for (const h of this._headers) {
			html += `<tr>
				<td><code>${this._esc(h)}</code></td>
				<td class="fv-iw-arrow">→</td>
				<td>
					<select class="fv-iw-map-select" data-source="${this._esc(h)}">
						<option value="">${__("— Skip —")}</option>
						${this._targetFields.map(f => `
							<option value="${f.fieldname}" ${this._mapping[h] === f.fieldname ? "selected" : ""}>
								${this._esc(f.label || f.fieldname)} ${f.reqd ? "*" : ""}
							</option>`).join("")}
					</select>
				</td>
			</tr>`;
		}

		html += `</tbody></table>
			<div class="fv-iw-nav">
				<button class="fv-iw-btn" data-act="back">${__("Back")}</button>
				<button class="fv-iw-btn fv-iw-btn--primary" data-act="next">${__("Next: Preview")}</button>
			</div>`;

		this._contentEl.innerHTML = html;

		this._contentEl.querySelectorAll(".fv-iw-map-select").forEach(sel => {
			sel.addEventListener("change", () => {
				const source = sel.dataset.source;
				if (sel.value) this._mapping[source] = sel.value;
				else delete this._mapping[source];
			});
		});

		this._contentEl.querySelectorAll(".fv-iw-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				if (btn.dataset.act === "back") { this._step = 1; this._renderWizard(); }
				else { this._step = 3; this._renderWizard(); }
			});
		});
	}

	/* ── Step 3: Preview ─────────────────────────────────────── */
	_renderPreview() {
		const mappedFields = Object.values(this._mapping);
		const previewRows = this._fileData.slice(0, this.opts.maxPreviewRows);

		let html = `<h3>${__("Data Preview")}</h3>
			<p class="fv-iw-hint">${this._fileData.length} ${__("rows")} · ${mappedFields.length} ${__("mapped fields")}</p>
			<div class="fv-iw-preview-wrap"><table class="fv-iw-preview-table"><thead><tr>`;

		for (const [src, tgt] of Object.entries(this._mapping)) {
			const f = this._targetFields.find(tf => tf.fieldname === tgt);
			html += `<th>${this._esc(f?.label || tgt)}</th>`;
		}
		html += "</tr></thead><tbody>";

		for (const row of previewRows) {
			html += "<tr>";
			for (const [src, tgt] of Object.entries(this._mapping)) {
				html += `<td>${this._esc(String(row[src] ?? ""))}</td>`;
			}
			html += "</tr>";
		}

		html += `</tbody></table></div>
			<div class="fv-iw-nav">
				<button class="fv-iw-btn" data-act="back">${__("Back")}</button>
				<button class="fv-iw-btn fv-iw-btn--primary" data-act="import">${__("Start Import")} (${this._fileData.length} ${__("rows")})</button>
			</div>`;

		this._contentEl.innerHTML = html;

		this._contentEl.querySelectorAll(".fv-iw-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				if (btn.dataset.act === "back") { this._step = 2; this._renderWizard(); }
				else { this._step = 4; this._renderWizard(); this._startImport(); }
			});
		});
	}

	/* ── Step 4: Importing ───────────────────────────────────── */
	_renderImporting() {
		this._contentEl.innerHTML = `
			<div class="fv-iw-importing">
				<div class="fv-iw-progress-ring"></div>
				<h3>${__("Importing...")}</h3>
				<div class="fv-iw-progress-bar"><div class="fv-iw-progress-fill"></div></div>
				<p class="fv-iw-progress-text">0 / ${this._fileData.length}</p>
				<div class="fv-iw-error-list"></div>
			</div>`;
	}

	async _startImport() {
		this._total = this._fileData.length;
		this._imported = 0;
		this._errors = [];

		const fill = this._contentEl.querySelector(".fv-iw-progress-fill");
		const text = this._contentEl.querySelector(".fv-iw-progress-text");
		const errList = this._contentEl.querySelector(".fv-iw-error-list");

		for (let i = 0; i < this._fileData.length; i++) {
			const row = this._fileData[i];
			const doc = {};
			for (const [src, tgt] of Object.entries(this._mapping)) {
				doc[tgt] = row[src];
			}

			try {
				if (this.opts.doctype && typeof frappe !== "undefined") {
					await frappe.xcall("frappe.client.insert", { doc: { doctype: this.opts.doctype, ...doc } });
				}
				this._imported++;
			} catch (e) {
				this._errors.push({ row: i + 1, error: e.message || String(e) });
				if (errList) {
					errList.innerHTML += `<div class="fv-iw-error-item">⚠ ${__("Row")} ${i + 1}: ${this._esc(e.message || "")}</div>`;
				}
			}

			// Update progress
			const pct = ((i + 1) / this._total * 100).toFixed(0);
			if (fill) fill.style.width = pct + "%";
			if (text) text.textContent = `${i + 1} / ${this._total}`;
		}

		this._step = 5;
		this._renderWizard();
	}

	/* ── Step 5: Done ────────────────────────────────────────── */
	_renderDone() {
		const success = this._imported;
		const failed = this._errors.length;

		this._contentEl.innerHTML = `
			<div class="fv-iw-done">
				<div class="fv-iw-done-icon">${failed === 0 ? "✅" : "⚠️"}</div>
				<h3>${__("Import Complete")}</h3>
				<div class="fv-iw-done-stats">
					<span class="fv-iw-done-stat fv-iw-done-stat--ok">${success} ${__("imported")}</span>
					${failed > 0 ? `<span class="fv-iw-done-stat fv-iw-done-stat--err">${failed} ${__("failed")}</span>` : ""}
				</div>
				${this._errors.length > 0 ? `
				<details class="fv-iw-error-details">
					<summary>${__("Show errors")}</summary>
					${this._errors.map(e => `<div class="fv-iw-error-item">${__("Row")} ${e.row}: ${this._esc(e.error)}</div>`).join("")}
				</details>` : ""}
				<button class="fv-iw-btn fv-iw-btn--primary" data-act="restart">${__("Import More")}</button>
			</div>`;

		this._contentEl.querySelector("[data-act='restart']")?.addEventListener("click", () => {
			this._step = 1;
			this._fileData = null;
			this._mapping = {};
			this._errors = [];
			this._renderWizard();
		});

		if (this.opts.onComplete) this.opts.onComplete({ imported: success, failed, errors: this._errors });
	}

	/* ── Public API ──────────────────────────────────────────── */
	reset() { this._step = 1; this._fileData = null; this._mapping = {}; this._renderWizard(); }
	getMapping() { return { ...this._mapping }; }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-iw", `fv-iw--${this.opts.theme}`);
	}
}
