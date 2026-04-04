/**
 * FileDropZone — Drag-and-drop file upload area with preview
 *
 * A rich drop zone supporting drag-and-drop, click-to-browse, file type
 * validation, size limits, image previews, progress indicators, and
 * multi-file upload.
 *
 * frappe.visual.FileDropZone.create({
 *   container: "#upload-area", accept: ["image/*", ".pdf"],
 *   maxSize: 10 * 1024 * 1024, onUpload: (files) => {}
 * })
 */
export class FileDropZone {
	static create(opts = {}) { return new FileDropZone(opts); }

	static ICONS = {
		image: "🖼️", pdf: "📄", doc: "📝", xls: "📊", zip: "📦",
		video: "🎬", audio: "🎵", default: "📎"
	};

	constructor(opts) {
		this.opts = Object.assign({
			container: null, accept: [], maxSize: 10 * 1024 * 1024,
			maxFiles: 10, multiple: true, showPreview: true,
			onUpload: null, onRemove: null
		}, opts);
		this._files = [];
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	get files() { return [...this._files]; }
	get fileCount() { return this._files.length; }

	/** Programmatically add files */
	addFiles(fileList) {
		Array.from(fileList).forEach(f => this._processFile(f));
		this._renderFiles();
	}

	/** Remove a file by index */
	removeFile(index) {
		const removed = this._files.splice(index, 1);
		this._renderFiles();
		this.opts.onRemove?.(removed[0]);
	}

	clearAll() { this._files = []; this._renderFiles(); }

	destroy() { this._el?.remove(); }

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;
		this._el = document.createElement("div");
		this._el.className = "fv-file-drop";
		this._el.innerHTML = `<div class="fv-fd-zone" role="button" tabindex="0"
			aria-label="${__("Drop files here or click to browse")}">
			<div class="fv-fd-icon">📁</div>
			<div class="fv-fd-text">${__("Drop files here or click to browse")}</div>
			<div class="fv-fd-hint">${this.opts.accept.length ? __("Accepted: {0}", [this.opts.accept.join(", ")]) : ""}
				${__("Max size: {0}MB", [Math.round(this.opts.maxSize / 1024 / 1024)])}</div>
			<input class="fv-fd-input" type="file" ${this.opts.multiple ? "multiple" : ""}
				${this.opts.accept.length ? `accept="${this.opts.accept.join(",")}"` : ""} hidden>
		</div>
		<div class="fv-fd-files"></div>`;
		parent.appendChild(this._el);

		const zone = this._el.querySelector(".fv-fd-zone");
		const input = this._el.querySelector(".fv-fd-input");

		// Click to browse
		zone.addEventListener("click", () => input.click());
		zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") input.click(); });
		input.addEventListener("change", () => {
			this.addFiles(input.files);
			input.value = "";
		});

		// Drag and drop
		zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("fv-fd-zone--hover"); });
		zone.addEventListener("dragleave", () => zone.classList.remove("fv-fd-zone--hover"));
		zone.addEventListener("drop", (e) => {
			e.preventDefault();
			zone.classList.remove("fv-fd-zone--hover");
			this.addFiles(e.dataTransfer.files);
		});
	}

	_processFile(file) {
		if (this._files.length >= this.opts.maxFiles) {
			this._showError(__("Maximum {0} files allowed", [this.opts.maxFiles]));
			return;
		}
		if (file.size > this.opts.maxSize) {
			this._showError(__("{0} is too large (max {1}MB)", [file.name, Math.round(this.opts.maxSize / 1024 / 1024)]));
			return;
		}
		if (this.opts.accept.length && !this._matchesAccept(file)) {
			this._showError(__("{0} is not an accepted file type", [file.name]));
			return;
		}
		const entry = { file, name: file.name, size: file.size, type: file.type, preview: null };
		// Generate preview for images
		if (this.opts.showPreview && file.type.startsWith("image/")) {
			const reader = new FileReader();
			reader.onload = (e) => { entry.preview = e.target.result; this._renderFiles(); };
			reader.readAsDataURL(file);
		}
		this._files.push(entry);
		this.opts.onUpload?.(this._files);
	}

	_matchesAccept(file) {
		return this.opts.accept.some(a => {
			if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a.toLowerCase());
			if (a.endsWith("/*")) return file.type.startsWith(a.replace("/*", "/"));
			return file.type === a;
		});
	}

	_renderFiles() {
		const container = this._el?.querySelector(".fv-fd-files");
		if (!container) return;
		if (!this._files.length) { container.innerHTML = ""; return; }
		container.innerHTML = this._files.map((entry, i) => {
			const icon = this._getIcon(entry);
			const sizeStr = this._formatSize(entry.size);
			return `<div class="fv-fd-file">
				${entry.preview ? `<img src="${entry.preview}" class="fv-fd-preview" alt="">` :
					`<span class="fv-fd-file-icon">${icon}</span>`}
				<div class="fv-fd-file-info">
					<span class="fv-fd-file-name">${this._esc(entry.name)}</span>
					<span class="fv-fd-file-size">${sizeStr}</span>
				</div>
				<button class="fv-fd-remove" data-idx="${i}" aria-label="${__("Remove")}">×</button>
			</div>`;
		}).join("");
		container.querySelectorAll(".fv-fd-remove").forEach(btn => {
			btn.addEventListener("click", () => this.removeFile(parseInt(btn.dataset.idx)));
		});
	}

	_getIcon(entry) {
		const type = entry.type || "";
		if (type.startsWith("image/")) return FileDropZone.ICONS.image;
		if (type.includes("pdf")) return FileDropZone.ICONS.pdf;
		if (type.includes("word") || type.includes("document")) return FileDropZone.ICONS.doc;
		if (type.includes("sheet") || type.includes("excel")) return FileDropZone.ICONS.xls;
		if (type.includes("zip") || type.includes("compressed")) return FileDropZone.ICONS.zip;
		if (type.startsWith("video/")) return FileDropZone.ICONS.video;
		if (type.startsWith("audio/")) return FileDropZone.ICONS.audio;
		return FileDropZone.ICONS.default;
	}

	_formatSize(bytes) {
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return (bytes / 1024 / 1024).toFixed(1) + " MB";
	}

	_showError(msg) {
		if (typeof frappe !== "undefined" && frappe.show_alert) {
			frappe.show_alert({ message: msg, indicator: "red" });
		} else { console.warn(msg); }
	}

	_esc(s) { const d = document.createElement("span"); d.textContent = s || ""; return d.innerHTML; }
}
