// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ExportManager — Multi-format export from 3D scenes
 * =====================================================
 * Supports: PNG, JPEG, WebP (image), glTF/GLB, OBJ (geometry), PDF.
 */

import { RenderConfig } from "./render_config.js";
import { ClientRenderer } from "./client_renderer.js";

export class ExportManager {
	constructor(engine) {
		this.engine = engine;
		this._clientRenderer = new ClientRenderer(engine);
	}

	/**
	 * Export scene as an image (PNG/JPEG/WebP)
	 */
	async exportImage(opts = {}) {
		return this._clientRenderer.render(opts);
	}

	/**
	 * Download scene as an image
	 */
	async downloadImage(filename = "render", opts = {}) {
		return this._clientRenderer.download(filename, opts);
	}

	/**
	 * Export scene as glTF/GLB
	 * Requires ThreeExporter to be available on engine
	 */
	async exportGLTF(binary = true) {
		if (this.engine.exporter) {
			return this.engine.exporter.exportGLTF(this.engine.scene, { binary });
		}
		// Fallback: dynamic import
		const { ThreeExporter } = await import("../core/three_exporter.js");
		const exporter = new ThreeExporter(this.engine);
		return exporter.exportGLTF(this.engine.scene, { binary });
	}

	/**
	 * Export scene as OBJ
	 */
	async exportOBJ() {
		if (this.engine.exporter) {
			return this.engine.exporter.exportOBJ(this.engine.scene);
		}
		const { ThreeExporter } = await import("../core/three_exporter.js");
		const exporter = new ThreeExporter(this.engine);
		return exporter.exportOBJ(this.engine.scene);
	}

	/**
	 * Download glTF/GLB file
	 */
	async downloadGLTF(filename = "scene", binary = true) {
		const { blob } = await this.exportGLTF(binary);
		const ext = binary ? "glb" : "gltf";
		this._downloadBlob(blob, `${filename}.${ext}`);
	}

	/**
	 * Download OBJ file
	 */
	async downloadOBJ(filename = "scene") {
		const { blob } = await this.exportOBJ();
		this._downloadBlob(blob, `${filename}.obj`);
	}

	/**
	 * Upload render result to Frappe file system
	 */
	async uploadToFrappe(blob, filename, doctype, docname) {
		const formData = new FormData();
		formData.append("file", blob, filename);
		formData.append("is_private", "0");
		if (doctype) formData.append("doctype", doctype);
		if (docname) formData.append("docname", docname);

		const resp = await fetch("/api/method/upload_file", {
			method: "POST",
			body: formData,
			headers: {
				"X-Frappe-CSRF-Token": frappe.csrf_token,
			},
		});

		const result = await resp.json();
		return result.message;
	}

	/**
	 * Get list of supported export formats
	 */
	static getSupportedFormats() {
		return {
			image: Object.keys(RenderConfig.outputFormats),
			geometry: ["gltf", "glb", "obj"],
		};
	}

	_downloadBlob(blob, filename) {
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = filename;
		a.click();
		URL.revokeObjectURL(a.href);
	}
}
