/**
 * Frappe Visual — DataExporter
 * ==============================
 * Universal export engine with column selection, format options,
 * live preview, batch export, and progress tracking.
 *
 * Usage:
 *   DataExporter.create({
 *     target: '#mount',
 *     doctype: 'Sales Invoice',
 *     columns: [ { fieldname: 'name', label: 'ID' }, ... ],
 *     data: [...],  // or fetch via Frappe API
 *     formats: ['csv', 'excel', 'pdf', 'json'],
 *     theme: 'glass'
 *   });
 */

const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const FORMAT_ICONS = { csv: '📊', excel: '📗', pdf: '📄', json: '{ }', xml: '📋' };
const FORMAT_LABELS = { csv: 'CSV', excel: 'Excel (.xlsx)', pdf: 'PDF', json: 'JSON', xml: 'XML' };
const FORMAT_MIMES = {
	csv: 'text/csv', json: 'application/json', xml: 'application/xml',
	excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	pdf: 'application/pdf'
};

export class DataExporter {
	constructor(opts = {}) {
		this.opts = Object.assign({
			target: null,
			doctype: '',
			title: '',
			columns: [],
			data: null,
			fetchData: null,     // async fn => rows[]
			formats: ['csv', 'excel', 'pdf', 'json'],
			defaultFormat: 'csv',
			maxRows: 50000,
			theme: 'glass',
			dark: false,
			onExport: null,
			dateFormat: 'YYYY-MM-DD',
			numberFormat: '1,234.56',
			includeHeader: true,
			filename: null
		}, opts);

		this.selectedColumns = new Set(this.opts.columns.map(c => c.fieldname));
		this.format = this.opts.defaultFormat;
		this.previewData = [];
		this.exporting = false;
		this.el = null;

		if (this.opts.target) this._mount();
	}

	static create(opts) { return new DataExporter(opts); }

	/* ── Mount ────────────────────────────────────────────── */

	_mount() {
		const target = typeof this.opts.target === 'string'
			? document.querySelector(this.opts.target) : this.opts.target;
		if (!target) return;
		this.el = document.createElement('div');
		this.el.className = `fv-dex fv-dex--${this.opts.theme}${this.opts.dark ? ' fv-dex--dark' : ''}`;
		target.appendChild(this.el);
		this._loadPreview();
	}

	destroy() { this.el?.remove(); }

	/* ── Data ─────────────────────────────────────────────── */

	async _loadPreview() {
		try {
			if (this.opts.data) {
				this.previewData = this.opts.data.slice(0, 5);
			} else if (this.opts.fetchData) {
				const rows = await this.opts.fetchData();
				this.previewData = (rows || []).slice(0, 5);
			} else if (this.opts.doctype) {
				const r = await frappe.call({
					method: 'frappe.client.get_list',
					args: {
						doctype: this.opts.doctype,
						fields: this.opts.columns.map(c => c.fieldname),
						limit_page_length: 5
					}
				});
				this.previewData = r.message || [];
			}
		} catch (e) { this.previewData = []; }
		this.render();
	}

	/* ── Render ───────────────────────────────────────────── */

	render() {
		if (!this.el) return;
		const cols = this.opts.columns;
		const selCols = cols.filter(c => this.selectedColumns.has(c.fieldname));
		const fname = this._getFilename();

		this.el.innerHTML = `
			<div class="fv-dex-header">
				<div class="fv-dex-title">${_esc(this.opts.title || `Export ${this.opts.doctype}`)}</div>
				<div class="fv-dex-subtitle">${_esc(selCols.length)} of ${cols.length} columns selected</div>
			</div>

			<div class="fv-dex-body">
				<!-- Format Selection -->
				<div class="fv-dex-section">
					<div class="fv-dex-section-title">${__('Format')}</div>
					<div class="fv-dex-formats">
						${this.opts.formats.map(f => `
							<button class="fv-dex-format ${f === this.format ? 'active' : ''}" data-format="${f}">
								<span class="fv-dex-format-icon">${FORMAT_ICONS[f] || '📁'}</span>
								<span>${FORMAT_LABELS[f] || f.toUpperCase()}</span>
							</button>
						`).join('')}
					</div>
				</div>

				<!-- Column Selection -->
				<div class="fv-dex-section">
					<div class="fv-dex-section-title">
						${__('Columns')}
						<div class="fv-dex-col-actions">
							<button class="fv-dex-btn-sm" data-col-action="all">${__('All')}</button>
							<button class="fv-dex-btn-sm" data-col-action="none">${__('None')}</button>
						</div>
					</div>
					<div class="fv-dex-columns">
						${cols.map(c => `
							<label class="fv-dex-col-item">
								<input type="checkbox" data-col="${_esc(c.fieldname)}" ${this.selectedColumns.has(c.fieldname) ? 'checked' : ''}>
								<span>${_esc(c.label || c.fieldname)}</span>
								${c.fieldtype ? `<span class="fv-dex-col-type">${_esc(c.fieldtype)}</span>` : ''}
							</label>
						`).join('')}
					</div>
				</div>

				<!-- Options -->
				<div class="fv-dex-section">
					<div class="fv-dex-section-title">${__('Options')}</div>
					<div class="fv-dex-options">
						<label class="fv-dex-option">
							<input type="checkbox" id="fv-dex-header" ${this.opts.includeHeader ? 'checked' : ''}>
							<span>${__('Include header row')}</span>
						</label>
						<div class="fv-dex-option-row">
							<label>${__('Filename')}</label>
							<input class="fv-dex-input" id="fv-dex-filename" value="${_esc(fname)}" placeholder="export">
						</div>
					</div>
				</div>

				<!-- Preview -->
				<div class="fv-dex-section">
					<div class="fv-dex-section-title">${__('Preview')} <span class="fv-dex-muted">(${this.previewData.length} rows)</span></div>
					<div class="fv-dex-preview-scroll">
						<table class="fv-dex-preview">
							<thead><tr>${selCols.map(c => `<th>${_esc(c.label || c.fieldname)}</th>`).join('')}</tr></thead>
							<tbody>${this.previewData.map(row => `<tr>
								${selCols.map(c => `<td>${_esc(row[c.fieldname] ?? '')}</td>`).join('')}
							</tr>`).join('') || `<tr><td colspan="${selCols.length}" class="fv-dex-empty">${__('No data')}</td></tr>`}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div class="fv-dex-footer">
				<button class="fv-dex-btn" data-action="cancel">${__('Cancel')}</button>
				<button class="fv-dex-btn fv-dex-btn--primary" data-action="export" ${this.exporting ? 'disabled' : ''}>
					${this.exporting ? __('Exporting...') : `${FORMAT_ICONS[this.format] || ''} ${__('Export')}`}
				</button>
			</div>
		`;
		this._bindEvents();
	}

	/* ── Events ───────────────────────────────────────────── */

	_bindEvents() {
		// Format buttons
		this.el.querySelectorAll('[data-format]').forEach(btn => {
			btn.addEventListener('click', () => { this.format = btn.dataset.format; this.render(); });
		});

		// Column checkboxes
		this.el.querySelectorAll('[data-col]').forEach(cb => {
			cb.addEventListener('change', () => {
				if (cb.checked) this.selectedColumns.add(cb.dataset.col);
				else this.selectedColumns.delete(cb.dataset.col);
				this.render();
			});
		});

		// All/None
		this.el.querySelectorAll('[data-col-action]').forEach(btn => {
			btn.addEventListener('click', () => {
				if (btn.dataset.colAction === 'all') this.opts.columns.forEach(c => this.selectedColumns.add(c.fieldname));
				else this.selectedColumns.clear();
				this.render();
			});
		});

		// Actions
		this.el.querySelectorAll('[data-action]').forEach(btn => {
			btn.addEventListener('click', () => {
				if (btn.dataset.action === 'export') this.export();
				else if (btn.dataset.action === 'cancel') this.opts.onCancel?.();
			});
		});
	}

	/* ── Export Logic ──────────────────────────────────────── */

	async export() {
		if (this.exporting) return;
		this.exporting = true;
		this.render();

		try {
			let rows = this.opts.data;
			if (!rows && this.opts.fetchData) rows = await this.opts.fetchData();
			if (!rows && this.opts.doctype) {
				const r = await frappe.call({
					method: 'frappe.client.get_list',
					args: {
						doctype: this.opts.doctype,
						fields: [...this.selectedColumns],
						limit_page_length: this.opts.maxRows
					}
				});
				rows = r.message || [];
			}
			if (!rows) rows = [];

			const cols = this.opts.columns.filter(c => this.selectedColumns.has(c.fieldname));
			const fname = this.el.querySelector('#fv-dex-filename')?.value || this._getFilename();
			const includeHeader = this.el.querySelector('#fv-dex-header')?.checked ?? true;

			if (this.opts.onExport) {
				await this.opts.onExport({ format: this.format, columns: cols, data: rows, filename: fname });
			} else {
				this._downloadFile(rows, cols, fname, includeHeader);
			}
		} catch (e) {
			frappe.msgprint({ title: __('Export Error'), indicator: 'red', message: e.message || __('Export failed') });
		} finally {
			this.exporting = false;
			this.render();
		}
	}

	_downloadFile(rows, cols, filename, includeHeader) {
		let content, ext, mime;

		switch (this.format) {
			case 'csv': {
				const lines = [];
				if (includeHeader) lines.push(cols.map(c => `"${(c.label || c.fieldname).replace(/"/g, '""')}"`).join(','));
				for (const row of rows) {
					lines.push(cols.map(c => {
						const v = row[c.fieldname] ?? '';
						return `"${String(v).replace(/"/g, '""')}"`;
					}).join(','));
				}
				content = lines.join('\n');
				ext = 'csv'; mime = FORMAT_MIMES.csv;
				break;
			}
			case 'json': {
				const data = rows.map(row => {
					const obj = {};
					cols.forEach(c => obj[c.fieldname] = row[c.fieldname] ?? null);
					return obj;
				});
				content = JSON.stringify(data, null, 2);
				ext = 'json'; mime = FORMAT_MIMES.json;
				break;
			}
			case 'xml': {
				let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
				for (const row of rows) {
					xml += '  <record>\n';
					cols.forEach(c => xml += `    <${c.fieldname}>${_esc(row[c.fieldname] ?? '')}</${c.fieldname}>\n`);
					xml += '  </record>\n';
				}
				xml += '</records>';
				content = xml;
				ext = 'xml'; mime = FORMAT_MIMES.xml;
				break;
			}
			default: {
				// For Excel/PDF, delegate to Frappe server-side export
				if (this.opts.doctype) {
					const fieldnames = cols.map(c => c.fieldname);
					window.open(`/api/method/frappe.client.get_list?doctype=${encodeURIComponent(this.opts.doctype)}&fields=${encodeURIComponent(JSON.stringify(fieldnames))}&limit_page_length=${this.opts.maxRows}&as_excel=1`);
					return;
				}
				// Fallback to CSV
				content = rows.map(r => cols.map(c => r[c.fieldname] ?? '').join(',')).join('\n');
				ext = 'csv'; mime = FORMAT_MIMES.csv;
			}
		}

		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = `${filename}.${ext}`;
		document.body.appendChild(a); a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		frappe.show_alert({ message: __('Export complete: {0} rows', [rows.length]), indicator: 'green' });
	}

	_getFilename() {
		return this.opts.filename || `${(this.opts.doctype || 'export').toLowerCase().replace(/\s+/g, '_')}_${frappe.datetime.now_date()}`;
	}
}
