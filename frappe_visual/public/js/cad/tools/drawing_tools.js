// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * DrawingTools — Pluggable tool system for 2D CAD canvas
 * ========================================================
 * State machine for tools: select, wall, rect, line, circle, measure, text, erase.
 * Tools register handlers for mousedown/move/up events in world coords.
 */

export class DrawingTools {
	constructor(engine, opts = {}) {
		this.engine = engine;
		this.opts = Object.assign({
			defaultTool: "select",
			snapEnabled: true,
		}, opts);

		this._tools = new Map();
		this._activeTool = null;
		this._drawing = false;
		this._startPoint = null;

		this._registerBuiltinTools();
		this._bindCanvasEvents();
		this.setTool(this.opts.defaultTool);
	}

	/** Register a custom tool */
	registerTool(name, handlers) {
		this._tools.set(name, {
			name,
			onStart: handlers.onStart || (() => {}),
			onMove: handlers.onMove || (() => {}),
			onEnd: handlers.onEnd || (() => {}),
			cursor: handlers.cursor || "crosshair",
			render: handlers.render || null,
		});
	}

	setTool(name) {
		const tool = this._tools.get(name);
		if (!tool) return;
		this._activeTool = tool;
		this.engine.canvas.style.cursor = tool.cursor;
		this._drawing = false;
	}

	getActiveTool() {
		return this._activeTool?.name;
	}

	_registerBuiltinTools() {
		// Select tool
		this.registerTool("select", {
			cursor: "default",
			onStart: (pt, ctx) => ctx.emit?.("select:start", pt),
			onMove: (pt, ctx) => ctx.emit?.("select:move", pt),
			onEnd: (pt, ctx) => ctx.emit?.("select:end", pt),
		});

		// Wall drawing tool
		this.registerTool("wall", {
			cursor: "crosshair",
			onStart: (pt, ctx) => { ctx.tempStart = pt; },
			onMove: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.preview = { type: "line", start: ctx.tempStart, end: pt, color: "#333", width: 4 };
				}
			},
			onEnd: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.emit?.("wall:create", { type: "wall", start: ctx.tempStart, end: pt });
					ctx.tempStart = null;
					ctx.preview = null;
				}
			},
		});

		// Rectangle tool
		this.registerTool("rect", {
			cursor: "crosshair",
			onStart: (pt, ctx) => { ctx.tempStart = pt; },
			onMove: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.preview = {
						type: "rect",
						x: Math.min(ctx.tempStart.x, pt.x),
						y: Math.min(ctx.tempStart.y, pt.y),
						width: Math.abs(pt.x - ctx.tempStart.x),
						height: Math.abs(pt.y - ctx.tempStart.y),
						color: "#6366f1",
					};
				}
			},
			onEnd: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.emit?.("rect:create", {
						type: "rect",
						x: Math.min(ctx.tempStart.x, pt.x),
						y: Math.min(ctx.tempStart.y, pt.y),
						width: Math.abs(pt.x - ctx.tempStart.x),
						height: Math.abs(pt.y - ctx.tempStart.y),
					});
					ctx.tempStart = null;
					ctx.preview = null;
				}
			},
		});

		// Line tool
		this.registerTool("line", {
			cursor: "crosshair",
			onStart: (pt, ctx) => { ctx.tempStart = pt; },
			onMove: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.preview = { type: "line", start: ctx.tempStart, end: pt, color: "#333", width: 1 };
				}
			},
			onEnd: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.emit?.("line:create", { type: "line", start: ctx.tempStart, end: pt });
					ctx.tempStart = null;
					ctx.preview = null;
				}
			},
		});

		// Measure tool
		this.registerTool("measure", {
			cursor: "crosshair",
			onStart: (pt, ctx) => { ctx.tempStart = pt; },
			onMove: (pt, ctx) => {
				if (ctx.tempStart) {
					const dx = pt.x - ctx.tempStart.x;
					const dy = pt.y - ctx.tempStart.y;
					const dist = Math.sqrt(dx * dx + dy * dy);
					ctx.preview = {
						type: "measure",
						start: ctx.tempStart,
						end: pt,
						distance: dist,
						color: "#f59e0b",
					};
				}
			},
			onEnd: (pt, ctx) => {
				if (ctx.tempStart) {
					ctx.emit?.("measure:result", {
						start: ctx.tempStart,
						end: pt,
						distance: Math.sqrt(
							(pt.x - ctx.tempStart.x) ** 2 + (pt.y - ctx.tempStart.y) ** 2
						),
					});
					ctx.tempStart = null;
					ctx.preview = null;
				}
			},
		});

		// Erase tool
		this.registerTool("erase", {
			cursor: "not-allowed",
			onStart: (pt, ctx) => ctx.emit?.("erase:at", pt),
		});

		// Text tool
		this.registerTool("text", {
			cursor: "text",
			onStart: (pt, ctx) => ctx.emit?.("text:place", pt),
		});
	}

	_bindCanvasEvents() {
		const canvas = this.engine.canvas;
		this._ctx = { preview: null, tempStart: null, listeners: {} };

		this._ctx.emit = (event, data) => {
			const cbs = this._ctx.listeners[event] || [];
			cbs.forEach(cb => cb(data));
		};

		canvas.addEventListener("pointerdown", (e) => {
			if (e.button !== 0 || e.altKey) return;
			const rect = canvas.getBoundingClientRect();
			const pt = this.engine.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
			this._drawing = true;
			this._activeTool?.onStart(pt, this._ctx);
		});

		canvas.addEventListener("pointermove", (e) => {
			if (!this._drawing) return;
			const rect = canvas.getBoundingClientRect();
			const pt = this.engine.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
			this._activeTool?.onMove(pt, this._ctx);
			this.engine.render();
		});

		canvas.addEventListener("pointerup", (e) => {
			if (!this._drawing) return;
			const rect = canvas.getBoundingClientRect();
			const pt = this.engine.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
			this._activeTool?.onEnd(pt, this._ctx);
			this._drawing = false;
			this.engine.render();
		});

		// Register preview render layer in engine
		this.engine.addLayer("tool-preview", (ctx, eng) => {
			const p = this._ctx.preview;
			if (!p) return;
			ctx.save();
			ctx.strokeStyle = p.color || "#333";
			ctx.lineWidth = (p.width || 1) / eng.zoom;
			ctx.setLineDash([5 / eng.zoom, 5 / eng.zoom]);

			if (p.type === "line" || p.type === "measure") {
				ctx.beginPath();
				ctx.moveTo(p.start.x, p.start.y);
				ctx.lineTo(p.end.x, p.end.y);
				ctx.stroke();
				if (p.distance !== undefined) {
					const mx = (p.start.x + p.end.x) / 2;
					const my = (p.start.y + p.end.y) / 2;
					ctx.setLineDash([]);
					ctx.font = `${12 / eng.zoom}px system-ui`;
					ctx.fillStyle = p.color;
					ctx.fillText(`${p.distance.toFixed(1)}`, mx, my - 5 / eng.zoom);
				}
			} else if (p.type === "rect") {
				ctx.strokeRect(p.x, p.y, p.width, p.height);
			}
			ctx.restore();
		});
	}

	/** Listen for tool events */
	on(event, callback) {
		if (!this._ctx.listeners[event]) this._ctx.listeners[event] = [];
		this._ctx.listeners[event].push(callback);
	}

	dispose() {
		this._tools.clear();
		this._ctx = null;
	}
}
