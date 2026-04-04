// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — FloorPlanDesigner
 * ====================================
 * Interactive spatial layout editor for real-world floor plans.
 * Upload a blueprint/photo background, then draw polygonal rooms/zones,
 * drag-drop items (tables, desks, beds, seats, equipment) from a
 * configurable palette, mark entrances, and display real-time status
 * with color-coded overlays.
 *
 * Use-cases:
 *  • Restaurant (Candela)  — floors, sections, tables, seats, bar area
 *  • Coworking (ARKSpace)  — floors, zones, desks, meeting rooms, pods
 *  • Hotel (Velara)        — floors, rooms, suites, lobby, pool area
 *  • Hospital              — floors, wards, beds, operating theatres
 *  • Warehouse / Office    — zones, racks, workstations
 *
 * Two input modes:
 *  1. **Draw mode** — freehand polygon drawing on the background image
 *  2. **Palette mode** — drag-drop pre-defined item types onto the plan
 *
 * Features:
 *  - Background image (floor plan / blueprint) with pan + zoom
 *  - Polygon drawing tool (click vertices, close shape, n-sided)
 *  - Entrance / door markers with directional indicators
 *  - Drag-drop palette of configurable item types
 *  - Real-time status overlays (available / occupied / reserved / maintenance)
 *  - Property panel: name, type, capacity, price, status, custom fields
 *  - Status legend with color key
 *  - Layer system (background, zones, items, labels, overlays)
 *  - Snap-to-grid and alignment guides
 *  - Multi-select, group move, copy/paste
 *  - Undo/redo (50 deep)
 *  - Save/load via Frappe DocType or JSON export
 *  - Live data binding (e.g., room status from DB)
 *  - Labels with auto-positioning
 *  - Minimap navigation for large plans
 *  - Print / export as PNG
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.FloorPlanDesigner.create('#el', { ... })
 *
 * @module frappe_visual/components/floor_plan_designer
 */

/* ── Constants ────────────────────────────────────────────────── */
const STATUS_COLORS = {
	available:   { fill: "rgba(16,185,129,0.25)",  stroke: "#10B981", label: "Available" },
	occupied:    { fill: "rgba(99,102,241,0.25)",   stroke: "#6366F1", label: "Occupied" },
	reserved:    { fill: "rgba(245,158,11,0.25)",   stroke: "#F59E0B", label: "Reserved" },
	maintenance: { fill: "rgba(239,68,68,0.25)",    stroke: "#EF4444", label: "Maintenance" },
	blocked:     { fill: "rgba(107,114,128,0.25)",  stroke: "#6B7280", label: "Blocked" },
	vip:         { fill: "rgba(168,85,247,0.25)",   stroke: "#A855F7", label: "VIP" },
	cleaning:    { fill: "rgba(14,165,233,0.25)",   stroke: "#0EA5E9", label: "Cleaning" },
};

const TOOLS = {
	select:  { label: "Select",  icon: "↖", cursor: "default" },
	pan:     { label: "Pan",     icon: "✥", cursor: "grab" },
	polygon: { label: "Draw Zone", icon: "⬡", cursor: "crosshair" },
	rect:    { label: "Draw Rect", icon: "▭", cursor: "crosshair" },
	door:    { label: "Entrance",  icon: "🚪", cursor: "crosshair" },
	place:   { label: "Place Item", icon: "📌", cursor: "copy" },
	label:   { label: "Label",    icon: "A", cursor: "text" },
};

const GRID_SIZE = 10;

export class FloorPlanDesigner {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("FloorPlanDesigner: container not found");

		this.opts = Object.assign({
			theme: "glass",
			width: null,          // auto = container width
			height: 600,
			backgroundImage: null,  // URL of floor plan image
			imageStretchMode: "cover", // cover | contain | stretch | original
			autoFitViewBox: true,  // auto-adjust viewBox to image aspect ratio
			bgOpacity: 0.85,       // background image opacity (0-1)
			minRecommendedResolution: { w: 1200, h: 800 }, // warn if below
			editable: true,
			showGrid: true,
			snapToGrid: true,
			gridSize: GRID_SIZE,
			showMinimap: true,
			showLegend: true,
			showLabels: true,
			showProperties: true,
			statuses: STATUS_COLORS,
			paletteItems: [],     // [{ type, label, icon, width, height, shape }]
			zones: [],            // saved zones (polygons)
			items: [],            // saved placed items
			doors: [],            // saved entrance markers
			labels: [],           // saved text labels
			onSave: null,         // callback(data)
			onChange: null,        // callback(data)
			doctype: null,        // Frappe DocType for saving
			docname: null,
		}, opts);

		// Internal state
		this._zones = JSON.parse(JSON.stringify(this.opts.zones));
		this._items = JSON.parse(JSON.stringify(this.opts.items));
		this._doors = JSON.parse(JSON.stringify(this.opts.doors));
		this._labels = JSON.parse(JSON.stringify(this.opts.labels));
		this._tool = "select";
		this._selected = null;      // { type: 'zone'|'item'|'door'|'label', id }
		this._drawingPoly = null;   // current polygon being drawn
		this._drawingRect = null;   // current rect being drawn
		this._placingItem = null;   // palette item being placed
		this._viewBox = { x: 0, y: 0, w: 1000, h: 700 };
		this._zoom = 1;
		this._isPanning = false;
		this._panStart = null;
		this._undoStack = [];
		this._redoStack = [];
		this._idCounter = Date.now();
		this._bgLoaded = false;

		this._init();
	}

	static create(container, opts = {}) {
		return new FloorPlanDesigner(container, opts);
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  INITIALIZATION                                           */
	/* ══════════════════════════════════════════════════════════ */
	_init() {
		this.container.classList.add("fv-fp", `fv-fp--${this.opts.theme}`);
		this.container.innerHTML = "";

		this._renderToolbar();
		this._renderMainArea();
		if (this.opts.showProperties) this._renderPropertiesPanel();
		if (this.opts.showLegend) this._renderLegend();

		this._setupKeyboard();
		this._loadBackground();
		this._redraw();
	}

	/* ── Unique ID Generator ──────────────────────────────────── */
	_uid() { return `fp_${++this._idCounter}`; }

	/* ══════════════════════════════════════════════════════════ */
	/*  TOOLBAR                                                  */
	/* ══════════════════════════════════════════════════════════ */
	_renderToolbar() {
		const bar = document.createElement("div");
		bar.className = "fv-fp-toolbar";

		// Tools
		const toolsDiv = document.createElement("div");
		toolsDiv.className = "fv-fp-tools";
		for (const [key, tool] of Object.entries(TOOLS)) {
			if (!this.opts.editable && key !== "select" && key !== "pan") continue;
			const btn = document.createElement("button");
			btn.className = `fv-fp-tool-btn ${key === this._tool ? "active" : ""}`;
			btn.dataset.tool = key;
			btn.title = __(tool.label);
			btn.innerHTML = `<span class="fv-fp-tool-icon">${tool.icon}</span>`;
			btn.addEventListener("click", () => this._setTool(key));
			toolsDiv.appendChild(btn);
		}
		bar.appendChild(toolsDiv);

		// Right actions
		const actions = document.createElement("div");
		actions.className = "fv-fp-actions";

		if (this.opts.editable) {
			actions.innerHTML = `
				<button class="fv-fp-act-btn" data-act="undo" title="${__("Undo")}">↩</button>
				<button class="fv-fp-act-btn" data-act="redo" title="${__("Redo")}">↪</button>
				<button class="fv-fp-act-btn" data-act="bg" title="${__("Change Background")}">🖼</button>
				<button class="fv-fp-act-btn" data-act="grid" title="${__("Toggle Grid")}">▦</button>
				<button class="fv-fp-act-btn" data-act="save" title="${__("Save")}">💾</button>
				<button class="fv-fp-act-btn" data-act="export" title="${__("Export PNG")}">📷</button>`;
		}
		actions.innerHTML += `
			<button class="fv-fp-act-btn" data-act="zoomin" title="${__("Zoom In")}">+</button>
			<button class="fv-fp-act-btn" data-act="zoomout" title="${__("Zoom Out")}">−</button>
			<button class="fv-fp-act-btn" data-act="fit" title="${__("Fit")}">⊡</button>`;
		bar.appendChild(actions);

		this.container.appendChild(bar);

		// Action handlers
		actions.querySelectorAll(".fv-fp-act-btn").forEach(btn => {
			btn.addEventListener("click", () => this._handleAction(btn.dataset.act));
		});
	}

	_setTool(toolName) {
		this._tool = toolName;
		this.container.querySelectorAll(".fv-fp-tool-btn").forEach(b =>
			b.classList.toggle("active", b.dataset.tool === toolName));
		const t = TOOLS[toolName];
		if (this._svgEl) this._svgEl.style.cursor = t?.cursor || "default";

		// Cancel any in-progress drawing
		if (toolName !== "polygon") this._cancelPolygon();
		if (toolName !== "rect") this._drawingRect = null;
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  MAIN SVG AREA                                            */
	/* ══════════════════════════════════════════════════════════ */
	_renderMainArea() {
		const wrapper = document.createElement("div");
		wrapper.className = "fv-fp-canvas-wrap";

		// Palette sidebar (drag-drop source)
		if (this.opts.editable && this.opts.paletteItems.length > 0) {
			wrapper.appendChild(this._buildPalette());
		}

		// SVG canvas
		const svgNS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgNS, "svg");
		svg.setAttribute("class", "fv-fp-svg");
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", this.opts.height);
		svg.setAttribute("viewBox", `${this._viewBox.x} ${this._viewBox.y} ${this._viewBox.w} ${this._viewBox.h}`);

		// Defs (grid pattern, clip paths, filters)
		const defs = document.createElementNS(svgNS, "defs");
		defs.innerHTML = `
			<pattern id="fv-fp-grid" width="${this.opts.gridSize}" height="${this.opts.gridSize}"
				patternUnits="userSpaceOnUse">
				<path d="M ${this.opts.gridSize} 0 L 0 0 0 ${this.opts.gridSize}"
					fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="0.5"/>
			</pattern>
			<filter id="fv-fp-shadow">
				<feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.15"/>
			</filter>
			<marker id="fv-fp-door-arrow" viewBox="0 0 10 10" refX="5" refY="5"
				markerWidth="6" markerHeight="6" orient="auto-start-reverse">
				<path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B"/>
			</marker>`;
		svg.appendChild(defs);

		// Layer: background
		this._layerBg = document.createElementNS(svgNS, "g");
		this._layerBg.setAttribute("class", "fv-fp-layer-bg");
		svg.appendChild(this._layerBg);

		// Layer: grid
		this._layerGrid = document.createElementNS(svgNS, "g");
		this._layerGrid.setAttribute("class", "fv-fp-layer-grid");
		if (this.opts.showGrid) {
			const gridRect = document.createElementNS(svgNS, "rect");
			gridRect.setAttribute("width", "100%");
			gridRect.setAttribute("height", "100%");
			gridRect.setAttribute("fill", "url(#fv-fp-grid)");
			this._layerGrid.appendChild(gridRect);
		}
		svg.appendChild(this._layerGrid);

		// Layer: zones (polygons)
		this._layerZones = document.createElementNS(svgNS, "g");
		this._layerZones.setAttribute("class", "fv-fp-layer-zones");
		svg.appendChild(this._layerZones);

		// Layer: items (placed objects)
		this._layerItems = document.createElementNS(svgNS, "g");
		this._layerItems.setAttribute("class", "fv-fp-layer-items");
		svg.appendChild(this._layerItems);

		// Layer: doors
		this._layerDoors = document.createElementNS(svgNS, "g");
		this._layerDoors.setAttribute("class", "fv-fp-layer-doors");
		svg.appendChild(this._layerDoors);

		// Layer: labels
		this._layerLabels = document.createElementNS(svgNS, "g");
		this._layerLabels.setAttribute("class", "fv-fp-layer-labels");
		svg.appendChild(this._layerLabels);

		// Layer: drawing preview (temp)
		this._layerDraw = document.createElementNS(svgNS, "g");
		this._layerDraw.setAttribute("class", "fv-fp-layer-draw");
		svg.appendChild(this._layerDraw);

		wrapper.appendChild(svg);
		this.container.appendChild(wrapper);
		this._svgEl = svg;
		this._wrapperEl = wrapper;

		// Event listeners
		svg.addEventListener("mousedown", (e) => this._onMouseDown(e));
		svg.addEventListener("mousemove", (e) => this._onMouseMove(e));
		svg.addEventListener("mouseup", (e) => this._onMouseUp(e));
		svg.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });
		svg.addEventListener("dblclick", (e) => this._onDblClick(e));
		svg.addEventListener("contextmenu", (e) => e.preventDefault());

		// Drag-drop from palette onto SVG
		svg.addEventListener("dragover", (e) => e.preventDefault());
		svg.addEventListener("drop", (e) => this._onDrop(e));
	}

	/* ── Background Image ─────────────────────────────────────── */
	_loadBackground() {
		if (!this.opts.backgroundImage) return;
		const svgNS = "http://www.w3.org/2000/svg";

		// Pre-load via HTML Image to detect natural dimensions
		const htmlImg = new Image();
		htmlImg.crossOrigin = "anonymous";
		htmlImg.onload = () => {
			const natW = htmlImg.naturalWidth;
			const natH = htmlImg.naturalHeight;
			this._bgNaturalSize = { w: natW, h: natH };

			// Decide stretch mode
			const mode = this.opts.imageStretchMode || "cover"; // cover | contain | stretch | original
			let imgX = 0, imgY = 0, imgW = this._viewBox.w, imgH = this._viewBox.h;
			const vbAspect = this._viewBox.w / this._viewBox.h;
			const imgAspect = natW / natH;

			if (mode === "contain") {
				// Fit inside viewBox preserving aspect ratio
				if (imgAspect > vbAspect) {
					imgW = this._viewBox.w;
					imgH = imgW / imgAspect;
					imgY = (this._viewBox.h - imgH) / 2;
				} else {
					imgH = this._viewBox.h;
					imgW = imgH * imgAspect;
					imgX = (this._viewBox.w - imgW) / 2;
				}
			} else if (mode === "cover") {
				// Fill viewBox (may crop) — default for floor plans
				if (imgAspect > vbAspect) {
					imgH = this._viewBox.h;
					imgW = imgH * imgAspect;
					imgX = (this._viewBox.w - imgW) / 2;
				} else {
					imgW = this._viewBox.w;
					imgH = imgW / imgAspect;
					imgY = (this._viewBox.h - imgH) / 2;
				}
			} else if (mode === "original") {
				// Use natural size, centered
				imgW = natW;
				imgH = natH;
				imgX = (this._viewBox.w - natW) / 2;
				imgY = (this._viewBox.h - natH) / 2;
			}
			// mode === "stretch": use full viewBox (imgX/Y=0, imgW/H=viewBox)

			const svgImg = document.createElementNS(svgNS, "image");
			svgImg.setAttributeNS("http://www.w3.org/1999/xlink", "href", this.opts.backgroundImage);
			svgImg.setAttribute("x", imgX);
			svgImg.setAttribute("y", imgY);
			svgImg.setAttribute("width", imgW);
			svgImg.setAttribute("height", imgH);
			svgImg.setAttribute("preserveAspectRatio", mode === "stretch" ? "none" : "xMidYMid slice");
			svgImg.setAttribute("opacity", this.opts.bgOpacity ?? 0.85);
			this._layerBg.appendChild(svgImg);
			this._bgImage = svgImg;
			this._bgLoaded = true;

			// Auto-adjust viewBox to match image when in "auto" mode
			if (this.opts.autoFitViewBox && mode !== "stretch") {
				this._viewBox.w = Math.max(imgW + 40, 400);
				this._viewBox.h = Math.max(imgH + 40, 300);
				this._viewBox.x = imgX - 20;
				this._viewBox.y = imgY - 20;
				this._updateViewBox();
				// Update SVG element height to match aspect
				const containerW = this.container.clientWidth || 900;
				const aspectH = containerW * (this._viewBox.h / this._viewBox.w);
				this._svgEl.setAttribute("height", Math.min(aspectH, window.innerHeight * 0.8));
			}

			// Show resolution info banner if image is low-res
			this._checkResolution(natW, natH);
		};
		htmlImg.onerror = () => {
			console.warn("FloorPlanDesigner: Failed to load background image");
			this._showImageError();
		};
		htmlImg.src = this.opts.backgroundImage;
	}

	/** Show a resolution recommendation if the image is too small */
	_checkResolution(natW, natH) {
		const minRecommended = this.opts.minRecommendedResolution || { w: 1200, h: 800 };
		if (natW < minRecommended.w || natH < minRecommended.h) {
			this._showResolutionWarning(natW, natH, minRecommended);
		}
	}

	_showResolutionWarning(natW, natH, rec) {
		const warn = document.createElement("div");
		warn.className = "fv-fp-resolution-warn";
		warn.innerHTML = `
			<span class="fv-fp-res-icon">⚠</span>
			<span class="fv-fp-res-text">
				${__("Image resolution")}: ${natW}×${natH}px —
				${__("Recommended minimum")}: ${rec.w}×${rec.h}px
			</span>
			<button class="fv-fp-res-dismiss" title="${__("Dismiss")}">✕</button>`;
		warn.querySelector(".fv-fp-res-dismiss").addEventListener("click", () => warn.remove());
		this.container.insertBefore(warn, this.container.children[1] || null);
		// Auto-dismiss after 8s
		setTimeout(() => warn?.remove(), 8000);
	}

	_showImageError() {
		const err = document.createElement("div");
		err.className = "fv-fp-resolution-warn fv-fp-resolution-warn--error";
		err.innerHTML = `
			<span class="fv-fp-res-icon">❌</span>
			<span class="fv-fp-res-text">${__("Failed to load floor plan image. Check the URL or upload a new image.")}</span>
			<button class="fv-fp-res-dismiss" title="${__("Dismiss")}">✕</button>`;
		err.querySelector(".fv-fp-res-dismiss").addEventListener("click", () => err.remove());
		this.container.insertBefore(err, this.container.children[1] || null);
	}

	setBackground(url, mode) {
		this.opts.backgroundImage = url;
		if (mode) this.opts.imageStretchMode = mode;
		while (this._layerBg.firstChild) this._layerBg.removeChild(this._layerBg.firstChild);
		// Remove old warnings
		this.container.querySelectorAll(".fv-fp-resolution-warn").forEach(e => e.remove());
		this._loadBackground();
	}

	/** Set background stretch mode and reload */
	setStretchMode(mode) {
		this.opts.imageStretchMode = mode;
		while (this._layerBg.firstChild) this._layerBg.removeChild(this._layerBg.firstChild);
		this._loadBackground();
	}

	/** Get background image natural dimensions */
	getBackgroundSize() {
		return this._bgNaturalSize || null;
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  PALETTE (drag-drop item source)                          */
	/* ══════════════════════════════════════════════════════════ */
	_buildPalette() {
		const pal = document.createElement("div");
		pal.className = "fv-fp-palette";
		pal.innerHTML = `<div class="fv-fp-pal-title">${__("Items")}</div>`;

		for (const item of this.opts.paletteItems) {
			const el = document.createElement("div");
			el.className = "fv-fp-pal-item";
			el.draggable = true;
			el.dataset.type = item.type;
			el.innerHTML = `
				<span class="fv-fp-pal-icon">${item.icon || "■"}</span>
				<span class="fv-fp-pal-label">${this._esc(__(item.label || item.type))}</span>`;
			el.addEventListener("dragstart", (e) => {
				e.dataTransfer.setData("application/fv-item", JSON.stringify(item));
				this._placingItem = item;
			});
			// Click to activate "place" tool
			el.addEventListener("click", () => {
				this._placingItem = item;
				this._setTool("place");
			});
			pal.appendChild(el);
		}
		return pal;
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  COORDINATE HELPERS                                       */
	/* ══════════════════════════════════════════════════════════ */
	_svgPoint(e) {
		const rect = this._svgEl.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width * this._viewBox.w + this._viewBox.x;
		const y = (e.clientY - rect.top) / rect.height * this._viewBox.h + this._viewBox.y;
		return this.opts.snapToGrid ? this._snap(x, y) : { x, y };
	}

	_snap(x, y) {
		const g = this.opts.gridSize;
		return { x: Math.round(x / g) * g, y: Math.round(y / g) * g };
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  MOUSE EVENTS                                             */
	/* ══════════════════════════════════════════════════════════ */
	_onMouseDown(e) {
		if (e.button === 1 || (e.button === 0 && this._tool === "pan")) {
			this._isPanning = true;
			this._panStart = { x: e.clientX, y: e.clientY, vx: this._viewBox.x, vy: this._viewBox.y };
			this._svgEl.style.cursor = "grabbing";
			return;
		}

		const pt = this._svgPoint(e);

		if (this._tool === "select") {
			this._trySelect(pt);
			if (this._selected) {
				this._dragStart = { ...pt, entity: this._getEntity(this._selected) };
			}
		} else if (this._tool === "polygon") {
			this._addPolyVertex(pt);
		} else if (this._tool === "rect") {
			this._startRect(pt);
		} else if (this._tool === "door") {
			this._placeDoor(pt);
		} else if (this._tool === "place") {
			this._placeItem(pt);
		} else if (this._tool === "label") {
			this._placeLabel(pt);
		}
	}

	_onMouseMove(e) {
		if (this._isPanning && this._panStart) {
			const dx = (e.clientX - this._panStart.x) / this._svgEl.getBoundingClientRect().width * this._viewBox.w;
			const dy = (e.clientY - this._panStart.y) / this._svgEl.getBoundingClientRect().height * this._viewBox.h;
			this._viewBox.x = this._panStart.vx - dx;
			this._viewBox.y = this._panStart.vy - dy;
			this._updateViewBox();
			return;
		}

		const pt = this._svgPoint(e);

		// Drag selected item
		if (this._tool === "select" && this._dragStart && this._selected) {
			const entity = this._dragStart.entity;
			if (entity && (this._selected.type === "item" || this._selected.type === "door" || this._selected.type === "label")) {
				const dx = pt.x - this._dragStart.x;
				const dy = pt.y - this._dragStart.y;
				entity.x = (this._dragStart.entity._origX ?? entity.x) + dx;
				entity.y = (this._dragStart.entity._origY ?? entity.y) + dy;
				this._redraw();
			}
		}

		// Preview polygon edge
		if (this._tool === "polygon" && this._drawingPoly && this._drawingPoly.points.length > 0) {
			this._updatePolyPreview(pt);
		}

		// Preview rect
		if (this._tool === "rect" && this._drawingRect) {
			this._drawingRect.x2 = pt.x;
			this._drawingRect.y2 = pt.y;
			this._updateRectPreview();
		}
	}

	_onMouseUp(e) {
		if (this._isPanning) {
			this._isPanning = false;
			this._panStart = null;
			this._svgEl.style.cursor = TOOLS[this._tool]?.cursor || "default";
			return;
		}

		// Finish drag — save undo
		if (this._dragStart && this._selected) {
			const entity = this._getEntity(this._selected);
			if (entity) {
				delete entity._origX;
				delete entity._origY;
				this._pushUndo();
				this._emitChange();
			}
			this._dragStart = null;
		}

		// Finish rect
		if (this._tool === "rect" && this._drawingRect) {
			this._finishRect();
		}
	}

	_onWheel(e) {
		e.preventDefault();
		const factor = e.deltaY > 0 ? 1.1 : 0.9;
		this._zoomBy(factor, e);
	}

	_onDblClick(e) {
		// Close polygon on double-click
		if (this._tool === "polygon" && this._drawingPoly && this._drawingPoly.points.length >= 3) {
			this._finishPolygon();
		}
		// Open properties on double-click in select mode
		if (this._tool === "select" && this._selected) {
			this._showProperties(this._selected);
		}
	}

	_onDrop(e) {
		e.preventDefault();
		const raw = e.dataTransfer.getData("application/fv-item");
		if (!raw) return;
		const itemDef = JSON.parse(raw);
		const pt = this._svgPoint(e);
		this._addItem(itemDef, pt);
		this._placingItem = null;
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  SELECTION                                                */
	/* ══════════════════════════════════════════════════════════ */
	_trySelect(pt) {
		// Try items first (topmost layer)
		for (const item of this._items) {
			if (this._pointInRect(pt, item)) {
				this._select({ type: "item", id: item.id });
				item._origX = item.x;
				item._origY = item.y;
				return;
			}
		}
		// Try doors
		for (const door of this._doors) {
			if (Math.hypot(pt.x - door.x, pt.y - door.y) < 15) {
				this._select({ type: "door", id: door.id });
				door._origX = door.x;
				door._origY = door.y;
				return;
			}
		}
		// Try zones (point-in-polygon)
		for (const zone of this._zones) {
			if (this._pointInPolygon(pt, zone.points)) {
				this._select({ type: "zone", id: zone.id });
				return;
			}
		}
		// Try labels
		for (const lbl of this._labels) {
			if (Math.hypot(pt.x - lbl.x, pt.y - lbl.y) < 20) {
				this._select({ type: "label", id: lbl.id });
				lbl._origX = lbl.x;
				lbl._origY = lbl.y;
				return;
			}
		}
		this._select(null);
	}

	_select(sel) {
		this._selected = sel;
		this._redraw();
		if (sel && this.opts.showProperties) this._showProperties(sel);
		else this._clearProperties();
	}

	_getEntity(sel) {
		if (!sel) return null;
		const arr = sel.type === "zone" ? this._zones
			: sel.type === "item" ? this._items
			: sel.type === "door" ? this._doors
			: this._labels;
		return arr.find(e => e.id === sel.id) || null;
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  POLYGON DRAWING                                          */
	/* ══════════════════════════════════════════════════════════ */
	_addPolyVertex(pt) {
		if (!this._drawingPoly) {
			this._drawingPoly = { points: [] };
		}
		const pts = this._drawingPoly.points;

		// Close if clicking near first point
		if (pts.length >= 3) {
			const first = pts[0];
			if (Math.hypot(pt.x - first.x, pt.y - first.y) < 12) {
				this._finishPolygon();
				return;
			}
		}
		pts.push(pt);
		this._updatePolyPreview(pt);
	}

	_finishPolygon() {
		if (!this._drawingPoly || this._drawingPoly.points.length < 3) {
			this._cancelPolygon();
			return;
		}
		const zone = {
			id: this._uid(),
			name: `${__("Zone")} ${this._zones.length + 1}`,
			type: "zone",
			points: this._drawingPoly.points,
			status: "available",
			capacity: 0,
			properties: {},
		};
		this._zones.push(zone);
		this._drawingPoly = null;
		this._clearDrawLayer();
		this._pushUndo();
		this._redraw();
		this._emitChange();
		this._select({ type: "zone", id: zone.id });
	}

	_cancelPolygon() {
		this._drawingPoly = null;
		this._clearDrawLayer();
	}

	_updatePolyPreview(pt) {
		this._clearDrawLayer();
		const svgNS = "http://www.w3.org/2000/svg";
		const pts = this._drawingPoly.points;

		// Draw completed edges
		const polyline = document.createElementNS(svgNS, "polyline");
		polyline.setAttribute("points", pts.map(p => `${p.x},${p.y}`).join(" "));
		polyline.setAttribute("fill", "rgba(99,102,241,0.1)");
		polyline.setAttribute("stroke", "#6366F1");
		polyline.setAttribute("stroke-width", "2");
		polyline.setAttribute("stroke-dasharray", "4 4");
		this._layerDraw.appendChild(polyline);

		// Preview line to cursor
		if (pts.length > 0) {
			const line = document.createElementNS(svgNS, "line");
			const last = pts[pts.length - 1];
			line.setAttribute("x1", last.x);
			line.setAttribute("y1", last.y);
			line.setAttribute("x2", pt.x);
			line.setAttribute("y2", pt.y);
			line.setAttribute("stroke", "#6366F1");
			line.setAttribute("stroke-width", "1");
			line.setAttribute("stroke-dasharray", "3 3");
			line.setAttribute("opacity", "0.6");
			this._layerDraw.appendChild(line);
		}

		// Vertex circles
		for (const p of pts) {
			const c = document.createElementNS(svgNS, "circle");
			c.setAttribute("cx", p.x);
			c.setAttribute("cy", p.y);
			c.setAttribute("r", "4");
			c.setAttribute("fill", "#6366F1");
			this._layerDraw.appendChild(c);
		}
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  RECTANGLE DRAWING (quick zone)                           */
	/* ══════════════════════════════════════════════════════════ */
	_startRect(pt) {
		this._drawingRect = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
	}

	_updateRectPreview() {
		this._clearDrawLayer();
		const r = this._drawingRect;
		const svgNS = "http://www.w3.org/2000/svg";
		const rect = document.createElementNS(svgNS, "rect");
		const x = Math.min(r.x1, r.x2), y = Math.min(r.y1, r.y2);
		const w = Math.abs(r.x2 - r.x1), h = Math.abs(r.y2 - r.y1);
		rect.setAttribute("x", x);
		rect.setAttribute("y", y);
		rect.setAttribute("width", w);
		rect.setAttribute("height", h);
		rect.setAttribute("fill", "rgba(99,102,241,0.1)");
		rect.setAttribute("stroke", "#6366F1");
		rect.setAttribute("stroke-width", "2");
		rect.setAttribute("stroke-dasharray", "4 4");
		this._layerDraw.appendChild(rect);
	}

	_finishRect() {
		const r = this._drawingRect;
		this._drawingRect = null;
		this._clearDrawLayer();
		const x1 = Math.min(r.x1, r.x2), y1 = Math.min(r.y1, r.y2);
		const x2 = Math.max(r.x1, r.x2), y2 = Math.max(r.y1, r.y2);
		if (Math.abs(x2 - x1) < 5 || Math.abs(y2 - y1) < 5) return;

		const zone = {
			id: this._uid(),
			name: `${__("Room")} ${this._zones.length + 1}`,
			type: "room",
			points: [
				{ x: x1, y: y1 }, { x: x2, y: y1 },
				{ x: x2, y: y2 }, { x: x1, y: y2 },
			],
			status: "available",
			capacity: 0,
			properties: {},
		};
		this._zones.push(zone);
		this._pushUndo();
		this._redraw();
		this._emitChange();
		this._select({ type: "zone", id: zone.id });
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  ITEM PLACEMENT                                           */
	/* ══════════════════════════════════════════════════════════ */
	_addItem(itemDef, pt) {
		const item = {
			id: this._uid(),
			type: itemDef.type,
			label: itemDef.label || itemDef.type,
			icon: itemDef.icon || "■",
			x: pt.x,
			y: pt.y,
			width: itemDef.width || 30,
			height: itemDef.height || 30,
			shape: itemDef.shape || "rect",
			status: "available",
			capacity: itemDef.capacity || 1,
			price: itemDef.price || 0,
			properties: {},
		};
		this._items.push(item);
		this._pushUndo();
		this._redraw();
		this._emitChange();
		this._select({ type: "item", id: item.id });
	}

	_placeItem(pt) {
		if (!this._placingItem) return;
		this._addItem(this._placingItem, pt);
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  DOOR / ENTRANCE MARKERS                                  */
	/* ══════════════════════════════════════════════════════════ */
	_placeDoor(pt) {
		const door = {
			id: this._uid(),
			x: pt.x,
			y: pt.y,
			angle: 0,
			name: `${__("Entrance")} ${this._doors.length + 1}`,
			type: "main",
		};
		this._doors.push(door);
		this._pushUndo();
		this._redraw();
		this._emitChange();
		this._select({ type: "door", id: door.id });
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  LABEL PLACEMENT                                          */
	/* ══════════════════════════════════════════════════════════ */
	_placeLabel(pt) {
		const text = prompt(__("Enter label text:"));
		if (!text) return;
		const lbl = {
			id: this._uid(),
			x: pt.x,
			y: pt.y,
			text: text,
			fontSize: 14,
			color: "#1e293b",
		};
		this._labels.push(lbl);
		this._pushUndo();
		this._redraw();
		this._emitChange();
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  RENDERING                                                */
	/* ══════════════════════════════════════════════════════════ */
	_redraw() {
		this._drawZones();
		this._drawItems();
		this._drawDoors();
		this._drawLabels();
	}

	_drawZones() {
		while (this._layerZones.firstChild) this._layerZones.removeChild(this._layerZones.firstChild);
		const svgNS = "http://www.w3.org/2000/svg";

		for (const zone of this._zones) {
			const st = this.opts.statuses[zone.status] || STATUS_COLORS.available;
			const isSelected = this._selected?.type === "zone" && this._selected?.id === zone.id;

			const g = document.createElementNS(svgNS, "g");
			g.setAttribute("class", `fv-fp-zone ${isSelected ? "fv-fp-zone--selected" : ""}`);
			g.dataset.id = zone.id;

			// Polygon
			const poly = document.createElementNS(svgNS, "polygon");
			poly.setAttribute("points", zone.points.map(p => `${p.x},${p.y}`).join(" "));
			poly.setAttribute("fill", st.fill);
			poly.setAttribute("stroke", isSelected ? "#6366F1" : st.stroke);
			poly.setAttribute("stroke-width", isSelected ? "3" : "2");
			g.appendChild(poly);

			// Label
			if (this.opts.showLabels && zone.name) {
				const center = this._polygonCenter(zone.points);
				const text = document.createElementNS(svgNS, "text");
				text.setAttribute("x", center.x);
				text.setAttribute("y", center.y);
				text.setAttribute("text-anchor", "middle");
				text.setAttribute("dominant-baseline", "central");
				text.setAttribute("class", "fv-fp-zone-label");
				text.setAttribute("font-size", "12");
				text.setAttribute("fill", st.stroke);
				text.textContent = zone.name;
				g.appendChild(text);

				// Status badge below name
				if (zone.status) {
					const badge = document.createElementNS(svgNS, "text");
					badge.setAttribute("x", center.x);
					badge.setAttribute("y", center.y + 16);
					badge.setAttribute("text-anchor", "middle");
					badge.setAttribute("dominant-baseline", "central");
					badge.setAttribute("font-size", "9");
					badge.setAttribute("fill", st.stroke);
					badge.setAttribute("opacity", "0.7");
					badge.textContent = __(st.label);
					g.appendChild(badge);
				}
			}

			this._layerZones.appendChild(g);
		}
	}

	_drawItems() {
		while (this._layerItems.firstChild) this._layerItems.removeChild(this._layerItems.firstChild);
		const svgNS = "http://www.w3.org/2000/svg";

		for (const item of this._items) {
			const st = this.opts.statuses[item.status] || STATUS_COLORS.available;
			const isSelected = this._selected?.type === "item" && this._selected?.id === item.id;
			const g = document.createElementNS(svgNS, "g");
			g.setAttribute("class", `fv-fp-item ${isSelected ? "fv-fp-item--selected" : ""}`);
			g.setAttribute("transform", `translate(${item.x}, ${item.y})`);
			g.dataset.id = item.id;

			const hw = item.width / 2, hh = item.height / 2;

			if (item.shape === "circle") {
				const c = document.createElementNS(svgNS, "circle");
				c.setAttribute("r", hw);
				c.setAttribute("fill", st.fill);
				c.setAttribute("stroke", isSelected ? "#6366F1" : st.stroke);
				c.setAttribute("stroke-width", isSelected ? "2.5" : "1.5");
				c.setAttribute("filter", "url(#fv-fp-shadow)");
				g.appendChild(c);
			} else {
				const rect = document.createElementNS(svgNS, "rect");
				rect.setAttribute("x", -hw);
				rect.setAttribute("y", -hh);
				rect.setAttribute("width", item.width);
				rect.setAttribute("height", item.height);
				rect.setAttribute("rx", "4");
				rect.setAttribute("fill", st.fill);
				rect.setAttribute("stroke", isSelected ? "#6366F1" : st.stroke);
				rect.setAttribute("stroke-width", isSelected ? "2.5" : "1.5");
				rect.setAttribute("filter", "url(#fv-fp-shadow)");
				g.appendChild(rect);
			}

			// Icon
			const icon = document.createElementNS(svgNS, "text");
			icon.setAttribute("text-anchor", "middle");
			icon.setAttribute("dominant-baseline", "central");
			icon.setAttribute("font-size", Math.min(item.width, item.height) * 0.5);
			icon.textContent = item.icon;
			g.appendChild(icon);

			// Tiny label below
			if (this.opts.showLabels) {
				const lbl = document.createElementNS(svgNS, "text");
				lbl.setAttribute("y", hh + 12);
				lbl.setAttribute("text-anchor", "middle");
				lbl.setAttribute("font-size", "9");
				lbl.setAttribute("fill", st.stroke);
				lbl.textContent = item.label;
				g.appendChild(lbl);
			}

			this._layerItems.appendChild(g);
		}
	}

	_drawDoors() {
		while (this._layerDoors.firstChild) this._layerDoors.removeChild(this._layerDoors.firstChild);
		const svgNS = "http://www.w3.org/2000/svg";

		for (const door of this._doors) {
			const isSelected = this._selected?.type === "door" && this._selected?.id === door.id;
			const g = document.createElementNS(svgNS, "g");
			g.setAttribute("class", `fv-fp-door ${isSelected ? "fv-fp-door--selected" : ""}`);
			g.setAttribute("transform", `translate(${door.x},${door.y}) rotate(${door.angle || 0})`);
			g.dataset.id = door.id;

			// Door arc
			const arc = document.createElementNS(svgNS, "path");
			arc.setAttribute("d", "M -12 0 A 12 12 0 0 1 12 0");
			arc.setAttribute("fill", "none");
			arc.setAttribute("stroke", "#F59E0B");
			arc.setAttribute("stroke-width", isSelected ? "3" : "2");
			g.appendChild(arc);

			// Arrow
			const arrow = document.createElementNS(svgNS, "line");
			arrow.setAttribute("x1", "0");
			arrow.setAttribute("y1", "0");
			arrow.setAttribute("x2", "0");
			arrow.setAttribute("y2", "-18");
			arrow.setAttribute("stroke", "#F59E0B");
			arrow.setAttribute("stroke-width", "2");
			arrow.setAttribute("marker-end", "url(#fv-fp-door-arrow)");
			g.appendChild(arrow);

			// Label
			const lbl = document.createElementNS(svgNS, "text");
			lbl.setAttribute("y", "16");
			lbl.setAttribute("text-anchor", "middle");
			lbl.setAttribute("font-size", "9");
			lbl.setAttribute("fill", "#F59E0B");
			lbl.textContent = door.name;
			g.appendChild(lbl);

			this._layerDoors.appendChild(g);
		}
	}

	_drawLabels() {
		while (this._layerLabels.firstChild) this._layerLabels.removeChild(this._layerLabels.firstChild);
		const svgNS = "http://www.w3.org/2000/svg";

		for (const lbl of this._labels) {
			const isSelected = this._selected?.type === "label" && this._selected?.id === lbl.id;
			const text = document.createElementNS(svgNS, "text");
			text.setAttribute("x", lbl.x);
			text.setAttribute("y", lbl.y);
			text.setAttribute("text-anchor", "middle");
			text.setAttribute("font-size", lbl.fontSize || 14);
			text.setAttribute("fill", lbl.color || "#1e293b");
			text.setAttribute("class", `fv-fp-label-text ${isSelected ? "fv-fp-label--selected" : ""}`);
			text.textContent = lbl.text;
			this._layerLabels.appendChild(text);
		}
	}

	_clearDrawLayer() {
		while (this._layerDraw.firstChild) this._layerDraw.removeChild(this._layerDraw.firstChild);
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  PROPERTIES PANEL                                         */
	/* ══════════════════════════════════════════════════════════ */
	_renderPropertiesPanel() {
		const panel = document.createElement("div");
		panel.className = "fv-fp-props";
		panel.innerHTML = `<div class="fv-fp-props-title">${__("Properties")}</div>
			<div class="fv-fp-props-body"><p class="fv-fp-props-hint">${__("Select an element to edit its properties")}</p></div>`;
		this._wrapperEl.appendChild(panel);
		this._propsPanel = panel;
	}

	_showProperties(sel) {
		if (!this._propsPanel) return;
		const entity = this._getEntity(sel);
		if (!entity) return;

		const body = this._propsPanel.querySelector(".fv-fp-props-body");
		let html = "";

		// Common fields
		html += this._propField("name", __("Name"), entity.name || entity.label || entity.text || "", "text");

		if (sel.type === "zone" || sel.type === "item") {
			html += this._propField("status", __("Status"), entity.status || "available", "select",
				Object.entries(this.opts.statuses).map(([k, v]) => ({ value: k, label: __(v.label) })));
			html += this._propField("capacity", __("Capacity"), entity.capacity || 0, "number");
		}

		if (sel.type === "item") {
			html += this._propField("price", __("Price"), entity.price || 0, "number");
			html += this._propField("type", __("Type"), entity.type || "", "text");
		}

		if (sel.type === "door") {
			html += this._propField("angle", __("Angle"), entity.angle || 0, "number");
			html += this._propField("type", __("Type"), entity.type || "main", "select",
				[{ value: "main", label: __("Main") }, { value: "emergency", label: __("Emergency") },
				 { value: "service", label: __("Service") }, { value: "staff", label: __("Staff") }]);
		}

		if (sel.type === "label") {
			html += this._propField("fontSize", __("Font Size"), entity.fontSize || 14, "number");
			html += this._propField("color", __("Color"), entity.color || "#1e293b", "color");
		}

		// Delete button
		html += `<button class="fv-fp-prop-delete">${__("Delete")}</button>`;

		body.innerHTML = html;

		// Event bindings
		body.querySelectorAll(".fv-fp-prop-input").forEach(inp => {
			inp.addEventListener("change", () => {
				const field = inp.dataset.field;
				let val = inp.type === "number" ? parseFloat(inp.value) : inp.value;
				entity[field] = val;
				// Special: update name/label/text
				if (field === "name") {
					if (entity.label !== undefined) entity.label = val;
					if (entity.text !== undefined) entity.text = val;
				}
				this._pushUndo();
				this._redraw();
				this._emitChange();
			});
		});

		body.querySelector(".fv-fp-prop-delete")?.addEventListener("click", () => {
			this._deleteEntity(sel);
		});
	}

	_propField(name, label, value, type, options) {
		let input;
		if (type === "select" && options) {
			input = `<select class="fv-fp-prop-input" data-field="${name}">
				${options.map(o => `<option value="${o.value}" ${o.value === value ? "selected" : ""}>${o.label}</option>`).join("")}
			</select>`;
		} else if (type === "color") {
			input = `<input type="color" class="fv-fp-prop-input" data-field="${name}" value="${this._esc(String(value))}">`;
		} else {
			input = `<input type="${type}" class="fv-fp-prop-input" data-field="${name}" value="${this._esc(String(value))}">`;
		}
		return `<div class="fv-fp-prop-row">
			<label class="fv-fp-prop-label">${label}</label>
			${input}
		</div>`;
	}

	_clearProperties() {
		if (!this._propsPanel) return;
		const body = this._propsPanel.querySelector(".fv-fp-props-body");
		body.innerHTML = `<p class="fv-fp-props-hint">${__("Select an element to edit its properties")}</p>`;
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  DELETE                                                   */
	/* ══════════════════════════════════════════════════════════ */
	_deleteEntity(sel) {
		if (sel.type === "zone") this._zones = this._zones.filter(z => z.id !== sel.id);
		else if (sel.type === "item") this._items = this._items.filter(i => i.id !== sel.id);
		else if (sel.type === "door") this._doors = this._doors.filter(d => d.id !== sel.id);
		else if (sel.type === "label") this._labels = this._labels.filter(l => l.id !== sel.id);
		this._selected = null;
		this._pushUndo();
		this._redraw();
		this._clearProperties();
		this._emitChange();
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  ZOOM / PAN                                               */
	/* ══════════════════════════════════════════════════════════ */
	_zoomBy(factor, e) {
		const old = { ...this._viewBox };
		const newW = old.w * factor;
		const newH = old.h * factor;

		// Zoom toward cursor position
		if (e) {
			const rect = this._svgEl.getBoundingClientRect();
			const mx = (e.clientX - rect.left) / rect.width;
			const my = (e.clientY - rect.top) / rect.height;
			this._viewBox.x = old.x + (old.w - newW) * mx;
			this._viewBox.y = old.y + (old.h - newH) * my;
		}

		this._viewBox.w = newW;
		this._viewBox.h = newH;
		this._zoom = 1000 / newW;
		this._updateViewBox();
	}

	_updateViewBox() {
		this._svgEl.setAttribute("viewBox",
			`${this._viewBox.x} ${this._viewBox.y} ${this._viewBox.w} ${this._viewBox.h}`);
	}

	_fitView() {
		this._viewBox = { x: -20, y: -20, w: 1040, h: 740 };
		this._zoom = 1;
		this._updateViewBox();
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  UNDO / REDO                                              */
	/* ══════════════════════════════════════════════════════════ */
	_pushUndo() {
		this._undoStack.push(this._snapshot());
		if (this._undoStack.length > 50) this._undoStack.shift();
		this._redoStack = [];
	}

	_undo() {
		if (this._undoStack.length === 0) return;
		this._redoStack.push(this._snapshot());
		this._restore(this._undoStack.pop());
	}

	_redo() {
		if (this._redoStack.length === 0) return;
		this._undoStack.push(this._snapshot());
		this._restore(this._redoStack.pop());
	}

	_snapshot() {
		return JSON.stringify({
			zones: this._zones,
			items: this._items,
			doors: this._doors,
			labels: this._labels,
		});
	}

	_restore(snap) {
		const data = JSON.parse(snap);
		this._zones = data.zones;
		this._items = data.items;
		this._doors = data.doors;
		this._labels = data.labels;
		this._selected = null;
		this._clearProperties();
		this._redraw();
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  ACTIONS                                                  */
	/* ══════════════════════════════════════════════════════════ */
	_handleAction(act) {
		switch (act) {
			case "undo": this._undo(); break;
			case "redo": this._redo(); break;
			case "bg": this._promptBackground(); break;
			case "grid":
				this.opts.showGrid = !this.opts.showGrid;
				this._layerGrid.style.display = this.opts.showGrid ? "" : "none";
				break;
			case "save": this.save(); break;
			case "export": this.exportPNG(); break;
			case "zoomin": this._zoomBy(0.8); break;
			case "zoomout": this._zoomBy(1.25); break;
			case "fit": this._fitView(); break;
		}
	}

	_promptBackground() {
		// Use Frappe's built-in file uploader if available, else fallback to prompt
		if (typeof frappe !== "undefined" && frappe.ui && frappe.ui.FileUploader) {
			const dialog = new frappe.ui.Dialog({
				title: __("Set Floor Plan Background"),
				fields: [
					{
						fieldname: "source",
						label: __("Image Source"),
						fieldtype: "Select",
						options: [__("Upload Image"), __("Enter URL")].join("\n"),
						default: __("Upload Image"),
						change: () => {
							const v = dialog.get_value("source");
							dialog.set_df_property("url", "hidden", v === __("Upload Image") ? 1 : 0);
							dialog.set_df_property("upload_section", "hidden", v === __("Enter URL") ? 1 : 0);
						}
					},
					{ fieldname: "upload_section", fieldtype: "Section Break", label: __("Upload") },
					{ fieldname: "image", fieldtype: "Attach Image", label: __("Floor Plan Image") },
					{ fieldname: "url_section", fieldtype: "Section Break", label: __("URL"), hidden: 1 },
					{ fieldname: "url", fieldtype: "Data", label: __("Image URL"), hidden: 1 },
					{ fieldname: "options_section", fieldtype: "Section Break", label: __("Display Options") },
					{
						fieldname: "stretch_mode",
						label: __("Stretch Mode"),
						fieldtype: "Select",
						options: "cover\ncontain\nstretch\noriginal",
						default: this.opts.imageStretchMode || "cover",
						description: __("cover = fill (may crop) · contain = fit inside · stretch = distort to fill · original = natural size")
					},
					{
						fieldname: "opacity",
						label: __("Opacity"),
						fieldtype: "Float",
						default: this.opts.bgOpacity ?? 0.85,
						description: __("Background image opacity (0.0 – 1.0)")
					},
					{
						fieldname: "info",
						fieldtype: "HTML",
						options: `<div style="padding:8px;background:#f0f9ff;border-radius:8px;margin-top:8px;font-size:12px">
							<b>${__("Recommended Resolution")}:</b> ${this.opts.minRecommendedResolution?.w || 1200}×${this.opts.minRecommendedResolution?.h || 800}px ${__("or higher")}<br>
							<b>${__("Best formats")}:</b> PNG, SVG, JPEG<br>
							<b>${__("Tip")}:</b> ${__("Use high-resolution blueprint/CAD exports for best results")}
						</div>`
					}
				],
				primary_action_label: __("Apply"),
				primary_action: (values) => {
					const imgUrl = values.source === __("Upload Image")
						? values.image
						: values.url;
					if (imgUrl) {
						this.opts.bgOpacity = Math.max(0, Math.min(1, values.opacity || 0.85));
						this.setBackground(imgUrl, values.stretch_mode);
					}
					dialog.hide();
				}
			});
			dialog.show();
		} else {
			const url = prompt(__("Enter floor plan image URL (or /api/method/... for uploaded file):"));
			if (url) this.setBackground(url);
		}
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  LEGEND                                                   */
	/* ══════════════════════════════════════════════════════════ */
	_renderLegend() {
		const legend = document.createElement("div");
		legend.className = "fv-fp-legend";
		legend.innerHTML = Object.entries(this.opts.statuses).map(([key, s]) =>
			`<span class="fv-fp-legend-item">
				<span class="fv-fp-legend-dot" style="background:${s.stroke}"></span>
				${__(s.label)}
			</span>`
		).join("");
		this.container.appendChild(legend);
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  KEYBOARD                                                 */
	/* ══════════════════════════════════════════════════════════ */
	_setupKeyboard() {
		this.container.setAttribute("tabindex", "0");
		this.container.addEventListener("keydown", (e) => {
			if (e.key === "Delete" || e.key === "Backspace") {
				if (this._selected) { this._deleteEntity(this._selected); e.preventDefault(); }
			} else if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
				this._undo(); e.preventDefault();
			} else if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
				this._redo(); e.preventDefault();
			} else if (e.key === "Escape") {
				this._cancelPolygon();
				this._drawingRect = null;
				this._clearDrawLayer();
				this._select(null);
				this._setTool("select");
			} else if (e.key === "g") {
				this.opts.showGrid = !this.opts.showGrid;
				this._layerGrid.style.display = this.opts.showGrid ? "" : "none";
			}
		});
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  SAVE / LOAD / EXPORT                                     */
	/* ══════════════════════════════════════════════════════════ */
	getData() {
		return {
			backgroundImage: this.opts.backgroundImage,
			zones: this._zones,
			items: this._items,
			doors: this._doors,
			labels: this._labels,
		};
	}

	setData(data) {
		if (data.backgroundImage) this.setBackground(data.backgroundImage);
		if (data.zones) this._zones = data.zones;
		if (data.items) this._items = data.items;
		if (data.doors) this._doors = data.doors;
		if (data.labels) this._labels = data.labels;
		this._redraw();
	}

	async save() {
		const data = this.getData();
		if (this.opts.onSave) {
			await this.opts.onSave(data);
		}
		if (this.opts.doctype && this.opts.docname) {
			try {
				await frappe.xcall("frappe.client.set_value", {
					doctype: this.opts.doctype,
					name: this.opts.docname,
					fieldname: "floor_plan_data",
					value: JSON.stringify(data),
				});
				frappe.show_alert({ message: __("Floor plan saved"), indicator: "green" });
			} catch (e) {
				frappe.show_alert({ message: __("Save failed"), indicator: "red" });
				console.error("FloorPlanDesigner: save error", e);
			}
		}
	}

	async loadFromDoc(doctype, docname, fieldname = "floor_plan_data") {
		try {
			const doc = await frappe.xcall("frappe.client.get_value", {
				doctype, filters: { name: docname }, fieldname,
			});
			if (doc?.[fieldname]) {
				this.setData(JSON.parse(doc[fieldname]));
			}
		} catch (e) {
			console.error("FloorPlanDesigner: load error", e);
		}
	}

	exportJSON() {
		const blob = new Blob([JSON.stringify(this.getData(), null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `floor_plan_${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	exportPNG() {
		const svgData = new XMLSerializer().serializeToString(this._svgEl);
		const canvas = document.createElement("canvas");
		canvas.width = this._viewBox.w * 2;
		canvas.height = this._viewBox.h * 2;
		const ctx = canvas.getContext("2d");
		const img = new Image();
		img.onload = () => {
			ctx.fillStyle = "#fff";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			const a = document.createElement("a");
			a.download = `floor_plan_${Date.now()}.png`;
			a.href = canvas.toDataURL("image/png");
			a.click();
		};
		img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  LIVE STATUS UPDATE                                       */
	/* ══════════════════════════════════════════════════════════ */
	updateStatus(entityId, status) {
		const entity = [...this._zones, ...this._items].find(e => e.id === entityId);
		if (entity) {
			entity.status = status;
			this._redraw();
		}
	}

	updateStatuses(updates) {
		for (const [id, status] of Object.entries(updates)) {
			this.updateStatus(id, status);
		}
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  GEOMETRY HELPERS                                         */
	/* ══════════════════════════════════════════════════════════ */
	_pointInPolygon(pt, polygon) {
		let inside = false;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const xi = polygon[i].x, yi = polygon[i].y;
			const xj = polygon[j].x, yj = polygon[j].y;
			if (((yi > pt.y) !== (yj > pt.y)) &&
				(pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) {
				inside = !inside;
			}
		}
		return inside;
	}

	_pointInRect(pt, item) {
		const hw = item.width / 2, hh = item.height / 2;
		return pt.x >= item.x - hw && pt.x <= item.x + hw &&
			   pt.y >= item.y - hh && pt.y <= item.y + hh;
	}

	_polygonCenter(points) {
		const n = points.length;
		return {
			x: points.reduce((s, p) => s + p.x, 0) / n,
			y: points.reduce((s, p) => s + p.y, 0) / n,
		};
	}

	/* ══════════════════════════════════════════════════════════ */
	/*  UTILITY                                                  */
	/* ══════════════════════════════════════════════════════════ */
	_emitChange() {
		if (this.opts.onChange) this.opts.onChange(this.getData());
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-fp", `fv-fp--${this.opts.theme}`);
	}
}
