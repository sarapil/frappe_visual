// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * SceneControls — Raycasting, object selection, and hover for 3D scenes
 * =====================================================================
 * Wraps Three.js Raycaster with a clean event API for picking objects
 * in a ThreeEngine scene.
 */

import * as THREE from "three";

export class SceneControls {
	constructor(engine) {
		this.engine = engine;
		this._raycaster = new THREE.Raycaster();
		this._mouse = new THREE.Vector2();
		this._selected = null;
		this._hovered = null;
		this._originalColors = new Map();

		this._onMouseMove = this._handleMouseMove.bind(this);
		this._onClick = this._handleClick.bind(this);

		this.engine.renderer.domElement.addEventListener("mousemove", this._onMouseMove);
		this.engine.renderer.domElement.addEventListener("click", this._onClick);
	}

	_updateMouse(event) {
		const rect = this.engine.renderer.domElement.getBoundingClientRect();
		this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	_raycast() {
		this._raycaster.setFromCamera(this._mouse, this.engine.camera);
		const intersects = this._raycaster.intersectObjects(
			this.engine.objectGroup.children, true
		);
		if (intersects.length === 0) return null;

		// Walk up to find the direct child of objectGroup
		let obj = intersects[0].object;
		while (obj.parent && obj.parent !== this.engine.objectGroup) {
			obj = obj.parent;
		}
		return { object: obj, point: intersects[0].point, distance: intersects[0].distance };
	}

	_handleMouseMove(event) {
		this._updateMouse(event);
		const hit = this._raycast();
		const newHovered = hit ? hit.object : null;

		if (newHovered !== this._hovered) {
			if (this._hovered && this._hovered !== this._selected) {
				this._restoreColor(this._hovered);
			}
			this._hovered = newHovered;
			if (this._hovered && this._hovered !== this._selected) {
				this._setEmissive(this._hovered, 0x333333);
			}
			this.engine.renderer.domElement.style.cursor = this._hovered ? "pointer" : "default";
			for (const cb of this.engine._eventHandlers.hover) {
				cb(this._hovered, hit);
			}
		}
	}

	_handleClick(event) {
		this._updateMouse(event);
		const hit = this._raycast();

		if (this._selected) {
			this._restoreColor(this._selected);
		}

		this._selected = hit ? hit.object : null;

		if (this._selected) {
			this._setEmissive(this._selected, 0x6366f1);
		}

		for (const cb of this.engine._eventHandlers.select) {
			cb(this._selected, hit);
		}
	}

	_setEmissive(object, color) {
		object.traverse((child) => {
			if (child.isMesh && child.material) {
				if (!this._originalColors.has(child.uuid)) {
					this._originalColors.set(child.uuid,
						child.material.emissive ? child.material.emissive.getHex() : 0
					);
				}
				if (child.material.emissive) {
					child.material.emissive.setHex(color);
				}
			}
		});
	}

	_restoreColor(object) {
		object.traverse((child) => {
			if (child.isMesh && child.material?.emissive) {
				const original = this._originalColors.get(child.uuid) || 0;
				child.material.emissive.setHex(original);
				this._originalColors.delete(child.uuid);
			}
		});
	}

	/** Get currently selected object */
	getSelected() { return this._selected; }

	/** Clear selection */
	clearSelection() {
		if (this._selected) {
			this._restoreColor(this._selected);
			this._selected = null;
		}
	}

	dispose() {
		this.engine.renderer.domElement.removeEventListener("mousemove", this._onMouseMove);
		this.engine.renderer.domElement.removeEventListener("click", this._onClick);
		this._originalColors.clear();
	}
}
