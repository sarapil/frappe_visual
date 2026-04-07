// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ModelCompare — Side-by-side or overlay 3D model comparison
 * ===========================================================
 */

import { ThreeEngine } from "../core/three_engine.js";
import { ModelLoader } from "../core/model_loader.js";

export class ModelCompare {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			modelA: null,
			modelB: null,
			mode: "side-by-side", // "side-by-side" | "overlay" | "slider"
			lighting: "studio",
			background: "#f0f0f0",
			syncCamera: true,
		}, opts);
		this.engineA = null;
		this.engineB = null;
		this.loader = new ModelLoader();
	}

	async init() {
		this._buildUI();

		if (this.opts.mode === "side-by-side") {
			await this._initSideBySide();
		} else {
			await this._initOverlay();
		}
		return this;
	}

	_buildUI() {
		this.container.classList.add("fv-model-compare");
		this.container.style.cssText = "display:flex;width:100%;height:100%;position:relative;";

		if (this.opts.mode === "side-by-side") {
			this._panelA = document.createElement("div");
			this._panelA.style.cssText = "flex:1;position:relative;border-inline-end:2px solid var(--border-color,#ddd);";
			this._panelB = document.createElement("div");
			this._panelB.style.cssText = "flex:1;position:relative;";
			this.container.appendChild(this._panelA);
			this.container.appendChild(this._panelB);
		} else {
			this._panelA = document.createElement("div");
			this._panelA.style.cssText = "width:100%;height:100%;position:absolute;inset:0;";
			this._panelB = document.createElement("div");
			this._panelB.style.cssText = "width:100%;height:100%;position:absolute;inset:0;pointer-events:none;opacity:0.5;";
			this.container.style.position = "relative";
			this.container.appendChild(this._panelA);
			this.container.appendChild(this._panelB);

			if (this.opts.mode === "slider") this._buildSlider();
		}
	}

	async _initSideBySide() {
		const engineOpts = {
			antialias: true,
			shadows: true,
			background: this.opts.background,
			lighting: this.opts.lighting,
			controls: { type: "orbit", damping: true },
		};

		this.engineA = new ThreeEngine(this._panelA, { ...engineOpts });
		this.engineB = new ThreeEngine(this._panelB, { ...engineOpts });
		await Promise.all([this.engineA.init(), this.engineB.init()]);

		if (this.opts.modelA) {
			const mA = await this.loader.load(this.opts.modelA, { shadows: true });
			this.engineA.add(mA);
			this.engineA.fitToView();
		}
		if (this.opts.modelB) {
			const mB = await this.loader.load(this.opts.modelB, { shadows: true });
			this.engineB.add(mB);
			this.engineB.fitToView();
		}

		if (this.opts.syncCamera) this._syncCameras();
	}

	async _initOverlay() {
		const engineOpts = {
			antialias: true,
			shadows: true,
			background: this.opts.background,
			lighting: this.opts.lighting,
			controls: { type: "orbit", damping: true },
		};

		this.engineA = new ThreeEngine(this._panelA, { ...engineOpts });
		this.engineB = new ThreeEngine(this._panelB, { ...engineOpts, background: "transparent" });
		await Promise.all([this.engineA.init(), this.engineB.init()]);

		if (this.opts.modelA) {
			const mA = await this.loader.load(this.opts.modelA, { shadows: true });
			this.engineA.add(mA);
			this.engineA.fitToView();
		}
		if (this.opts.modelB) {
			const mB = await this.loader.load(this.opts.modelB);
			this.engineB.add(mB);
			this.engineB.fitToView();
		}
	}

	_buildSlider() {
		const slider = document.createElement("input");
		slider.type = "range";
		slider.min = 0;
		slider.max = 100;
		slider.value = 50;
		slider.className = "fv-mc-slider";
		slider.style.cssText = "position:absolute;bottom:10px;inset-inline-start:10%;width:80%;z-index:10;";
		slider.addEventListener("input", () => {
			this._panelB.style.opacity = slider.value / 100;
		});
		this.container.appendChild(slider);
	}

	_syncCameras() {
		if (!this.engineA?._controls || !this.engineB?._controls) return;
		this.engineA._controls.addEventListener("change", () => {
			const camA = this.engineA._camera;
			this.engineB._camera.position.copy(camA.position);
			this.engineB._camera.rotation.copy(camA.rotation);
			this.engineB._controls.target.copy(this.engineA._controls.target);
			this.engineB._controls.update();
		});
	}

	dispose() {
		this.engineA?.dispose();
		this.engineB?.dispose();
		this.container.innerHTML = "";
	}
}
