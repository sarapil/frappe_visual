// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * MeasureTool3D — Distance / angle measurement in 3D scenes
 * ===========================================================
 * Click two points to measure distance; three points for angle.
 * Renders visual line + label between measurement points.
 */

export class MeasureTool3D {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			unit: "m",
			precision: 2,
			color: 0xf59e0b,
			lineWidth: 2,
		}, opts);
		this._active = false;
		this._points = [];
		this._markers = [];
		this._lines = [];
		this._labels = [];
		this._onClick = null;
	}

	async activate() {
		this._active = true;
		this._points = [];
		const canvas = this.engine._renderer?.domElement;
		if (!canvas) return;

		this._onClick = (e) => this._handleClick(e);
		canvas.addEventListener("click", this._onClick);
		canvas.style.cursor = "crosshair";
	}

	deactivate() {
		this._active = false;
		const canvas = this.engine._renderer?.domElement;
		if (canvas && this._onClick) {
			canvas.removeEventListener("click", this._onClick);
			canvas.style.cursor = "";
		}
		this._onClick = null;
	}

	async _handleClick(e) {
		if (!this._active) return;
		const THREE = await import("three");

		const rect = e.target.getBoundingClientRect();
		const mouse = new THREE.Vector2(
			((e.clientX - rect.left) / rect.width) * 2 - 1,
			-((e.clientY - rect.top) / rect.height) * 2 + 1
		);

		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(mouse, this.engine._camera);
		const intersects = raycaster.intersectObjects(this.engine._scene.children, true);

		if (!intersects.length) return;
		const point = intersects[0].point.clone();
		this._points.push(point);

		// Add marker sphere
		const geo = new THREE.SphereGeometry(0.05, 16, 16);
		const mat = new THREE.MeshBasicMaterial({ color: this.opts.color });
		const marker = new THREE.Mesh(geo, mat);
		marker.position.copy(point);
		this.engine.add(marker);
		this._markers.push(marker);

		if (this._points.length === 2) {
			this._drawMeasurement(THREE);
			this._points = [];
		}
	}

	_drawMeasurement(THREE) {
		const [a, b] = [this._points[0], this._points[1]];
		const distance = a.distanceTo(b);

		// Line
		const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
		const mat = new THREE.LineBasicMaterial({ color: this.opts.color, linewidth: this.opts.lineWidth });
		const line = new THREE.Line(geo, mat);
		this.engine.add(line);
		this._lines.push(line);

		// Label (sprite)
		const mid = a.clone().add(b).multiplyScalar(0.5);
		const text = `${distance.toFixed(this.opts.precision)} ${this.opts.unit}`;

		const canvas = document.createElement("canvas");
		canvas.width = 256;
		canvas.height = 64;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = "rgba(0,0,0,0.8)";
		ctx.fillRect(0, 0, 256, 64);
		ctx.fillStyle = "#fff";
		ctx.font = "bold 24px system-ui";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, 128, 32);

		const texture = new THREE.CanvasTexture(canvas);
		const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
		const sprite = new THREE.Sprite(spriteMat);
		sprite.position.copy(mid);
		sprite.position.y += 0.15;
		sprite.scale.set(1.5, 0.4, 1);
		this.engine.add(sprite);
		this._labels.push(sprite);
	}

	clearMeasurements() {
		[...this._markers, ...this._lines, ...this._labels].forEach(m => this.engine.remove(m));
		this._markers = [];
		this._lines = [];
		this._labels = [];
		this._points = [];
	}

	dispose() {
		this.deactivate();
		this.clearMeasurements();
	}
}
