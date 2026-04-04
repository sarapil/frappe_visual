/**
 * ImageCompare — Before/after image comparison slider
 *
 * frappe.visual.ImageCompare.create({
 *   wrapper: el,
 *   before: { src, label },
 *   after:  { src, label },
 *   startPosition: 50,       // percentage
 *   direction: "horizontal", // or "vertical"
 *   theme: "glass"
 * })
 */
export class ImageCompare {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new ImageCompare(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, before: {}, after: {},
      startPosition: 50, direction: "horizontal", theme: "glass"
    }, opts);
    if (!this.wrapper) return;
    this._pos = this.startPosition;
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-imgcmp fv-imgcmp--${this.direction} fv-imgcmp--${this.theme}`;

    this.el.innerHTML = `
      <div class="fv-imgcmp__after">
        <img src="${ImageCompare._esc(this.after.src)}" alt="After" draggable="false" />
        ${this.after.label ? `<span class="fv-imgcmp__label fv-imgcmp__label--after">${ImageCompare._esc(this.after.label)}</span>` : ""}
      </div>
      <div class="fv-imgcmp__before">
        <img src="${ImageCompare._esc(this.before.src)}" alt="Before" draggable="false" />
        ${this.before.label ? `<span class="fv-imgcmp__label fv-imgcmp__label--before">${ImageCompare._esc(this.before.label)}</span>` : ""}
      </div>
      <div class="fv-imgcmp__slider">
        <div class="fv-imgcmp__line"></div>
        <div class="fv-imgcmp__handle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 18l-4-6 4-6M16 6l4 6-4 6"/>
          </svg>
        </div>
      </div>`;

    this.beforeEl = this.el.querySelector(".fv-imgcmp__before");
    this.slider = this.el.querySelector(".fv-imgcmp__slider");

    this._setPosition(this._pos);
    this._bindDrag();

    this.wrapper.appendChild(this.el);
  }

  _setPosition(pct) {
    this._pos = Math.max(0, Math.min(100, pct));
    const isH = this.direction === "horizontal";
    this.beforeEl.style.clipPath = isH
      ? `inset(0 ${100 - this._pos}% 0 0)`
      : `inset(0 0 ${100 - this._pos}% 0)`;
    if (isH) {
      this.slider.style.left = `${this._pos}%`;
    } else {
      this.slider.style.top = `${this._pos}%`;
    }
  }

  _bindDrag() {
    const handle = this.slider;
    const onMove = (e) => {
      const rect = this.el.getBoundingClientRect();
      const isH = this.direction === "horizontal";
      const clientPos = e.touches ? e.touches[0] : e;
      const pct = isH
        ? ((clientPos.clientX - rect.left) / rect.width) * 100
        : ((clientPos.clientY - rect.top) / rect.height) * 100;
      this._setPosition(pct);
    };
    const onEnd = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onEnd);
    };
    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onEnd);
    });
    // Touch support
    handle.addEventListener("touchmove", (e) => { e.preventDefault(); onMove(e); }, { passive: false });
  }

  setPosition(pct) { this._setPosition(pct); }

  destroy() { this.el.remove(); }
}
