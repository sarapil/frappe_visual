// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * SceneGraph3D — Serializable 3D scene data model
 * =================================================
 * JSON-serializable data structure representing a 3D scene
 * with objects, transforms, materials, and metadata.
 */

export class SceneGraph3D {
	constructor(data = {}) {
		this.objects = data.objects || [];
		this.lights = data.lights || [];
		this.camera = data.camera || { position: [0, 5, 10], target: [0, 0, 0], fov: 50 };
		this.environment = data.environment || { background: "#f0f0f0", lighting: "studio" };
		this.meta = data.meta || { unit: "m", scale: 1, gridSize: 1 };
		this._nextId = data._nextId || 1;
	}

	/** Add an object to the scene */
	addObject(obj) {
		const id = obj.id || `obj_${this._nextId++}`;
		const entry = {
			id,
			type: obj.type || "model",
			label: obj.label || "",
			modelUrl: obj.modelUrl || null,
			geometry: obj.geometry || null,
			material: obj.material || "matte_gray",
			position: obj.position || [0, 0, 0],
			rotation: obj.rotation || [0, 0, 0],
			scale: obj.scale || [1, 1, 1],
			visible: obj.visible !== false,
			userData: obj.userData || {},
		};
		this.objects.push(entry);
		return entry;
	}

	/** Remove an object by ID */
	removeObject(id) {
		const idx = this.objects.findIndex(o => o.id === id);
		if (idx >= 0) return this.objects.splice(idx, 1)[0];
		return null;
	}

	/** Get object by ID */
	getObject(id) {
		return this.objects.find(o => o.id === id) || null;
	}

	/** Update an existing object */
	updateObject(id, updates) {
		const obj = this.getObject(id);
		if (obj) Object.assign(obj, updates);
		return obj;
	}

	/** Get all objects of a given type */
	getObjectsByType(type) {
		return this.objects.filter(o => o.type === type);
	}

	/** Serialize to JSON */
	toJSON() {
		return {
			objects: this.objects,
			lights: this.lights,
			camera: this.camera,
			environment: this.environment,
			meta: this.meta,
			_nextId: this._nextId,
		};
	}

	/** Deserialize from JSON */
	static fromJSON(json) {
		const data = typeof json === "string" ? JSON.parse(json) : json;
		return new SceneGraph3D(data);
	}

	/** Deep clone */
	clone() {
		return SceneGraph3D.fromJSON(JSON.parse(JSON.stringify(this.toJSON())));
	}

	/** Clear all objects */
	clear() {
		this.objects = [];
		this.lights = [];
		this._nextId = 1;
	}

	/** Object count */
	get count() {
		return this.objects.length;
	}
}
