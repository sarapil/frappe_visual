/**
 * ScenePresetWorkshop — Factory / construction workshop scene
 *
 * Workbench, toolboard, safety gear, hard hat, blueprint roll.
 * Ideal for manufacturing, construction (Vertex), and industrial dashboards.
 *
 * frappe.visual.ScenePresetWorkshop.create({ container, theme, frames, documents })
 */
import { SceneEngine } from "./scene_engine";

const NS = "http://www.w3.org/2000/svg";

export class ScenePresetWorkshop {
  static create(opts = {}) { return new ScenePresetWorkshop(opts); }

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
      container: this.container, scene: "workshop", theme: this.theme,
      frames: this.frames, documents: this.documents,
      books: this.books, notes: this.notes,
      animate: true, interactive: true, onElementClick: this.onElementClick,
    });
    if (this.engine?.svg) this._addDecor(this.engine.svg);
  }

  _addDecor(svg) {
    const pal = SceneEngine.THEMES[this.theme] || SceneEngine.THEMES.warm;
    const g = this._el("g", { class: "fv-scene__workshop-decor" }, svg);

    // ── Tool board on left wall ──────────────────────────────
    const toolG = this._el("g", { class: "fv-scene__toolboard", opacity: "0.5" }, g);
    this._el("rect", { x: 50, y: 100, width: 70, height: 140, rx: 3, fill: "#d4a574", opacity: "0.4" }, toolG);
    // Peg outlines (tool silhouettes)
    // Hammer
    this._el("rect", { x: 60, y: 115, width: 4, height: 30, rx: 1, fill: pal.trim }, toolG);
    this._el("rect", { x: 55, y: 110, width: 14, height: 8, rx: 2, fill: "#475569" }, toolG);
    // Wrench
    this._el("rect", { x: 82, y: 115, width: 3, height: 28, rx: 1, fill: pal.trim }, toolG);
    this._el("circle", { cx: 83.5, cy: 112, r: 5, fill: "none", stroke: "#475569", "stroke-width": "1.5" }, toolG);
    // Screwdriver
    this._el("rect", { x: 100, y: 120, width: 3, height: 25, rx: 1, fill: "#f59e0b" }, toolG);
    this._el("rect", { x: 100, y: 145, width: 3, height: 10, rx: 0.5, fill: "#475569" }, toolG);

    // ── Hard hat on desk ─────────────────────────────────────
    const hatG = this._el("g", { class: "fv-scene__hardhat", opacity: "0.6" }, g);
    this._el("ellipse", { cx: 340, cy: 332, rx: 20, ry: 8, fill: "#f59e0b" }, hatG);
    this._el("path", {
      d: "M322,332 Q331,318 340,316 Q349,318 358,332",
      fill: "#fbbf24", stroke: "#f59e0b", "stroke-width": "1",
    }, hatG);

    // ── Blueprint roll on desk ───────────────────────────────
    const bpG = this._el("g", { class: "fv-scene__blueprint", opacity: "0.5" }, g);
    this._el("rect", { x: 420, y: 338, width: 80, height: 12, rx: 6, fill: "#bfdbfe" }, bpG);
    this._el("ellipse", { cx: 420, cy: 344, rx: 4, ry: 6, fill: "#93c5fd" }, bpG);
    this._el("ellipse", { cx: 500, cy: 344, rx: 4, ry: 6, fill: "#93c5fd" }, bpG);
    // Partially unrolled section
    this._el("rect", { x: 500, y: 335, width: 40, height: 20, rx: 1, fill: "#dbeafe", opacity: "0.6" }, bpG);
    // Grid lines on unrolled part
    for (let i = 0; i < 3; i++) {
      this._el("line", { x1: 505, y1: 340 + i * 5, x2: 535, y2: 340 + i * 5, stroke: "#60a5fa", "stroke-width": "0.3" }, bpG);
    }

    // ── Safety sign (back wall) ──────────────────────────────
    const signG = this._el("g", { class: "fv-scene__safety-sign", opacity: "0.4" }, g);
    this._el("polygon", { points: "380,200 400,180 420,200", fill: "#f59e0b", stroke: "#92400e", "stroke-width": "1" }, signG);
    const t = this._el("text", { x: 400, y: 197, "text-anchor": "middle", "font-size": "10", "font-weight": "800", fill: "#92400e" }, signG);
    t.textContent = "!";
  }

  refresh(data) { this.engine?.refresh(data); }
  destroy() { this.engine?.destroy(); }
}
