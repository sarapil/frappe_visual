// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Construction Overlay — BIM Viewer for Vertex
 * ===============================================
 * Extends ThreeEngine with construction-specific features:
 * - BIM model loading (IFC via external parser)
 * - Progress heatmap (color-code by completion %)
 * - Phase filtering (show/hide by construction phase)
 * - Measurement overlay
 * - Safety zone visualization
 */

export class ConstructionOverlay {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			progressColors: {
				0: 0xff4444,    // Not started — red
				25: 0xff8800,   // 25% — orange
				50: 0xffcc00,   // 50% — yellow
				75: 0x44cc44,   // 75% — light green
				100: 0x00aa44,  // Complete — green
			},
			phaseColors: {
				foundation: 0x8B4513,
				structure: 0x808080,
				mep: 0x4169E1,
				finishing: 0xFFD700,
				landscape: 0x228B22,
			},
			safetyZoneColor: 0xff0000,
			safetyZoneOpacity: 0.15,
		}, opts);

		this._phaseGroups = {};
		this._progressMeshes = [];
		this._safetyZones = [];
		this._activePhases = new Set();
	}

	/**
	 * Apply progress heatmap to scene meshes.
	 * @param {Array} progressData — [{meshName, progress: 0-100}]
	 */
	applyProgressHeatmap(progressData) {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		for (const item of progressData) {
			const mesh = this.engine.scene.getObjectByName(item.meshName);
			if (!mesh?.isMesh) continue;

			const color = this._getProgressColor(item.progress);
			mesh.material = mesh.material.clone();
			mesh.material.color.setHex(color);
			mesh.material.transparent = true;
			mesh.material.opacity = 0.5 + (item.progress / 200);
			mesh.userData.progress = item.progress;
			this._progressMeshes.push(mesh);
		}
	}

	/**
	 * Organize scene objects into phase groups for filtering.
	 * @param {Object} phaseMap — { "foundation": ["mesh1", "mesh2"], "structure": [...] }
	 */
	setPhases(phaseMap) {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		for (const [phase, meshNames] of Object.entries(phaseMap)) {
			const group = new THREE.Group();
			group.name = `phase_${phase}`;

			for (const name of meshNames) {
				const obj = this.engine.scene.getObjectByName(name);
				if (obj) {
					group.add(obj);
				}
			}

			this._phaseGroups[phase] = group;
			this._activePhases.add(phase);
			this.engine.scene.add(group);
		}
	}

	/**
	 * Toggle visibility of a construction phase.
	 */
	togglePhase(phase, visible) {
		const group = this._phaseGroups[phase];
		if (!group) return;

		group.visible = visible;
		if (visible) {
			this._activePhases.add(phase);
		} else {
			this._activePhases.delete(phase);
		}
	}

	/**
	 * Show only specific phases.
	 */
	showOnlyPhases(phases) {
		for (const phase of Object.keys(this._phaseGroups)) {
			this.togglePhase(phase, phases.includes(phase));
		}
	}

	/**
	 * Add a safety zone (transparent colored volume).
	 */
	addSafetyZone(position, size, label = "") {
		const THREE = this.engine.THREE;
		if (!THREE) return;

		const geometry = new THREE.BoxGeometry(size.x || size, size.y || size, size.z || size);
		const material = new THREE.MeshBasicMaterial({
			color: this.opts.safetyZoneColor,
			transparent: true,
			opacity: this.opts.safetyZoneOpacity,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(position.x || 0, position.y || 0, position.z || 0);
		mesh.name = `safety_zone_${label || this._safetyZones.length}`;

		const edges = new THREE.EdgesGeometry(geometry);
		const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
			color: this.opts.safetyZoneColor,
			opacity: 0.5,
			transparent: true,
		}));
		mesh.add(line);

		this.engine.scene.add(mesh);
		this._safetyZones.push(mesh);
		return mesh;
	}

	/**
	 * Get summary of progress across all tracked meshes.
	 */
	getProgressSummary() {
		if (!this._progressMeshes.length) return { total: 0, average: 0, complete: 0 };

		let sum = 0;
		let complete = 0;
		for (const mesh of this._progressMeshes) {
			const p = mesh.userData.progress || 0;
			sum += p;
			if (p >= 100) complete++;
		}
		return {
			total: this._progressMeshes.length,
			average: Math.round(sum / this._progressMeshes.length),
			complete,
		};
	}

	_getProgressColor(progress) {
		const keys = Object.keys(this.opts.progressColors).map(Number).sort((a, b) => a - b);
		let color = this.opts.progressColors[keys[0]];
		for (const threshold of keys) {
			if (progress >= threshold) {
				color = this.opts.progressColors[threshold];
			}
		}
		return color;
	}

	dispose() {
		for (const zone of this._safetyZones) {
			zone.geometry?.dispose();
			zone.material?.dispose();
			this.engine.scene.remove(zone);
		}
		this._safetyZones = [];
		this._phaseGroups = {};
		this._progressMeshes = [];
	}
}
