// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * Canvas2DEngine — Viewport management for 2D CAD editing
 * =========================================================
 * Provides zoom, pan, grid, DPR-aware rendering, and coordinate
 * transforms for a canvas-based 2D editor.
 */

export class Canvas2DEngine {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		this.opts = Object.assign({
			gridSize: 10,
			gridColor: "#e0e0e0",
			gridMajorColor: "#c0c0c0",
			gridMajorEvery: 5,
			background: "#ffffff",
			minZoom: 0.1,
			maxZoom: 20,
			initialZoom: 1,
			showGrid: true,
			units: "cm",
		}, opts);

		this.canvas = null;
		this.ctx = null;
		this.dpr = window.devicePixelRatio || 1;

		// View transform
		this.zoom = this.opts.initialZoom;
		this.panX = 0;
		this.panY = 0;

		// State
		this._isPanning = false;
		this._lastMouse = { x: 0, y: 0 };
		this._layers = [];
		this._resizeObserver = null;
	}

	init() {
		this.canvas = document.createElement("canvas");
		this.canvas.style.cssText = "width:100%;height:100%;display:block;cursor:default;";
		this.container.appendChild(this.canvas);
		this.ctx = this.canvas.getContext("2d");

		this._resize();
		this._resizeObserver = new ResizeObserver(() => this._resize());
		this._resizeObserver.observe(this.container);

		this._bindEvents();
		this.render();
		return this;
	}

	_resize() {
		const rect = this.container.getBoundingClientRect();
		this.canvas.width = rect.width * this.dpr;
		this.canvas.height = rect.height * this.dpr;
		this.canvas.style.width = `${rect.width}px`;
		this.canvas.style.height = `${rect.height}px`;
		this.render();
	}

	_bindEvents() {
		this.canvas.addEventListener("wheel", (e) => {
			e.preventDefault();
			const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
			const newZoom = Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, this.zoom * zoomFactor));

			// Zoom toward mouse
			const rect = this.canvas.getBoundingClientRect();
			const mx = e.clientX - rect.left;
			const my = e.clientY - rect.top;
			this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
			this.panY = my - (my - this.panY) * (newZoom / this.zoom);
			this.zoom = newZoom;
			this.render();
		}, { passive: false });

		this.canvas.addEventListener("pointerdown", (e) => {
			if (e.button === 1 || (e.button === 0 && e.altKey)) {
				this._isPanning = true;
				this._lastMouse = { x: e.clientX, y: e.clientY };
				this.canvas.setPointerCapture(e.pointerId);
			}
		});

		this.canvas.addEventListener("pointermove", (e) => {
			if (this._isPanning) {
				this.panX += e.clientX - this._lastMouse.x;
				this.panY += e.clientY - this._lastMouse.y;
				this._lastMouse = { x: e.clientX, y: e.clientY };
				this.render();
			}
		});

		this.canvas.addEventListener("pointerup", () => {
			this._isPanning = false;
		});
	}

	/** Convert screen coords to world coords */
	screenToWorld(sx, sy) {
		return {
			x: (sx - this.panX) / this.zoom,
			y: (sy - this.panY) / this.zoom,
		};
	}

	/** Convert world coords to screen coords */
	worldToScreen(wx, wy) {
		return {
			x: wx * this.zoom + this.panX,
			y: wy * this.zoom + this.panY,
		};
	}

	/** Register a render layer (callback) */
	addLayer(name, renderFn) {
		this._layers.push({ name, render: renderFn });
	}

	removeLayer(name) {
		this._layers = this._layers.filter(l => l.name !== name);
	}

	/** Main render loop */
	render() {
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

		// Background
		ctx.fillStyle = this.opts.background;
		ctx.fillRect(0, 0, w / this.dpr, h / this.dpr);

		// Grid
		if (this.opts.showGrid) this._drawGrid();

		// Apply view transform for layers
		ctx.save();
		ctx.translate(this.panX, this.panY);
		ctx.scale(this.zoom, this.zoom);

		// Render each layer
		this._layers.forEach(layer => layer.render(ctx, this));

		ctx.restore();
	}

	_drawGrid() {
		const ctx = this.ctx;
		const gs = this.opts.gridSize * this.zoom;
		if (gs < 3) return; // Too small to draw

		const w = this.canvas.width / this.dpr;
		const h = this.canvas.height / this.dpr;
		const offsetX = this.panX % gs;
		const offsetY = this.panY % gs;
		const majorEvery = this.opts.gridMajorEvery;

		const startCol = Math.floor(-this.panX / gs);
		const startRow = Math.floor(-this.panY / gs);

		ctx.beginPath();
		for (let x = offsetX; x < w; x += gs) {
			const col = startCol + Math.round((x - offsetX) / gs);
			ctx.strokeStyle = (col % majorEvery === 0) ? this.opts.gridMajorColor : this.opts.gridColor;
			ctx.lineWidth = (col % majorEvery === 0) ? 0.5 : 0.25;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, h);
			ctx.stroke();
		}
		for (let y = offsetY; y < h; y += gs) {
			const row = startRow + Math.round((y - offsetY) / gs);
			ctx.strokeStyle = (row % majorEvery === 0) ? this.opts.gridMajorColor : this.opts.gridColor;
			ctx.lineWidth = (row % majorEvery === 0) ? 0.5 : 0.25;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}
	}

	/** Reset view to origin */
	resetView() {
		this.zoom = this.opts.initialZoom;
		this.panX = this.canvas.width / (2 * this.dpr);
		this.panY = this.canvas.height / (2 * this.dpr);
		this.render();
	}

	/** Fit a bounding box into view */
	fitBounds(minX, minY, maxX, maxY, padding = 50) {
		const w = this.canvas.width / this.dpr;
		const h = this.canvas.height / this.dpr;
		const bw = maxX - minX;
		const bh = maxY - minY;
		if (bw === 0 || bh === 0) return;

		this.zoom = Math.min((w - padding * 2) / bw, (h - padding * 2) / bh);
		this.panX = (w / 2) - ((minX + bw / 2) * this.zoom);
		this.panY = (h / 2) - ((minY + bh / 2) * this.zoom);
		this.render();
	}

	dispose() {
		this._resizeObserver?.disconnect();
		this._layers = [];
		this.container.innerHTML = "";
	}
}
