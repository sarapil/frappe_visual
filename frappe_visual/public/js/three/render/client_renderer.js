// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ClientRenderer — Browser-side rendering using Three.js WebGLRenderer
 * =====================================================================
 * Creates high-quality screenshots/renders of 3D scenes entirely in the
 * browser using the existing ThreeEngine instance.
 */

import { RenderConfig } from "./render_config.js";

export class ClientRenderer {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			quality: "standard",
			camera: "perspective",
			format: "png",
			resolution: null,
			lighting: null,
			background: null,
		}, opts);
	}

	/**
	 * Render the current scene to an image blob
	 * @param {Object} overrides - Override any default opts for this render
	 * @returns {Promise<{blob: Blob, dataUrl: string, config: Object}>}
	 */
	async render(overrides = {}) {
		const mergedOpts = { ...this.opts, ...overrides };
		const config = RenderConfig.buildConfig(mergedOpts);
		const { width, height } = config.resolution;

		// Save current renderer state
		const renderer = this.engine.renderer;
		const prevSize = renderer.getSize(new this.engine.THREE.Vector2());
		const prevPixelRatio = renderer.getPixelRatio();

		// Create offscreen render target at requested resolution
		renderer.setPixelRatio(1);
		renderer.setSize(width, height);

		// Apply camera preset
		const camera = this._setupCamera(config.camera, width / height);

		// Apply lighting if different
		const prevLighting = this.engine._currentLighting;
		if (config.lighting && config.lighting !== prevLighting) {
			this.engine.setLighting?.(config.lighting);
		}

		// Apply quality settings
		if (config.quality.shadows) {
			renderer.shadowMap.enabled = true;
		}

		// Apply background override
		const prevBg = this.engine.scene.background;
		if (mergedOpts.background) {
			this.engine.scene.background = new this.engine.THREE.Color(mergedOpts.background);
		}

		// Render
		renderer.render(this.engine.scene, camera);

		// Extract image
		const canvas = renderer.domElement;
		const format = config.output;
		const dataUrl = canvas.toDataURL(format.mime, format.quality);
		const blob = await new Promise(resolve => canvas.toBlob(resolve, format.mime, format.quality));

		// Restore previous state
		renderer.setPixelRatio(prevPixelRatio);
		renderer.setSize(prevSize.x, prevSize.y);
		this.engine.scene.background = prevBg;
		if (prevLighting && config.lighting !== prevLighting) {
			this.engine.setLighting?.(prevLighting);
		}

		return { blob, dataUrl, config };
	}

	/**
	 * Quick screenshot at current viewport (no preset changes)
	 */
	async screenshot(format = "png") {
		const renderer = this.engine.renderer;
		renderer.render(this.engine.scene, this.engine.camera);
		const mime = RenderConfig.outputFormats[format]?.mime || "image/png";
		const quality = RenderConfig.outputFormats[format]?.quality || 1;
		const dataUrl = renderer.domElement.toDataURL(mime, quality);
		const blob = await new Promise(resolve => renderer.domElement.toBlob(resolve, mime, quality));
		return { blob, dataUrl };
	}

	/**
	 * Download image to user's machine
	 */
	async download(filename, overrides = {}) {
		const { blob, config } = await this.render(overrides);
		const ext = config.output.formatKey || "png";
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `${filename || "render"}.${ext}`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	_setupCamera(cameraConfig, aspect) {
		const THREE = this.engine.THREE;
		let camera;

		if (cameraConfig.type === "orthographic") {
			const frustumSize = 500;
			camera = new THREE.OrthographicCamera(
				-frustumSize * aspect / 2, frustumSize * aspect / 2,
				frustumSize / 2, -frustumSize / 2, 0.1, 10000
			);
		} else {
			camera = new THREE.PerspectiveCamera(cameraConfig.fov || 50, aspect, 0.1, 10000);
		}

		const pos = cameraConfig.position || [300, 400, 300];
		const target = cameraConfig.target || [0, 0, 0];
		camera.position.set(pos[0], pos[1], pos[2]);
		camera.lookAt(target[0], target[1], target[2]);
		camera.updateProjectionMatrix();

		return camera;
	}
}
