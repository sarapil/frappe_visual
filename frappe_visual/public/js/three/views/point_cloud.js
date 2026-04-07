// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * PointCloud — Large point cloud viewer for PLY/LAS data
 * =======================================================
 */

import { ThreeEngine } from "../core/three_engine.js";

export class PointCloud {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			src: null,
			pointSize: 0.02,
			color: null,           // null = use vertex colors
			maxPoints: 5_000_000,
			background: "#0a0a1a",
			lighting: "neutral",
		}, opts);
		this.engine = null;
		this._points = null;
	}

	async init() {
		this.engine = new ThreeEngine(this.container, {
			antialias: false,
			shadows: false,
			background: this.opts.background,
			lighting: this.opts.lighting,
			controls: { type: "orbit", damping: true },
		});
		await this.engine.init();

		if (this.opts.src) {
			await this.loadPoints(this.opts.src);
		}
		return this;
	}

	async loadPoints(src) {
		const THREE = await import("three");

		if (src.endsWith(".ply")) {
			const { PLYLoader } = await import("three/addons/loaders/PLYLoader.js");
			const loader = new PLYLoader();
			const geometry = await new Promise((resolve, reject) => {
				loader.load(src, resolve, undefined, reject);
			});
			this._renderGeometry(THREE, geometry);
		} else {
			// Generic: assume array of [x, y, z, r, g, b]
			const resp = await fetch(src);
			const json = await resp.json();
			this._renderFromArray(THREE, json);
		}

		this.engine.fitToView();
	}

	_renderGeometry(THREE, geometry) {
		if (this._points) this.engine.remove(this._points);

		const mat = new THREE.PointsMaterial({
			size: this.opts.pointSize,
			vertexColors: !this.opts.color,
			color: this.opts.color ? new THREE.Color(this.opts.color) : undefined,
			sizeAttenuation: true,
		});

		this._points = new THREE.Points(geometry, mat);
		this.engine.add(this._points);
	}

	_renderFromArray(THREE, data) {
		if (this._points) this.engine.remove(this._points);

		const count = Math.min(data.length, this.opts.maxPoints);
		const positions = new Float32Array(count * 3);
		const colors = new Float32Array(count * 3);
		let hasColor = data[0]?.length >= 6;

		for (let i = 0; i < count; i++) {
			const p = data[i];
			positions[i * 3] = p[0];
			positions[i * 3 + 1] = p[1];
			positions[i * 3 + 2] = p[2];
			if (hasColor) {
				colors[i * 3] = (p[3] || 255) / 255;
				colors[i * 3 + 1] = (p[4] || 255) / 255;
				colors[i * 3 + 2] = (p[5] || 255) / 255;
			}
		}

		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		if (hasColor) {
			geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
		}

		const mat = new THREE.PointsMaterial({
			size: this.opts.pointSize,
			vertexColors: hasColor && !this.opts.color,
			color: this.opts.color ? new THREE.Color(this.opts.color) : (hasColor ? undefined : 0x6366f1),
			sizeAttenuation: true,
		});

		this._points = new THREE.Points(geo, mat);
		this.engine.add(this._points);
	}

	setPointSize(size) {
		if (this._points) this._points.material.size = size;
	}

	dispose() {
		this._points = null;
		this.engine?.dispose();
		this.container.innerHTML = "";
	}
}
