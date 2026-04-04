/**
 * ScenePresetCafe — Restaurant / café scene
 *
 * Counter, espresso machine, menu boards, table, cups.
 * Ideal for hospitality, restaurant (Candela), café dashboards.
 *
 * frappe.visual.ScenePresetCafe.create({ container, theme, frames, documents })
 */
import { SceneEngine } from "./scene_engine";

const NS = "http://www.w3.org/2000/svg";

export class ScenePresetCafe {
  static create(opts = {}) { return new ScenePresetCafe(opts); }

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
      container: this.container, scene: "office", theme: this.theme,
      frames: this.frames, documents: this.documents,
      books: this.books, notes: this.notes,
      animate: true, interactive: true, onElementClick: this.onElementClick,
    });
    if (this.engine?.svg) this._addDecor(this.engine.svg);
  }

  _addDecor(svg) {
    const pal = SceneEngine.THEMES[this.theme] || SceneEngine.THEMES.warm;
    const g = this._el("g", { class: "fv-scene__cafe-decor" }, svg);

    // ── Menu blackboard on back wall ─────────────────────────
    const menuG = this._el("g", { class: "fv-scene__menu-board", opacity: "0.6" }, g);
    this._el("rect", { x: 180, y: 100, width: 80, height: 55, rx: 3, fill: "#1e293b" }, menuG);
    this._el("rect", { x: 178, y: 98, width: 84, height: 59, rx: 4, fill: "none", stroke: pal.trim, "stroke-width": "2" }, menuG);
    const mt = this._el("text", { x: 220, y: 120, "text-anchor": "middle", "font-size": "8", fill: "#fbbf24", "font-weight": "600" }, menuG);
    mt.textContent = "☕ MENU";
    for (let i = 0; i < 3; i++) {
      this._el("line", { x1: 190, y1: 132 + i * 8, x2: 250, y2: 132 + i * 8, stroke: "#94a3b8", "stroke-width": "0.5" }, menuG);
    }

    // ── Espresso machine (on desk/counter) ───────────────────
    const espG = this._el("g", { class: "fv-scene__espresso", opacity: "0.55" }, g);
    // Body
    this._el("rect", { x: 460, y: 310, width: 35, height: 30, rx: 3, fill: "#374151" }, espG);
    this._el("rect", { x: 458, y: 307, width: 39, height: 6, rx: 2, fill: "#475569" }, espG);
    // Spout
    this._el("rect", { x: 472, y: 330, width: 10, height: 10, rx: 1, fill: "#1e293b" }, espG);
    // Steam
    this._el("path", { d: "M477,305 Q480,295 475,288 Q480,280 477,272", fill: "none", stroke: "#94a3b8", "stroke-width": "0.8", opacity: "0.4" }, espG);

    // ── Coffee cups on counter ───────────────────────────────
    const cupsG = this._el("g", { class: "fv-scene__cups", opacity: "0.5" }, g);
    [320, 345].forEach((cx, i) => {
      // Cup body
      this._el("polygon", { points: `${cx-7},335 ${cx+7},335 ${cx+5},350 ${cx-5},350`, fill: "#fff", stroke: "#e2e8f0", "stroke-width": "0.5" }, cupsG);
      // Handle
      this._el("path", { d: `M${cx+7},338 Q${cx+13},342 ${cx+7},346`, fill: "none", stroke: "#e2e8f0", "stroke-width": "1" }, cupsG);
      // Coffee inside
      this._el("ellipse", { cx, cy: 336, rx: 6, ry: 2, fill: i === 0 ? "#92400e" : "#d4a574" }, cupsG);
      // Saucer
      this._el("ellipse", { cx, cy: 352, rx: 10, ry: 3, fill: "#fff", stroke: "#e2e8f0", "stroke-width": "0.5" }, cupsG);
    });

    // ── Pendant lights (from ceiling) ────────────────────────
    const lightG = this._el("g", { class: "fv-scene__pendants", opacity: "0.35" }, g);
    [300, 500].forEach(cx => {
      this._el("line", { x1: cx, y1: 70, x2: cx, y2: 100, stroke: "#1e293b", "stroke-width": "1" }, lightG);
      this._el("polygon", { points: `${cx-12},100 ${cx+12},100 ${cx+8},88 ${cx-8},88`, fill: "#f59e0b" }, lightG);
      // Glow
      this._el("ellipse", { cx, cy: 108, rx: 18, ry: 10, fill: "#fbbf24", opacity: "0.06" }, lightG);
    });
  }

  refresh(data) { this.engine?.refresh(data); }
  destroy() { this.engine?.destroy(); }
}
