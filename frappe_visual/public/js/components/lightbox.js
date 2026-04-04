/**
 * Lightbox — Image/gallery lightbox with zoom, keyboard nav & swipe
 *
 * frappe.visual.Lightbox.create({
 *   images: [{ src, thumb, caption }],
 *   startIndex: 0,
 *   enableZoom: true,
 *   theme: "dark"
 * })
 */
export class Lightbox {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new Lightbox(opts); }

  constructor(opts) {
    Object.assign(this, {
      images: [], startIndex: 0, enableZoom: true, theme: "dark"
    }, opts);
    this._idx = this.startIndex;
    this._zoom = 1;
    if (!this.images.length) return;
    this._build();
    this._bind();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-lb fv-lb--${this.theme}`;
    this.el.innerHTML = `
      <div class="fv-lb__backdrop"></div>
      <button class="fv-lb__close" aria-label="Close">&times;</button>
      <button class="fv-lb__prev" aria-label="Previous">&#8249;</button>
      <button class="fv-lb__next" aria-label="Next">&#8250;</button>
      <div class="fv-lb__stage">
        <img class="fv-lb__img" draggable="false" />
      </div>
      <div class="fv-lb__caption"></div>
      <div class="fv-lb__counter"></div>`;

    this.img = this.el.querySelector(".fv-lb__img");
    this.caption = this.el.querySelector(".fv-lb__caption");
    this.counter = this.el.querySelector(".fv-lb__counter");

    this.el.querySelector(".fv-lb__close").addEventListener("click", () => this.close());
    this.el.querySelector(".fv-lb__backdrop").addEventListener("click", () => this.close());
    this.el.querySelector(".fv-lb__prev").addEventListener("click", () => this.prev());
    this.el.querySelector(".fv-lb__next").addEventListener("click", () => this.next());

    if (this.enableZoom) {
      this.img.addEventListener("dblclick", () => this._toggleZoom());
      this.img.addEventListener("wheel", (e) => { e.preventDefault(); this._wheelZoom(e); });
    }

    document.body.appendChild(this.el);
    requestAnimationFrame(() => {
      this.el.classList.add("fv-lb--open");
      this._show(this._idx);
    });
  }

  _bind() {
    this._keyHandler = (e) => {
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.prev();
      if (e.key === "ArrowRight") this.next();
    };
    document.addEventListener("keydown", this._keyHandler);
  }

  _show(idx) {
    this._idx = ((idx % this.images.length) + this.images.length) % this.images.length;
    const item = this.images[this._idx];
    this.img.src = item.src || item;
    this.img.style.transform = "scale(1)";
    this._zoom = 1;
    this.caption.textContent = item.caption || "";
    this.caption.style.display = item.caption ? "" : "none";
    this.counter.textContent = `${this._idx + 1} / ${this.images.length}`;
  }

  prev() { this._show(this._idx - 1); }
  next() { this._show(this._idx + 1); }

  _toggleZoom() {
    this._zoom = this._zoom > 1 ? 1 : 2.5;
    this.img.style.transform = `scale(${this._zoom})`;
    this.img.style.cursor = this._zoom > 1 ? "zoom-out" : "zoom-in";
  }

  _wheelZoom(e) {
    this._zoom = Math.max(.5, Math.min(5, this._zoom + (e.deltaY > 0 ? -.2 : .2)));
    this.img.style.transform = `scale(${this._zoom})`;
  }

  close() {
    this.el.classList.remove("fv-lb--open");
    document.removeEventListener("keydown", this._keyHandler);
    setTimeout(() => this.el.remove(), 300);
  }

  destroy() {
    document.removeEventListener("keydown", this._keyHandler);
    this.el.remove();
  }
}
