// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Hospitality Overlay — For Velara & Candela
 * =============================================
 * Extends ThreeEngine with hospitality-specific features:
 * - Interactive floor plan with room status (available/occupied/cleaning)
 * - Table layout for restaurants (candela)
 * - Real-time occupancy heatmap
 * - Guest wayfinding (highlight path to room)
 * - Virtual room tour mode
 */

export class HospitalityOverlay {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			statusColors: {
				available: 0x22c55e,   // green
				occupied: 0xef4444,    // red
				cleaning: 0xf59e0b,   // amber
				maintenance: 0x6b7280, // gray
				reserved: 0x3b82f6,   // blue
				checkout: 0xa855f7,   // purple
			},
			highlightOpacity: 0.6,
			pathColor: 0x3b82f6,
			pathWidth: 0.1,
		}, opts);

		this._unitMeshes = new Map(); // name -> { mesh, status }
		this._pathLine = null;
	}

	/**
	 * Register rooms/tables as interactive units.
	 * @param {Array} units — [{name, meshName, type: "room"|"table", status}]
	 */
	registerUnits(units) {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		for (const unit of units) {
			const mesh = this.engine.scene.getObjectByName(unit.meshName);
			if (!mesh) continue;

			mesh.userData.unitName = unit.name;
			mesh.userData.unitType = unit.type;
			mesh.userData.status = unit.status;

			this._applyStatusColor(mesh, unit.status);
			this._unitMeshes.set(unit.name, { mesh, status: unit.status, type: unit.type });
		}
	}

	/**
	 * Update the status of a unit (room/table).
	 */
	updateStatus(unitName, newStatus) {
		const entry = this._unitMeshes.get(unitName);
		if (!entry) return;

		entry.status = newStatus;
		entry.mesh.userData.status = newStatus;
		this._applyStatusColor(entry.mesh, newStatus);
	}

	/**
	 * Batch update statuses (e.g., from real-time API).
	 * @param {Object} statusMap — { "Room 101": "occupied", "Room 102": "available" }
	 */
	batchUpdateStatus(statusMap) {
		for (const [name, status] of Object.entries(statusMap)) {
			this.updateStatus(name, status);
		}
	}

	/**
	 * Get occupancy summary.
	 */
	getOccupancySummary() {
		const summary = {};
		for (const [, entry] of this._unitMeshes) {
			const s = entry.status || "unknown";
			summary[s] = (summary[s] || 0) + 1;
		}
		summary.total = this._unitMeshes.size;
		return summary;
	}

	/**
	 * Highlight a path from point A to point B (wayfinding).
	 * @param {Array} waypoints — [{x, y, z}]
	 */
	showPath(waypoints) {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		this.clearPath();

		const points = waypoints.map(w => new THREE.Vector3(w.x, w.y || 0.05, w.z));
		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const material = new THREE.LineBasicMaterial({
			color: this.opts.pathColor,
			linewidth: 2,
		});
		this._pathLine = new THREE.Line(geometry, material);
		this._pathLine.name = "wayfinding_path";
		this.engine.scene.add(this._pathLine);
	}

	/**
	 * Clear the wayfinding path.
	 */
	clearPath() {
		if (this._pathLine) {
			this._pathLine.geometry?.dispose();
			this._pathLine.material?.dispose();
			this.engine.scene.remove(this._pathLine);
			this._pathLine = null;
		}
	}

	/**
	 * Fly camera to a specific unit (room/table).
	 */
	focusUnit(unitName, opts = {}) {
		const entry = this._unitMeshes.get(unitName);
		if (!entry) return;

		const mesh = entry.mesh;
		const camera = this.engine.camera;
		const offset = opts.offset || { x: 2, y: 3, z: 2 };
		const target = mesh.position.clone();
		const destination = target.clone().add(
			new this.engine.THREE.Vector3(offset.x, offset.y, offset.z)
		);

		this._animateTo(camera, destination, target, opts.duration || 1000);
	}

	/**
	 * Get units filtered by status.
	 */
	getUnitsByStatus(status) {
		const results = [];
		for (const [name, entry] of this._unitMeshes) {
			if (entry.status === status) {
				results.push({ name, type: entry.type, position: entry.mesh.position });
			}
		}
		return results;
	}

	_applyStatusColor(mesh, status) {
		const color = this.opts.statusColors[status] || 0x6b7280;
		if (mesh.isMesh && mesh.material) {
			mesh.material = mesh.material.clone();
			mesh.material.color.setHex(color);
			mesh.material.transparent = true;
			mesh.material.opacity = this.opts.highlightOpacity;
		}
		mesh.traverse(child => {
			if (child.isMesh && child !== mesh) {
				child.material = child.material.clone();
				child.material.color.setHex(color);
				child.material.transparent = true;
				child.material.opacity = this.opts.highlightOpacity;
			}
		});
	}

	_animateTo(camera, toPos, lookTarget, duration) {
		const startPos = camera.position.clone();
		const start = performance.now();

		const animate = (now) => {
			const t = Math.min((now - start) / duration, 1);
			const ease = t * (2 - t);
			camera.position.lerpVectors(startPos, toPos, ease);
			camera.lookAt(lookTarget);
			if (t < 1) requestAnimationFrame(animate);
		};
		requestAnimationFrame(animate);
	}

	dispose() {
		this.clearPath();
		this._unitMeshes.clear();
	}
}
