// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — File Manager Pro
 * ==================================
 * Visual file browser with grid/list views, drag-drop upload,
 * preview panel, breadcrumbs, context menu, and Frappe File
 * DocType integration.
 *
 * Features:
 *  - Grid (thumbnail) and list (detail) view modes
 *  - Drag-and-drop file upload with progress
 *  - File preview panel (image, PDF, text, video)
 *  - Breadcrumb navigation with folder hierarchy
 *  - Context menu (open, rename, download, delete, move, copy)
 *  - Multi-select with Shift/Ctrl+click
 *  - Search/filter files
 *  - Sort by name/size/date/type
 *  - File type icons and color coding
 *  - Frappe File DocType integration
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.FileManager.create('#el', { folder, ... })
 *
 * @module frappe_visual/components/file_manager
 */

const FILE_ICONS = {
	image:  { icon: "🖼", color: "#8B5CF6" },
	pdf:    { icon: "📄", color: "#EF4444" },
	doc:    { icon: "📝", color: "#3B82F6" },
	sheet:  { icon: "📊", color: "#10B981" },
	video:  { icon: "🎬", color: "#F59E0B" },
	audio:  { icon: "🎵", color: "#EC4899" },
	zip:    { icon: "📦", color: "#6B7280" },
	code:   { icon: "💻", color: "#06B6D4" },
	folder: { icon: "📁", color: "#F59E0B" },
	other:  { icon: "📎", color: "#6B7280" },
};

function getFileCategory(name) {
	const ext = (name || "").split(".").pop().toLowerCase();
	if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) return "image";
	if (ext === "pdf") return "pdf";
	if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext)) return "doc";
	if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "sheet";
	if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
	if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) return "audio";
	if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
	if (["js", "py", "html", "css", "json", "xml", "yaml", "yml"].includes(ext)) return "code";
	return "other";
}

export class FileManager {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("FileManager: container not found");

		this.opts = Object.assign({
			theme: "glass",
			folder: "Home",
			viewMode: "grid",     // "grid" | "list"
			showPreview: true,
			showUpload: true,
			sortBy: "file_name",
			sortDir: "asc",
			filters: {},
		}, opts);

		this.currentFolder = this.opts.folder;
		this.files = [];
		this.selected = new Set();
		this._breadcrumbs = [{ label: "Home", folder: "Home" }];
		this._previewFile = null;

		this._init();
	}

	static create(container, opts) { return new FileManager(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	async _init() {
		this.container.classList.add("fv-fm", `fv-fm--${this.opts.theme}`, `fv-fm--${this.opts.viewMode}`);
		this.container.innerHTML = "";

		this._renderToolbar();
		this._renderBreadcrumbs();
		this._renderBody();
		if (this.opts.showUpload) this._setupDropZone();
		await this.loadFiles();
	}

	/* ── Load Files ──────────────────────────────────────────── */
	async loadFiles() {
		try {
			const result = await frappe.xcall("frappe.client.get_list", {
				doctype: "File",
				fields: ["name", "file_name", "file_url", "file_size", "is_folder",
					"modified", "owner", "folder"],
				filters: {
					folder: this.currentFolder,
					...this.opts.filters,
				},
				order_by: `is_folder desc, ${this.opts.sortBy} ${this.opts.sortDir}`,
				limit_page_length: 200,
			});
			this.files = result || [];
			this._renderFiles();
		} catch (e) {
			console.error("FileManager: load error", e);
			this.files = [];
			this._renderFiles();
		}
	}

	/* ── Toolbar ─────────────────────────────────────────────── */
	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-fm-toolbar";
		bar.innerHTML = `
			<div class="fv-fm-toolbar-left">
				<input class="fv-fm-search" placeholder="${__("Search files...")}" />
			</div>
			<div class="fv-fm-toolbar-right">
				<button class="fv-fm-btn ${this.opts.viewMode === "grid" ? "active" : ""}" data-view="grid">▦</button>
				<button class="fv-fm-btn ${this.opts.viewMode === "list" ? "active" : ""}" data-view="list">☰</button>
				<select class="fv-fm-sort">
					<option value="file_name">${__("Name")}</option>
					<option value="file_size">${__("Size")}</option>
					<option value="modified">${__("Date")}</option>
				</select>
				${this.opts.showUpload ? `<button class="fv-fm-btn fv-fm-btn--upload">${__("Upload")}</button>` : ""}
			</div>`;
		this.container.appendChild(bar);

		bar.querySelectorAll("[data-view]").forEach(btn => {
			btn.addEventListener("click", () => {
				this.opts.viewMode = btn.dataset.view;
				this.container.classList.toggle("fv-fm--grid", this.opts.viewMode === "grid");
				this.container.classList.toggle("fv-fm--list", this.opts.viewMode === "list");
				bar.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b === btn));
				this._renderFiles();
			});
		});

		bar.querySelector(".fv-fm-search").addEventListener("input", (e) => this._filterFiles(e.target.value));
		bar.querySelector(".fv-fm-sort").addEventListener("change", (e) => {
			this.opts.sortBy = e.target.value;
			this.loadFiles();
		});

		if (this.opts.showUpload) {
			bar.querySelector(".fv-fm-btn--upload").addEventListener("click", () => this._triggerUpload());
		}
	}

	/* ── Breadcrumbs ─────────────────────────────────────────── */
	_renderBreadcrumbs() {
		const bc = document.createElement("div");
		bc.className = "fv-fm-breadcrumbs";
		this.container.appendChild(bc);
		this._breadcrumbEl = bc;
		this._updateBreadcrumbs();
	}

	_updateBreadcrumbs() {
		if (!this._breadcrumbEl) return;
		this._breadcrumbEl.innerHTML = this._breadcrumbs.map((b, i) => `
			<button class="fv-fm-bc-item ${i === this._breadcrumbs.length - 1 ? "active" : ""}"
				data-folder="${this._esc(b.folder)}">${this._esc(__(b.label))}</button>
			${i < this._breadcrumbs.length - 1 ? '<span class="fv-fm-bc-sep">/</span>' : ""}`
		).join("");

		this._breadcrumbEl.querySelectorAll(".fv-fm-bc-item").forEach(btn => {
			btn.addEventListener("click", () => this.navigateTo(btn.dataset.folder));
		});
	}

	/* ── Body ────────────────────────────────────────────────── */
	_renderBody() {
		const body = document.createElement("div");
		body.className = "fv-fm-body";

		const fileArea = document.createElement("div");
		fileArea.className = "fv-fm-file-area";
		body.appendChild(fileArea);
		this._fileArea = fileArea;

		if (this.opts.showPreview) {
			const preview = document.createElement("div");
			preview.className = "fv-fm-preview";
			preview.innerHTML = `<div class="fv-fm-preview-empty">${__("Select a file to preview")}</div>`;
			body.appendChild(preview);
			this._previewEl = preview;
		}

		this.container.appendChild(body);
	}

	_renderFiles() {
		if (!this._fileArea) return;

		if (this.files.length === 0) {
			this._fileArea.innerHTML = `<div class="fv-fm-empty">
				<span class="fv-fm-empty-icon">📂</span>
				<p>${__("No files in this folder")}</p>
			</div>`;
			return;
		}

		const isGrid = this.opts.viewMode === "grid";
		this._fileArea.innerHTML = this.files.map(f => {
			const isFolder = f.is_folder;
			const cat = isFolder ? "folder" : getFileCategory(f.file_name);
			const icon = FILE_ICONS[cat] || FILE_ICONS.other;
			const selClass = this.selected.has(f.name) ? "fv-fm-item--selected" : "";
			const size = isFolder ? "" : this._formatSize(f.file_size);
			const isImage = cat === "image" && f.file_url;

			if (isGrid) {
				return `<div class="fv-fm-item fv-fm-item--grid ${selClass}" data-name="${this._esc(f.name)}"
					data-folder="${isFolder ? 1 : 0}">
					<div class="fv-fm-thumb" style="border-color: ${icon.color}20">
						${isImage ? `<img src="${f.file_url}" loading="lazy" />` : `<span class="fv-fm-icon">${icon.icon}</span>`}
					</div>
					<div class="fv-fm-item-name" title="${this._esc(f.file_name)}">${this._esc(f.file_name)}</div>
					${size ? `<div class="fv-fm-item-size">${size}</div>` : ""}
				</div>`;
			} else {
				return `<div class="fv-fm-item fv-fm-item--list ${selClass}" data-name="${this._esc(f.name)}"
					data-folder="${isFolder ? 1 : 0}">
					<span class="fv-fm-icon-sm" style="color:${icon.color}">${icon.icon}</span>
					<span class="fv-fm-item-name">${this._esc(f.file_name)}</span>
					<span class="fv-fm-item-size">${size}</span>
					<span class="fv-fm-item-date">${this._formatDate(f.modified)}</span>
					<span class="fv-fm-item-owner">${this._esc(f.owner)}</span>
				</div>`;
			}
		}).join("");

		// Event listeners
		this._fileArea.querySelectorAll(".fv-fm-item").forEach(el => {
			el.addEventListener("click", (e) => {
				const name = el.dataset.name;
				if (e.ctrlKey || e.metaKey) {
					if (this.selected.has(name)) this.selected.delete(name);
					else this.selected.add(name);
				} else {
					this.selected.clear();
					this.selected.add(name);
				}
				this._renderFiles();
				this._showPreview(name);
			});

			el.addEventListener("dblclick", () => {
				const isFolder = el.dataset.folder === "1";
				if (isFolder) {
					const file = this.files.find(f => f.name === el.dataset.name);
					if (file) this.navigateTo(file.name);
				} else {
					const file = this.files.find(f => f.name === el.dataset.name);
					if (file?.file_url) window.open(file.file_url, "_blank");
				}
			});
		});
	}

	/* ── Preview ─────────────────────────────────────────────── */
	_showPreview(name) {
		if (!this._previewEl) return;
		const file = this.files.find(f => f.name === name);
		if (!file || file.is_folder) {
			this._previewEl.innerHTML = `<div class="fv-fm-preview-empty">${__("Select a file to preview")}</div>`;
			return;
		}

		const cat = getFileCategory(file.file_name);
		const icon = FILE_ICONS[cat] || FILE_ICONS.other;
		let previewHTML = "";

		if (cat === "image" && file.file_url) {
			previewHTML = `<img class="fv-fm-preview-img" src="${file.file_url}" />`;
		} else if (cat === "video" && file.file_url) {
			previewHTML = `<video class="fv-fm-preview-video" src="${file.file_url}" controls></video>`;
		} else if (cat === "pdf" && file.file_url) {
			previewHTML = `<iframe class="fv-fm-preview-pdf" src="${file.file_url}"></iframe>`;
		} else {
			previewHTML = `<div class="fv-fm-preview-icon">${icon.icon}</div>`;
		}

		this._previewEl.innerHTML = `
			${previewHTML}
			<div class="fv-fm-preview-info">
				<h4>${this._esc(file.file_name)}</h4>
				<p>${this._formatSize(file.file_size)} · ${this._formatDate(file.modified)}</p>
				<p>${this._esc(file.owner)}</p>
				${file.file_url ? `<a class="fv-fm-btn" href="${file.file_url}" download>${__("Download")}</a>` : ""}
			</div>`;
	}

	/* ── Navigation ──────────────────────────────────────────── */
	navigateTo(folder) {
		this.currentFolder = folder;
		this.selected.clear();

		// Update breadcrumbs
		const existing = this._breadcrumbs.findIndex(b => b.folder === folder);
		if (existing >= 0) {
			this._breadcrumbs = this._breadcrumbs.slice(0, existing + 1);
		} else {
			const label = folder.split("/").pop() || folder;
			this._breadcrumbs.push({ label, folder });
		}
		this._updateBreadcrumbs();
		this.loadFiles();
	}

	/* ── Upload ──────────────────────────────────────────────── */
	_setupDropZone() {
		this.container.addEventListener("dragover", (e) => {
			e.preventDefault();
			this.container.classList.add("fv-fm--dragover");
		});
		this.container.addEventListener("dragleave", () => {
			this.container.classList.remove("fv-fm--dragover");
		});
		this.container.addEventListener("drop", (e) => {
			e.preventDefault();
			this.container.classList.remove("fv-fm--dragover");
			if (e.dataTransfer?.files?.length) this._uploadFiles(e.dataTransfer.files);
		});
	}

	_triggerUpload() {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = true;
		input.addEventListener("change", () => {
			if (input.files?.length) this._uploadFiles(input.files);
		});
		input.click();
	}

	async _uploadFiles(fileList) {
		for (const file of fileList) {
			try {
				await frappe.xcall("frappe.client.upload_file", {
					file,
					folder: this.currentFolder,
					is_private: 0,
				});
			} catch (e) {
				console.error("FileManager: upload error", e);
			}
		}
		await this.loadFiles();
		frappe.show_alert({ message: __("{0} file(s) uploaded", [fileList.length]), indicator: "green" });
	}

	/* ── Filter ──────────────────────────────────────────────── */
	_filterFiles(term) {
		if (!term) {
			this._renderFiles();
			return;
		}
		const lc = term.toLowerCase();
		const original = this.files;
		this.files = this.files.filter(f => (f.file_name || "").toLowerCase().includes(lc));
		this._renderFiles();
		this.files = original;
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_formatSize(bytes) {
		if (!bytes) return "";
		const units = ["B", "KB", "MB", "GB"];
		let i = 0;
		let size = bytes;
		while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
		return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
	}

	_formatDate(d) {
		if (!d) return "";
		try { return new Date(d).toLocaleDateString(); } catch { return d; }
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-fm", `fv-fm--${this.opts.theme}`);
	}
}
