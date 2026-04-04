/**
 * BottomSheet — Mobile bottom sheet with snap points & drag dismiss
 *
 * frappe.visual.BottomSheet.create({
 *   title: "Details",
 *   content: htmlOrEl,
 *   snapPoints: [.25, .5, .9],   // fraction of viewport height
 *   defaultSnap: 1,              // index into snapPoints
 *   overlay: true,
 *   onClose: () => {},
 *   theme: "glass"
 * })
 */
export class BottomSheet {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new BottomSheet(opts); }

  constructor(opts) {
    Object.assign(this, {
      title: "", content: "", snapPoints: [.3, .6, .95],
      defaultSnap: 1, overlay: true, onClose: null, theme: "glass"
    }, opts);
    this._snap = this.defaultSnap;
    this._startY = 0;
    this._currentY = 0;
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-bsheet fv-bsheet--${this.theme}`;

    if (this.overlay) {
      this.backdrop = document.createElement("div");
      this.backdrop.className = "fv-bsheet__backdrop";
      this.backdrop.addEventListener("click", () => this.close());
      this.el.appendChild(this.backdrop);
    }

    this.sheet = document.createElement("div");
    this.sheet.className = "fv-bsheet__sheet";
    this.sheet.innerHTML = `
      <div class="fv-bsheet__handle"><div class="fv-bsheet__handle-bar"></div></div>
      ${this.title ? `<div class="fv-bsheet__header"><span class="fv-bsheet__title">${BottomSheet._esc(this.title)}</span></div>` : ""}
      <div class="fv-bsheet__body"></div>`;

    const body = this.sheet.querySelector(".fv-bsheet__body");
    if (typeof this.content === "string") body.innerHTML = this.content;
    else if (this.content instanceof HTMLElement) body.appendChild(this.content);

    const handle = this.sheet.querySelector(".fv-bsheet__handle");
    handle.addEventListener("pointerdown", (e) => this._onDragStart(e));

    this.el.appendChild(this.sheet);
    document.body.appendChild(this.el);

    requestAnimationFrame(() => {
      this.el.classList.add("fv-bsheet--open");
      this._applySnap(this._snap);
    });
  }

  _applySnap(idx) {
    this._snap = Math.max(0, Math.min(idx, this.snapPoints.length - 1));
    const h = this.snapPoints[this._snap] * window.innerHeight;
    this.sheet.style.height = `${h}px`;
    this.sheet.style.transition = "height .3s cubic-bezier(.4,0,.2,1)";
  }

  _onDragStart(e) {
    this._startY = e.clientY;
    this._startH = this.sheet.offsetHeight;
    this.sheet.style.transition = "none";

    const onMove = (ev) => {
      const dy = this._startY - ev.clientY;
      const newH = Math.max(60, this._startH + dy);
      this.sheet.style.height = `${newH}px`;
    };
    const onEnd = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
      this._snapToNearest();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
  }

  _snapToNearest() {
    const currentFrac = this.sheet.offsetHeight / window.innerHeight;
    if (currentFrac < this.snapPoints[0] * 0.5) { this.close(); return; }
    let closest = 0, minDist = Infinity;
    this.snapPoints.forEach((p, i) => {
      const d = Math.abs(currentFrac - p);
      if (d < minDist) { minDist = d; closest = i; }
    });
    this._applySnap(closest);
  }

  close() {
    this.el.classList.remove("fv-bsheet--open");
    this.sheet.style.height = "0";
    setTimeout(() => {
      this.el.remove();
      if (this.onClose) this.onClose();
    }, 300);
  }

  destroy() { this.el.remove(); }
}
