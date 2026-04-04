/**
 * PinchZoom — Touch-friendly pinch-to-zoom & pan for any content
 *
 * frappe.visual.PinchZoom.create({
 *   wrapper: el,            // container
 *   minZoom: .5,
 *   maxZoom: 6,
 *   doubleTapZoom: 2.5,
 *   wheelZoom: true,
 *   theme: "flat"
 * })
 */
export class PinchZoom {
  static create(opts = {}) { return new PinchZoom(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, minZoom: .5, maxZoom: 6,
      doubleTapZoom: 2.5, wheelZoom: true, theme: "flat"
    }, opts);
    if (!this.wrapper) return;

    this._scale = 1;
    this._x = 0;
    this._y = 0;
    this._lastDist = 0;
    this._lastTap = 0;

    this.wrapper.classList.add("fv-pzoom");
    this.wrapper.style.overflow = "hidden";
    this.wrapper.style.touchAction = "none";

    this.content = this.wrapper.firstElementChild;
    if (!this.content) return;
    this.content.classList.add("fv-pzoom__content");
    this.content.style.transformOrigin = "0 0";

    this._bindTouch();
    this._bindMouse();
    if (this.wheelZoom) this._bindWheel();
  }

  _apply() {
    this.content.style.transform = `translate(${this._x}px, ${this._y}px) scale(${this._scale})`;
  }

  _clampScale(s) { return Math.max(this.minZoom, Math.min(this.maxZoom, s)); }

  _bindTouch() {
    this.wrapper.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        this._lastDist = this._dist(e.touches);
      }
      // Double-tap detection
      const now = Date.now();
      if (e.touches.length === 1 && now - this._lastTap < 300) {
        this._scale = this._scale > 1 ? 1 : this.doubleTapZoom;
        if (this._scale === 1) { this._x = 0; this._y = 0; }
        this._apply();
      }
      this._lastTap = now;
    }, { passive: true });

    this.wrapper.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = this._dist(e.touches);
        const ratio = dist / this._lastDist;
        this._scale = this._clampScale(this._scale * ratio);
        this._lastDist = dist;
        this._apply();
      } else if (e.touches.length === 1 && this._scale > 1) {
        // Pan
        const t = e.touches[0];
        if (this._lastTouch) {
          this._x += t.clientX - this._lastTouch.x;
          this._y += t.clientY - this._lastTouch.y;
          this._apply();
        }
        this._lastTouch = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });

    this.wrapper.addEventListener("touchend", () => { this._lastTouch = null; });
  }

  _bindMouse() {
    let dragging = false, startX, startY;
    this.wrapper.addEventListener("mousedown", (e) => {
      if (this._scale <= 1) return;
      dragging = true;
      startX = e.clientX - this._x;
      startY = e.clientY - this._y;
      this.wrapper.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      this._x = e.clientX - startX;
      this._y = e.clientY - startY;
      this._apply();
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      this.wrapper.style.cursor = "";
    });
  }

  _bindWheel() {
    this.wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      this._scale = this._clampScale(this._scale + delta);
      if (this._scale <= 1) { this._x = 0; this._y = 0; }
      this._apply();
    }, { passive: false });
  }

  _dist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  reset() {
    this._scale = 1; this._x = 0; this._y = 0;
    this._apply();
  }

  setZoom(scale) {
    this._scale = this._clampScale(scale);
    this._apply();
  }

  destroy() {
    this.wrapper?.classList.remove("fv-pzoom");
  }
}
