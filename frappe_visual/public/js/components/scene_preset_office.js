/**
 * ScenePresetOffice — Complete office scene with furniture & decor
 *
 * Pre-built scene that renders: desk, chair back, bookshelf, wall art,
 * potted plant, window blinds, clock, and waste basket.
 * Data slots auto-positioned across frames, desk docs, and shelf.
 *
 * frappe.visual.ScenePresetOffice.create({
 *   container: "#report-header",
 *   theme: "warm",
 *   frames: [...], documents: [...], books: [...], notes: [...]
 * })
 */
import { SceneEngine } from "./scene_engine";

const NS = "http://www.w3.org/2000/svg";

export class ScenePresetOffice {
  static create(opts = {}) { return new ScenePresetOffice(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      container: null, theme: "warm",
      frames: [], documents: [], books: [], notes: [],
      height: 500, onElementClick: null,
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
    // Create the scene engine with office layout
    this.engine = SceneEngine.create({
      container: this.container,
      scene: "office",
      theme: this.theme,
      frames: this.frames,
      documents: this.documents,
      books: this.books,
      notes: this.notes,
      animate: true,
      interactive: true,
      onElementClick: this.onElementClick,
    });

    // Add office-specific furniture on top
    if (this.engine?.svg) this._addFurniture(this.engine.svg);
  }

  _addFurniture(svg) {
    const pal = SceneEngine.THEMES[this.theme] || SceneEngine.THEMES.warm;
    const g = this._el("g", { class: "fv-scene__office-decor" }, svg);

    // ── Office chair back (behind desk) ──────────────────────
    const chairG = this._el("g", { class: "fv-scene__chair", opacity: "0.55" }, g);
    // Chair back
    this._el("ellipse", { cx: 400, cy: 310, rx: 38, ry: 28, fill: "#374151" }, chairG);
    this._el("ellipse", { cx: 400, cy: 310, rx: 34, ry: 24, fill: "#4b5563" }, chairG);
    // Headrest
    this._el("ellipse", { cx: 400, cy: 285, rx: 16, ry: 8, fill: "#374151" }, chairG);

    // ── Potted plant (right side of back wall) ───────────────
    const plantG = this._el("g", { class: "fv-scene__plant" }, g);
    // Pot
    this._el("polygon", { points: "648,265 668,265 665,295 651,295", fill: "#d97706" }, plantG);
    this._el("rect", { x: 646, y: 262, width: 24, height: 5, rx: 1, fill: "#b45309" }, plantG);
    // Leaves (simple circles for foliage)
    const leafColors = ["#16a34a", "#22c55e", "#15803d"];
    [[658,248,10],[648,240,8],[668,242,8],[654,232,7],[662,230,7]].forEach(([cx,cy,r], i) => {
      this._el("ellipse", { cx, cy, rx: r, ry: r * 0.8, fill: leafColors[i % 3], opacity: "0.8" }, plantG);
    });

    // ── Wall clock (back wall, upper right) ──────────────────
    const clockG = this._el("g", { class: "fv-scene__clock" }, g);
    this._el("circle", { cx: 590, cy: 92, r: 16, fill: "#fff", stroke: pal.trim, "stroke-width": "2" }, clockG);
    this._el("circle", { cx: 590, cy: 92, r: 1.5, fill: pal.trim }, clockG);
    // Hour marks
    for (let i = 0; i < 12; i++) {
      const a = (i * 30) * Math.PI / 180;
      const r1 = 13, r2 = 14.5;
      this._el("line", {
        x1: 590 + Math.sin(a) * r1, y1: 92 - Math.cos(a) * r1,
        x2: 590 + Math.sin(a) * r2, y2: 92 - Math.cos(a) * r2,
        stroke: pal.trim, "stroke-width": "1", opacity: "0.4"
      }, clockG);
    }
    // Hands (static — 10:10 for classic look)
    this._el("line", { x1: 590, y1: 92, x2: 585, y2: 82, stroke: pal.trim, "stroke-width": "1.5" }, clockG);
    this._el("line", { x1: 590, y1: 92, x2: 598, y2: 84, stroke: pal.trim, "stroke-width": "1" }, clockG);

    // ── Window blinds (right wall hint) ──────────────────────
    const blindG = this._el("g", { class: "fv-scene__blinds", opacity: "0.12" }, g);
    for (let i = 0; i < 6; i++) {
      this._el("line", {
        x1: 690, y1: 100 + i * 25, x2: 755, y2: 85 + i * 30,
        stroke: "#fff", "stroke-width": "1.5",
      }, blindG);
    }
  }

  refresh(data) { this.engine?.refresh(data); }
  destroy() { this.engine?.destroy(); }
}
