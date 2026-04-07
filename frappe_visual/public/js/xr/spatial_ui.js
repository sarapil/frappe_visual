// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * SpatialUI — VR-compatible floating UI panels
 * ================================================
 * Creates HTML-CSS panels that render as textures on planes in 3D space
 * for use inside VR/AR sessions. Supports interactive buttons and text.
 */

export class SpatialUI {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			panelWidth: 1.0,
			panelHeight: 0.6,
			resolution: 512,
			background: "rgba(26, 26, 46, 0.92)",
			textColor: "#ffffff",
			fontSize: 24,
			borderRadius: 16,
		}, opts);
		this._panels = [];
	}

	/**
	 * Create a floating info panel in 3D space
	 */
	createPanel(content, position = [0, 1.5, -2]) {
		const THREE = this.engine.THREE;
		if (!THREE) return null;

		const canvas = document.createElement("canvas");
		const w = this.opts.resolution;
		const h = Math.round(w * (this.opts.panelHeight / this.opts.panelWidth));
		canvas.width = w;
		canvas.height = h;

		this._renderPanelContent(canvas, content);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;

		const geometry = new THREE.PlaneGeometry(this.opts.panelWidth, this.opts.panelHeight);
		const material = new THREE.MeshBasicMaterial({
			map: texture,
			transparent: true,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(position[0], position[1], position[2]);

		this.engine.scene.add(mesh);

		const panel = { mesh, canvas, texture, content };
		this._panels.push(panel);
		return panel;
	}

	/**
	 * Update panel content
	 */
	updatePanel(panel, content) {
		panel.content = content;
		this._renderPanelContent(panel.canvas, content);
		panel.texture.needsUpdate = true;
	}

	/**
	 * Make panel face the camera (billboard mode)
	 */
	enableBillboard(panel) {
		panel._billboard = true;
		const animate = () => {
			if (!panel._billboard) return;
			const camera = this.engine.camera;
			if (camera) {
				panel.mesh.lookAt(camera.position);
			}
			requestAnimationFrame(animate);
		};
		animate();
	}

	_renderPanelContent(canvas, content) {
		const ctx = canvas.getContext("2d");
		const w = canvas.width;
		const h = canvas.height;
		const r = this.opts.borderRadius * (w / this.opts.resolution);

		// Background
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = this.opts.background;
		this._roundRect(ctx, 0, 0, w, h, r);
		ctx.fill();

		// Border
		ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
		ctx.lineWidth = 2;
		this._roundRect(ctx, 1, 1, w - 2, h - 2, r);
		ctx.stroke();

		ctx.fillStyle = this.opts.textColor;

		if (typeof content === "string") {
			// Simple text
			ctx.font = `${this.opts.fontSize}px system-ui, sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(content, w / 2, h / 2);
		} else if (content && typeof content === "object") {
			let y = 40;

			// Title
			if (content.title) {
				ctx.font = `bold ${this.opts.fontSize * 1.2}px system-ui, sans-serif`;
				ctx.textAlign = "center";
				ctx.fillText(content.title, w / 2, y);
				y += this.opts.fontSize * 1.6;
			}

			// Key-value pairs
			if (content.items) {
				ctx.font = `${this.opts.fontSize * 0.8}px system-ui, sans-serif`;
				ctx.textAlign = "start";
				for (const item of content.items) {
					ctx.fillStyle = "rgba(255,255,255,0.6)";
					ctx.fillText(item.label, 30, y);
					ctx.fillStyle = item.color || this.opts.textColor;
					ctx.textAlign = "end";
					ctx.fillText(item.value, w - 30, y);
					ctx.textAlign = "start";
					y += this.opts.fontSize * 1.3;
				}
			}
		}
	}

	_roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
	}

	removePanel(panel) {
		panel._billboard = false;
		panel.mesh.geometry?.dispose();
		panel.mesh.material?.map?.dispose();
		panel.mesh.material?.dispose();
		this.engine.scene.remove(panel.mesh);
		this._panels = this._panels.filter(p => p !== panel);
	}

	dispose() {
		for (const panel of [...this._panels]) {
			this.removePanel(panel);
		}
	}
}
