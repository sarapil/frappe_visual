/**
 * NotificationStack — Stackable toast notification system
 *
 * frappe.visual.NotificationStack.create({
 *   position: "top-end",      // top-end | top-start | bottom-end | bottom-start
 *   maxVisible: 5,
 *   gap: 8,
 *   theme: "glass"
 * })
 *
 * instance.push({ title, message, type, icon, duration, action })
 * types: success, error, warning, info
 */
export class NotificationStack {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new NotificationStack(opts); }

  constructor(opts) {
    Object.assign(this, {
      position: "top-end", maxVisible: 5, gap: 8, theme: "glass"
    }, opts);
    this._toasts = [];
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-nstack fv-nstack--${this.position} fv-nstack--${this.theme}`;
    this.el.style.gap = `${this.gap}px`;
    document.body.appendChild(this.el);
  }

  push({ title = "", message = "", type = "info", icon = "", duration = 4000, action = null } = {}) {
    const id = `fv-toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const toast = document.createElement("div");
    toast.className = `fv-nstack__toast fv-nstack__toast--${type}`;
    toast.id = id;

    const typeIcons = {
      success: "✓", error: "✕", warning: "⚠", info: "ℹ"
    };

    toast.innerHTML = `
      <span class="fv-nstack__icon">${icon || typeIcons[type] || ""}</span>
      <div class="fv-nstack__content">
        ${title ? `<div class="fv-nstack__title">${NotificationStack._esc(title)}</div>` : ""}
        ${message ? `<div class="fv-nstack__msg">${NotificationStack._esc(message)}</div>` : ""}
      </div>
      ${action ? `<button class="fv-nstack__action">${NotificationStack._esc(action.label)}</button>` : ""}
      <button class="fv-nstack__close">&times;</button>
      ${duration ? `<div class="fv-nstack__timer" style="animation-duration:${duration}ms"></div>` : ""}`;

    toast.querySelector(".fv-nstack__close").addEventListener("click", () => this.dismiss(id));
    if (action) {
      toast.querySelector(".fv-nstack__action").addEventListener("click", () => {
        if (action.onClick) action.onClick();
        this.dismiss(id);
      });
    }

    this.el.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("fv-nstack__toast--enter"));

    this._toasts.push({ id, timer: duration ? setTimeout(() => this.dismiss(id), duration) : null });

    // Enforce max
    while (this._toasts.length > this.maxVisible) {
      this.dismiss(this._toasts[0].id);
    }

    return id;
  }

  dismiss(id) {
    const idx = this._toasts.findIndex(t => t.id === id);
    if (idx === -1) return;
    const { timer } = this._toasts[idx];
    if (timer) clearTimeout(timer);
    this._toasts.splice(idx, 1);

    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("fv-nstack__toast--exit");
    setTimeout(() => el.remove(), 300);
  }

  clearAll() {
    [...this._toasts].forEach(t => this.dismiss(t.id));
  }

  destroy() { this.clearAll(); this.el.remove(); }
}
