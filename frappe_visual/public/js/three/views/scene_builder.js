// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * SceneBuilder — Drag-and-drop 3D scene composition editor
 * =========================================================
 * Combines ThreeEngine with a catalog panel and properties panel
 * for interactive 3D scene building.
 */

import { ThreeEngine } from "../core/three_engine.js";
import { SceneGraph3D } from "../core/scene_graph_3d.js";
import { SceneControls } from "../core/scene_controls.js";

export class SceneBuilder {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			catalog: [],
			lighting: "studio",
			background: "#f0f0f0",
			grid: true,
			gridSize: 1,
			snap: true,
			snapSize: 0.25,
			onSave: null,
			sceneData: null,
		}, opts);
		this.engine = null;
		this.controls = null;
		this.sceneGraph = new SceneGraph3D(this.opts.sceneData || {});
		this._objectMap = new Map();
	}

	async init() {
		this._buildUI();
		this.engine = new ThreeEngine(this._viewportEl, {
			antialias: true,
			shadows: true,
			background: this.opts.background,
			lighting: this.opts.lighting,
			controls: { type: "orbit", damping: true },
		});
		await this.engine.init();

		this.controls = new SceneControls(this.engine);

		if (this.opts.grid) this._addGrid();
		if (this.opts.sceneData) await this._loadScene();

		this.controls.onSelect = (obj) => this._onObjectSelected(obj);
		this._setupCatalogDrag();

		return this;
	}

	_buildUI() {
		this.container.classList.add("fv-scene-builder");
		this.container.style.cssText = "display:flex;width:100%;height:100%;position:relative;";

		// Catalog sidebar
		this._catalogEl = document.createElement("div");
		this._catalogEl.className = "fv-sb-catalog";
		this._catalogEl.style.cssText = "width:220px;overflow-y:auto;border-inline-end:1px solid var(--border-color,#e0e0e0);padding:8px;";
		this._catalogEl.innerHTML = `<h4 style="margin:0 0 8px">${__("Catalog")}</h4>`;
		this.opts.catalog.forEach(item => {
			const el = document.createElement("div");
			el.className = "fv-sb-catalog-item fv-fx-hover-lift";
			el.draggable = true;
			el.dataset.modelUrl = item.modelUrl || "";
			el.dataset.label = item.label || "";
			el.dataset.type = item.type || "model";
			el.innerHTML = `<span>${item.label || item.name}</span>`;
			el.style.cssText = "padding:6px 8px;margin-bottom:4px;border-radius:6px;cursor:grab;background:var(--bg-light-gray,#f8f8f8);";
			this._catalogEl.appendChild(el);
		});

		// Viewport
		this._viewportEl = document.createElement("div");
		this._viewportEl.className = "fv-sb-viewport";
		this._viewportEl.style.cssText = "flex:1;position:relative;";

		// Properties panel
		this._propsEl = document.createElement("div");
		this._propsEl.className = "fv-sb-properties";
		this._propsEl.style.cssText = "width:220px;overflow-y:auto;border-inline-start:1px solid var(--border-color,#e0e0e0);padding:8px;";
		this._propsEl.innerHTML = `<h4 style="margin:0 0 8px">${__("Properties")}</h4><p class="text-muted">${__("Select an object")}</p>`;

		// Toolbar
		this._toolbarEl = document.createElement("div");
		this._toolbarEl.className = "fv-sb-toolbar";
		this._toolbarEl.style.cssText = "position:absolute;top:8px;inset-inline-start:228px;display:flex;gap:4px;z-index:10;";
		this._toolbarEl.innerHTML = `
			<button class="btn btn-xs btn-default" data-action="save">${__("Save")}</button>
			<button class="btn btn-xs btn-default" data-action="delete">${__("Delete")}</button>
			<button class="btn btn-xs btn-default" data-action="reset-view">${__("Reset View")}</button>
		`;
		this._toolbarEl.addEventListener("click", (e) => {
			const btn = e.target.closest("[data-action]");
			if (!btn) return;
			this._handleToolbarAction(btn.dataset.action);
		});

		this.container.appendChild(this._catalogEl);
		this.container.appendChild(this._viewportEl);
		this.container.appendChild(this._propsEl);
		this.container.appendChild(this._toolbarEl);
	}

	_addGrid() {
		import("three").then(({ GridHelper }) => {
			const grid = new GridHelper(50, 50 / this.opts.gridSize, 0xcccccc, 0xe0e0e0);
			this.engine.add(grid);
		});
	}

	_setupCatalogDrag() {
		this._viewportEl.addEventListener("dragover", (e) => e.preventDefault());
		this._viewportEl.addEventListener("drop", async (e) => {
			e.preventDefault();
			const modelUrl = e.dataTransfer.getData("text/model-url");
			const label = e.dataTransfer.getData("text/label");
			if (modelUrl) {
				await this.addObject({ modelUrl, label, position: [0, 0, 0] });
			}
		});

		this._catalogEl.addEventListener("dragstart", (e) => {
			const item = e.target.closest(".fv-sb-catalog-item");
			if (!item) return;
			e.dataTransfer.setData("text/model-url", item.dataset.modelUrl);
			e.dataTransfer.setData("text/label", item.dataset.label);
		});
	}

	async addObject(objData) {
		const entry = this.sceneGraph.addObject(objData);
		if (entry.modelUrl) {
			const { ModelLoader } = await import("../core/model_loader.js");
			const loader = new ModelLoader();
			const model = await loader.load(entry.modelUrl, {
				position: entry.position,
				scale: entry.scale,
				shadows: true,
			});
			model.userData.sceneId = entry.id;
			this.engine.add(model);
			this._objectMap.set(entry.id, model);
		}
		return entry;
	}

	removeObject(id) {
		const model = this._objectMap.get(id);
		if (model) {
			this.engine.remove(model);
			this._objectMap.delete(id);
		}
		this.sceneGraph.removeObject(id);
	}

	_onObjectSelected(threeObj) {
		if (!threeObj) {
			this._propsEl.innerHTML = `<h4 style="margin:0 0 8px">${__("Properties")}</h4><p class="text-muted">${__("Select an object")}</p>`;
			return;
		}
		const id = threeObj.userData?.sceneId;
		const entry = id ? this.sceneGraph.getObject(id) : null;
		if (entry) {
			this._propsEl.innerHTML = `
				<h4 style="margin:0 0 8px">${__("Properties")}</h4>
				<div class="fv-sb-prop"><label>${__("Label")}</label><input type="text" value="${entry.label}" data-field="label" class="input-with-feedback form-control input-sm"></div>
				<div class="fv-sb-prop"><label>${__("Position X")}</label><input type="number" value="${entry.position[0]}" data-field="px" step="0.25" class="input-with-feedback form-control input-sm"></div>
				<div class="fv-sb-prop"><label>${__("Position Y")}</label><input type="number" value="${entry.position[1]}" data-field="py" step="0.25" class="input-with-feedback form-control input-sm"></div>
				<div class="fv-sb-prop"><label>${__("Position Z")}</label><input type="number" value="${entry.position[2]}" data-field="pz" step="0.25" class="input-with-feedback form-control input-sm"></div>
			`;
			this._propsEl.querySelectorAll("input").forEach(inp => {
				inp.addEventListener("change", () => this._onPropChange(id, inp));
			});
		}
	}

	_onPropChange(id, input) {
		const entry = this.sceneGraph.getObject(id);
		const model = this._objectMap.get(id);
		if (!entry || !model) return;
		const field = input.dataset.field;
		const val = input.value;

		if (field === "label") entry.label = val;
		if (field === "px") { entry.position[0] = +val; model.position.x = +val; }
		if (field === "py") { entry.position[1] = +val; model.position.y = +val; }
		if (field === "pz") { entry.position[2] = +val; model.position.z = +val; }
	}

	_handleToolbarAction(action) {
		switch (action) {
			case "save":
				if (this.opts.onSave) this.opts.onSave(this.sceneGraph.toJSON());
				break;
			case "delete": {
				const sel = this.controls?.getSelected();
				const id = sel?.userData?.sceneId;
				if (id) this.removeObject(id);
				break;
			}
			case "reset-view":
				this.engine.fitToView();
				break;
		}
	}

	getScene() {
		return this.sceneGraph.toJSON();
	}

	async _loadScene() {
		for (const obj of this.sceneGraph.objects) {
			if (obj.modelUrl) {
				const { ModelLoader } = await import("../core/model_loader.js");
				const loader = new ModelLoader();
				const model = await loader.load(obj.modelUrl, {
					position: obj.position,
					rotation: obj.rotation,
					scale: obj.scale,
					shadows: true,
				});
				model.userData.sceneId = obj.id;
				this.engine.add(model);
				this._objectMap.set(obj.id, model);
			}
		}
		this.engine.fitToView();
	}

	dispose() {
		this._objectMap.clear();
		this.controls = null;
		this.engine?.dispose();
		this.container.innerHTML = "";
	}
}
