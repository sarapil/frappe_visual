// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * FloorPlan3D — Convert 2D floor plan data to interactive 3D model
 * =================================================================
 * Takes SceneGraph3D or wall/room JSON and extrudes it into 3D space
 * with textures, furniture, and optional first-person navigation.
 */

import { ThreeEngine } from "../core/three_engine.js";
import { MaterialLibrary } from "../core/material_library.js";

export class FloorPlan3D {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			floorPlan: null,       // JSON scene data or SceneGraph3D
			wallHeight: 2.8,
			wallThickness: 0.15,
			floorTexture: "tile",
			wallTexture: "plaster",
			ceilingVisible: false,
			furniture: true,
			walkable: false,
			minimap: false,
			lighting: "interior",
			background: "#e8e8e8",
		}, opts);
		this.engine = null;
		this.materialLib = new MaterialLibrary();
	}

	async init() {
		this.engine = new ThreeEngine(this.container, {
			antialias: true,
			shadows: true,
			background: this.opts.background,
			camera: {
				type: "perspective",
				fov: this.opts.walkable ? 75 : 50,
				position: this.opts.walkable ? [0, 1.7, 0] : [0, 10, 10],
			},
			controls: { type: "orbit", damping: true },
			lighting: this.opts.lighting,
		});
		await this.engine.init();

		if (this.opts.floorPlan) {
			await this._buildFromPlan(this.opts.floorPlan);
		}

		if (this.opts.minimap) this._addMinimap();

		return this;
	}

	async _buildFromPlan(plan) {
		const THREE = await import("three");
		const data = plan.objects || plan.walls || [];

		// Build floor plane
		const floorGeo = new THREE.PlaneGeometry(50, 50);
		const floorMat = this.materialLib.get(this.opts.floorTexture, { color: 0xcccccc });
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = -Math.PI / 2;
		floor.receiveShadow = true;
		this.engine.add(floor);

		// Build walls from plan data
		for (const item of data) {
			if (item.type === "wall" || item.type === "line") {
				await this._extrudeWall(THREE, item);
			} else if (item.type === "model" && this.opts.furniture && item.modelUrl) {
				await this._loadFurniture(item);
			} else if (item.type === "rect" || item.type === "room") {
				await this._extrudeRoom(THREE, item);
			}
		}

		// Optional ceiling
		if (this.opts.ceilingVisible) {
			const ceilGeo = new THREE.PlaneGeometry(50, 50);
			const ceilMat = this.materialLib.get("matte_white");
			const ceil = new THREE.Mesh(ceilGeo, ceilMat);
			ceil.rotation.x = Math.PI / 2;
			ceil.position.y = this.opts.wallHeight;
			this.engine.add(ceil);
		}

		this.engine.fitToView();
	}

	async _extrudeWall(THREE, wall) {
		const start = wall.start || wall.position || [0, 0];
		const end = wall.end || [start[0] + (wall.width || 3), start[1]];
		const dx = end[0] - start[0];
		const dz = (end[1] || 0) - (start[1] || 0);
		const length = Math.sqrt(dx * dx + dz * dz);
		const angle = Math.atan2(dz, dx);

		const geo = new THREE.BoxGeometry(length, this.opts.wallHeight, this.opts.wallThickness);
		const mat = this.materialLib.get(this.opts.wallTexture, { color: 0xf0ece0 });
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(
			(start[0] + end[0]) / 2,
			this.opts.wallHeight / 2,
			((start[1] || 0) + (end[1] || 0)) / 2
		);
		mesh.rotation.y = -angle;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		this.engine.add(mesh);
	}

	async _extrudeRoom(THREE, room) {
		const pos = room.position || [0, 0];
		const w = room.width || 4;
		const d = room.depth || room.height || 4;
		const h = this.opts.wallHeight;
		const t = this.opts.wallThickness;
		const mat = this.materialLib.get(this.opts.wallTexture, { color: 0xf0ece0 });

		// Four walls around the room
		const walls = [
			{ pos: [pos[0], h / 2, pos[1] - d / 2], size: [w, h, t] },           // front
			{ pos: [pos[0], h / 2, pos[1] + d / 2], size: [w, h, t] },           // back
			{ pos: [pos[0] - w / 2, h / 2, pos[1]], size: [t, h, d] },           // left
			{ pos: [pos[0] + w / 2, h / 2, pos[1]], size: [t, h, d] },           // right
		];

		for (const wd of walls) {
			const geo = new THREE.BoxGeometry(...wd.size);
			const mesh = new THREE.Mesh(geo, mat.clone());
			mesh.position.set(...wd.pos);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			this.engine.add(mesh);
		}
	}

	async _loadFurniture(item) {
		const { ModelLoader } = await import("../core/model_loader.js");
		const loader = new ModelLoader();
		const model = await loader.load(item.modelUrl, {
			position: item.position ? [item.position[0], 0, item.position[1] || 0] : [0, 0, 0],
			scale: item.scale || [1, 1, 1],
			shadows: true,
		});
		this.engine.add(model);
	}

	_addMinimap() {
		const minimap = document.createElement("canvas");
		minimap.className = "fv-fp3d-minimap";
		minimap.width = 150;
		minimap.height = 150;
		minimap.style.cssText = "position:absolute;bottom:10px;inset-inline-end:10px;border:2px solid var(--border-color,#ccc);border-radius:8px;background:#fff;z-index:10;";
		this.container.style.position = "relative";
		this.container.appendChild(minimap);
	}

	dispose() {
		this.materialLib.dispose();
		this.engine?.dispose();
		this.container.innerHTML = "";
	}
}
