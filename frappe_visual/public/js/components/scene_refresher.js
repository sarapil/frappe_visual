/**
 * SceneRefresher — Auto-refresh scene with live polling or realtime events
 *
 * Wraps a SceneEngine and updates data at intervals or on Frappe
 * realtime events. Supports visual refresh animation.
 *
 * frappe.visual.SceneRefresher.create({
 *   engine: sceneInstance,
 *   dataSource: async () => ({ frames: [...], documents: [...] }),
 *   interval: 15000,
 *   realtime: "scene_update",    // frappe realtime event name
 *   showRefreshIndicator: true
 * })
 */
export class SceneRefresher {
  static create(opts = {}) { return new SceneRefresher(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      engine: null,
      dataSource: null,
      interval: 15000,
      realtime: null,
      showRefreshIndicator: true,
      autoStart: true,
    }, opts);

    this._timer = null;
    this._refreshing = false;
    this._indicator = null;

    if (this.showRefreshIndicator) this._buildIndicator();
    if (this.autoStart) this.start();
    if (this.realtime) this._bindRealtime();
  }

  _buildIndicator() {
    this._indicator = document.createElement("div");
    this._indicator.className = "fv-scene-refresher";
    this._indicator.innerHTML = `<div class="fv-scene-refresher__dot"></div>`;
    this._indicator.style.cssText = `
      position: absolute; top: 10px; right: 10px; z-index: 5;
      width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e; opacity: 0.6;
      transition: opacity .3s, background .3s;
    `;
    // Insert into the scene wrapper
    const wrap = this.engine?.wrap;
    if (wrap) {
      wrap.style.position = "relative";
      wrap.appendChild(this._indicator);
    }
  }

  start() {
    this.stop();
    this._doRefresh();
    if (this.interval > 0) {
      this._timer = setInterval(() => this._doRefresh(), this.interval);
    }
  }

  stop() {
    clearInterval(this._timer);
    this._timer = null;
  }

  async _doRefresh() {
    if (this._refreshing || !this.engine || !this.dataSource) return;
    this._refreshing = true;

    if (this._indicator) {
      this._indicator.style.background = "#f59e0b";
      this._indicator.style.opacity = "1";
    }

    try {
      const data = await this.dataSource();
      if (data) this.engine.refresh(data);
    } catch (e) {
      console.warn("[SceneRefresher] error:", e);
      if (this._indicator) this._indicator.style.background = "#ef4444";
    } finally {
      this._refreshing = false;
      setTimeout(() => {
        if (this._indicator) {
          this._indicator.style.background = "#22c55e";
          this._indicator.style.opacity = "0.6";
        }
      }, 400);
    }
  }

  _bindRealtime() {
    if (!this.realtime || typeof frappe === "undefined") return;
    frappe.realtime?.on(this.realtime, (data) => {
      if (data && this.engine) {
        this.engine.refresh(data);
      } else {
        this._doRefresh();
      }
    });
  }

  destroy() {
    this.stop();
    if (this.realtime && typeof frappe !== "undefined") {
      frappe.realtime?.off(this.realtime);
    }
    this._indicator?.remove();
    this.engine = null;
  }
}
