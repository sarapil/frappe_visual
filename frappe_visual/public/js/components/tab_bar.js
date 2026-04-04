// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * TabBar — Animated tab switcher with sliding indicator
 *
 * frappe.visual.TabBar.create({
 *   wrapper: el,
 *   tabs: [{ id, label, icon, badge, disabled }],
 *   active: "overview",
 *   onChange: (tab) => {},
 *   variant: "underline",   // "underline" | "pill" | "block"
 *   theme: "glass"
 * })
 */
export class TabBar {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new TabBar(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, tabs: [], active: null,
      onChange: null, variant: "underline", theme: "glass"
    }, opts);
    if (!this.wrapper) return;
    if (!this.active && this.tabs.length) this.active = this.tabs[0].id;
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-tbar fv-tbar--${this.variant} fv-tbar--${this.theme}`;

    const tabsHtml = this.tabs.map(t => {
      const active = t.id === this.active ? " fv-tbar__tab--active" : "";
      const disabled = t.disabled ? " fv-tbar__tab--disabled" : "";
      return `<button class="fv-tbar__tab${active}${disabled}" data-id="${TabBar._esc(t.id)}" ${t.disabled ? "disabled" : ""}>
        ${t.icon ? `<span class="fv-tbar__icon">${t.icon}</span>` : ""}
        <span class="fv-tbar__label">${TabBar._esc(t.label)}</span>
        ${t.badge ? `<span class="fv-tbar__badge">${TabBar._esc(String(t.badge))}</span>` : ""}
      </button>`;
    }).join("");

    this.el.innerHTML = `<div class="fv-tbar__indicator"></div>${tabsHtml}`;
    this.indicator = this.el.querySelector(".fv-tbar__indicator");

    this.el.querySelectorAll(".fv-tbar__tab").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        this.setActive(btn.dataset.id);
      });
    });

    this.wrapper.appendChild(this.el);
    requestAnimationFrame(() => this._moveIndicator());
  }

  setActive(id) {
    if (id === this.active) return;
    this.active = id;
    this.el.querySelectorAll(".fv-tbar__tab").forEach(btn =>
      btn.classList.toggle("fv-tbar__tab--active", btn.dataset.id === id)
    );
    this._moveIndicator();
    const tab = this.tabs.find(t => t.id === id);
    if (this.onChange) this.onChange(tab);
  }

  _moveIndicator() {
    const active = this.el.querySelector(".fv-tbar__tab--active");
    if (!active || !this.indicator) return;
    this.indicator.style.left = `${active.offsetLeft}px`;
    this.indicator.style.width = `${active.offsetWidth}px`;
  }

  destroy() { this.el.remove(); }
}
