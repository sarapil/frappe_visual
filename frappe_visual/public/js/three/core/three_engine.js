// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ThreeEngine — Core Three.js scene/renderer/camera lifecycle manager
 * ===================================================================
 * Low-level wrapper providing foundation for all 3D features in frappe_visual.
 * Handles scene creation, renderer setup, camera, animation loop, and disposal.
 *
 * Usage:
 *   const engine = new frappe.visual.ThreeEngine({
 *       container: '#my-3d',
 *       shadows: true,
 *       lighting: 'studio'
 *   });
 *   engine.dispose();
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class ThreeEngine {
	constructor(opts = {}) {
		this.opts = Object.assign({
			container: null,
			antialias: true,
			shadows: true,
			toneMapping: "aces",
			toneMappingExposure: 1.2,
			background: "#f0f0f0",
			pixelRatioLimit: 2,
			camera: {
				type: "perspective",
				fov: 50,
				near: 0.1,
				far: 10000,
				position: [0, 5, 10],
				target: [0, 0, 0],
			},
			controls: {
				type: "orbit",
				damping: true,
				dampingFactor: 0.05,
				maxPolarAngle: Math.PI / 2,
				enablePan: true,
				enableZoom: true,
			},
			lighting: "studio",
		}, opts);

		this._disposed = false;
		this._animationId = null;
		this._resizeObserver = null;
		this._eventHandlers = { select: [], hover: [] };

		this._initContainer();
		this._initRenderer();
		this._initScene();
		this._initCamera();
		this._initControls();
		this._initLighting();
		this._initResize();
		this._startLoop();
	}

	// ── Initialization ────────────────────────────────────────

	_initContainer() {
		const c = this.opts.container;
		this.container = typeof c === "string" ? document.querySelector(c) : c;
		if (!this.container) {
			throw new Error("ThreeEngine: container element not found");
		}
	}

	_initRenderer() {
		this.renderer = new THREE.WebGLRenderer({
			antialias: this.opts.antialias,
			alpha: this.opts.background === "transparent",
			powerPreference: "high-performance",
		});

		const rect = this.container.getBoundingClientRect();
		this.renderer.setSize(rect.width, rect.height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.opts.pixelRatioLimit));

		if (this.opts.shadows) {
			this.renderer.shadowMap.enabled = true;
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		}

		const toneMap = {
			aces: THREE.ACESFilmicToneMapping,
			linear: THREE.LinearToneMapping,
			reinhard: THREE.ReinhardToneMapping,
			cineon: THREE.CineonToneMapping,
		};
		this.renderer.toneMapping = toneMap[this.opts.toneMapping] || THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = this.opts.toneMappingExposure;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;

		this.container.appendChild(this.renderer.domElement);
		this.renderer.domElement.style.display = "block";
	}

	_initScene() {
		this.scene = new THREE.Scene();

		if (this.opts.background === "transparent") {
			this.scene.background = null;
		} else if (typeof this.opts.background === "string") {
			this.scene.background = new THREE.Color(this.opts.background);
		}

		this.objectGroup = new THREE.Group();
		this.objectGroup.name = "objects";
		this.scene.add(this.objectGroup);
	}

	_initCamera() {
		const cam = this.opts.camera;
		const rect = this.container.getBoundingClientRect();
		const aspect = rect.width / rect.height;

		if (cam.type === "orthographic") {
			const frustumSize = cam.fov || 10;
			this.camera = new THREE.OrthographicCamera(
				-frustumSize * aspect / 2, frustumSize * aspect / 2,
				frustumSize / 2, -frustumSize / 2,
				cam.near, cam.far
			);
		} else {
			this.camera = new THREE.PerspectiveCamera(cam.fov, aspect, cam.near, cam.far);
		}

		const pos = cam.position;
		this.camera.position.set(pos[0], pos[1], pos[2]);

		const target = cam.target;
		this.camera.lookAt(target[0], target[1], target[2]);
	}

	_initControls() {
		const ctrl = this.opts.controls;
		if (ctrl.type === "orbit") {
			this.controls = new OrbitControls(this.camera, this.renderer.domElement);
			this.controls.enableDamping = ctrl.damping;
			this.controls.dampingFactor = ctrl.dampingFactor;
			this.controls.maxPolarAngle = ctrl.maxPolarAngle;
			this.controls.enablePan = ctrl.enablePan;
			this.controls.enableZoom = ctrl.enableZoom;

			const target = this.opts.camera.target;
			this.controls.target.set(target[0], target[1], target[2]);
			this.controls.update();
		}
	}

	_initLighting() {
		const rig = frappe.visual.LightingRig || {};
		const preset = rig[this.opts.lighting];

		if (preset && typeof preset === "function") {
			preset(this.scene);
		} else {
			this._defaultLighting();
		}
	}

	_defaultLighting() {
		const ambient = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(ambient);

		const sun = new THREE.DirectionalLight(0xffffff, 1.0);
		sun.position.set(5, 10, 7);
		if (this.opts.shadows) {
			sun.castShadow = true;
			sun.shadow.mapSize.width = 2048;
			sun.shadow.mapSize.height = 2048;
			sun.shadow.camera.near = 0.5;
			sun.shadow.camera.far = 50;
			const d = 20;
			sun.shadow.camera.left = -d;
			sun.shadow.camera.right = d;
			sun.shadow.camera.top = d;
			sun.shadow.camera.bottom = -d;
		}
		this.scene.add(sun);

		const fill = new THREE.DirectionalLight(0xaaccff, 0.3);
		fill.position.set(-3, 5, -5);
		this.scene.add(fill);
	}

	_initResize() {
		this._resizeObserver = new ResizeObserver(() => this._onResize());
		this._resizeObserver.observe(this.container);
	}

	_onResize() {
		if (this._disposed) return;
		const rect = this.container.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return;

		const aspect = rect.width / rect.height;

		if (this.camera.isPerspectiveCamera) {
			this.camera.aspect = aspect;
		} else {
			const h = this.camera.top - this.camera.bottom;
			this.camera.left = -h * aspect / 2;
			this.camera.right = h * aspect / 2;
		}
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(rect.width, rect.height);
	}

	// ── Animation Loop ────────────────────────────────────────

	_startLoop() {
		const animate = () => {
			if (this._disposed) return;
			this._animationId = requestAnimationFrame(animate);
			if (this.controls?.update) this.controls.update();
			this.renderer.render(this.scene, this.camera);
		};
		animate();
	}

	// ── Public API ────────────────────────────────────────────

	/** Add a Three.js Object3D to the scene */
	add(object) {
		this.objectGroup.add(object);
		return this;
	}

	/** Remove an object from the scene */
	remove(object) {
		this.objectGroup.remove(object);
		return this;
	}

	/** Clear all objects */
	clear() {
		while (this.objectGroup.children.length > 0) {
			const child = this.objectGroup.children[0];
			this.objectGroup.remove(child);
			this._disposeObject(child);
		}
		return this;
	}

	/** Set camera position */
	setCameraPosition(x, y, z) {
		this.camera.position.set(x, y, z);
		if (this.controls) this.controls.update();
	}

	/** Set camera look-at target */
	setCameraTarget(x, y, z) {
		if (this.controls) {
			this.controls.target.set(x, y, z);
			this.controls.update();
		} else {
			this.camera.lookAt(x, y, z);
		}
	}

	/** Take a screenshot */
	async screenshot(opts = {}) {
		const width = opts.width || this.renderer.domElement.width;
		const height = opts.height || this.renderer.domElement.height;

		const offRenderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			preserveDrawingBuffer: true,
		});
		offRenderer.setSize(width, height);
		offRenderer.shadowMap.enabled = this.opts.shadows;
		offRenderer.toneMapping = this.renderer.toneMapping;
		offRenderer.toneMappingExposure = this.renderer.toneMappingExposure;

		offRenderer.render(this.scene, this.camera);
		const dataUrl = offRenderer.domElement.toDataURL(opts.format || "image/png", opts.quality || 0.92);
		offRenderer.dispose();

		return dataUrl;
	}

	/** Register event callbacks */
	onSelect(cb) { this._eventHandlers.select.push(cb); }
	onHover(cb) { this._eventHandlers.hover.push(cb); }

	/** Fit camera to view all objects */
	fitToView(padding = 1.2) {
		const box = new THREE.Box3().setFromObject(this.objectGroup);
		if (box.isEmpty()) return;

		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z) * padding;

		if (this.camera.isPerspectiveCamera) {
			const fov = this.camera.fov * (Math.PI / 180);
			const distance = maxDim / (2 * Math.tan(fov / 2));
			const dir = this.camera.position.clone().sub(center).normalize();
			this.camera.position.copy(center.clone().add(dir.multiplyScalar(distance)));
		}

		if (this.controls) {
			this.controls.target.copy(center);
			this.controls.update();
		} else {
			this.camera.lookAt(center);
		}
	}

	/** Get the raw Three.js objects */
	getThree() {
		return { THREE, scene: this.scene, camera: this.camera, renderer: this.renderer };
	}

	// ── Cleanup ───────────────────────────────────────────────

	_disposeObject(obj) {
		obj.traverse((child) => {
			if (child.geometry) child.geometry.dispose();
			if (child.material) {
				if (Array.isArray(child.material)) {
					child.material.forEach(m => m.dispose());
				} else {
					child.material.dispose();
				}
			}
		});
	}

	dispose() {
		this._disposed = true;
		if (this._animationId) cancelAnimationFrame(this._animationId);
		if (this._resizeObserver) this._resizeObserver.disconnect();
		if (this.controls) this.controls.dispose();

		this.objectGroup.traverse((child) => {
			if (child.geometry) child.geometry.dispose();
			if (child.material) {
				const materials = Array.isArray(child.material) ? child.material : [child.material];
				materials.forEach(m => {
					if (m.map) m.map.dispose();
					if (m.normalMap) m.normalMap.dispose();
					if (m.roughnessMap) m.roughnessMap.dispose();
					m.dispose();
				});
			}
		});

		this.renderer.dispose();
		if (this.renderer.domElement.parentNode) {
			this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
		}
	}
}
