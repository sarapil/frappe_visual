// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * FloorPlanEditor — Complete pre-assembled 2D floor plan editor
 * ===============================================================
 * Composes Canvas2DEngine + DrawingTools + SnapEngine + Panels
 * into a full-featured floor plan editor with optional 3D preview.
 *
 * Usage:
 *   const editor = new FloorPlanEditor('#container', { ... });
 *   await editor.init();
 */

import { Canvas2DEngine } from "../core/canvas_2d_engine.js";
import { DrawingTools } from "../tools/drawing_tools.js";
import { SnapEngine } from "../tools/snap_engine.js";
import { CatalogPanel } from "../panels/catalog_panel.js";
import { PropertiesPanel } from "../panels/properties_panel.js";
import { ToolbarPanel } from "../panels/toolbar_panel.js";

export class FloorPlanEditor {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			tools: ["select", "wall", "rect", "door", "window", "measure", "text", "erase"],
			grid: { size: 10, snap: true },
			units: "cm",
			maxUndo: 50,
			catalog: null,
			propertyFields: [],
			showToolbar: true,
			showCatalog: true,
			showProperties: true,
			enable3DPreview: true,
			onSave: null,
			onLoad: null,
		}, opts);

		this.engine = null;
		this.drawingTools = null;
		this.snapEngine = null;
		this.toolbar = null;
		this.catalogPanel = null;
		this.propertiesPanel = null;

		this._scene = { walls: [], objects: [], annotations: [], meta: { units: this.opts.units, gridSize: this.opts.grid.size } };
		this._undoStack = [];
		this._redoStack = [];
		this._selectedObject = null;
	}

	async init() {
		this._buildLayout();
		this._initEngine();
		this._initTools();
		await this._initPanels();
		this._pushUndo();
		return this;
	}

	_buildLayout() {
		this.container.classList.add("fv-floor-plan-editor");
		this.container.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:hidden;";
		this.container.innerHTML = "";

		// Toolbar row
		if (this.opts.showToolbar) {
			this._toolbarContainer = document.createElement("div");
			this._toolbarContainer.className = "fv-fpe-toolbar";
			this.container.appendChild(this._toolbarContainer);
		}

		// Main area: catalog | canvas | properties
		const main = document.createElement("div");
		main.className = "fv-fpe-main";
		main.style.cssText = "display:flex;flex:1;overflow:hidden;";
		this.container.appendChild(main);

		if (this.opts.showCatalog) {
			this._catalogContainer = document.createElement("div");
			this._catalogContainer.className = "fv-fpe-catalog";
			this._catalogContainer.style.cssText = "width:200px;border-inline-end:1px solid var(--border-color, #e0e0e0);overflow-y:auto;padding:8px;flex-shrink:0;";
			main.appendChild(this._catalogContainer);
		}

		this._canvasContainer = document.createElement("div");
		this._canvasContainer.className = "fv-fpe-canvas";
		this._canvasContainer.style.cssText = "flex:1;position:relative;overflow:hidden;";
		main.appendChild(this._canvasContainer);

		if (this.opts.showProperties) {
			this._propertiesContainer = document.createElement("div");
			this._propertiesContainer.className = "fv-fpe-properties";
			this._propertiesContainer.style.cssText = "width:220px;border-inline-start:1px solid var(--border-color, #e0e0e0);overflow-y:auto;flex-shrink:0;";
			main.appendChild(this._propertiesContainer);
		}
	}

	_initEngine() {
		this.engine = new Canvas2DEngine(this._canvasContainer, {
			gridSize: this.opts.grid.size,
			showGrid: true,
			units: this.opts.units,
		});
		this.engine.init();

		// Register custom layer for scene drawing
		this.engine.addLayer("scene", (ctx, viewport) => this._renderScene(ctx, viewport));
		this.engine.addLayer("preview", (ctx, viewport) => this._renderPreview(ctx, viewport));
	}

	_initTools() {
		this.snapEngine = new SnapEngine({
			gridSize: this.opts.grid.size,
			snapDistance: 8,
			gridSnap: this.opts.grid.snap,
		});

		this.drawingTools = new DrawingTools(this.engine, {
			defaultTool: "select",
			snapEnabled: this.opts.grid.snap,
		});

		// Wire tool events to scene mutations
		this.drawingTools.on?.("wall:create", (data) => {
			this._scene.walls.push({ ...data, id: this._nextId() });
			this._pushUndo();
			this.engine.render();
		});

		this.drawingTools.on?.("object:create", (data) => {
			this._scene.objects.push({ ...data, id: this._nextId() });
			this._pushUndo();
			this.engine.render();
		});

		this.drawingTools.on?.("select:end", (pt) => {
			this._selectAt(pt);
		});
	}

	async _initPanels() {
		if (this.opts.showToolbar && this._toolbarContainer) {
			this.toolbar = new ToolbarPanel(this._toolbarContainer, {
				tools: this.opts.tools,
				onToolChange: (tool) => this.drawingTools.setTool(tool),
				onAction: (action) => this._handleAction(action),
			});
			this.toolbar.init();
		}

		if (this.opts.showCatalog && this._catalogContainer) {
			this.catalogPanel = new CatalogPanel(this._catalogContainer, {
				...this.opts.catalog,
				onItemClick: (item) => this._placeItem(item),
			});
			await this.catalogPanel.init();
		}

		if (this.opts.showProperties && this._propertiesContainer) {
			this.propertiesPanel = new PropertiesPanel(this._propertiesContainer, {
				fields: this.opts.propertyFields,
				onChange: (obj, field, value) => {
					this._pushUndo();
					this.engine.render();
				},
				onDelete: (obj) => this._deleteObject(obj),
			});
			this.propertiesPanel.init();
		}
	}

	// ── Scene ──────────────────────────────────────────

	getScene() {
		return JSON.parse(JSON.stringify(this._scene));
	}

	loadScene(data) {
		this._scene = typeof data === "string" ? JSON.parse(data) : JSON.parse(JSON.stringify(data));
		this._undoStack = [];
		this._redoStack = [];
		this._pushUndo();
		this.propertiesPanel?.clearSelection();
		this.engine.render();
	}

	// ── Undo/Redo ──────────────────────────────────────

	_pushUndo() {
		const snapshot = JSON.stringify(this._scene);
		this._undoStack.push(snapshot);
		if (this._undoStack.length > this.opts.maxUndo) this._undoStack.shift();
		this._redoStack = [];
	}

	undo() {
		if (this._undoStack.length <= 1) return;
		this._redoStack.push(this._undoStack.pop());
		this._scene = JSON.parse(this._undoStack[this._undoStack.length - 1]);
		this.engine.render();
	}

	redo() {
		if (!this._redoStack.length) return;
		const snapshot = this._redoStack.pop();
		this._undoStack.push(snapshot);
		this._scene = JSON.parse(snapshot);
		this.engine.render();
	}

	// ── Rendering ──────────────────────────────────────

	_renderScene(ctx, viewport) {
		// Walls
		ctx.strokeStyle = "#333";
		ctx.lineWidth = 4 / viewport.zoom;
		for (const wall of this._scene.walls) {
			ctx.beginPath();
			ctx.moveTo(wall.start.x, wall.start.y);
			ctx.lineTo(wall.end.x, wall.end.y);
			ctx.stroke();
		}

		// Objects
		for (const obj of this._scene.objects) {
			const isSelected = this._selectedObject?.id === obj.id;
			ctx.save();
			ctx.translate(obj.x, obj.y);
			if (obj.rotation) ctx.rotate(obj.rotation);

			ctx.fillStyle = isSelected ? "rgba(99, 102, 241, 0.3)" : "rgba(100, 116, 139, 0.2)";
			ctx.strokeStyle = isSelected ? "#6366f1" : "#94a3b8";
			ctx.lineWidth = (isSelected ? 2 : 1) / viewport.zoom;
			ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
			ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);

			// Label
			if (obj.label) {
				ctx.fillStyle = "#475569";
				ctx.font = `${10 / viewport.zoom}px system-ui`;
				ctx.textAlign = "center";
				ctx.fillText(obj.label, 0, obj.height / 2 + 12 / viewport.zoom);
			}
			ctx.restore();
		}

		// Annotations
		ctx.fillStyle = "#6366f1";
		ctx.font = `${12 / viewport.zoom}px system-ui`;
		for (const ann of this._scene.annotations || []) {
			ctx.fillText(ann.text, ann.x, ann.y);
		}
	}

	_renderPreview(ctx, viewport) {
		if (this.drawingTools?._context?.preview) {
			const p = this.drawingTools._context.preview;
			ctx.strokeStyle = p.color || "#6366f1";
			ctx.lineWidth = (p.width || 2) / viewport.zoom;
			ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
			ctx.beginPath();
			ctx.moveTo(p.start.x, p.start.y);
			ctx.lineTo(p.end.x, p.end.y);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	}

	// ── Selection / Interaction ────────────────────────

	_selectAt(point) {
		this._selectedObject = null;
		for (const obj of this._scene.objects) {
			const dx = point.x - obj.x;
			const dy = point.y - obj.y;
			if (Math.abs(dx) <= obj.width / 2 && Math.abs(dy) <= obj.height / 2) {
				this._selectedObject = obj;
				break;
			}
		}
		this.propertiesPanel?.setObject(this._selectedObject);
		this.engine.render();
	}

	_placeItem(item) {
		const obj = {
			id: this._nextId(),
			type: "component",
			label: item.label,
			x: 0, y: 0,
			width: item.width || 60,
			height: item.height || 60,
			rotation: 0,
			catalogItem: item.id,
			modelUrl: item.modelUrl || null,
		};
		this._scene.objects.push(obj);
		this._pushUndo();
		this._selectedObject = obj;
		this.propertiesPanel?.setObject(obj);
		this.engine.render();
	}

	_deleteObject(obj) {
		this._scene.objects = this._scene.objects.filter(o => o.id !== obj.id);
		this._scene.walls = this._scene.walls.filter(w => w.id !== obj.id);
		this._selectedObject = null;
		this.propertiesPanel?.clearSelection();
		this._pushUndo();
		this.engine.render();
	}

	// ── Actions ────────────────────────────────────────

	_handleAction(action) {
		switch (action) {
			case "undo": this.undo(); break;
			case "redo": this.redo(); break;
			case "zoom-in": this.engine.zoomBy(1.2); break;
			case "zoom-out": this.engine.zoomBy(0.8); break;
			case "zoom-fit": this.engine.zoomToFit?.(); break;
			case "save":
				if (this.opts.onSave) this.opts.onSave(this.getScene());
				break;
			case "preview-3d":
				this.preview3D();
				break;
		}
	}

	async preview3D() {
		if (!this.opts.enable3DPreview) return;
		try {
			const { FloorPlan3D } = await import("../../three/views/floor_plan_3d.js");
			const modal = document.createElement("div");
			modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;z-index:1060;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;";

			const viewer = document.createElement("div");
			viewer.style.cssText = "width:90vw;height:80vh;background:#1a1a2e;border-radius:8px;overflow:hidden;position:relative;";
			modal.appendChild(viewer);

			const closeBtn = document.createElement("button");
			closeBtn.style.cssText = "position:absolute;top:10px;right:10px;z-index:10;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:18px;";
			closeBtn.innerHTML = "✕";
			closeBtn.addEventListener("click", () => {
				fp?.dispose?.();
				modal.remove();
			});
			viewer.appendChild(closeBtn);

			document.body.appendChild(modal);

			const fp = new FloorPlan3D(viewer, {
				floorPlan: this._scene,
				wallHeight: 2.8,
				lighting: "interior",
			});
			await fp.init();
		} catch (e) {
			frappe.show_alert?.({ message: __("3D preview requires the 3D engine bundle"), indicator: "orange" });
		}
	}

	// ── Helpers ─────────────────────────────────────────

	_nextId() {
		this._scene._idCounter = (this._scene._idCounter || 0) + 1;
		return `obj_${this._scene._idCounter}`;
	}

	dispose() {
		this.engine?.dispose?.();
		this.catalogPanel?.dispose?.();
		this.propertiesPanel?.dispose?.();
		this.toolbar?.dispose?.();
		this.container.innerHTML = "";
	}
}
