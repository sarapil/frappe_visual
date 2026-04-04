/**
 * SceneWidget — Lightweight embeddable mini-scene for workspace headers
 *
 * Wraps SceneEngine in a compact container optimised for workspace
 * page headers, sidebar panels, or dashboard cards.
 *
 * frappe.visual.SceneWidget.create({
 *   container: ".workspace-header",
 *   preset: "office",
 *   height: 220,
 *   frames: [...],
 *   documents: [...],
 *   compact: true
 * })
 */
import { SceneEngine } from "./scene_engine";

export class SceneWidget {
  static create(opts = {}) { return new SceneWidget(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      container: null, preset: "office",
      height: 220, theme: "warm",
      frames: [], documents: [], books: [], notes: [],
      compact: true, refreshInterval: 0,
      dataSource: null, onElementClick: null,
    }, opts);

    this._build();
    if (this.refreshInterval > 0 && this.dataSource) this._autoRefresh();
  }

  _build() {
    const host = typeof this.container === "string" ? document.querySelector(this.container) : this.container;
    if (!host) return;

    this.wrap = document.createElement("div");
    this.wrap.className = "fv-scene-widget";
    this.wrap.style.cssText = `
      width: 100%; max-height: ${this.height}px; overflow: hidden;
      border-radius: 12px; position: relative;
    `;
    host.appendChild(this.wrap);

    // Gradient overlay for smooth edge blending
    const overlay = document.createElement("div");
    overlay.className = "fv-scene-widget__overlay";
    overlay.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0; height: 40px;
      background: linear-gradient(transparent, var(--fv-scene-widget-fade, #fff));
      pointer-events: none; z-index: 1;
    `;
    this.wrap.appendChild(overlay);

    this.engine = SceneEngine.create({
      container: this.wrap,
      scene: this.preset,
      theme: this.theme,
      width: 800,
      height: this.compact ? 400 : 500,
      frames: this.frames,
      documents: this.documents,
      books: this.books,
      notes: this.notes,
      animate: true,
      interactive: true,
      onElementClick: this.onElementClick,
    });
  }

  async _autoRefresh() {
    this._refreshTimer = setInterval(async () => {
      try {
        const data = await this.dataSource();
        if (data) this.engine.refresh(data);
      } catch (e) { console.warn("[SceneWidget] refresh error:", e); }
    }, this.refreshInterval);
  }

  refresh(data) { this.engine?.refresh(data); }

  destroy() {
    clearInterval(this._refreshTimer);
    this.engine?.destroy();
    this.wrap?.remove();
  }
}
