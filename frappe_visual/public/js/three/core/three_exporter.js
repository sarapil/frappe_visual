// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ThreeExporter — Export 3D scenes to various formats
 * ====================================================
 * Supports: glTF/GLB, OBJ, screenshot (PNG), STL.
 * Each export returns a downloadable Blob or triggers a download.
 */

export class ThreeExporter {
	/**
	 * Export scene to glTF/GLB
	 * @param {THREE.Scene} scene
	 * @param {object} opts - { binary: true, filename: 'scene' }
	 */
	static async exportGLTF(scene, opts = {}) {
		const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
		const exporter = new GLTFExporter();
		const binary = opts.binary !== false;
		return new Promise((resolve, reject) => {
			exporter.parse(
				scene,
				(result) => {
					let blob;
					if (binary) {
						blob = new Blob([result], { type: "model/gltf-binary" });
					} else {
						blob = new Blob([JSON.stringify(result)], { type: "model/gltf+json" });
					}
					if (opts.download !== false) {
						const ext = binary ? "glb" : "gltf";
						ThreeExporter._download(blob, `${opts.filename || "scene"}.${ext}`);
					}
					resolve(blob);
				},
				(error) => reject(error),
				{ binary }
			);
		});
	}

	/**
	 * Export scene to OBJ format
	 * @param {THREE.Scene} scene
	 * @param {object} opts
	 */
	static async exportOBJ(scene, opts = {}) {
		const { OBJExporter } = await import("three/addons/exporters/OBJExporter.js");
		const exporter = new OBJExporter();
		const result = exporter.parse(scene);
		const blob = new Blob([result], { type: "text/plain" });
		if (opts.download !== false) {
			ThreeExporter._download(blob, `${opts.filename || "scene"}.obj`);
		}
		return blob;
	}

	/**
	 * Export scene to STL (binary)
	 * @param {THREE.Scene} scene
	 * @param {object} opts
	 */
	static async exportSTL(scene, opts = {}) {
		const { STLExporter } = await import("three/addons/exporters/STLExporter.js");
		const exporter = new STLExporter();
		const result = exporter.parse(scene, { binary: true });
		const blob = new Blob([result], { type: "application/octet-stream" });
		if (opts.download !== false) {
			ThreeExporter._download(blob, `${opts.filename || "scene"}.stl`);
		}
		return blob;
	}

	/**
	 * Take a screenshot of a renderer
	 * @param {THREE.WebGLRenderer} renderer
	 * @param {object} opts - { width, height, filename }
	 */
	static screenshot(renderer, opts = {}) {
		const canvas = renderer.domElement;
		return new Promise((resolve) => {
			canvas.toBlob((blob) => {
				if (opts.download !== false) {
					ThreeExporter._download(blob, `${opts.filename || "screenshot"}.png`);
				}
				resolve(blob);
			}, "image/png");
		});
	}

	/** Trigger a browser download */
	static _download(blob, filename) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}
