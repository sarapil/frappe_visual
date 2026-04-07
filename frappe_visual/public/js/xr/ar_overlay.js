// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * AROverlay — Augmented Reality model placement via WebXR AR
 * =============================================================
 * Places 3D models in the real world via device camera.
 * Uses WebXR hit-testing to anchor models to surfaces.
 *
 * Falls back to regular model viewer when AR is unavailable.
 */

export class AROverlay {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			model: null,
			engine: null,
			scale: 1.0,
			shadowPlane: true,
			measurements: true,
			reticleColor: 0x6366f1,
		}, opts);

		this._xrSession = null;
		this._hitTestSource = null;
		this._reticle = null;
		this._placedModel = null;
		this._isPlaced = false;
	}

	static async isSupported() {
		if (!navigator.xr) return false;
		try {
			return await navigator.xr.isSessionSupported("immersive-ar");
		} catch {
			return false;
		}
	}

	async init() {
		const supported = await AROverlay.isSupported();
		this._buildUI(supported);
		return this;
	}

	_buildUI(arSupported) {
		this.container.style.position = "relative";

		this._arButton = document.createElement("button");
		this._arButton.className = "btn btn-primary fv-ar-button";
		this._arButton.style.cssText = "position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:10;padding:10px 24px;border-radius:24px;";
		this._arButton.innerHTML = arSupported
			? `<i class="ti ti-augmented-reality-2"></i> ${__("View in AR")}`
			: `<i class="ti ti-augmented-reality-off"></i> ${__("AR Not Supported")}`;
		this._arButton.disabled = !arSupported;

		if (arSupported) {
			this._arButton.addEventListener("click", () => this._startAR());
		}

		this.container.appendChild(this._arButton);
	}

	async _startAR() {
		const engine = this.opts.engine;
		if (!engine?.renderer) return;

		try {
			engine.renderer.xr.enabled = true;

			this._xrSession = await navigator.xr.requestSession("immersive-ar", {
				requiredFeatures: ["hit-test"],
				optionalFeatures: ["dom-overlay", "light-estimation"],
				domOverlay: { root: this.container },
			});

			engine.renderer.xr.setSession(this._xrSession);

			const viewerSpace = await this._xrSession.requestReferenceSpace("viewer");
			this._hitTestSource = await this._xrSession.requestHitTestSource({ space: viewerSpace });

			this._xrSession.addEventListener("end", () => this._onSessionEnd());
			this._xrSession.addEventListener("select", () => this._onSelect());

			this._setupReticle(engine);

			this._arButton.innerHTML = `<i class="ti ti-x"></i> ${__("Exit AR")}`;
			this._isPlaced = false;
		} catch (e) {
			console.warn("Failed to start AR:", e);
			frappe.show_alert?.({ message: __("Failed to start AR session"), indicator: "red" });
		}
	}

	_setupReticle(engine) {
		const THREE = engine.THREE;
		if (!THREE) return;

		const ringGeo = new THREE.RingGeometry(0.08, 0.12, 32);
		ringGeo.rotateX(-Math.PI / 2);
		const ringMat = new THREE.MeshBasicMaterial({
			color: this.opts.reticleColor,
			opacity: 0.8,
			transparent: true,
		});
		this._reticle = new THREE.Mesh(ringGeo, ringMat);
		this._reticle.matrixAutoUpdate = false;
		this._reticle.visible = false;
		engine.scene.add(this._reticle);
	}

	_onSelect() {
		if (!this._reticle?.visible) return;

		if (!this._isPlaced) {
			this._placeModel();
		} else {
			// Move existing model to new position
			if (this._placedModel && this._reticle) {
				this._placedModel.position.setFromMatrixPosition(this._reticle.matrix);
			}
		}
	}

	async _placeModel() {
		const engine = this.opts.engine;
		if (!engine) return;

		try {
			if (this.opts.model && engine.modelLoader) {
				const model = await engine.modelLoader.load(this.opts.model);
				model.scale.setScalar(this.opts.scale);
				model.position.setFromMatrixPosition(this._reticle.matrix);
				engine.scene.add(model);
				this._placedModel = model;

				// Shadow plane
				if (this.opts.shadowPlane) {
					this._addShadowPlane(engine, model.position);
				}
			}

			this._isPlaced = true;
			this._reticle.visible = false;
		} catch (e) {
			console.warn("Failed to place model in AR:", e);
		}
	}

	_addShadowPlane(engine, position) {
		const THREE = engine.THREE;
		if (!THREE) return;

		const planeGeo = new THREE.PlaneGeometry(10, 10);
		planeGeo.rotateX(-Math.PI / 2);
		const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
		const plane = new THREE.Mesh(planeGeo, planeMat);
		plane.position.copy(position);
		plane.position.y -= 0.01;
		plane.receiveShadow = true;
		engine.scene.add(plane);
		this._shadowPlane = plane;
	}

	_onSessionEnd() {
		const engine = this.opts.engine;
		if (engine?.renderer) {
			engine.renderer.xr.enabled = false;
		}
		this._xrSession = null;
		this._hitTestSource = null;
		this._arButton.innerHTML = `<i class="ti ti-augmented-reality-2"></i> ${__("View in AR")}`;
	}

	dispose() {
		if (this._xrSession) {
			this._xrSession.end().catch(() => {});
		}
		if (this._reticle) {
			this._reticle.geometry?.dispose();
			this._reticle.material?.dispose();
		}
		if (this._shadowPlane) {
			this._shadowPlane.geometry?.dispose();
			this._shadowPlane.material?.dispose();
		}
		this._arButton?.remove();
	}
}
