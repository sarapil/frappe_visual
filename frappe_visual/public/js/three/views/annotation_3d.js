// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Annotation3D — Add/manage hotspot annotations on 3D models
 * ============================================================
 * Renders labeled markers in 3D space that face the camera (sprites)
 * and optionally show popover content on click.
 */

export class Annotation3D {
	constructor(engine) {
		this.engine = engine;
		this._annotations = [];
		this._sprites = [];
	}

	async add(annotation) {
		const THREE = await import("three");
		const { position, label, icon, color, content, onClick } = annotation;

		// Create sprite with canvas texture
		const canvas = document.createElement("canvas");
		canvas.width = 128;
		canvas.height = 48;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = color || "#6366f1";
		ctx.beginPath();
		ctx.arc(24, 24, 12, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#fff";
		ctx.font = "bold 14px system-ui";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(icon || "●", 24, 24);

		if (label) {
			ctx.fillStyle = "rgba(0,0,0,0.75)";
			const tw = ctx.measureText(label).width + 12;
			ctx.fillRect(40, 8, tw, 24);
			ctx.fillStyle = "#fff";
			ctx.font = "12px system-ui";
			ctx.textAlign = "start";
			ctx.fillText(label, 46, 22);
		}

		const texture = new THREE.CanvasTexture(canvas);
		const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
		const sprite = new THREE.Sprite(mat);
		sprite.position.set(...(position || [0, 0, 0]));
		sprite.scale.set(1.5, 0.6, 1);
		sprite.userData = { annotation: true, label, content, onClick };

		this.engine.add(sprite);
		this._sprites.push(sprite);
		this._annotations.push({ ...annotation, sprite });

		return sprite;
	}

	remove(index) {
		if (index >= 0 && index < this._sprites.length) {
			this.engine.remove(this._sprites[index]);
			this._sprites.splice(index, 1);
			this._annotations.splice(index, 1);
		}
	}

	clear() {
		this._sprites.forEach(s => this.engine.remove(s));
		this._sprites = [];
		this._annotations = [];
	}

	getAll() {
		return this._annotations.map(a => ({
			label: a.label,
			position: [a.sprite.position.x, a.sprite.position.y, a.sprite.position.z],
			content: a.content,
		}));
	}

	dispose() {
		this.clear();
	}
}
