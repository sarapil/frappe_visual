// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Color Picker Pro
 * ==================================
 * Advanced color selection with spectrum canvas, opacity slider,
 * palette swatches, gradient builder, color format conversion,
 * and eyedropper API support.
 *
 * Features:
 *  - HSV spectrum canvas with crosshair + hue strip
 *  - Opacity / alpha slider
 *  - HEX / RGB / HSL input fields with live conversion
 *  - Preset swatch palettes (Material, Tailwind, Frappe brand)
 *  - Recent colors memory (localStorage)
 *  - Gradient builder (linear/radial, multi-stop)
 *  - EyeDropper API (Chrome 95+) integration
 *  - Copy-to-clipboard button
 *  - Inline or popup mode
 *  - Dark mode / RTL / glass theme
 *
 * API:
 *   frappe.visual.ColorPicker.create('#el', { value: '#3B82F6' })
 *
 * @module frappe_visual/components/color_picker
 */

/* ── Palettes ────────────────────────────────────────────────── */
const MATERIAL = [
	"#F44336","#E91E63","#9C27B0","#673AB7","#3F51B5","#2196F3",
	"#03A9F4","#00BCD4","#009688","#4CAF50","#8BC34A","#CDDC39",
	"#FFEB3B","#FFC107","#FF9800","#FF5722","#795548","#9E9E9E","#607D8B",
];
const TAILWIND = [
	"#EF4444","#F97316","#F59E0B","#EAB308","#84CC16","#22C55E",
	"#10B981","#14B8A6","#06B6D4","#0EA5E9","#3B82F6","#6366F1",
	"#8B5CF6","#A855F7","#D946EF","#EC4899","#F43F5E",
];
const FRAPPE = [
	"#2490EF","#7C3AED","#E24C18","#ECAD4B","#29CD42","#00BCD4",
	"#FF5722","#6C757D","#36414C","#1E293B",
];
const LS_KEY = "fv_color_picker_recent";

export class ColorPicker {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("ColorPicker: container not found");

		this.opts = Object.assign({
			theme: "glass",
			value: "#3B82F6",
			alpha: true,
			gradientMode: false,
			showSwatches: true,
			showEyedropper: true,
			showInput: true,
			popup: false,
			onChange: null,
		}, opts);

		this._hsv = { h: 0, s: 100, v: 100 };
		this._alpha = 1;
		this._format = "hex"; // hex | rgb | hsl
		this._recentColors = this._loadRecent();

		// Gradient state
		this._gradient = {
			type: "linear",
			angle: 90,
			stops: [
				{ color: "#3B82F6", pos: 0 },
				{ color: "#8B5CF6", pos: 100 },
			],
		};

		this._parseColor(this.opts.value);
		this._init();
	}

	static create(container, opts) { return new ColorPicker(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-cp", `fv-cp--${this.opts.theme}`);
		if (this.opts.popup) this.container.classList.add("fv-cp--popup");
		this._render();
		this._bindEvents();
		this._updateAll();
	}

	_render() {
		this.container.innerHTML = `
		<div class="fv-cp-inner">
			<!-- Spectrum -->
			<div class="fv-cp-spectrum-wrap">
				<canvas class="fv-cp-spectrum" width="220" height="160"></canvas>
				<div class="fv-cp-crosshair"></div>
			</div>

			<!-- Hue strip -->
			<div class="fv-cp-strip-row">
				<div class="fv-cp-hue-wrap">
					<canvas class="fv-cp-hue" width="180" height="14"></canvas>
					<div class="fv-cp-hue-thumb"></div>
				</div>
				${this.opts.alpha ? `
				<div class="fv-cp-alpha-wrap">
					<canvas class="fv-cp-alpha" width="180" height="14"></canvas>
					<div class="fv-cp-alpha-thumb"></div>
				</div>` : ""}
			</div>

			<!-- Color preview + eyedropper -->
			<div class="fv-cp-preview-row">
				<div class="fv-cp-preview-swatch"></div>
				${this.opts.showEyedropper && window.EyeDropper ? `<button class="fv-cp-btn fv-cp-eyedropper" title="${__("Pick from screen")}">💉</button>` : ""}
				<button class="fv-cp-btn fv-cp-copy" title="${__("Copy")}">📋</button>
			</div>

			<!-- Input fields -->
			${this.opts.showInput ? `
			<div class="fv-cp-input-row">
				<select class="fv-cp-format">
					<option value="hex">HEX</option>
					<option value="rgb">RGB</option>
					<option value="hsl">HSL</option>
				</select>
				<input class="fv-cp-input" spellcheck="false" />
			</div>` : ""}

			<!-- Swatches -->
			${this.opts.showSwatches ? `
			<div class="fv-cp-swatch-section">
				<div class="fv-cp-swatch-tabs">
					<button class="fv-cp-stab active" data-pal="material">${__("Material")}</button>
					<button class="fv-cp-stab" data-pal="tailwind">${__("Tailwind")}</button>
					<button class="fv-cp-stab" data-pal="frappe">${__("Frappe")}</button>
					<button class="fv-cp-stab" data-pal="recent">${__("Recent")}</button>
				</div>
				<div class="fv-cp-swatches"></div>
			</div>` : ""}

			<!-- Gradient builder -->
			${this.opts.gradientMode ? `
			<div class="fv-cp-gradient-section">
				<div class="fv-cp-gradient-bar"></div>
				<div class="fv-cp-gradient-controls">
					<select class="fv-cp-grad-type">
						<option value="linear">${__("Linear")}</option>
						<option value="radial">${__("Radial")}</option>
					</select>
					<input class="fv-cp-grad-angle" type="number" min="0" max="360" value="90" /> °
				</div>
			</div>` : ""}
		</div>`;
	}

	/* ── Canvas Drawing ──────────────────────────────────────── */
	_drawSpectrum() {
		const canvas = this.container.querySelector(".fv-cp-spectrum");
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		const w = canvas.width, h = canvas.height;

		// Hue base
		ctx.fillStyle = `hsl(${this._hsv.h}, 100%, 50%)`;
		ctx.fillRect(0, 0, w, h);

		// White gradient left→right
		const gw = ctx.createLinearGradient(0, 0, w, 0);
		gw.addColorStop(0, "rgba(255,255,255,1)");
		gw.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = gw;
		ctx.fillRect(0, 0, w, h);

		// Black gradient top→bottom
		const gb = ctx.createLinearGradient(0, 0, 0, h);
		gb.addColorStop(0, "rgba(0,0,0,0)");
		gb.addColorStop(1, "rgba(0,0,0,1)");
		ctx.fillStyle = gb;
		ctx.fillRect(0, 0, w, h);
	}

	_drawHueStrip() {
		const canvas = this.container.querySelector(".fv-cp-hue");
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		const w = canvas.width, h = canvas.height;
		const gradient = ctx.createLinearGradient(0, 0, w, 0);
		for (let i = 0; i <= 6; i++) {
			gradient.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
		}
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, w, h);
	}

	_drawAlphaStrip() {
		const canvas = this.container.querySelector(".fv-cp-alpha");
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		const w = canvas.width, h = canvas.height;

		// Checker pattern
		const sz = 5;
		for (let x = 0; x < w; x += sz) {
			for (let y = 0; y < h; y += sz) {
				ctx.fillStyle = ((x / sz + y / sz) % 2) ? "#ccc" : "#fff";
				ctx.fillRect(x, y, sz, sz);
			}
		}

		const rgb = this._hsvToRgb(this._hsv.h, this._hsv.s, this._hsv.v);
		const gradient = ctx.createLinearGradient(0, 0, w, 0);
		gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
		gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, w, h);
	}

	/* ── Events ──────────────────────────────────────────────── */
	_bindEvents() {
		this._bindSpectrumDrag();
		this._bindHueDrag();
		if (this.opts.alpha) this._bindAlphaDrag();

		// Eyedropper
		const eyeBtn = this.container.querySelector(".fv-cp-eyedropper");
		if (eyeBtn) eyeBtn.addEventListener("click", () => this._eyedrop());

		// Copy
		const copyBtn = this.container.querySelector(".fv-cp-copy");
		if (copyBtn) copyBtn.addEventListener("click", () => this._copyColor());

		// Format selector
		const fmtSel = this.container.querySelector(".fv-cp-format");
		if (fmtSel) fmtSel.addEventListener("change", (e) => { this._format = e.target.value; this._updateInput(); });

		// Input
		const inp = this.container.querySelector(".fv-cp-input");
		if (inp) inp.addEventListener("change", (e) => { this._parseColor(e.target.value); this._updateAll(); });

		// Swatch tabs
		this.container.querySelectorAll(".fv-cp-stab").forEach(btn => {
			btn.addEventListener("click", () => {
				this.container.querySelectorAll(".fv-cp-stab").forEach(b => b.classList.remove("active"));
				btn.classList.add("active");
				this._renderSwatches(btn.dataset.pal);
			});
		});

		if (this.opts.showSwatches) this._renderSwatches("material");
	}

	_bindSpectrumDrag() {
		const canvas = this.container.querySelector(".fv-cp-spectrum");
		if (!canvas) return;

		const onMove = (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = Math.max(0, Math.min(canvas.width, (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left));
			const y = Math.max(0, Math.min(canvas.height, (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top));
			this._hsv.s = (x / canvas.width) * 100;
			this._hsv.v = 100 - (y / canvas.height) * 100;
			this._updateAll();
		};

		canvas.addEventListener("mousedown", (e) => {
			onMove(e);
			const up = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", up); };
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", up);
		});
	}

	_bindHueDrag() {
		const canvas = this.container.querySelector(".fv-cp-hue");
		if (!canvas) return;

		const onMove = (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = Math.max(0, Math.min(canvas.width, (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left));
			this._hsv.h = (x / canvas.width) * 360;
			this._updateAll();
		};

		canvas.addEventListener("mousedown", (e) => {
			onMove(e);
			const up = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", up); };
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", up);
		});
	}

	_bindAlphaDrag() {
		const canvas = this.container.querySelector(".fv-cp-alpha");
		if (!canvas) return;

		const onMove = (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = Math.max(0, Math.min(canvas.width, (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left));
			this._alpha = x / canvas.width;
			this._updateAll();
		};

		canvas.addEventListener("mousedown", (e) => {
			onMove(e);
			const up = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", up); };
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", up);
		});
	}

	/* ── Swatches ────────────────────────────────────────────── */
	_renderSwatches(palette) {
		const el = this.container.querySelector(".fv-cp-swatches");
		if (!el) return;

		let colors;
		switch (palette) {
			case "tailwind": colors = TAILWIND; break;
			case "frappe":   colors = FRAPPE; break;
			case "recent":   colors = this._recentColors; break;
			default:         colors = MATERIAL;
		}

		el.innerHTML = colors.map(c =>
			`<button class="fv-cp-swatch" style="background:${c}" data-color="${c}" title="${c}"></button>`
		).join("");

		el.querySelectorAll(".fv-cp-swatch").forEach(btn => {
			btn.addEventListener("click", () => {
				this._parseColor(btn.dataset.color);
				this._updateAll();
			});
		});
	}

	/* ── Eyedropper ──────────────────────────────────────────── */
	async _eyedrop() {
		if (!window.EyeDropper) return;
		try {
			const dropper = new EyeDropper();
			const result = await dropper.open();
			if (result?.sRGBHex) {
				this._parseColor(result.sRGBHex);
				this._updateAll();
			}
		} catch { /* user cancelled */ }
	}

	/* ── Copy ────────────────────────────────────────────────── */
	_copyColor() {
		const val = this._getFormattedColor();
		navigator.clipboard?.writeText(val).then(() => {
			frappe.show_alert({ message: __("Copied: {0}", [val]), indicator: "green" });
		});
	}

	/* ── Update All ──────────────────────────────────────────── */
	_updateAll() {
		this._drawSpectrum();
		this._drawHueStrip();
		if (this.opts.alpha) this._drawAlphaStrip();
		this._updateCrosshair();
		this._updateHueThumb();
		if (this.opts.alpha) this._updateAlphaThumb();
		this._updatePreview();
		this._updateInput();
		this._emit();
	}

	_updateCrosshair() {
		const ch = this.container.querySelector(".fv-cp-crosshair");
		const canvas = this.container.querySelector(".fv-cp-spectrum");
		if (!ch || !canvas) return;
		ch.style.left = `${(this._hsv.s / 100) * canvas.width}px`;
		ch.style.top = `${(1 - this._hsv.v / 100) * canvas.height}px`;
	}

	_updateHueThumb() {
		const thumb = this.container.querySelector(".fv-cp-hue-thumb");
		const canvas = this.container.querySelector(".fv-cp-hue");
		if (!thumb || !canvas) return;
		thumb.style.left = `${(this._hsv.h / 360) * canvas.width}px`;
	}

	_updateAlphaThumb() {
		const thumb = this.container.querySelector(".fv-cp-alpha-thumb");
		const canvas = this.container.querySelector(".fv-cp-alpha");
		if (!thumb || !canvas) return;
		thumb.style.left = `${this._alpha * canvas.width}px`;
	}

	_updatePreview() {
		const el = this.container.querySelector(".fv-cp-preview-swatch");
		if (el) el.style.background = this._getFormattedColor("rgb");
	}

	_updateInput() {
		const inp = this.container.querySelector(".fv-cp-input");
		if (inp) inp.value = this._getFormattedColor();
	}

	/* ── Color Conversion ────────────────────────────────────── */
	_hsvToRgb(h, s, v) {
		s /= 100; v /= 100;
		const c = v * s;
		const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = v - c;
		let r, g, b;
		if (h < 60) { r = c; g = x; b = 0; }
		else if (h < 120) { r = x; g = c; b = 0; }
		else if (h < 180) { r = 0; g = c; b = x; }
		else if (h < 240) { r = 0; g = x; b = c; }
		else if (h < 300) { r = x; g = 0; b = c; }
		else { r = c; g = 0; b = x; }
		return {
			r: Math.round((r + m) * 255),
			g: Math.round((g + m) * 255),
			b: Math.round((b + m) * 255),
		};
	}

	_rgbToHsv(r, g, b) {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		const d = max - min;
		let h = 0, s = max === 0 ? 0 : d / max, v = max;
		if (d !== 0) {
			if (max === r) h = ((g - b) / d) % 6;
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h = Math.round(h * 60);
			if (h < 0) h += 360;
		}
		return { h, s: s * 100, v: v * 100 };
	}

	_rgbToHsl(r, g, b) {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h = 0, s = 0, l = (max + min) / 2;
		const d = max - min;
		if (d !== 0) {
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			if (max === r) h = ((g - b) / d) % 6;
			else if (max === g) h = (b - r) / d + 2;
			else h = (r - g) / d + 4;
			h = Math.round(h * 60);
			if (h < 0) h += 360;
		}
		return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
	}

	_parseColor(val) {
		if (!val) return;
		val = val.trim();

		// HEX
		const hexMatch = val.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
		if (hexMatch) {
			const r = parseInt(hexMatch[1], 16);
			const g = parseInt(hexMatch[2], 16);
			const b = parseInt(hexMatch[3], 16);
			if (hexMatch[4]) this._alpha = parseInt(hexMatch[4], 16) / 255;
			this._hsv = this._rgbToHsv(r, g, b);
			return;
		}

		// RGB(A)
		const rgbMatch = val.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
		if (rgbMatch) {
			this._hsv = this._rgbToHsv(+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]);
			if (rgbMatch[4] !== undefined) this._alpha = parseFloat(rgbMatch[4]);
			return;
		}

		// HSL(A)
		const hslMatch = val.match(/hsla?\(\s*(\d+),\s*(\d+)%?,\s*(\d+)%?(?:,\s*([\d.]+))?\s*\)/);
		if (hslMatch) {
			// Approximate: convert HSL → RGB → HSV
			const h2 = +hslMatch[1], s2 = +hslMatch[2] / 100, l2 = +hslMatch[3] / 100;
			const c = (1 - Math.abs(2 * l2 - 1)) * s2;
			const x = c * (1 - Math.abs((h2 / 60) % 2 - 1));
			const m = l2 - c / 2;
			let r, g, b;
			if (h2 < 60) { r = c; g = x; b = 0; }
			else if (h2 < 120) { r = x; g = c; b = 0; }
			else if (h2 < 180) { r = 0; g = c; b = x; }
			else if (h2 < 240) { r = 0; g = x; b = c; }
			else if (h2 < 300) { r = x; g = 0; b = c; }
			else { r = c; g = 0; b = x; }
			this._hsv = this._rgbToHsv(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
			if (hslMatch[4] !== undefined) this._alpha = parseFloat(hslMatch[4]);
		}
	}

	_getFormattedColor(fmt) {
		const f = fmt || this._format;
		const rgb = this._hsvToRgb(this._hsv.h, this._hsv.s, this._hsv.v);

		if (f === "rgb") {
			return this._alpha < 1
				? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this._alpha.toFixed(2)})`
				: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
		}
		if (f === "hsl") {
			const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b);
			return this._alpha < 1
				? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${this._alpha.toFixed(2)})`
				: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
		}
		// hex
		const hex = `#${this._toHex(rgb.r)}${this._toHex(rgb.g)}${this._toHex(rgb.b)}`;
		return this._alpha < 1 ? hex + this._toHex(Math.round(this._alpha * 255)) : hex;
	}

	_toHex(n) { return n.toString(16).padStart(2, "0"); }

	/* ── Emit ────────────────────────────────────────────────── */
	_emit() {
		const val = this._getFormattedColor();
		this._saveRecent(val);
		if (this.opts.onChange) this.opts.onChange(val, this._hsv, this._alpha);
	}

	/* ── Recent Colors ───────────────────────────────────────── */
	_loadRecent() {
		try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
	}

	_saveRecent(color) {
		if (!color.startsWith("#")) return;
		const hex = color.slice(0, 7).toUpperCase();
		this._recentColors = [hex, ...this._recentColors.filter(c => c !== hex)].slice(0, 20);
		try { localStorage.setItem(LS_KEY, JSON.stringify(this._recentColors)); } catch { /* */ }
	}

	/* ── Public API ──────────────────────────────────────────── */
	getValue() { return this._getFormattedColor(); }

	setValue(color) {
		this._parseColor(color);
		this._updateAll();
	}

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-cp");
	}
}
