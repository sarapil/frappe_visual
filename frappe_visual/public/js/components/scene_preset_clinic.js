/**
 * ScenePresetClinic — Medical reception / clinic scene
 *
 * Reception desk, health posters, stethoscope, waiting chairs.
 * Ideal for medical, hospital, clinic, and health-care dashboards.
 *
 * frappe.visual.ScenePresetClinic.create({ container, theme, frames, documents })
 */
import { SceneEngine } from "./scene_engine";

const NS = "http://www.w3.org/2000/svg";

export class ScenePresetClinic {
  static create(opts = {}) { return new ScenePresetClinic(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      container: null, theme: "cool",
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
      container: this.container, scene: "office", theme: this.theme,
      frames: this.frames, documents: this.documents,
      books: this.books, notes: this.notes,
      animate: true, interactive: true, onElementClick: this.onElementClick,
    });
    if (this.engine?.svg) this._addDecor(this.engine.svg);
  }

  _addDecor(svg) {
    const g = this._el("g", { class: "fv-scene__clinic-decor" }, svg);

    // ── Red cross on back wall ───────────────────────────────
    const crossG = this._el("g", { class: "fv-scene__cross", opacity: "0.4" }, g);
    this._el("rect", { x: 392, y: 78, width: 16, height: 40, rx: 2, fill: "#ef4444" }, crossG);
    this._el("rect", { x: 380, y: 90, width: 40, height: 16, rx: 2, fill: "#ef4444" }, crossG);

    // ── Stethoscope on desk ──────────────────────────────────
    const stetG = this._el("g", { class: "fv-scene__stethoscope", opacity: "0.5" }, g);
    this._el("path", {
      d: "M310,350 C310,330 330,320 340,330 C350,340 340,355 330,350",
      fill: "none", stroke: "#475569", "stroke-width": "2",
    }, stetG);
    this._el("circle", { cx: 330, cy: 352, r: 6, fill: "#94a3b8", stroke: "#475569", "stroke-width": "1" }, stetG);

    // ── Waiting chairs (front floor) ─────────────────────────
    const chairsG = this._el("g", { class: "fv-scene__chairs", opacity: "0.3" }, g);
    [200, 260].forEach(cx => {
      // Seat
      this._el("rect", { x: cx, y: 430, width: 35, height: 6, rx: 2, fill: "#3b82f6" }, chairsG);
      // Back
      this._el("rect", { x: cx + 2, y: 416, width: 31, height: 14, rx: 2, fill: "#3b82f6", opacity: "0.7" }, chairsG);
      // Legs
      this._el("line", { x1: cx + 4, y1: 436, x2: cx + 4, y2: 450, stroke: "#475569", "stroke-width": "1.5" }, chairsG);
      this._el("line", { x1: cx + 31, y1: 436, x2: cx + 31, y2: 450, stroke: "#475569", "stroke-width": "1.5" }, chairsG);
    });

    // ── Clipboard on wall ────────────────────────────────────
    const clipG = this._el("g", { class: "fv-scene__clipboard", opacity: "0.35" }, g);
    this._el("rect", { x: 175, y: 150, width: 30, height: 40, rx: 2, fill: "#d4a574" }, clipG);
    this._el("rect", { x: 178, y: 158, width: 24, height: 28, rx: 1, fill: "#fff" }, clipG);
    this._el("rect", { x: 185, y: 148, width: 10, height: 6, rx: 2, fill: "#475569" }, clipG);
    // Lines on clipboard
    for (let i = 0; i < 3; i++) {
      this._el("line", { x1: 182, y1: 166 + i * 7, x2: 198, y2: 166 + i * 7, stroke: "#cbd5e1", "stroke-width": "1" }, clipG);
    }
  }

  refresh(data) { this.engine?.refresh(data); }
  destroy() { this.engine?.destroy(); }
}
