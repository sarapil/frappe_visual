/**
 * SceneEngine — Immersive SVG Scene Renderer for Dashboards & Reports
 *
 * Renders interactive, animated SVG scenes (office, library, workshop…)
 * where real data is embedded as wall frames, desk documents, shelf books,
 * and board notes — creating a semi-realistic visual dashboard.
 *
 * frappe.visual.SceneEngine.create({
 *   container: "#workspace-header",
 *   scene: "office",          // "office" | "library" | "workshop" | custom
 *   theme: "warm",            // "warm" | "cool" | "dark" | "blueprint"
 *   frames:    [{ label, value, status, icon }],
 *   documents: [{ label, count, href, color }],
 *   books:     [{ label, href, color }],
 *   notes:     [{ text, color, href }],
 *   animate: true,
 *   interactive: true,
 *   onElementClick: (type, item) => {}
 * })
 */
import { SceneRoom } from "./scene_room";
import { SceneFrame } from "./scene_frame";
import { SceneDesk } from "./scene_desk";
import { SceneDocument } from "./scene_document";
import { SceneShelf } from "./scene_shelf";
import { SceneBoard } from "./scene_board";
import { SceneLighting } from "./scene_lighting";

const NS = "http://www.w3.org/2000/svg";

export class SceneEngine {
  static _esc(s) { return (s||"").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }
  static create(opts = {}) { return new SceneEngine(opts); }

  /* ── Theme colour palettes ──────────────────────────────────── */
  static THEMES = {
    warm:      { wall: "#f5ebe0", wallSide: "#e8d5c4", floor: "#c9a87c", floorDark: "#b8956c", accent: "#d4a373", trim: "#8b7355", shadow: "rgba(80,50,20,.25)" },
    cool:      { wall: "#e0e7ef", wallSide: "#c9d5e3", floor: "#94a3b8", floorDark: "#7a8ea3", accent: "#6366f1", trim: "#475569", shadow: "rgba(20,30,60,.2)" },
    dark:      { wall: "#2a2a3e", wallSide: "#1e1e2e", floor: "#3a3a52", floorDark: "#2a2a3e", accent: "#818cf8", trim: "#4a4a66", shadow: "rgba(0,0,0,.4)" },
    blueprint: { wall: "#1a2744", wallSide: "#142038", floor: "#0f172a", floorDark: "#0c1322", accent: "#38bdf8", trim: "#1e3a5f", shadow: "rgba(0,0,0,.5)" },
  };

  /* ── Scene layout presets (element positions relative to room) ── */
  static LAYOUTS = {
    office:   { frames: [[190,110],[330,100],[480,100],[610,110]], desk:[280,330,240,75], shelf:[25,80,105,210], board:[350,230,120,55] },
    library:  { frames: [[210,110],[400,100]], desk:[300,345,200,65], shelf:[25,70,105,230], board:[530,105,120,175] },
    workshop: { frames: [[200,115],[430,110],[600,115]], desk:[250,340,300,75], shelf: null, board:[180,230,140,55] },
  };

  constructor(opts = {}) {
    Object.assign(this, {
      container: null, scene: "office", theme: "warm",
      frames: [], documents: [], books: [], notes: [],
      animate: true, interactive: true, onElementClick: null,
      width: 800, height: 500,
    }, opts);

    this._pal = SceneEngine.THEMES[this.theme] || SceneEngine.THEMES.warm;
    this._layout = SceneEngine.LAYOUTS[this.scene] || SceneEngine.LAYOUTS.office;
    this._build();
  }

  /* ── helpers ─────────────────────────────────────────────────── */
  _el(tag, attrs = {}, parent) {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v != null) el.setAttribute(k, v); });
    if (parent) parent.appendChild(el);
    return el;
  }
  _text(str, attrs, parent) { const t = this._el("text", attrs, parent); t.textContent = str; return t; }

  /* ── Build ──────────────────────────────────────────────────── */
  _build() {
    const host = typeof this.container === "string" ? document.querySelector(this.container) : this.container;
    if (!host) return;

    this.wrap = document.createElement("div");
    this.wrap.className = `fv-scene fv-scene--${this.theme}`;

    this.svg = this._el("svg", { viewBox: `0 0 ${this.width} ${this.height}`, width: "100%", preserveAspectRatio: "xMidYMid meet" });
    this.wrap.appendChild(this.svg);
    host.appendChild(this.wrap);

    this._defs();
    this._renderRoom();
    this._renderLighting();
    this._renderShelf();
    this._renderFrames();
    this._renderDesk();
    this._renderDocuments();
    this._renderBoard();
    if (this.animate) this.wrap.classList.add("fv-scene--animated");
  }

  _defs() {
    const d = this._el("defs", {}, this.svg);
    // Floor gradient
    const fg = this._el("linearGradient", { id: "fv-sc-floor", x1: "0", y1: "0", x2: "0", y2: "1" }, d);
    this._el("stop", { offset: "0%", "stop-color": this._pal.floor }, fg);
    this._el("stop", { offset: "100%", "stop-color": this._pal.floorDark }, fg);
    // Shadow filter
    const sf = this._el("filter", { id: "fv-sc-shadow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, d);
    this._el("feDropShadow", { dx: "2", dy: "3", stdDeviation: "4", "flood-color": this._pal.shadow, "flood-opacity": "0.5" }, sf);
    // Glow filter
    const gf = this._el("filter", { id: "fv-sc-glow" }, d);
    this._el("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "6", result: "blur" }, gf);
    const gm = this._el("feMerge", {}, gf);
    this._el("feMergeNode", { in: "blur" }, gm);
    this._el("feMergeNode", { in: "SourceGraphic" }, gm);
    // Wood pattern
    const wp = this._el("pattern", { id: "fv-sc-wood", width: "40", height: "10", patternUnits: "userSpaceOnUse" }, d);
    this._el("rect", { width: "40", height: "10", fill: this._pal.floor }, wp);
    this._el("line", { x1: "0", y1: "5", x2: "40", y2: "5", stroke: this._pal.floorDark, "stroke-width": "0.5", opacity: "0.3" }, wp);
  }

  /* ── Room ────────────────────────────────────────────────────── */
  _renderRoom() {
    SceneRoom.render(this.svg, this._pal, this);
  }

  _renderLighting() {
    SceneLighting.render(this.svg, this._pal, this);
  }

  /* ── Frames (wall KPIs) ─────────────────────────────────────── */
  _renderFrames() {
    const positions = this._layout.frames || [];
    const g = this._el("g", { class: "fv-scene__frames" }, this.svg);
    this.frames.forEach((f, i) => {
      if (i >= positions.length) return;
      const [x, y] = positions[i];
      SceneFrame.render(g, { ...f, x, y, w: 110, h: 80 }, this);
    });
  }

  /* ── Desk ────────────────────────────────────────────────────── */
  _renderDesk() {
    if (!this._layout.desk) return;
    const [x, y, w, h] = this._layout.desk;
    SceneDesk.render(this.svg, { x, y, w, h }, this);
  }

  /* ── Documents on desk ──────────────────────────────────────── */
  _renderDocuments() {
    if (!this._layout.desk || !this.documents.length) return;
    const [dx, dy, dw] = this._layout.desk;
    const g = this._el("g", { class: "fv-scene__documents" }, this.svg);
    const spacing = Math.min(70, (dw - 20) / this.documents.length);
    this.documents.forEach((doc, i) => {
      const ox = dx + 20 + i * spacing;
      const oy = dy + 8 + (i % 2 === 0 ? 0 : 10);
      const rot = -8 + Math.random() * 16;
      SceneDocument.render(g, { ...doc, x: ox, y: oy, rotation: rot }, this);
    });
  }

  /* ── Shelf + books ──────────────────────────────────────────── */
  _renderShelf() {
    if (!this._layout.shelf) return;
    const [x, y, w, h] = this._layout.shelf;
    SceneShelf.render(this.svg, { x, y, w, h, books: this.books }, this);
  }

  /* ── Board + notes ──────────────────────────────────────────── */
  _renderBoard() {
    if (!this._layout.board) return;
    const [x, y, w, h] = this._layout.board;
    SceneBoard.render(this.svg, { x, y, w, h, notes: this.notes }, this);
  }

  /* ── Public API ─────────────────────────────────────────────── */
  refresh(data = {}) {
    if (data.frames) this.frames = data.frames;
    if (data.documents) this.documents = data.documents;
    if (data.books) this.books = data.books;
    if (data.notes) this.notes = data.notes;
    // Re-render all data elements
    this.svg.querySelectorAll(".fv-scene__frames, .fv-scene__documents, .fv-scene__board-notes").forEach(g => g.remove());
    this._renderFrames();
    this._renderDocuments();
    this._renderBoard();
  }

  getElement(type, id) {
    return this.svg.querySelector(`[data-type="${type}"][data-id="${id}"]`);
  }

  toSVGString() {
    return new XMLSerializer().serializeToString(this.svg);
  }

  async toDataURL() {
    const svgStr = this.toSVGString();
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    return URL.createObjectURL(blob);
  }

  destroy() { this.wrap?.remove(); }
}
