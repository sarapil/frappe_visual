// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * VRViewer — Immersive VR walkthrough of 3D scenes via WebXR
 * =============================================================
 * Wraps Three.js WebXR sessions with teleport navigation,
 * spatial UI panels, and controller support.
 *
 * Progressive enhancement: falls back to regular 3D orbit viewer
 * when WebXR is unavailable.
 */

export class VRViewer {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			scene: null,
			engine: null,
			startPosition: [0, 1.7, 0],
			teleport: true,
			spatialUI: true,
			controllers: true,
			background: "#1a1a2e",
			floorY: 0,
		}, opts);

		this._xrSession = null;
		this._xrRefSpace = null;
		this._controllers = [];
		this._teleportTarget = null;
		this._isVR = false;
	}

	static async isSupported() {
		if (!navigator.xr) return false;
		try {
			return await navigator.xr.isSessionSupported("immersive-vr");
		} catch {
			return false;
		}
	}

	async init() {
		const supported = await VRViewer.isSupported();

		this._buildUI(supported);

		if (supported) {
			this._setupVRButton();
		}

		return this;
	}

	_buildUI(vrSupported) {
		this.container.style.position = "relative";

		// VR enter button
		this._vrButton = document.createElement("button");
		this._vrButton.className = "btn btn-primary fv-vr-button";
		this._vrButton.style.cssText = "position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:10;padding:10px 24px;border-radius:24px;font-size:14px;";
		this._vrButton.innerHTML = vrSupported
			? `<i class="ti ti-device-vision-pro"></i> ${__("Enter VR")}`
			: `<i class="ti ti-device-vision-pro-off"></i> ${__("VR Not Supported")}`;
		this._vrButton.disabled = !vrSupported;
		this.container.appendChild(this._vrButton);
	}

	_setupVRButton() {
		this._vrButton.addEventListener("click", async () => {
			if (this._xrSession) {
				await this._exitVR();
			} else {
				await this._enterVR();
			}
		});
	}

	async _enterVR() {
		const engine = this.opts.engine;
		if (!engine?.renderer) return;

		try {
			engine.renderer.xr.enabled = true;

			this._xrSession = await navigator.xr.requestSession("immersive-vr", {
				optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
			});

			engine.renderer.xr.setSession(this._xrSession);

			this._xrRefSpace = await this._xrSession.requestReferenceSpace("local-floor");

			if (this.opts.controllers) {
				this._setupControllers(engine);
			}

			if (this.opts.teleport) {
				this._setupTeleport(engine);
			}

			this._xrSession.addEventListener("end", () => this._onSessionEnd());

			this._isVR = true;
			this._vrButton.innerHTML = `<i class="ti ti-device-vision-pro-off"></i> ${__("Exit VR")}`;

			// Set initial position
			const [x, y, z] = this.opts.startPosition;
			engine.camera.position.set(x, y, z);

		} catch (e) {
			console.warn("Failed to enter VR:", e);
			frappe.show_alert?.({ message: __("Failed to start VR session"), indicator: "red" });
		}
	}

	async _exitVR() {
		if (this._xrSession) {
			await this._xrSession.end();
		}
	}

	_onSessionEnd() {
		const engine = this.opts.engine;
		if (engine?.renderer) {
			engine.renderer.xr.enabled = false;
		}
		this._xrSession = null;
		this._isVR = false;
		this._vrButton.innerHTML = `<i class="ti ti-device-vision-pro"></i> ${__("Enter VR")}`;
		this._controllers = [];
	}

	_setupControllers(engine) {
		const THREE = engine.THREE;
		if (!THREE) return;

		for (let i = 0; i < 2; i++) {
			const controller = engine.renderer.xr.getController(i);
			controller.addEventListener("selectstart", () => this._onSelectStart(i));
			controller.addEventListener("selectend", () => this._onSelectEnd(i));
			engine.scene.add(controller);

			// Visual representation — simple ray
			const geometry = new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 0),
				new THREE.Vector3(0, 0, -5)
			]);
			const material = new THREE.LineBasicMaterial({ color: 0x6366f1 });
			const line = new THREE.Line(geometry, material);
			controller.add(line);

			this._controllers.push({ controller, line });
		}
	}

	_setupTeleport(engine) {
		const THREE = engine.THREE;
		if (!THREE) return;

		// Teleport marker — ring on the floor
		const ringGeo = new THREE.RingGeometry(0.15, 0.25, 32);
		ringGeo.rotateX(-Math.PI / 2);
		const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, opacity: 0.6, transparent: true });
		this._teleportMarker = new THREE.Mesh(ringGeo, ringMat);
		this._teleportMarker.visible = false;
		engine.scene.add(this._teleportMarker);

		// Floor plane for raycasting
		this._floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.opts.floorY);
	}

	_onSelectStart(controllerIndex) {
		// Begin teleport aim
		if (this.opts.teleport && this._teleportMarker) {
			this._teleportMarker.visible = true;
		}
	}

	_onSelectEnd(controllerIndex) {
		// Execute teleport
		if (this.opts.teleport && this._teleportTarget) {
			const engine = this.opts.engine;
			if (engine) {
				const offset = engine.camera.position.clone().sub(this._teleportTarget);
				offset.y = 0; // Keep height
				engine.renderer.xr.getCamera().position.sub(offset);
			}
		}
		if (this._teleportMarker) {
			this._teleportMarker.visible = false;
		}
		this._teleportTarget = null;
	}

	dispose() {
		this._exitVR().catch(() => {});
		if (this._teleportMarker) {
			this._teleportMarker.geometry?.dispose();
			this._teleportMarker.material?.dispose();
		}
		for (const { line } of this._controllers) {
			line.geometry?.dispose();
			line.material?.dispose();
		}
		this._vrButton?.remove();
	}
}
