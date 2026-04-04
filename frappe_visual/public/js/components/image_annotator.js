// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Image Annotator
 * =================================
 * Draw annotations on images: arrows, rectangles, circles,
 * freehand lines, text labels, blur regions, and crop tool.
 * Export annotated image as PNG/JPEG data URL.
 *
 * Features:
 *  - Tool palette: select, arrow, rect, circle, freehand, text, blur, crop
 *  - Color/thickness/opacity controls
 *  - Undo/redo stack
 *  - Zoom + pan with mouse wheel
 *  - Export to PNG data URL or Blob
 *  - Resize/move existing annotations
 *  - Dark mode / glass theme
 *
 * API:
 *   frappe.visual.ImageAnnotator.create('#el', { src: '/files/photo.jpg' })
 *
 * @module frappe_visual/components/image_annotator
 */

const TOOLS = [
	{ id: "select",   icon: "↖", label: "Select" },
	{ id: "arrow",    icon: "→", label: "Arrow" },
	{ id: "rect",     icon: "▢", label: "Rectangle" },
	{ id: "circle",   icon: "○", label: "Circle" },
	{ id: "freehand", icon: "✎", label: "Freehand" },
	{ id: "text",     icon: "T", label: "Text" },
	{ id: "blur",     icon: "▨", label: "Blur" },
	{ id: "crop",     icon: "⛶", label: "Crop" },
];

export class ImageAnnotator {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("ImageAnnotator: container not found");

		this.opts = Object.assign({
			theme: "glass",
			src: "",
			color: "#EF4444",
			strokeWidth: 3,
			fontSize: 16,
			opacity: 1,
			onChange: null,
		}, opts);

		this._tool = "arrow";
		this._annotations = [];
		this._undoStack = [];
		this._redoStack = [];
		this._drawing = false;
		this._startPos = null;
		this._currentAnnotation = null;
		this._scale = 1;
		this._offset = { x: 0, y: 0 };
		this._img = null;

		this._init();
	}

	static create(container, opts) { return new ImageAnnotator(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	async _init() {
		this.container.classList.add("fv-ia", `fv-ia--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._renderToolbar();
		this._renderCanvas();

		if (this.opts.src) await this._loadImage(this.opts.src);
	}

	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-ia-toolbar";

		// Tools
		const toolGroup = document.createElement("div");
		toolGroup.className = "fv-ia-tool-group";
		TOOLS.forEach(t => {
			const btn = document.createElement("button");
			btn.className = `fv-ia-tool ${t.id === this._tool ? "active" : ""}`;
			btn.dataset.tool = t.id;
			btn.title = __(t.label);
			btn.textContent = t.icon;
			btn.addEventListener("click", () => {
				this._tool = t.id;
				bar.querySelectorAll(".fv-ia-tool").forEach(b => b.classList.toggle("active", b.dataset.tool === t.id));
			});
			toolGroup.appendChild(btn);
		});
		bar.appendChild(toolGroup);

		// Controls
		const controls = document.createElement("div");
		controls.className = "fv-ia-controls";
		controls.innerHTML = `
			<input type="color" class="fv-ia-color" value="${this.opts.color}" title="${__("Color")}" />
			<select class="fv-ia-thickness" title="${__("Thickness")}">
				<option value="1">1px</option>
				<option value="2">2px</option>
				<option value="3" selected>3px</option>
				<option value="5">5px</option>
				<option value="8">8px</option>
			</select>
			<button class="fv-ia-btn fv-ia-undo" title="${__("Undo")}">↶</button>
			<button class="fv-ia-btn fv-ia-redo" title="${__("Redo")}">↷</button>
			<button class="fv-ia-btn fv-ia-clear" title="${__("Clear All")}">🗑</button>
			<button class="fv-ia-btn fv-ia-export" title="${__("Export")}">💾</button>`;
		bar.appendChild(controls);

		controls.querySelector(".fv-ia-color").addEventListener("input", (e) => { this.opts.color = e.target.value; });
		controls.querySelector(".fv-ia-thickness").addEventListener("change", (e) => { this.opts.strokeWidth = parseInt(e.target.value); });
		controls.querySelector(".fv-ia-undo").addEventListener("click", () => this.undo());
		controls.querySelector(".fv-ia-redo").addEventListener("click", () => this.redo());
		controls.querySelector(".fv-ia-clear").addEventListener("click", () => this.clear());
		controls.querySelector(".fv-ia-export").addEventListener("click", () => this._exportImage());

		this.container.appendChild(bar);
	}

	_renderCanvas() {
		const wrap = document.createElement("div");
		wrap.className = "fv-ia-canvas-wrap";

		this._canvas = document.createElement("canvas");
		this._canvas.className = "fv-ia-canvas";
		this._ctx = this._canvas.getContext("2d");
		wrap.appendChild(this._canvas);

		// Overlay canvas for active drawing
		this._overlay = document.createElement("canvas");
		this._overlay.className = "fv-ia-overlay";
		this._overlayCtx = this._overlay.getContext("2d");
		wrap.appendChild(this._overlay);

		this.container.appendChild(wrap);
		this._canvasWrap = wrap;

		this._bindCanvasEvents();
	}

	/* ── Load Image ──────────────────────────────────────────── */
	_loadImage(src) {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				this._img = img;
				const maxW = this._canvasWrap.clientWidth || 800;
				const maxH = this._canvasWrap.clientHeight || 600;
				const scale = Math.min(maxW / img.width, maxH / img.height, 1);
				this._canvas.width = this._overlay.width = Math.round(img.width * scale);
				this._canvas.height = this._overlay.height = Math.round(img.height * scale);
				this._scale = scale;
				this._redrawAll();
				resolve();
			};
			img.onerror = reject;
			img.src = src;
		});
	}

	/* ── Canvas Events ───────────────────────────────────────── */
	_bindCanvasEvents() {
		this._overlay.addEventListener("mousedown", (e) => this._onMouseDown(e));
		this._overlay.addEventListener("mousemove", (e) => this._onMouseMove(e));
		this._overlay.addEventListener("mouseup", (e) => this._onMouseUp(e));
		this._overlay.addEventListener("wheel", (e) => {
			e.preventDefault();
			// Zoom in/out
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			this._scale *= delta;
			this._scale = Math.max(0.1, Math.min(5, this._scale));
			this._redrawAll();
		});
	}

	_getPos(e) {
		const rect = this._overlay.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) / this._scale,
			y: (e.clientY - rect.top) / this._scale,
		};
	}

	_onMouseDown(e) {
		if (this._tool === "select") return;
		this._drawing = true;
		this._startPos = this._getPos(e);
		this._currentAnnotation = {
			type: this._tool,
			color: this.opts.color,
			strokeWidth: this.opts.strokeWidth,
			fontSize: this.opts.fontSize,
			opacity: this.opts.opacity,
			points: [this._startPos],
		};
	}

	_onMouseMove(e) {
		if (!this._drawing || !this._currentAnnotation) return;
		const pos = this._getPos(e);

		if (this._tool === "freehand") {
			this._currentAnnotation.points.push(pos);
		} else {
			this._currentAnnotation.endPos = pos;
		}

		this._drawOverlay();
	}

	_onMouseUp(e) {
		if (!this._drawing) return;
		this._drawing = false;

		if (this._tool === "text") {
			const pos = this._getPos(e);
			const text = prompt(__("Enter text:"));
			if (text) {
				this._currentAnnotation.text = text;
				this._currentAnnotation.endPos = pos;
			} else {
				this._currentAnnotation = null;
				this._clearOverlay();
				return;
			}
		}

		if (this._currentAnnotation) {
			if (!this._currentAnnotation.endPos && this._currentAnnotation.points.length <= 1) {
				this._currentAnnotation = null;
				this._clearOverlay();
				return;
			}
			this._undoStack.push([...this._annotations]);
			this._redoStack = [];
			this._annotations.push(this._currentAnnotation);
			this._currentAnnotation = null;
			this._clearOverlay();
			this._redrawAll();
			this._emit();
		}
	}

	/* ── Drawing ─────────────────────────────────────────────── */
	_redrawAll() {
		const ctx = this._ctx;
		const w = this._canvas.width, h = this._canvas.height;
		ctx.clearRect(0, 0, w, h);

		// Draw image
		if (this._img) {
			ctx.drawImage(this._img, 0, 0, w, h);
		}

		// Draw annotations
		this._annotations.forEach(a => this._drawAnnotation(ctx, a));
	}

	_drawOverlay() {
		this._clearOverlay();
		if (this._currentAnnotation) {
			this._drawAnnotation(this._overlayCtx, this._currentAnnotation);
		}
	}

	_clearOverlay() {
		this._overlayCtx.clearRect(0, 0, this._overlay.width, this._overlay.height);
	}

	_drawAnnotation(ctx, ann) {
		ctx.save();
		ctx.globalAlpha = ann.opacity || 1;
		ctx.strokeStyle = ann.color;
		ctx.fillStyle = ann.color;
		ctx.lineWidth = ann.strokeWidth;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		const s = this._scale;
		const start = ann.points?.[0] || { x: 0, y: 0 };
		const end = ann.endPos || start;

		switch (ann.type) {
			case "arrow":
				this._drawArrow(ctx, start.x * s, start.y * s, end.x * s, end.y * s);
				break;
			case "rect":
				ctx.strokeRect(start.x * s, start.y * s, (end.x - start.x) * s, (end.y - start.y) * s);
				break;
			case "circle": {
				const rx = Math.abs(end.x - start.x) * s / 2;
				const ry = Math.abs(end.y - start.y) * s / 2;
				const cx = (start.x + end.x) * s / 2;
				const cy = (start.y + end.y) * s / 2;
				ctx.beginPath();
				ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
				ctx.stroke();
				break;
			}
			case "freehand":
				if (ann.points.length < 2) break;
				ctx.beginPath();
				ctx.moveTo(ann.points[0].x * s, ann.points[0].y * s);
				for (let i = 1; i < ann.points.length; i++) {
					ctx.lineTo(ann.points[i].x * s, ann.points[i].y * s);
				}
				ctx.stroke();
				break;
			case "text":
				ctx.font = `${ann.fontSize * s}px sans-serif`;
				ctx.fillText(ann.text || "", end.x * s, end.y * s);
				break;
			case "blur": {
				// Simulated blur: pixelate region
				const x = Math.min(start.x, end.x) * s;
				const y = Math.min(start.y, end.y) * s;
				const w = Math.abs(end.x - start.x) * s;
				const h = Math.abs(end.y - start.y) * s;
				if (w > 0 && h > 0) {
					const pixelSize = 10;
					const imgData = ctx.getImageData(x, y, w, h);
					for (let py = 0; py < h; py += pixelSize) {
						for (let px = 0; px < w; px += pixelSize) {
							const idx = (py * w + px) * 4;
							const r = imgData.data[idx], g = imgData.data[idx + 1], b = imgData.data[idx + 2];
							ctx.fillStyle = `rgb(${r},${g},${b})`;
							ctx.fillRect(x + px, y + py, pixelSize, pixelSize);
						}
					}
				}
				break;
			}
			case "crop":
				ctx.setLineDash([5, 5]);
				ctx.strokeStyle = "#fff";
				ctx.strokeRect(start.x * s, start.y * s, (end.x - start.x) * s, (end.y - start.y) * s);
				ctx.setLineDash([]);
				// Darken outside
				ctx.fillStyle = "rgba(0,0,0,0.5)";
				const cx = start.x * s, cy = start.y * s, cw = (end.x - start.x) * s, ch = (end.y - start.y) * s;
				ctx.fillRect(0, 0, this._canvas.width, cy);
				ctx.fillRect(0, cy + ch, this._canvas.width, this._canvas.height - cy - ch);
				ctx.fillRect(0, cy, cx, ch);
				ctx.fillRect(cx + cw, cy, this._canvas.width - cx - cw, ch);
				break;
		}
		ctx.restore();
	}

	_drawArrow(ctx, x1, y1, x2, y2) {
		const headLen = 12;
		const angle = Math.atan2(y2 - y1, x2 - x1);
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		// Arrowhead
		ctx.beginPath();
		ctx.moveTo(x2, y2);
		ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
		ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
		ctx.closePath();
		ctx.fill();
	}

	/* ── Undo/Redo ───────────────────────────────────────────── */
	undo() {
		if (this._undoStack.length === 0) return;
		this._redoStack.push([...this._annotations]);
		this._annotations = this._undoStack.pop();
		this._redrawAll();
		this._emit();
	}

	redo() {
		if (this._redoStack.length === 0) return;
		this._undoStack.push([...this._annotations]);
		this._annotations = this._redoStack.pop();
		this._redrawAll();
		this._emit();
	}

	clear() {
		this._undoStack.push([...this._annotations]);
		this._redoStack = [];
		this._annotations = [];
		this._redrawAll();
		this._emit();
	}

	/* ── Export ───────────────────────────────────────────────── */
	_exportImage() {
		const dataURL = this.toDataURL();
		const a = document.createElement("a");
		a.href = dataURL;
		a.download = "annotated-image.png";
		a.click();
	}

	toDataURL(type = "image/png", quality = 0.92) {
		return this._canvas.toDataURL(type, quality);
	}

	toBlob(callback, type = "image/png", quality = 0.92) {
		this._canvas.toBlob(callback, type, quality);
	}

	/* ── Public API ──────────────────────────────────────────── */
	async setImage(src) {
		this._annotations = [];
		this._undoStack = [];
		this._redoStack = [];
		await this._loadImage(src);
	}

	getAnnotations() { return JSON.parse(JSON.stringify(this._annotations)); }

	setAnnotations(annotations) {
		this._annotations = annotations || [];
		this._redrawAll();
	}

	_emit() {
		if (this.opts.onChange) this.opts.onChange(this._annotations);
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ia");
	}
}
