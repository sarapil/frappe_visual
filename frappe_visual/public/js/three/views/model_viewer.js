// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ModelViewer — Universal drop-in 3D model viewer
 * =================================================
 * Ready-to-use viewer with toolbar, auto-rotate, annotations,
 * and optional AR button.
 */

import { ThreeEngine } from "../core/three_engine.js";
import { Annotation3D } from "./annotation_3d.js";

export class ModelViewer {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			src: null,
			autoRotate: false,
			autoRotateSpeed: 1,
			lighting: "studio",
			background: "#f0f0f0",
			annotations: [],
			toolbar: true,
			ar: false,
			shadows: true,
			camera: {},
		}, opts);
		this.engine = null;
		this.model = null;
		this.annotationManager = null;
		this._rotating = this.opts.autoRotate;
	}

	async init() {
		this._buildUI();
		this.engine = new ThreeEngine(this._viewerEl, {
			antialias: true,
			shadows: this.opts.shadows,
			background: this.opts.background,
			camera: Object.assign({ type: "perspective", fov: 50, position: [0, 5, 10] }, this.opts.camera),
			controls: { type: "orbit", damping: true },
			lighting: this.opts.lighting,
		});
		await this.engine.init();

		if (this.opts.src) {
			await this.loadModel(this.opts.src);
		}
		if (this.opts.annotations.length) {
			this.annotationManager = new Annotation3D(this.engine);
			this.opts.annotations.forEach(a => this.annotationManager.add(a));
		}
		if (this._rotating) this._startAutoRotate();
		return this;
	}

	async loadModel(src) {
		const { ModelLoader } = await import("../core/model_loader.js");
		const loader = new ModelLoader();
		this.model = await loader.load(src, { shadows: this.opts.shadows });
		this.engine.add(this.model);
		this.engine.fitToView();
		return this.model;
	}

	_buildUI() {
		this.container.classList.add("fv-model-viewer");
		this._viewerEl = document.createElement("div");
		this._viewerEl.className = "fv-mv-canvas";
		this._viewerEl.style.cssText = "width:100%;height:100%;position:relative;";
		this.container.appendChild(this._viewerEl);

		if (this.opts.toolbar) {
			this._toolbar = document.createElement("div");
			this._toolbar.className = "fv-mv-toolbar";
			this._toolbar.innerHTML = `
				<button class="fv-mv-btn" data-action="reset" title="${__("Reset View")}">⟲</button>
				<button class="fv-mv-btn" data-action="rotate" title="${__("Auto Rotate")}">↻</button>
				<button class="fv-mv-btn" data-action="fullscreen" title="${__("Fullscreen")}">⛶</button>
				<button class="fv-mv-btn" data-action="screenshot" title="${__("Screenshot")}">📷</button>
				${this.opts.ar ? `<button class="fv-mv-btn" data-action="ar" title="${__("View in AR")}">🥽</button>` : ""}
			`;
			this._toolbar.addEventListener("click", (e) => {
				const btn = e.target.closest("[data-action]");
				if (!btn) return;
				this._handleAction(btn.dataset.action);
			});
			this.container.appendChild(this._toolbar);
		}
	}

	_handleAction(action) {
		switch (action) {
			case "reset":
				this.engine.fitToView();
				break;
			case "rotate":
				this._rotating = !this._rotating;
				this._rotating ? this._startAutoRotate() : this._stopAutoRotate();
				break;
			case "fullscreen":
				if (document.fullscreenElement) {
					document.exitFullscreen();
				} else {
					this.container.requestFullscreen?.();
				}
				break;
			case "screenshot":
				this.engine.screenshot({ download: true, filename: "model-screenshot" });
				break;
			case "ar":
				this._launchAR();
				break;
		}
	}

	_startAutoRotate() {
		const controls = this.engine._controls;
		if (controls) {
			controls.autoRotate = true;
			controls.autoRotateSpeed = this.opts.autoRotateSpeed;
		}
	}

	_stopAutoRotate() {
		const controls = this.engine._controls;
		if (controls) controls.autoRotate = false;
	}

	async _launchAR() {
		try {
			const { AROverlay } = await import("../../xr/ar_overlay.js");
			const ar = new AROverlay(this.engine);
			await ar.start();
		} catch {
			frappe.msgprint(__("AR is not available on this device/browser."));
		}
	}

	dispose() {
		this.annotationManager?.dispose();
		this.engine?.dispose();
		this.container.innerHTML = "";
	}
}
