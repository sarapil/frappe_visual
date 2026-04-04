/**
 * ContextPanel — Slide-in detail/context panel (from edge)
 *
 * frappe.visual.ContextPanel.create({
 *   title: "Details",
 *   content: htmlOrEl,
 *   width: "380px",
 *   side: "end",              // "end" (right/RTL-left) | "start"
 *   overlay: true,
 *   closeOnOutsideClick: true,
 *   onClose: () => {},
 *   theme: "glass"
 * })
 */
export class ContextPanel {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new ContextPanel(opts); }

  constructor(opts) {
    Object.assign(this, {
      title: "", content: "", width: "380px", side: "end",
      overlay: true, closeOnOutsideClick: true,
      onClose: null, theme: "glass"
    }, opts);
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-cpanel fv-cpanel--${this.side} fv-cpanel--${this.theme}`;

    if (this.overlay) {
      this.backdrop = document.createElement("div");
      this.backdrop.className = "fv-cpanel__backdrop";
      if (this.closeOnOutsideClick) {
        this.backdrop.addEventListener("click", () => this.close());
      }
      this.el.appendChild(this.backdrop);
    }

    this.panel = document.createElement("div");
    this.panel.className = "fv-cpanel__panel";
    this.panel.style.width = this.width;
    this.panel.innerHTML = `
      <div class="fv-cpanel__header">
        <span class="fv-cpanel__title">${ContextPanel._esc(this.title)}</span>
        <button class="fv-cpanel__close">&times;</button>
      </div>
      <div class="fv-cpanel__body"></div>`;

    const body = this.panel.querySelector(".fv-cpanel__body");
    if (typeof this.content === "string") body.innerHTML = this.content;
    else if (this.content instanceof HTMLElement) body.appendChild(this.content);

    this.panel.querySelector(".fv-cpanel__close").addEventListener("click", () => this.close());

    this.el.appendChild(this.panel);
    document.body.appendChild(this.el);

    requestAnimationFrame(() => this.el.classList.add("fv-cpanel--open"));
  }

  setContent(content) {
    const body = this.panel.querySelector(".fv-cpanel__body");
    body.innerHTML = "";
    if (typeof content === "string") body.innerHTML = content;
    else if (content instanceof HTMLElement) body.appendChild(content);
  }

  close() {
    this.el.classList.remove("fv-cpanel--open");
    setTimeout(() => {
      this.el.remove();
      if (this.onClose) this.onClose();
    }, 300);
  }

  destroy() { this.el.remove(); }
}
