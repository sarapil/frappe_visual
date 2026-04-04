/**
 * ScenePresetLibrary — Library / archive scene with tall shelves & reading nook
 *
 * Multiple bookshelves, reading desk, globe, table lamp.
 * Ideal for knowledge bases, archives, report hubs.
 *
 * frappe.visual.ScenePresetLibrary.create({ container, theme, books, frames })
 */
import { SceneEngine } from "./scene_engine";

const NS = "http://www.w3.org/2000/svg";

export class ScenePresetLibrary {
  static create(opts = {}) { return new ScenePresetLibrary(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      container: null, theme: "warm",
      frames: [], documents: [], books: [], notes: [],
      onElementClick: null,
    }, opts);
    this._build();
  }

  _el(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }

  _build() {
    this.engine = SceneEngine.create({
      container: this.container, scene: "library", theme: this.theme,
      frames: this.frames, documents: this.documents,
      books: this.books, notes: this.notes,
      animate: true, interactive: true, onElementClick: this.onElementClick,
    });
    if (this.engine?.svg) this._addDecor(this.engine.svg);
  }

  _addDecor(svg) {
    const pal = SceneEngine.THEMES[this.theme] || SceneEngine.THEMES.warm;
    const g = this._el("g", { class: "fv-scene__library-decor" }, svg);

    // ── Globe on stand (decorative, right side floor) ────────
    const globeG = this._el("g", { class: "fv-scene__globe", opacity: "0.6" }, g);
    // Stand
    this._el("line", { x1: 640, y1: 400, x2: 640, y2: 360, stroke: pal.trim, "stroke-width": "2" }, globeG);
    this._el("ellipse", { cx: 640, cy: 402, rx: 14, ry: 4, fill: pal.trim }, globeG);
    // Globe sphere
    this._el("circle", { cx: 640, cy: 348, r: 16, fill: "#3b82f6", opacity: "0.7" }, globeG);
    this._el("ellipse", { cx: 640, cy: 348, rx: 16, ry: 4, fill: "none", stroke: "#60a5fa", "stroke-width": "0.8" }, globeG);
    this._el("ellipse", { cx: 640, cy: 348, rx: 4, ry: 16, fill: "none", stroke: "#60a5fa", "stroke-width": "0.8" }, globeG);
    // Ring
    this._el("ellipse", { cx: 640, cy: 348, rx: 18, ry: 6, fill: "none", stroke: pal.trim, "stroke-width": "1" }, globeG);

    // ── Reading lamp on desk ─────────────────────────────────
    const lampG = this._el("g", { class: "fv-scene__reading-lamp", opacity: "0.65" }, g);
    this._el("ellipse", { cx: 340, cy: 338, rx: 8, ry: 3, fill: "#1e293b" }, lampG);
    this._el("line", { x1: 340, y1: 338, x2: 355, y2: 310, stroke: "#1e293b", "stroke-width": "2" }, lampG);
    this._el("ellipse", { cx: 360, cy: 308, rx: 15, ry: 6, fill: "#22c55e", opacity: "0.8" }, lampG);
    // Lamp glow
    this._el("ellipse", { cx: 360, cy: 318, rx: 25, ry: 12, fill: "#fbbf24", opacity: "0.06" }, lampG);

    // ── Ladder against right wall ────────────────────────────
    const ladG = this._el("g", { class: "fv-scene__ladder", opacity: "0.3" }, g);
    this._el("line", { x1: 630, y1: 110, x2: 650, y2: 290, stroke: pal.trim, "stroke-width": "2" }, ladG);
    this._el("line", { x1: 642, y1: 110, x2: 662, y2: 290, stroke: pal.trim, "stroke-width": "2" }, ladG);
    for (let i = 0; i < 5; i++) {
      const t = 0.15 + i * 0.18;
      const lx = 630 + 20 * t, rx = 642 + 20 * t;
      const y = 110 + 180 * t;
      this._el("line", { x1: lx, y1: y, x2: rx, y2: y, stroke: pal.trim, "stroke-width": "1.5" }, ladG);
    }
  }

  refresh(data) { this.engine?.refresh(data); }
  destroy() { this.engine?.destroy(); }
}
