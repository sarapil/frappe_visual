/**
 * Frappe Visual — SignaturePad
 * ===============================
 * Canvas-based signature capture with smooth Bézier interpolation,
 * undo/redo, line width/color options, and export to PNG/SVG/DataURL.
 *
 * Usage:
 *   const pad = frappe.visual.SignaturePad.create('#el', {
 *     width: 500,
 *     height: 200,
 *     onChange: dataUrl => console.log(dataUrl)
 *   })
 *   pad.toDataURL('image/png')
 *   pad.clear()
 *
 * @module frappe_visual/components/signature_pad
 */

export class SignaturePad {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("SignaturePad: container not found");

		this.opts = Object.assign({
			theme: "glass",
			width: 0,               // 0 = auto from container
			height: 200,
			lineWidth: 2.5,
			lineColor: "#1e293b",
			backgroundColor: "transparent",
			showControls: true,
			showGuide: true,         // faint baseline
			placeholder: __("Sign here"),
			readOnly: false,
			onChange: null,
		}, opts);

		this._strokes = [];         // array of stroke arrays [{x,y,t}]
		this._undone = [];
		this._drawing = false;
		this._currentStroke = [];
		this._isEmpty = true;
		this._init();
	}

	static create(container, opts = {}) { return new SignaturePad(container, opts); }

	_init() {
		this.container.classList.add("fv-sig", `fv-sig--${this.opts.theme}`);
		this.container.innerHTML = "";

		const w = this.opts.width || this.container.clientWidth || 500;
		const h = this.opts.height;
		this._width = w;
		this._height = h;

		// Canvas wrapper
		const wrap = document.createElement("div");
		wrap.className = "fv-sig-canvas-wrap";
		wrap.style.width = w + "px";
		wrap.style.height = h + "px";
		this.container.appendChild(wrap);

		// Canvas
		this._canvas = document.createElement("canvas");
		this._canvas.width = w * 2; // HiDPI
		this._canvas.height = h * 2;
		this._canvas.style.width = w + "px";
		this._canvas.style.height = h + "px";
		this._canvas.className = "fv-sig-canvas";
		wrap.appendChild(this._canvas);

		this._ctx = this._canvas.getContext("2d");
		this._ctx.scale(2, 2);
		this._ctx.lineCap = "round";
		this._ctx.lineJoin = "round";

		// Placeholder
		if (this.opts.placeholder) {
			this._placeholderEl = document.createElement("div");
			this._placeholderEl.className = "fv-sig-placeholder";
			this._placeholderEl.textContent = this.opts.placeholder;
			wrap.appendChild(this._placeholderEl);
		}

		// Guide line
		if (this.opts.showGuide) {
			this._drawGuide();
		}

		// Controls
		if (this.opts.showControls && !this.opts.readOnly) {
			const controls = document.createElement("div");
			controls.className = "fv-sig-controls";
			controls.innerHTML = `
				<button type="button" class="fv-sig-btn fv-sig-btn--undo" title="${__("Undo")}">↩</button>
				<button type="button" class="fv-sig-btn fv-sig-btn--redo" title="${__("Redo")}">↪</button>
				<span class="fv-sig-spacer"></span>
				<button type="button" class="fv-sig-btn fv-sig-btn--clear" title="${__("Clear")}">${__("Clear")}</button>`;
			controls.querySelector(".fv-sig-btn--undo").addEventListener("click", () => this.undo());
			controls.querySelector(".fv-sig-btn--redo").addEventListener("click", () => this.redo());
			controls.querySelector(".fv-sig-btn--clear").addEventListener("click", () => this.clear());
			this.container.appendChild(controls);
		}

		if (!this.opts.readOnly) this._bindEvents();
	}

	_bindEvents() {
		const getPos = (e) => {
			const rect = this._canvas.getBoundingClientRect();
			const touch = e.touches ? e.touches[0] : e;
			return { x: touch.clientX - rect.left, y: touch.clientY - rect.top, t: Date.now() };
		};

		const start = (e) => {
			e.preventDefault();
			this._drawing = true;
			this._currentStroke = [getPos(e)];
			this._ctx.beginPath();
			this._ctx.strokeStyle = this.opts.lineColor;
			this._ctx.lineWidth = this.opts.lineWidth;
			const p = this._currentStroke[0];
			this._ctx.moveTo(p.x, p.y);
		};

		const move = (e) => {
			if (!this._drawing) return;
			e.preventDefault();
			const p = getPos(e);
			this._currentStroke.push(p);

			// Smooth drawing with quadratic bezier
			if (this._currentStroke.length >= 3) {
				const len = this._currentStroke.length;
				const p0 = this._currentStroke[len - 3];
				const p1 = this._currentStroke[len - 2];
				const p2 = this._currentStroke[len - 1];
				const mx = (p1.x + p2.x) / 2;
				const my = (p1.y + p2.y) / 2;

				this._ctx.quadraticCurveTo(p1.x, p1.y, mx, my);
				this._ctx.stroke();
			} else {
				this._ctx.lineTo(p.x, p.y);
				this._ctx.stroke();
			}

			this._hidePlaceholder();
		};

		const end = () => {
			if (!this._drawing) return;
			this._drawing = false;
			if (this._currentStroke.length > 0) {
				this._strokes.push([...this._currentStroke]);
				this._undone = [];
				this._isEmpty = false;
				this._emitChange();
			}
			this._currentStroke = [];
		};

		// Mouse events
		this._canvas.addEventListener("mousedown", start);
		this._canvas.addEventListener("mousemove", move);
		document.addEventListener("mouseup", end);

		// Touch events
		this._canvas.addEventListener("touchstart", start, { passive: false });
		this._canvas.addEventListener("touchmove", move, { passive: false });
		this._canvas.addEventListener("touchend", end);

		this._cleanup = () => {
			document.removeEventListener("mouseup", end);
		};
	}

	_drawGuide() {
		this._ctx.save();
		this._ctx.strokeStyle = "#e2e8f0";
		this._ctx.lineWidth = 1;
		this._ctx.setLineDash([4, 4]);
		this._ctx.beginPath();
		this._ctx.moveTo(20, this._height * 0.72);
		this._ctx.lineTo(this._width - 20, this._height * 0.72);
		this._ctx.stroke();
		this._ctx.restore();
	}

	_redraw() {
		this._ctx.clearRect(0, 0, this._width, this._height);
		if (this.opts.showGuide) this._drawGuide();

		this._ctx.strokeStyle = this.opts.lineColor;
		this._ctx.lineWidth = this.opts.lineWidth;
		this._ctx.lineCap = "round";
		this._ctx.lineJoin = "round";

		for (const stroke of this._strokes) {
			if (stroke.length < 2) continue;
			this._ctx.beginPath();
			this._ctx.moveTo(stroke[0].x, stroke[0].y);

			for (let i = 1; i < stroke.length - 1; i++) {
				const mx = (stroke[i].x + stroke[i + 1].x) / 2;
				const my = (stroke[i].y + stroke[i + 1].y) / 2;
				this._ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, mx, my);
			}

			const last = stroke[stroke.length - 1];
			this._ctx.lineTo(last.x, last.y);
			this._ctx.stroke();
		}

		this._isEmpty = this._strokes.length === 0;
		if (this._isEmpty) this._showPlaceholder();
		else this._hidePlaceholder();
	}

	_hidePlaceholder() {
		if (this._placeholderEl) this._placeholderEl.style.opacity = "0";
	}

	_showPlaceholder() {
		if (this._placeholderEl) this._placeholderEl.style.opacity = "1";
	}

	_emitChange() {
		if (this.opts.onChange) this.opts.onChange(this.toDataURL());
	}

	/* ── Public API ──────────────────────────────────────────── */
	undo() {
		if (this._strokes.length === 0) return;
		this._undone.push(this._strokes.pop());
		this._redraw();
		this._emitChange();
	}

	redo() {
		if (this._undone.length === 0) return;
		this._strokes.push(this._undone.pop());
		this._redraw();
		this._emitChange();
	}

	clear() {
		this._strokes = [];
		this._undone = [];
		this._redraw();
		this._emitChange();
	}

	isEmpty() { return this._isEmpty; }

	toDataURL(type = "image/png", quality = 1.0) {
		return this._canvas.toDataURL(type, quality);
	}

	toBlob(callback, type = "image/png", quality = 1.0) {
		this._canvas.toBlob(callback, type, quality);
	}

	toSVG() {
		let paths = "";
		for (const stroke of this._strokes) {
			if (stroke.length < 2) continue;
			let d = `M ${stroke[0].x} ${stroke[0].y}`;
			for (let i = 1; i < stroke.length - 1; i++) {
				const mx = (stroke[i].x + stroke[i + 1].x) / 2;
				const my = (stroke[i].y + stroke[i + 1].y) / 2;
				d += ` Q ${stroke[i].x} ${stroke[i].y} ${mx} ${my}`;
			}
			const last = stroke[stroke.length - 1];
			d += ` L ${last.x} ${last.y}`;
			paths += `<path d="${d}" fill="none" stroke="${this.opts.lineColor}" stroke-width="${this.opts.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
		}
		return `<svg xmlns="http://www.w3.org/2000/svg" width="${this._width}" height="${this._height}" viewBox="0 0 ${this._width} ${this._height}">${paths}</svg>`;
	}

	fromDataURL(dataUrl) {
		const img = new Image();
		img.onload = () => {
			this._ctx.clearRect(0, 0, this._width, this._height);
			this._ctx.drawImage(img, 0, 0, this._width, this._height);
			this._isEmpty = false;
			this._hidePlaceholder();
		};
		img.src = dataUrl;
	}

	destroy() {
		if (this._cleanup) this._cleanup();
		this.container.innerHTML = "";
		this.container.classList.remove("fv-sig", `fv-sig--${this.opts.theme}`);
	}
}
