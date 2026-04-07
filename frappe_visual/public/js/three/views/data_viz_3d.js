// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * DataViz3D — 3D chart visualizations (bar, scatter, surface)
 * =============================================================
 * Renders data as interactive 3D charts using Three.js.
 */

import { ThreeEngine } from "../core/three_engine.js";
import { MaterialLibrary } from "../core/material_library.js";

export class DataViz3D {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			type: "bar3d",          // "bar3d" | "scatter3d" | "surface" | "force-directed-3d"
			data: [],
			labels: { x: "X", y: "Y", z: "Z" },
			colors: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
			background: "#1a1a2e",
			lighting: "studio",
			animated: true,
		}, opts);
		this.engine = null;
		this.materialLib = new MaterialLibrary();
		this._meshes = [];
	}

	async init() {
		this.engine = new ThreeEngine(this.container, {
			antialias: true,
			shadows: true,
			background: this.opts.background,
			lighting: this.opts.lighting,
			controls: { type: "orbit", damping: true },
		});
		await this.engine.init();
		await this._build();
		this.engine.fitToView();
		return this;
	}

	async _build() {
		switch (this.opts.type) {
			case "bar3d": await this._buildBars(); break;
			case "scatter3d": await this._buildScatter(); break;
			case "surface": await this._buildSurface(); break;
			case "force-directed-3d": await this._buildForceGraph(); break;
		}
	}

	async _buildBars() {
		const THREE = await import("three");
		const data = this.opts.data;
		const maxVal = Math.max(...data.map(d => d.value || d.y || 1));

		data.forEach((d, i) => {
			const h = ((d.value || d.y || 0) / maxVal) * 5;
			const geo = new THREE.BoxGeometry(0.6, h, 0.6);
			const color = new THREE.Color(this.opts.colors[i % this.opts.colors.length]);
			const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
			const mesh = new THREE.Mesh(geo, mat);
			mesh.position.set(
				(d.x !== undefined ? d.x : i) * 1.2 - (data.length * 0.6),
				h / 2,
				d.z || 0
			);
			mesh.castShadow = true;
			mesh.userData = { label: d.label, value: d.value || d.y };
			this.engine.add(mesh);
			this._meshes.push(mesh);
		});

		this._addAxes(THREE);
	}

	async _buildScatter() {
		const THREE = await import("three");
		const geo = new THREE.SphereGeometry(0.1, 16, 16);

		this.opts.data.forEach((d, i) => {
			const color = new THREE.Color(this.opts.colors[i % this.opts.colors.length]);
			const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
			const mesh = new THREE.Mesh(geo.clone(), mat);
			mesh.position.set(d.x || 0, d.y || 0, d.z || 0);
			mesh.userData = { label: d.label, value: d.value };
			this.engine.add(mesh);
			this._meshes.push(mesh);
		});

		this._addAxes(THREE);
	}

	async _buildSurface() {
		const THREE = await import("three");
		const data = this.opts.data;
		if (!data.length || !data[0].length) return;

		const rows = data.length;
		const cols = data[0].length;
		const geo = new THREE.PlaneGeometry(cols - 1, rows - 1, cols - 1, rows - 1);
		const positions = geo.attributes.position;

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const idx = r * cols + c;
				positions.setZ(idx, data[r][c] || 0);
			}
		}
		geo.computeVertexNormals();

		const mat = new THREE.MeshStandardMaterial({
			color: 0x6366f1,
			side: THREE.DoubleSide,
			wireframe: false,
			roughness: 0.4,
			metalness: 0.1,
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.rotation.x = -Math.PI / 2;
		this.engine.add(mesh);
		this._meshes.push(mesh);
	}

	async _buildForceGraph() {
		const THREE = await import("three");
		const { nodes = [], edges = [] } = this.opts.data;
		const nodeSpheres = new Map();

		nodes.forEach((n, i) => {
			const geo = new THREE.SphereGeometry(0.2, 16, 16);
			const color = new THREE.Color(this.opts.colors[i % this.opts.colors.length]);
			const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
			const mesh = new THREE.Mesh(geo, mat);
			// Random initial position
			mesh.position.set(
				(Math.random() - 0.5) * 10,
				(Math.random() - 0.5) * 10,
				(Math.random() - 0.5) * 10
			);
			mesh.userData = { id: n.id, label: n.label };
			this.engine.add(mesh);
			this._meshes.push(mesh);
			nodeSpheres.set(n.id, mesh);
		});

		// Draw edges as lines
		edges.forEach(e => {
			const from = nodeSpheres.get(e.source);
			const to = nodeSpheres.get(e.target);
			if (!from || !to) return;
			const geo = new THREE.BufferGeometry().setFromPoints([from.position, to.position]);
			const mat = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.5 });
			const line = new THREE.Line(geo, mat);
			this.engine.add(line);
			this._meshes.push(line);
		});
	}

	_addAxes(THREE) {
		const axes = new THREE.AxesHelper(5);
		this.engine.add(axes);
	}

	update(newData) {
		// Clear existing
		this._meshes.forEach(m => this.engine.remove(m));
		this._meshes = [];
		this.opts.data = newData;
		this._build();
		this.engine.fitToView();
	}

	dispose() {
		this._meshes = [];
		this.materialLib.dispose();
		this.engine?.dispose();
		this.container.innerHTML = "";
	}
}
