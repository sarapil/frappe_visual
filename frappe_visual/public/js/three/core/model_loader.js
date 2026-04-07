// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * ModelLoader — Unified async loader for 7 3D model formats + DRACO
 * =================================================================
 * Auto-detects format from file extension. Supports:
 * glTF/GLB, OBJ, FBX, STL, Collada/DAE, PLY (+ DRACO compression)
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

export class ModelLoader {
	constructor() {
		this._cache = new Map();
		this._dracoLoader = null;
		this._gltfLoader = null;
	}

	/** Supported format list */
	get supportedFormats() {
		return ["gltf", "glb", "obj", "fbx", "stl", "dae", "ply"];
	}

	/**
	 * Load a 3D model from URL. Auto-detects format.
	 * @param {string} url - Path to model file
	 * @param {Object} opts - { format, scale, shadows, onProgress }
	 * @returns {Promise<THREE.Group>}
	 */
	async load(url, opts = {}) {
		const format = opts.format || this._detectFormat(url);
		if (!format) {
			throw new Error(`ModelLoader: Cannot detect format for "${url}"`);
		}

		const cacheKey = `${url}:${JSON.stringify(opts)}`;
		if (!opts.noCache && this._cache.has(cacheKey)) {
			return this._cache.get(cacheKey).clone();
		}

		let model;
		switch (format) {
			case "gltf":
			case "glb":
				model = await this._loadGLTF(url, opts);
				break;
			case "obj":
				model = await this._loadOBJ(url, opts);
				break;
			case "fbx":
				model = await this._loadFBX(url, opts);
				break;
			case "stl":
				model = await this._loadSTL(url, opts);
				break;
			case "dae":
				model = await this._loadCollada(url, opts);
				break;
			case "ply":
				model = await this._loadPLY(url, opts);
				break;
			default:
				throw new Error(`ModelLoader: Unsupported format "${format}"`);
		}

		// Apply common post-processing
		this._postProcess(model, opts);

		if (!opts.noCache) {
			this._cache.set(cacheKey, model);
		}
		return model;
	}

	// ── Format Loaders ────────────────────────────────────────

	_loadGLTF(url, opts) {
		if (!this._gltfLoader) {
			this._gltfLoader = new GLTFLoader();
			this._dracoLoader = new DRACOLoader();
			this._dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
			this._gltfLoader.setDRACOLoader(this._dracoLoader);
		}
		return new Promise((resolve, reject) => {
			this._gltfLoader.load(url,
				(gltf) => resolve(gltf.scene),
				opts.onProgress,
				reject
			);
		});
	}

	_loadOBJ(url, opts) {
		const loader = new OBJLoader();
		return new Promise((resolve, reject) => {
			loader.load(url, resolve, opts.onProgress, reject);
		});
	}

	_loadFBX(url, opts) {
		const loader = new FBXLoader();
		return new Promise((resolve, reject) => {
			loader.load(url, resolve, opts.onProgress, reject);
		});
	}

	_loadSTL(url, opts) {
		const loader = new STLLoader();
		return new Promise((resolve, reject) => {
			loader.load(url, (geometry) => {
				const material = new THREE.MeshStandardMaterial({
					color: 0xcccccc,
					roughness: 0.5,
					metalness: 0.2,
				});
				const mesh = new THREE.Mesh(geometry, material);
				const group = new THREE.Group();
				group.add(mesh);
				resolve(group);
			}, opts.onProgress, reject);
		});
	}

	_loadCollada(url, opts) {
		const loader = new ColladaLoader();
		return new Promise((resolve, reject) => {
			loader.load(url,
				(collada) => resolve(collada.scene),
				opts.onProgress,
				reject
			);
		});
	}

	_loadPLY(url, opts) {
		const loader = new PLYLoader();
		return new Promise((resolve, reject) => {
			loader.load(url, (geometry) => {
				geometry.computeVertexNormals();
				const material = new THREE.MeshStandardMaterial({
					vertexColors: geometry.hasAttribute("color"),
					roughness: 0.6,
					metalness: 0.1,
				});
				const mesh = new THREE.Mesh(geometry, material);
				const group = new THREE.Group();
				group.add(mesh);
				resolve(group);
			}, opts.onProgress, reject);
		});
	}

	// ── Helpers ───────────────────────────────────────────────

	_detectFormat(url) {
		const clean = url.split("?")[0].split("#")[0];
		const ext = clean.split(".").pop().toLowerCase();
		const map = { gltf: "gltf", glb: "glb", obj: "obj", fbx: "fbx", stl: "stl", dae: "dae", ply: "ply" };
		return map[ext] || null;
	}

	_postProcess(model, opts) {
		if (opts.scale) {
			model.scale.setScalar(opts.scale);
		}
		if (opts.position) {
			model.position.set(opts.position[0], opts.position[1], opts.position[2]);
		}
		if (opts.rotation) {
			model.rotation.set(opts.rotation[0], opts.rotation[1], opts.rotation[2]);
		}

		const shadows = opts.shadows !== false;
		model.traverse((child) => {
			if (child.isMesh) {
				child.castShadow = shadows;
				child.receiveShadow = shadows;
			}
		});

		model.userData = Object.assign(model.userData || {}, {
			sourceUrl: null, // don't store URL for security
			sourceFormat: opts.format || "unknown",
			loadedAt: Date.now(),
		});
	}

	/** Clear the model cache */
	clearCache() {
		this._cache.clear();
	}

	/** Dispose loader resources */
	dispose() {
		this.clearCache();
		if (this._dracoLoader) this._dracoLoader.dispose();
	}
}
