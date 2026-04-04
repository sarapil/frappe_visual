// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * BottomNav — Mobile-friendly bottom navigation bar
 *
 * frappe.visual.BottomNav.create({
 *   items: [{ id, icon, label, badge, action }],
 *   active: "home",
 *   onChange: (item) => {},
 *   hideOnScroll: true,
 *   theme: "glass"
 * })
 */
export class BottomNav {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new BottomNav(opts); }

  constructor(opts) {
    Object.assign(this, {
      items: [], active: null, onChange: null,
      hideOnScroll: true, theme: "glass"
    }, opts);
    if (!this.active && this.items.length) this.active = this.items[0].id;
    this._lastScroll = 0;
    this._build();
    if (this.hideOnScroll) this._bindScroll();
  }

  _build() {
    this.el = document.createElement("nav");
    this.el.className = `fv-bnav fv-bnav--${this.theme}`;

    this.el.innerHTML = this.items.map(it => {
      const active = it.id === this.active ? " fv-bnav__item--active" : "";
      return `<button class="fv-bnav__item${active}" data-id="${BottomNav._esc(it.id)}">
        <span class="fv-bnav__icon">${it.icon || ""}</span>
        ${it.badge ? `<span class="fv-bnav__badge">${BottomNav._esc(String(it.badge))}</span>` : ""}
        <span class="fv-bnav__label">${BottomNav._esc(it.label)}</span>
      </button>`;
    }).join("");

    this.el.querySelectorAll(".fv-bnav__item").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.setActive(id);
        const it = this.items.find(i => i.id === id);
        if (it?.action) it.action(it);
        if (this.onChange) this.onChange(it);
      });
    });

    document.body.appendChild(this.el);
  }

  setActive(id) {
    this.active = id;
    this.el.querySelectorAll(".fv-bnav__item").forEach(btn =>
      btn.classList.toggle("fv-bnav__item--active", btn.dataset.id === id)
    );
  }

  setBadge(id, value) {
    const btn = this.el.querySelector(`[data-id="${id}"]`);
    if (!btn) return;
    let badge = btn.querySelector(".fv-bnav__badge");
    if (value) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "fv-bnav__badge";
        btn.querySelector(".fv-bnav__icon").after(badge);
      }
      badge.textContent = value;
    } else if (badge) {
      badge.remove();
    }
  }

  _bindScroll() {
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      this.el.classList.toggle("fv-bnav--hidden", y > this._lastScroll && y > 100);
      this._lastScroll = y;
    }, { passive: true });
  }

  destroy() { this.el.remove(); }
}
