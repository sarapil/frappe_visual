// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Coworking Overlay — For ARKSpace
 * ==================================
 * Extends ThreeEngine with coworking-specific features:
 * - Desk/seat availability map
 * - Meeting room booking visualization
 * - Real-time occupancy tracking
 * - Hot-desk selection interface
 * - Capacity indicators per zone
 */

export class CoworkingOverlay {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			deskColors: {
				available: 0x22c55e,
				occupied: 0xef4444,
				reserved: 0x3b82f6,
				disabled: 0x9ca3af,
			},
			zoneColors: [0x6366f1, 0x14b8a6, 0xf59e0b, 0xec4899, 0x8b5cf6],
			selectionColor: 0xfbbf24,
			selectionEmissive: 0x332200,
		}, opts);

		this._desks = new Map();
		this._zones = new Map();
		this._selectedDesk = null;
		this._onSelect = null;
	}

	/**
	 * Register desks/seats.
	 * @param {Array} desks — [{name, meshName, zone, status, capacity?}]
	 */
	registerDesks(desks) {
		for (const desk of desks) {
			const mesh = this.engine.scene.getObjectByName(desk.meshName);
			if (!mesh) continue;

			mesh.userData.deskName = desk.name;
			mesh.userData.zone = desk.zone;
			mesh.userData.status = desk.status;
			mesh.userData.capacity = desk.capacity || 1;

			this._applyDeskColor(mesh, desk.status);
			this._desks.set(desk.name, { mesh, ...desk });

			// Track zones
			if (desk.zone && !this._zones.has(desk.zone)) {
				this._zones.set(desk.zone, []);
			}
			if (desk.zone) {
				this._zones.get(desk.zone).push(desk.name);
			}
		}
	}

	/**
	 * Enable click-to-select on available desks.
	 * @param {Function} callback — (deskName, deskData) => {}
	 */
	enableSelection(callback) {
		this._onSelect = callback;
		const raycaster = new this.engine.THREE.Raycaster();
		const mouse = new this.engine.THREE.Vector2();

		const meshes = [];
		for (const [, desk] of this._desks) {
			if (desk.status === "available") {
				meshes.push(desk.mesh);
			}
		}

		const container = this.engine.renderer.domElement;
		container.addEventListener("click", (event) => {
			const rect = container.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			raycaster.setFromCamera(mouse, this.engine.camera);
			const intersects = raycaster.intersectObjects(meshes, true);

			if (intersects.length > 0) {
				let obj = intersects[0].object;
				while (obj && !obj.userData.deskName) {
					obj = obj.parent;
				}
				if (obj?.userData.deskName) {
					this.selectDesk(obj.userData.deskName);
				}
			}
		});
	}

	/**
	 * Programmatically select a desk.
	 */
	selectDesk(deskName) {
		// Deselect previous
		if (this._selectedDesk) {
			const prev = this._desks.get(this._selectedDesk);
			if (prev) this._applyDeskColor(prev.mesh, prev.status);
		}

		const desk = this._desks.get(deskName);
		if (!desk) return;

		this._selectedDesk = deskName;

		// Highlight selection
		if (desk.mesh.isMesh && desk.mesh.material) {
			desk.mesh.material = desk.mesh.material.clone();
			desk.mesh.material.color.setHex(this.opts.selectionColor);
			desk.mesh.material.emissive?.setHex(this.opts.selectionEmissive);
		}

		this._onSelect?.(deskName, desk);
	}

	/**
	 * Update desk status.
	 */
	updateDeskStatus(deskName, newStatus) {
		const desk = this._desks.get(deskName);
		if (!desk) return;
		desk.status = newStatus;
		desk.mesh.userData.status = newStatus;
		if (deskName !== this._selectedDesk) {
			this._applyDeskColor(desk.mesh, newStatus);
		}
	}

	/**
	 * Get zone occupancy stats.
	 */
	getZoneStats() {
		const stats = {};
		for (const [zone, deskNames] of this._zones) {
			let total = 0;
			let occupied = 0;
			let available = 0;
			for (const name of deskNames) {
				const desk = this._desks.get(name);
				if (!desk) continue;
				total += desk.capacity || 1;
				if (desk.status === "occupied") occupied += desk.capacity || 1;
				if (desk.status === "available") available += desk.capacity || 1;
			}
			stats[zone] = { total, occupied, available, occupancy: total ? Math.round((occupied / total) * 100) : 0 };
		}
		return stats;
	}

	/**
	 * Get overall occupancy.
	 */
	getOverallOccupancy() {
		let total = 0;
		let occupied = 0;
		for (const [, desk] of this._desks) {
			total += desk.capacity || 1;
			if (desk.status === "occupied") occupied += desk.capacity || 1;
		}
		return { total, occupied, percentage: total ? Math.round((occupied / total) * 100) : 0 };
	}

	/**
	 * Highlight an entire zone.
	 */
	highlightZone(zoneName) {
		const deskNames = this._zones.get(zoneName);
		if (!deskNames) return;

		const colorIdx = [...this._zones.keys()].indexOf(zoneName);
		const zoneColor = this.opts.zoneColors[colorIdx % this.opts.zoneColors.length];

		for (const name of deskNames) {
			const desk = this._desks.get(name);
			if (desk?.mesh?.isMesh) {
				desk.mesh.material = desk.mesh.material.clone();
				desk.mesh.material.emissive?.setHex(zoneColor);
				desk.mesh.material.emissiveIntensity = 0.3;
			}
		}
	}

	_applyDeskColor(mesh, status) {
		const color = this.opts.deskColors[status] || this.opts.deskColors.disabled;
		if (mesh.isMesh && mesh.material) {
			mesh.material = mesh.material.clone();
			mesh.material.color.setHex(color);
			mesh.material.transparent = true;
			mesh.material.opacity = 0.7;
			if (mesh.material.emissive) mesh.material.emissive.setHex(0x000000);
		}
	}

	dispose() {
		this._desks.clear();
		this._zones.clear();
		this._selectedDesk = null;
		this._onSelect = null;
	}
}
