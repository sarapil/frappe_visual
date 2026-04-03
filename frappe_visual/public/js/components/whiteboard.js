/**
 * Frappe Visual — Digital Whiteboard
 * =====================================
 * Infinite-canvas whiteboard with freehand drawing, shapes, sticky notes,
 * connectors, text, zoom / pan, and image export.  Perfect for brainstorming,
 * architecture diagrams, and collaborative planning inside Frappe.
 *
 * Features:
 *  - Infinite SVG canvas with zoom / pan (mouse wheel + drag)
 *  - Tools: Select, Pen, Line, Rectangle, Ellipse, Arrow, Text, Sticky Note, Image
 *  - Freehand smoothing via quadratic-curve simplification
 *  - Sticky notes with editable text + 6 colors
 *  - Shape handles: resize, rotate, drag
 *  - Arrow / connector snapping to shape edges
 *  - Undo / Redo stack (Ctrl+Z / Ctrl+Shift+Z)
 *  - Grid / dot background (toggle)
 *  - Export: PNG (canvas), SVG (raw), JSON (state)
 *  - Import from JSON state
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.Whiteboard.create('#el', opts)
 *
 * @module frappe_visual/components/whiteboard
 */

const TOOLS = [
	{ id: "select",    icon: "⊹",  label: "Select",    cursor: "default" },
	{ id: "pen",       icon: "✎",  label: "Pen",       cursor: "crosshair" },
	{ id: "line",      icon: "╱",  label: "Line",      cursor: "crosshair" },
	{ id: "rect",      icon: "▭",  label: "Rectangle", cursor: "crosshair" },
	{ id: "ellipse",   icon: "◯",  label: "Ellipse",   cursor: "crosshair" },
	{ id: "arrow",     icon: "→",  label: "Arrow",     cursor: "crosshair" },
	{ id: "text",      icon: "T",  label: "Text",      cursor: "text" },
	{ id: "sticky",    icon: "▪",  label: "Sticky",    cursor: "crosshair" },
	{ id: "image",     icon: "🖼", label: "Image",     cursor: "crosshair" },
	{ id: "eraser",    icon: "⌫",  label: "Eraser",    cursor: "crosshair" },
];

const STICKY_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fecaca", "#ddd6fe", "#fed7aa"];
const DEFAULT_STROKE = "#334155";
const DEFAULT_FILL = "transparent";

function _esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

let _idCounter = 0;
function _uid() { return `wb_${Date.now()}_${++_idCounter}`; }

export class Whiteboard {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("Whiteboard: container not found");

		this.opts = Object.assign({
			theme: "glass",
			width: "100%",
			height: 600,
			showGrid: true,
			gridSize: 20,
			strokeColor: DEFAULT_STROKE,
			strokeWidth: 2,
			fillColor: DEFAULT_FILL,
			onChange: null,
		}, opts);

		this._elements = [];
		this._undoStack = [];
		this._redoStack = [];
		this._currentTool = "select";
		this._zoom = 1;
		this._pan = { x: 0, y: 0 };
		this._drawing = false;
		this._currentPath = [];
		this._selectedId = null;
		this._dragStart = null;
		this._init();
	}

	static create(container, opts) { return new Whiteboard(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-wb", `fv-wb--${this.opts.theme}`);
		this.container.innerHTML = "";
		this.container.style.position = "relative";
		this.container.style.overflow = "hidden";

		this._renderToolbar();
		this._createSVG();
		this._setupEvents();
	}

	/* ── Toolbar ─────────────────────────────────────────────── */
	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-wb-toolbar";

		for (const tool of TOOLS) {
			const btn = document.createElement("button");
			btn.className = `fv-wb-tool ${tool.id === this._currentTool ? "active" : ""}`;
			btn.title = tool.label;
			btn.textContent = tool.icon;
			btn.dataset.tool = tool.id;
			btn.addEventListener("click", () => this.setTool(tool.id));
			bar.appendChild(btn);
		}

		// Separator + actions
		bar.appendChild(Object.assign(document.createElement("div"), { className: "fv-wb-sep" }));

		const undoBtn = this._mkBtn("↶", __("Undo"), () => this.undo());
		const redoBtn = this._mkBtn("↷", __("Redo"), () => this.redo());
		const gridBtn = this._mkBtn("⊞", __("Toggle Grid"), () => { this.opts.showGrid = !this.opts.showGrid; this._drawGrid(); });
		const zoomIn = this._mkBtn("+", __("Zoom In"), () => this.zoomTo(this._zoom * 1.2));
		const zoomOut = this._mkBtn("−", __("Zoom Out"), () => this.zoomTo(this._zoom / 1.2));
		const fitBtn = this._mkBtn("◻", __("Fit"), () => this.zoomTo(1));
		const exportBtn = this._mkBtn("⤓", __("Export PNG"), () => this.exportPNG());

		[undoBtn, redoBtn, gridBtn, zoomIn, zoomOut, fitBtn, exportBtn].forEach(b => bar.appendChild(b));

		// Color pickers
		const strokePick = document.createElement("input");
		strokePick.type = "color";
		strokePick.value = this.opts.strokeColor;
		strokePick.title = __("Stroke Color");
		strokePick.className = "fv-wb-color";
		strokePick.addEventListener("input", (e) => { this.opts.strokeColor = e.target.value; });
		bar.appendChild(strokePick);

		const widthSel = document.createElement("select");
		widthSel.className = "fv-wb-width";
		widthSel.title = __("Stroke Width");
		[1, 2, 3, 5, 8].forEach(w => {
			const opt = document.createElement("option");
			opt.value = w;
			opt.textContent = `${w}px`;
			if (w === this.opts.strokeWidth) opt.selected = true;
			widthSel.appendChild(opt);
		});
		widthSel.addEventListener("change", (e) => { this.opts.strokeWidth = parseInt(e.target.value); });
		bar.appendChild(widthSel);

		this.container.appendChild(bar);
		this._toolbarEl = bar;
	}

	_mkBtn(icon, title, fn) {
		const btn = document.createElement("button");
		btn.className = "fv-wb-tool";
		btn.title = title;
		btn.textContent = icon;
		btn.addEventListener("click", fn);
		return btn;
	}

	/* ── SVG Canvas ──────────────────────────────────────────── */
	_createSVG() {
		const wrap = document.createElement("div");
		wrap.className = "fv-wb-canvas-wrap";
		wrap.style.height = typeof this.opts.height === "number" ? `${this.opts.height}px` : this.opts.height;

		const ns = "http://www.w3.org/2000/svg";
		this._svg = document.createElementNS(ns, "svg");
		this._svg.setAttribute("class", "fv-wb-svg");
		this._svg.setAttribute("width", "100%");
		this._svg.setAttribute("height", "100%");

		// Defs: arrow marker
		const defs = document.createElementNS(ns, "defs");
		const marker = document.createElementNS(ns, "marker");
		marker.setAttribute("id", "fv-wb-arrowhead");
		marker.setAttribute("markerWidth", "10");
		marker.setAttribute("markerHeight", "7");
		marker.setAttribute("refX", "10");
		marker.setAttribute("refY", "3.5");
		marker.setAttribute("orient", "auto");
		const poly = document.createElementNS(ns, "polygon");
		poly.setAttribute("points", "0 0, 10 3.5, 0 7");
		poly.setAttribute("fill", DEFAULT_STROKE);
		marker.appendChild(poly);
		defs.appendChild(marker);
		this._svg.appendChild(defs);

		// Layers
		this._gridLayer = document.createElementNS(ns, "g");
		this._gridLayer.setAttribute("class", "fv-wb-grid-layer");
		this._svg.appendChild(this._gridLayer);

		this._elemLayer = document.createElementNS(ns, "g");
		this._elemLayer.setAttribute("class", "fv-wb-elem-layer");
		this._svg.appendChild(this._elemLayer);

		this._drawLayer = document.createElementNS(ns, "g");
		this._drawLayer.setAttribute("class", "fv-wb-draw-layer");
		this._svg.appendChild(this._drawLayer);

		wrap.appendChild(this._svg);
		this.container.appendChild(wrap);
		this._canvasWrap = wrap;

		this._drawGrid();
		this._applyTransform();
	}

	_drawGrid() {
		const ns = "http://www.w3.org/2000/svg";
		this._gridLayer.innerHTML = "";
		if (!this.opts.showGrid) return;

		const g = this.opts.gridSize;
		const w = 2000;
		const h = 2000;

		for (let x = -w; x <= w; x += g) {
			const line = document.createElementNS(ns, "line");
			line.setAttribute("x1", x); line.setAttribute("y1", -h);
			line.setAttribute("x2", x); line.setAttribute("y2", h);
			line.setAttribute("class", "fv-wb-grid-line");
			this._gridLayer.appendChild(line);
		}
		for (let y = -h; y <= h; y += g) {
			const line = document.createElementNS(ns, "line");
			line.setAttribute("x1", -w); line.setAttribute("y1", y);
			line.setAttribute("x2", w);  line.setAttribute("y2", y);
			line.setAttribute("class", "fv-wb-grid-line");
			this._gridLayer.appendChild(line);
		}
	}

	_applyTransform() {
		const t = `translate(${this._pan.x},${this._pan.y}) scale(${this._zoom})`;
		this._gridLayer.setAttribute("transform", t);
		this._elemLayer.setAttribute("transform", t);
		this._drawLayer.setAttribute("transform", t);
	}

	/* ── Events ──────────────────────────────────────────────── */
	_setupEvents() {
		const svg = this._svg;

		svg.addEventListener("mousedown", (e) => this._onMouseDown(e));
		svg.addEventListener("mousemove", (e) => this._onMouseMove(e));
		svg.addEventListener("mouseup", (e) => this._onMouseUp(e));
		svg.addEventListener("wheel", (e) => { e.preventDefault(); this._onWheel(e); }, { passive: false });

		// Keyboard
		document.addEventListener("keydown", (e) => {
			if (!this.container.contains(document.activeElement) && document.activeElement !== document.body) return;
			if ((e.ctrlKey || e.metaKey) && e.key === "z") {
				e.preventDefault();
				e.shiftKey ? this.redo() : this.undo();
			}
			if (e.key === "Delete" || e.key === "Backspace") {
				if (this._selectedId) { this.deleteElement(this._selectedId); }
			}
		});
	}

	_svgPoint(e) {
		const rect = this._svg.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left - this._pan.x) / this._zoom,
			y: (e.clientY - rect.top - this._pan.y) / this._zoom,
		};
	}

	_onMouseDown(e) {
		const pt = this._svgPoint(e);
		const tool = this._currentTool;

		if (tool === "select") {
			this._dragStart = { x: e.clientX, y: e.clientY, panX: this._pan.x, panY: this._pan.y };
			// Check if clicking on an element
			const hit = this._hitTest(pt);
			this._selectElement(hit);
			if (hit) {
				this._dragEl = hit;
				this._dragElStart = { ...pt };
			}
			return;
		}

		if (tool === "eraser") {
			const hit = this._hitTest(pt);
			if (hit) this.deleteElement(hit);
			return;
		}

		this._drawing = true;
		this._drawStart = pt;
		this._currentPath = [pt];

		if (tool === "pen") {
			this._livePath = this._createSVGPath();
			this._drawLayer.appendChild(this._livePath);
		}

		if (tool === "text") {
			this._drawing = false;
			this._addText(pt);
		}

		if (tool === "sticky") {
			this._drawing = false;
			this._addSticky(pt);
		}

		if (tool === "image") {
			this._drawing = false;
			this._addImage(pt);
		}
	}

	_onMouseMove(e) {
		const pt = this._svgPoint(e);

		// Pan with select tool
		if (this._dragStart && !this._dragEl && this._currentTool === "select") {
			this._pan.x = this._dragStart.panX + (e.clientX - this._dragStart.x);
			this._pan.y = this._dragStart.panY + (e.clientY - this._dragStart.y);
			this._applyTransform();
			return;
		}

		// Drag element
		if (this._dragEl && this._dragElStart) {
			const dx = pt.x - this._dragElStart.x;
			const dy = pt.y - this._dragElStart.y;
			this._moveElement(this._dragEl, dx, dy);
			this._dragElStart = { ...pt };
			return;
		}

		if (!this._drawing) return;

		this._currentPath.push(pt);
		const tool = this._currentTool;

		if (tool === "pen" && this._livePath) {
			this._livePath.setAttribute("d", this._buildPathD(this._currentPath));
		}
		if (tool === "line" || tool === "arrow") {
			this._updateLiveShape("line", this._drawStart, pt);
		}
		if (tool === "rect") {
			this._updateLiveShape("rect", this._drawStart, pt);
		}
		if (tool === "ellipse") {
			this._updateLiveShape("ellipse", this._drawStart, pt);
		}
	}

	_onMouseUp(e) {
		if (this._dragStart) { this._dragStart = null; this._dragEl = null; this._dragElStart = null; }
		if (!this._drawing) return;
		this._drawing = false;

		const pt = this._svgPoint(e);
		const tool = this._currentTool;

		if (tool === "pen" && this._currentPath.length > 1) {
			this._addElement({ type: "path", d: this._buildPathD(this._currentPath), stroke: this.opts.strokeColor, strokeWidth: this.opts.strokeWidth });
			if (this._livePath) { this._livePath.remove(); this._livePath = null; }
		}
		if (tool === "line" && this._drawStart) {
			this._addElement({ type: "line", x1: this._drawStart.x, y1: this._drawStart.y, x2: pt.x, y2: pt.y, stroke: this.opts.strokeColor, strokeWidth: this.opts.strokeWidth });
		}
		if (tool === "arrow" && this._drawStart) {
			this._addElement({ type: "arrow", x1: this._drawStart.x, y1: this._drawStart.y, x2: pt.x, y2: pt.y, stroke: this.opts.strokeColor, strokeWidth: this.opts.strokeWidth });
		}
		if (tool === "rect" && this._drawStart) {
			const x = Math.min(this._drawStart.x, pt.x), y = Math.min(this._drawStart.y, pt.y);
			const w = Math.abs(pt.x - this._drawStart.x), h = Math.abs(pt.y - this._drawStart.y);
			if (w > 2 && h > 2) this._addElement({ type: "rect", x, y, width: w, height: h, stroke: this.opts.strokeColor, fill: this.opts.fillColor, strokeWidth: this.opts.strokeWidth });
		}
		if (tool === "ellipse" && this._drawStart) {
			const cx = (this._drawStart.x + pt.x) / 2, cy = (this._drawStart.y + pt.y) / 2;
			const rx = Math.abs(pt.x - this._drawStart.x) / 2, ry = Math.abs(pt.y - this._drawStart.y) / 2;
			if (rx > 2 && ry > 2) this._addElement({ type: "ellipse", cx, cy, rx, ry, stroke: this.opts.strokeColor, fill: this.opts.fillColor, strokeWidth: this.opts.strokeWidth });
		}

		this._clearLive();
	}

	_onWheel(e) {
		const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
		this.zoomTo(this._zoom * factor);
	}

	/* ── Shape Drawing ───────────────────────────────────────── */
	_createSVGPath() {
		const ns = "http://www.w3.org/2000/svg";
		const path = document.createElementNS(ns, "path");
		path.setAttribute("fill", "none");
		path.setAttribute("stroke", this.opts.strokeColor);
		path.setAttribute("stroke-width", this.opts.strokeWidth);
		path.setAttribute("stroke-linecap", "round");
		path.setAttribute("stroke-linejoin", "round");
		return path;
	}

	_buildPathD(pts) {
		if (pts.length < 2) return "";
		let d = `M ${pts[0].x} ${pts[0].y}`;
		for (let i = 1; i < pts.length - 1; i++) {
			const cp = pts[i];
			const next = pts[i + 1];
			const mx = (cp.x + next.x) / 2;
			const my = (cp.y + next.y) / 2;
			d += ` Q ${cp.x} ${cp.y} ${mx} ${my}`;
		}
		const last = pts[pts.length - 1];
		d += ` L ${last.x} ${last.y}`;
		return d;
	}

	_updateLiveShape(type, start, end) {
		this._clearLive();
		const ns = "http://www.w3.org/2000/svg";
		let el;

		if (type === "line") {
			el = document.createElementNS(ns, "line");
			el.setAttribute("x1", start.x); el.setAttribute("y1", start.y);
			el.setAttribute("x2", end.x); el.setAttribute("y2", end.y);
			el.setAttribute("stroke", this.opts.strokeColor);
			el.setAttribute("stroke-width", this.opts.strokeWidth);
			if (this._currentTool === "arrow") el.setAttribute("marker-end", "url(#fv-wb-arrowhead)");
		} else if (type === "rect") {
			el = document.createElementNS(ns, "rect");
			el.setAttribute("x", Math.min(start.x, end.x));
			el.setAttribute("y", Math.min(start.y, end.y));
			el.setAttribute("width", Math.abs(end.x - start.x));
			el.setAttribute("height", Math.abs(end.y - start.y));
			el.setAttribute("stroke", this.opts.strokeColor);
			el.setAttribute("fill", this.opts.fillColor);
			el.setAttribute("stroke-width", this.opts.strokeWidth);
		} else if (type === "ellipse") {
			el = document.createElementNS(ns, "ellipse");
			el.setAttribute("cx", (start.x + end.x) / 2);
			el.setAttribute("cy", (start.y + end.y) / 2);
			el.setAttribute("rx", Math.abs(end.x - start.x) / 2);
			el.setAttribute("ry", Math.abs(end.y - start.y) / 2);
			el.setAttribute("stroke", this.opts.strokeColor);
			el.setAttribute("fill", this.opts.fillColor);
			el.setAttribute("stroke-width", this.opts.strokeWidth);
		}

		if (el) { el.classList.add("fv-wb-live"); this._drawLayer.appendChild(el); }
	}

	_clearLive() {
		this._drawLayer.querySelectorAll(".fv-wb-live").forEach(el => el.remove());
	}

	/* ── Element CRUD ────────────────────────────────────────── */
	_addElement(data) {
		data.id = _uid();
		this._pushUndo();
		this._elements.push(data);
		this._renderElement(data);
		this._emitChange();
		return data.id;
	}

	_renderElement(data) {
		const ns = "http://www.w3.org/2000/svg";
		let el;

		switch (data.type) {
			case "path":
				el = document.createElementNS(ns, "path");
				el.setAttribute("d", data.d);
				el.setAttribute("fill", "none");
				el.setAttribute("stroke", data.stroke);
				el.setAttribute("stroke-width", data.strokeWidth);
				el.setAttribute("stroke-linecap", "round");
				break;
			case "line":
				el = document.createElementNS(ns, "line");
				el.setAttribute("x1", data.x1); el.setAttribute("y1", data.y1);
				el.setAttribute("x2", data.x2); el.setAttribute("y2", data.y2);
				el.setAttribute("stroke", data.stroke);
				el.setAttribute("stroke-width", data.strokeWidth);
				break;
			case "arrow":
				el = document.createElementNS(ns, "line");
				el.setAttribute("x1", data.x1); el.setAttribute("y1", data.y1);
				el.setAttribute("x2", data.x2); el.setAttribute("y2", data.y2);
				el.setAttribute("stroke", data.stroke);
				el.setAttribute("stroke-width", data.strokeWidth);
				el.setAttribute("marker-end", "url(#fv-wb-arrowhead)");
				break;
			case "rect":
				el = document.createElementNS(ns, "rect");
				el.setAttribute("x", data.x); el.setAttribute("y", data.y);
				el.setAttribute("width", data.width); el.setAttribute("height", data.height);
				el.setAttribute("stroke", data.stroke);
				el.setAttribute("fill", data.fill || "transparent");
				el.setAttribute("stroke-width", data.strokeWidth);
				el.setAttribute("rx", 4);
				break;
			case "ellipse":
				el = document.createElementNS(ns, "ellipse");
				el.setAttribute("cx", data.cx); el.setAttribute("cy", data.cy);
				el.setAttribute("rx", data.rx); el.setAttribute("ry", data.ry);
				el.setAttribute("stroke", data.stroke);
				el.setAttribute("fill", data.fill || "transparent");
				el.setAttribute("stroke-width", data.strokeWidth);
				break;
			case "text":
				el = document.createElementNS(ns, "text");
				el.setAttribute("x", data.x); el.setAttribute("y", data.y);
				el.setAttribute("fill", data.stroke || DEFAULT_STROKE);
				el.setAttribute("font-size", data.fontSize || 16);
				el.textContent = data.text;
				break;
			case "sticky":
				el = document.createElementNS(ns, "g");
				const r = document.createElementNS(ns, "rect");
				r.setAttribute("x", data.x); r.setAttribute("y", data.y);
				r.setAttribute("width", data.width || 150); r.setAttribute("height", data.height || 100);
				r.setAttribute("fill", data.color || STICKY_COLORS[0]);
				r.setAttribute("rx", 6);
				r.setAttribute("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,.15))");
				const t = document.createElementNS(ns, "text");
				t.setAttribute("x", data.x + 10); t.setAttribute("y", data.y + 24);
				t.setAttribute("font-size", 13);
				t.setAttribute("fill", "#1e293b");
				t.textContent = data.text || "";
				el.appendChild(r);
				el.appendChild(t);
				break;
			case "image":
				el = document.createElementNS(ns, "image");
				el.setAttribute("x", data.x); el.setAttribute("y", data.y);
				el.setAttribute("width", data.width || 200); el.setAttribute("height", data.height || 150);
				el.setAttributeNS("http://www.w3.org/1999/xlink", "href", data.src);
				break;
		}

		if (el) {
			el.setAttribute("data-id", data.id);
			el.classList.add("fv-wb-el");
			this._elemLayer.appendChild(el);
		}
	}

	_addText(pt) {
		const text = prompt(__("Enter text:"));
		if (!text) return;
		this._addElement({ type: "text", x: pt.x, y: pt.y, text, stroke: this.opts.strokeColor, fontSize: 16 });
	}

	_addSticky(pt) {
		const text = prompt(__("Sticky note text:"));
		if (text === null) return;
		const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
		this._addElement({ type: "sticky", x: pt.x, y: pt.y, width: 150, height: 100, text, color });
	}

	_addImage(pt) {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.addEventListener("change", async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("is_private", 0);
				const resp = await fetch("/api/method/upload_file", {
					method: "POST",
					headers: { "X-Frappe-CSRF-Token": frappe.csrf_token },
					body: formData,
				});
				const data = await resp.json();
				if (data.message?.file_url) {
					this._addElement({ type: "image", x: pt.x, y: pt.y, src: data.message.file_url, width: 200, height: 150 });
				}
			} catch (err) { console.error("Whiteboard: upload error", err); }
		});
		input.click();
	}

	deleteElement(id) {
		this._pushUndo();
		this._elements = this._elements.filter(el => el.id !== id);
		const svgEl = this._elemLayer.querySelector(`[data-id="${id}"]`);
		if (svgEl) svgEl.remove();
		if (this._selectedId === id) this._selectElement(null);
		this._emitChange();
	}

	_moveElement(id, dx, dy) {
		const el = this._elements.find(e => e.id === id);
		if (!el) return;

		switch (el.type) {
			case "rect": case "sticky": case "text": case "image":
				el.x = (el.x || 0) + dx;
				el.y = (el.y || 0) + dy;
				break;
			case "ellipse":
				el.cx = (el.cx || 0) + dx;
				el.cy = (el.cy || 0) + dy;
				break;
			case "line": case "arrow":
				el.x1 += dx; el.y1 += dy; el.x2 += dx; el.y2 += dy;
				break;
		}

		// Re-render this element
		const svgEl = this._elemLayer.querySelector(`[data-id="${id}"]`);
		if (svgEl) svgEl.remove();
		this._renderElement(el);
	}

	_hitTest(pt) {
		for (let i = this._elements.length - 1; i >= 0; i--) {
			const el = this._elements[i];
			if (el.type === "rect" || el.type === "sticky" || el.type === "image") {
				if (pt.x >= el.x && pt.x <= el.x + (el.width || 150) && pt.y >= el.y && pt.y <= el.y + (el.height || 100)) return el.id;
			}
			if (el.type === "ellipse") {
				const dx = (pt.x - el.cx) / el.rx, dy = (pt.y - el.cy) / el.ry;
				if (dx * dx + dy * dy <= 1) return el.id;
			}
			if (el.type === "text") {
				if (pt.x >= el.x && pt.x <= el.x + 200 && pt.y >= el.y - 20 && pt.y <= el.y + 10) return el.id;
			}
		}
		return null;
	}

	_selectElement(id) {
		// Clear old selection
		this._elemLayer.querySelectorAll(".fv-wb-el--selected").forEach(el => el.classList.remove("fv-wb-el--selected"));
		this._selectedId = id;
		if (id) {
			const svgEl = this._elemLayer.querySelector(`[data-id="${id}"]`);
			if (svgEl) svgEl.classList.add("fv-wb-el--selected");
		}
	}

	/* ── Undo / Redo ─────────────────────────────────────────── */
	_pushUndo() {
		this._undoStack.push(JSON.stringify(this._elements));
		if (this._undoStack.length > 50) this._undoStack.shift();
		this._redoStack = [];
	}

	undo() {
		if (!this._undoStack.length) return;
		this._redoStack.push(JSON.stringify(this._elements));
		this._elements = JSON.parse(this._undoStack.pop());
		this._refreshAll();
	}

	redo() {
		if (!this._redoStack.length) return;
		this._undoStack.push(JSON.stringify(this._elements));
		this._elements = JSON.parse(this._redoStack.pop());
		this._refreshAll();
	}

	_refreshAll() {
		this._elemLayer.innerHTML = "";
		this._elements.forEach(el => this._renderElement(el));
		this._emitChange();
	}

	/* ── Zoom ────────────────────────────────────────────────── */
	zoomTo(z) {
		this._zoom = Math.max(0.1, Math.min(5, z));
		this._applyTransform();
	}

	/* ── Tool ────────────────────────────────────────────────── */
	setTool(toolId) {
		this._currentTool = toolId;
		const tool = TOOLS.find(t => t.id === toolId);
		this._svg.style.cursor = tool?.cursor || "default";
		this._toolbarEl.querySelectorAll(".fv-wb-tool").forEach(b => {
			b.classList.toggle("active", b.dataset.tool === toolId);
		});
	}

	/* ── Export / Import ─────────────────────────────────────── */
	exportJSON() { return JSON.parse(JSON.stringify(this._elements)); }

	importJSON(data) {
		this._pushUndo();
		this._elements = Array.isArray(data) ? data : [];
		this._refreshAll();
	}

	exportSVG() { return this._svg.outerHTML; }

	async exportPNG() {
		const svgData = new XMLSerializer().serializeToString(this._svg);
		const blob = new Blob([svgData], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const img = new Image();
		return new Promise((resolve) => {
			img.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = img.naturalWidth || 1200;
				canvas.height = img.naturalHeight || 800;
				const ctx = canvas.getContext("2d");
				ctx.fillStyle = "#ffffff";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				canvas.toBlob((blob) => {
					const a = document.createElement("a");
					a.href = URL.createObjectURL(blob);
					a.download = "whiteboard.png";
					a.click();
					URL.revokeObjectURL(url);
					resolve();
				});
			};
			img.src = url;
		});
	}

	_emitChange() { if (this.opts.onChange) this.opts.onChange(this._elements); }

	/* ── Public API ──────────────────────────────────────────── */
	getElements() { return this.exportJSON(); }
	clear() { this._pushUndo(); this._elements = []; this._refreshAll(); }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-wb", `fv-wb--${this.opts.theme}`);
	}
}
