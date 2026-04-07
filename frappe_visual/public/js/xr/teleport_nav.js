// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * TeleportNav — Arc Teleportation for VR
 * ========================================
 * Parabolic arc visualization from controller → landing point.
 * Uses raycasting against a designated floor/navmesh layer.
 */

export class TeleportNav {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			arcSegments: 40,
			arcVelocity: 5,
			gravity: -9.8,
			maxDistance: 15,
			validColor: 0x00ff88,
			invalidColor: 0xff4444,
			indicatorRadius: 0.25,
			floorY: 0,
			navMeshFilter: null, // optional: function(intersect) => bool
		}, opts);

		this._arcLine = null;
		this._indicator = null;
		this._targetPos = null;
		this._isValid = false;
		this._active = false;
	}

	/**
	 * Initialize visual elements
	 */
	init() {
		const THREE = this.engine.THREE;
		if (!THREE) return this;

		// Arc line
		const positions = new Float32Array(this.opts.arcSegments * 3);
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		const material = new THREE.LineBasicMaterial({
			color: this.opts.validColor,
			transparent: true,
			opacity: 0.6,
		});
		this._arcLine = new THREE.Line(geometry, material);
		this._arcLine.visible = false;
		this._arcLine.frustumCulled = false;
		this.engine.scene.add(this._arcLine);

		// Landing indicator (ring + disc)
		const ringGeo = new THREE.RingGeometry(
			this.opts.indicatorRadius * 0.8,
			this.opts.indicatorRadius,
			32
		);
		ringGeo.rotateX(-Math.PI / 2);
		const ringMat = new THREE.MeshBasicMaterial({
			color: this.opts.validColor,
			transparent: true,
			opacity: 0.5,
			side: THREE.DoubleSide,
		});
		this._indicator = new THREE.Mesh(ringGeo, ringMat);
		this._indicator.visible = false;
		this.engine.scene.add(this._indicator);

		return this;
	}

	/**
	 * Begin showing the teleport arc from a controller pose
	 */
	startAiming() {
		this._active = true;
		if (this._arcLine) this._arcLine.visible = true;
	}

	/**
	 * Stop aiming and teleport if valid
	 * Returns the target position or null if invalid
	 */
	endAiming() {
		this._active = false;
		if (this._arcLine) this._arcLine.visible = false;
		if (this._indicator) this._indicator.visible = false;

		if (this._isValid && this._targetPos) {
			const pos = { ...this._targetPos };
			return pos;
		}
		return null;
	}

	/**
	 * Update the arc visualization — call per frame while aiming
	 * @param {Object} origin - {x, y, z} controller position
	 * @param {Object} direction - {x, y, z} controller forward direction (unit vector)
	 */
	update(origin, direction) {
		if (!this._active || !this._arcLine) return;

		const THREE = this.engine.THREE;
		const segments = this.opts.arcSegments;
		const v0 = this.opts.arcVelocity;
		const g = this.opts.gravity;
		const dt = 0.03;

		const positions = this._arcLine.geometry.attributes.position.array;

		let x = origin.x;
		let y = origin.y;
		let z = origin.z;
		let vx = direction.x * v0;
		let vy = direction.y * v0;
		let vz = direction.z * v0;

		let hitPoint = null;
		let hitValid = false;

		for (let i = 0; i < segments; i++) {
			positions[i * 3] = x;
			positions[i * 3 + 1] = y;
			positions[i * 3 + 2] = z;

			x += vx * dt;
			y += vy * dt;
			z += vz * dt;
			vy += g * dt;

			// Check floor intersection
			if (!hitPoint && y <= this.opts.floorY) {
				// Interpolate exact hit
				const prevY = positions[(i) * 3 + 1];
				const t = (prevY - this.opts.floorY) / (prevY - y);
				hitPoint = {
					x: positions[i * 3] + (x - positions[i * 3]) * t,
					y: this.opts.floorY,
					z: positions[i * 3 + 2] + (z - positions[i * 3 + 2]) * t,
				};

				// Validate with nav mesh filter
				hitValid = true;
				if (this.opts.navMeshFilter) {
					hitValid = this.opts.navMeshFilter(hitPoint);
				}

				const dist = Math.sqrt(
					(hitPoint.x - origin.x) ** 2 +
					(hitPoint.z - origin.z) ** 2
				);
				if (dist > this.opts.maxDistance) hitValid = false;

				// Fill remaining segments at hit point
				for (let j = i + 1; j < segments; j++) {
					positions[j * 3] = hitPoint.x;
					positions[j * 3 + 1] = hitPoint.y;
					positions[j * 3 + 2] = hitPoint.z;
				}
				break;
			}

			// Safety: stop if too far below floor
			if (y < this.opts.floorY - 5) {
				for (let j = i + 1; j < segments; j++) {
					positions[j * 3] = x;
					positions[j * 3 + 1] = y;
					positions[j * 3 + 2] = z;
				}
				break;
			}
		}

		this._arcLine.geometry.attributes.position.needsUpdate = true;

		// Update colors based on validity
		const color = hitValid ? this.opts.validColor : this.opts.invalidColor;
		this._arcLine.material.color.setHex(color);

		// Update indicator
		if (hitPoint) {
			this._indicator.visible = true;
			this._indicator.position.set(hitPoint.x, hitPoint.y + 0.01, hitPoint.z);
			this._indicator.material.color.setHex(color);
			this._targetPos = hitPoint;
			this._isValid = hitValid;
		} else {
			this._indicator.visible = false;
			this._targetPos = null;
			this._isValid = false;
		}
	}

	/**
	 * Apply teleportation to a camera rig
	 * @param {THREE.Object3D} rig — the camera rig/group to move
	 * @param {Object} targetPos — {x, y, z}
	 */
	applyTeleport(rig, targetPos) {
		if (!targetPos) return;
		rig.position.set(targetPos.x, targetPos.y, targetPos.z);
	}

	/**
	 * Set navigable area bounds
	 */
	setNavFilter(filterFn) {
		this.opts.navMeshFilter = filterFn;
	}

	dispose() {
		this._active = false;
		if (this._arcLine) {
			this._arcLine.geometry?.dispose();
			this._arcLine.material?.dispose();
			this.engine.scene.remove(this._arcLine);
		}
		if (this._indicator) {
			this._indicator.geometry?.dispose();
			this._indicator.material?.dispose();
			this.engine.scene.remove(this._indicator);
		}
		this._arcLine = null;
		this._indicator = null;
	}
}
