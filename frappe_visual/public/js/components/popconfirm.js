/**
 * Popconfirm — Inline confirmation popover attached to a trigger
 *
 * frappe.visual.Popconfirm.create({
 *   trigger: el,
 *   title: "Are you sure?",
 *   description: "This action cannot be undone.",
 *   confirmText: "Yes",
 *   cancelText: "No",
 *   confirmColor: "red",
 *   icon: "⚠️",
 *   onConfirm: () => {},
 *   onCancel: () => {},
 *   placement: "top",       // top | bottom | left | right
 *   theme: "glass"
 * })
 */
export class Popconfirm {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new Popconfirm(opts); }

  constructor(opts) {
    Object.assign(this, {
      trigger: null, title: __("Are you sure?"), description: "",
      confirmText: __("Yes"), cancelText: __("No"),
      confirmColor: "red", icon: "", onConfirm: null, onCancel: null,
      placement: "top", theme: "glass"
    }, opts);
    this._visible = false;
    if (this.trigger) {
      this.trigger.addEventListener("click", (e) => { e.stopPropagation(); this.show(); });
    }
  }

  show() {
    if (this._visible) return;
    this._visible = true;

    this.el = document.createElement("div");
    this.el.className = `fv-popc fv-popc--${this.placement} fv-popc--${this.theme}`;
    this.el.innerHTML = `
      <div class="fv-popc__arrow"></div>
      <div class="fv-popc__content">
        ${this.icon ? `<span class="fv-popc__icon">${this.icon}</span>` : ""}
        <div class="fv-popc__text">
          <div class="fv-popc__title">${Popconfirm._esc(this.title)}</div>
          ${this.description ? `<div class="fv-popc__desc">${Popconfirm._esc(this.description)}</div>` : ""}
        </div>
      </div>
      <div class="fv-popc__actions">
        <button class="fv-popc__btn fv-popc__btn--cancel">${Popconfirm._esc(this.cancelText)}</button>
        <button class="fv-popc__btn fv-popc__btn--confirm" style="--fv-popc-confirm:var(--${this.confirmColor}-500, #ef4444)">${Popconfirm._esc(this.confirmText)}</button>
      </div>`;

    this.el.querySelector(".fv-popc__btn--confirm").addEventListener("click", () => {
      if (this.onConfirm) this.onConfirm();
      this.hide();
    });
    this.el.querySelector(".fv-popc__btn--cancel").addEventListener("click", () => {
      if (this.onCancel) this.onCancel();
      this.hide();
    });

    document.body.appendChild(this.el);
    this._position();

    this._outsideHandler = (e) => {
      if (!this.el.contains(e.target) && e.target !== this.trigger) this.hide();
    };
    setTimeout(() => document.addEventListener("click", this._outsideHandler), 0);
  }

  _position() {
    if (!this.trigger || !this.el) return;
    const tr = this.trigger.getBoundingClientRect();
    const el = this.el.getBoundingClientRect();
    let top, left;

    switch (this.placement) {
      case "bottom":
        top = tr.bottom + 8; left = tr.left + (tr.width - el.width) / 2; break;
      case "left":
        top = tr.top + (tr.height - el.height) / 2; left = tr.left - el.width - 8; break;
      case "right":
        top = tr.top + (tr.height - el.height) / 2; left = tr.right + 8; break;
      default: // top
        top = tr.top - el.height - 8; left = tr.left + (tr.width - el.width) / 2;
    }
    this.el.style.position = "fixed";
    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
    this.el.style.zIndex = "99999";
  }

  hide() {
    this._visible = false;
    document.removeEventListener("click", this._outsideHandler);
    this.el?.remove();
  }

  destroy() { this.hide(); }
}
