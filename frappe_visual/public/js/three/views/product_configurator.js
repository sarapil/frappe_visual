// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ProductConfigurator — Configurable 3D product with selectable options
 * =====================================================================
 * Display a 3D model with swappable parts, materials, and colors.
 * Used for product customization, furniture, fixtures, etc.
 */

import { ThreeEngine } from "../core/three_engine.js";
import { MaterialLibrary } from "../core/material_library.js";

export class ProductConfigurator {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			baseModel: null,
			options: [],   // [{ name, label, choices: [{ label, modelUrl?, material?, value }] }]
			lighting: "studio",
			background: "#f5f5f5",
			onConfigChange: null,
		}, opts);
		this.engine = null;
		this.materialLib = new MaterialLibrary();
		this._config = {};
		this._partModels = new Map();
	}

	async init() {
		this._buildUI();
		this.engine = new ThreeEngine(this._viewerEl, {
			antialias: true,
			shadows: true,
			background: this.opts.background,
			lighting: this.opts.lighting,
			controls: { type: "orbit", damping: true },
		});
		await this.engine.init();

		if (this.opts.baseModel) {
			const { ModelLoader } = await import("../core/model_loader.js");
			const loader = new ModelLoader();
			const base = await loader.load(this.opts.baseModel, { shadows: true });
			this.engine.add(base);
			this._partModels.set("__base__", base);
			this.engine.fitToView();
		}

		// Set default selections
		this.opts.options.forEach(opt => {
			if (opt.choices.length) {
				this._config[opt.name] = opt.choices[0].value || opt.choices[0].label;
			}
		});

		return this;
	}

	_buildUI() {
		this.container.classList.add("fv-product-config");
		this.container.style.cssText = "display:flex;width:100%;height:100%;";

		// 3D Viewport
		this._viewerEl = document.createElement("div");
		this._viewerEl.style.cssText = "flex:1;position:relative;";

		// Config panel
		this._configEl = document.createElement("div");
		this._configEl.className = "fv-pc-panel";
		this._configEl.style.cssText = "width:260px;overflow-y:auto;border-inline-start:1px solid var(--border-color,#e0e0e0);padding:12px;";

		this.opts.options.forEach(opt => {
			const group = document.createElement("div");
			group.className = "fv-pc-group";
			group.style.cssText = "margin-bottom:16px;";
			group.innerHTML = `<label style="font-weight:600;margin-bottom:6px;display:block;">${opt.label || opt.name}</label>`;

			const choices = document.createElement("div");
			choices.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";

			opt.choices.forEach(choice => {
				const btn = document.createElement("button");
				btn.className = "btn btn-xs btn-default fv-pc-choice fv-fx-hover-lift";
				btn.textContent = choice.label;
				btn.dataset.optionName = opt.name;
				btn.dataset.value = choice.value || choice.label;
				if (choice.color) {
					btn.style.borderColor = choice.color;
				}
				btn.addEventListener("click", () => this._selectOption(opt.name, choice));
				choices.appendChild(btn);
			});

			group.appendChild(choices);
			this._configEl.appendChild(group);
		});

		this.container.appendChild(this._viewerEl);
		this.container.appendChild(this._configEl);
	}

	async _selectOption(optName, choice) {
		this._config[optName] = choice.value || choice.label;

		// Update button active states
		this._configEl.querySelectorAll(`[data-option-name="${optName}"]`).forEach(b => {
			b.classList.toggle("btn-primary", b.dataset.value === this._config[optName]);
			b.classList.toggle("btn-default", b.dataset.value !== this._config[optName]);
		});

		// Swap part model if choice has modelUrl
		if (choice.modelUrl) {
			const existing = this._partModels.get(optName);
			if (existing) this.engine.remove(existing);

			const { ModelLoader } = await import("../core/model_loader.js");
			const loader = new ModelLoader();
			const model = await loader.load(choice.modelUrl, { shadows: true });
			this.engine.add(model);
			this._partModels.set(optName, model);
		}

		// Apply material if choice has material
		if (choice.material) {
			const mat = this.materialLib.get(choice.material);
			const target = this._partModels.get(optName) || this._partModels.get("__base__");
			if (target && mat) {
				target.traverse(child => {
					if (child.isMesh) child.material = mat.clone();
				});
			}
		}

		if (this.opts.onConfigChange) {
			this.opts.onConfigChange({ ...this._config });
		}
	}

	getConfig() {
		return { ...this._config };
	}

	dispose() {
		this._partModels.clear();
		this.materialLib.dispose();
		this.engine?.dispose();
		this.container.innerHTML = "";
	}
}
