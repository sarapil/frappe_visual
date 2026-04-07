// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Interior Design Overlay — For Masar
 * =====================================
 * Extends ThreeEngine with interior-design-specific features:
 * - Room layout with walls, doors, windows
 * - Furniture placement with snap-to-wall
 * - Material/finish swapping (PBR textures)
 * - Catalog browser integration
 * - Client presentation mode (walkthrough camera)
 */

export class InteriorOverlay {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			wallHeight: 2.8,
			wallThickness: 0.15,
			wallColor: 0xf5f5f0,
			floorColor: 0xd4c4a8,
			furnitureSnapDistance: 0.3,
			showDimensions: true,
		}, opts);

		this._furniture = [];
		this._walls = [];
		this._roomGroup = null;
	}

	/**
	 * Build a room from a 2D floor plan polygon.
	 * @param {Array} points — [{x, z}] closed polygon
	 */
	buildRoom(points) {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		if (this._roomGroup) {
			this.engine.scene.remove(this._roomGroup);
		}
		this._roomGroup = new THREE.Group();
		this._roomGroup.name = "interior_room";

		// Floor
		const shape = new THREE.Shape();
		shape.moveTo(points[0].x, points[0].z);
		for (let i = 1; i < points.length; i++) {
			shape.lineTo(points[i].x, points[i].z);
		}
		shape.lineTo(points[0].x, points[0].z);

		const floorGeo = new THREE.ShapeGeometry(shape);
		floorGeo.rotateX(-Math.PI / 2);
		const floorMat = new THREE.MeshStandardMaterial({
			color: this.opts.floorColor,
			roughness: 0.8,
			metalness: 0.0,
		});
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.receiveShadow = true;
		floor.name = "floor";
		this._roomGroup.add(floor);

		// Walls
		this._walls = [];
		for (let i = 0; i < points.length; i++) {
			const a = points[i];
			const b = points[(i + 1) % points.length];
			const wall = this._createWall(a, b);
			this._walls.push(wall);
			this._roomGroup.add(wall);
		}

		this.engine.scene.add(this._roomGroup);
		return this._roomGroup;
	}

	_createWall(a, b) {
		const THREE = this.engine.THREE;
		const dx = b.x - a.x;
		const dz = b.z - a.z;
		const length = Math.sqrt(dx * dx + dz * dz);
		const angle = Math.atan2(dz, dx);

		const geo = new THREE.BoxGeometry(length, this.opts.wallHeight, this.opts.wallThickness);
		const mat = new THREE.MeshStandardMaterial({
			color: this.opts.wallColor,
			roughness: 0.9,
			metalness: 0.0,
		});
		const wall = new THREE.Mesh(geo, mat);
		wall.castShadow = true;
		wall.receiveShadow = true;

		wall.position.set(
			(a.x + b.x) / 2,
			this.opts.wallHeight / 2,
			(a.z + b.z) / 2
		);
		wall.rotation.y = -angle;
		wall.name = `wall_${this._walls.length}`;

		return wall;
	}

	/**
	 * Place a furniture item in the room.
	 * @param {THREE.Object3D} model — loaded 3D model
	 * @param {Object} position — {x, y, z}
	 * @param {number} rotationY — rotation in radians
	 */
	placeFurniture(model, position, rotationY = 0) {
		model.position.set(position.x, position.y || 0, position.z);
		model.rotation.y = rotationY;
		model.castShadow = true;
		model.receiveShadow = true;

		if (this._roomGroup) {
			this._roomGroup.add(model);
		} else {
			this.engine.scene.add(model);
		}

		this._furniture.push(model);
		return model;
	}

	/**
	 * Swap material on a mesh (e.g., change wood finish on a table).
	 * @param {string} meshName — name of the mesh in the scene
	 * @param {Object} materialOpts — { color, map, roughness, metalness, ... }
	 */
	swapMaterial(meshName, materialOpts) {
		const THREE = this.engine.THREE;
		const mesh = this.engine.scene.getObjectByName(meshName);
		if (!mesh?.isMesh) return;

		const mat = new THREE.MeshStandardMaterial({
			color: materialOpts.color || 0xffffff,
			roughness: materialOpts.roughness ?? 0.5,
			metalness: materialOpts.metalness ?? 0.0,
		});

		if (materialOpts.mapUrl) {
			const loader = new THREE.TextureLoader();
			loader.load(materialOpts.mapUrl, (texture) => {
				mat.map = texture;
				mat.needsUpdate = true;
			});
		}

		mesh.material.dispose();
		mesh.material = mat;
	}

	/**
	 * Enter presentation/walkthrough mode.
	 * Animates camera through a series of viewpoints.
	 */
	startPresentation(viewpoints, opts = {}) {
		const duration = opts.durationPerView || 3000;
		const camera = this.engine.camera;
		let idx = 0;

		const next = () => {
			if (idx >= viewpoints.length) {
				if (opts.loop) idx = 0;
				else return;
			}
			const vp = viewpoints[idx];
			this._animateCamera(camera, vp.position, vp.target, duration, () => {
				idx++;
				setTimeout(next, opts.pauseMs || 1000);
			});
		};
		next();
	}

	_animateCamera(camera, toPos, toTarget, duration, onComplete) {
		const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
		const start = performance.now();

		const animate = (now) => {
			const t = Math.min((now - start) / duration, 1);
			const ease = t * (2 - t); // easeOutQuad
			camera.position.set(
				startPos.x + (toPos.x - startPos.x) * ease,
				startPos.y + (toPos.y - startPos.y) * ease,
				startPos.z + (toPos.z - startPos.z) * ease
			);
			if (toTarget) {
				camera.lookAt(toTarget.x, toTarget.y, toTarget.z);
			}
			if (t < 1) {
				requestAnimationFrame(animate);
			} else {
				onComplete?.();
			}
		};
		requestAnimationFrame(animate);
	}

	/**
	 * Get list of all placed furniture.
	 */
	getFurnitureList() {
		return this._furniture.map(f => ({
			name: f.name,
			position: { x: f.position.x, y: f.position.y, z: f.position.z },
			rotation: f.rotation.y,
		}));
	}

	dispose() {
		if (this._roomGroup) {
			this.engine.scene.remove(this._roomGroup);
			this._roomGroup.traverse(child => {
				child.geometry?.dispose();
				if (child.material) {
					if (Array.isArray(child.material)) {
						child.material.forEach(m => m.dispose());
					} else {
						child.material.dispose();
					}
				}
			});
		}
		this._furniture = [];
		this._walls = [];
		this._roomGroup = null;
	}
}
