/**
 * NavRail — Vertical icon navigation rail (Material 3 style)
 *
 * frappe.visual.NavRail.create({
 *   wrapper: el,
 *   items: [{ id, icon, label, badge, action }],
 *   active: "dashboard",
 *   position: "start",     // "start" (left/RTL-right) | "end"
 *   collapsed: false,      // start collapsed (icons only)
 *   theme: "glass"
 * })
 */
export class NavRail {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new NavRail(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, items: [], active: null,
      position: "start", collapsed: false, theme: "glass"
    }, opts);
    this._build();
  }

  _build() {
    const target = this.wrapper || document.body;
    this.el = document.createElement("nav");
    this.el.className = `fv-nrail fv-nrail--${this.position} fv-nrail--${this.theme}`;
    if (this.collapsed) this.el.classList.add("fv-nrail--collapsed");

    const items = this.items.map(it => {
      const active = it.id === this.active ? " fv-nrail__item--active" : "";
      return `<button class="fv-nrail__item${active}" data-id="${NavRail._esc(it.id)}">
        <span class="fv-nrail__icon">${it.icon || ""}</span>
        ${it.badge ? `<span class="fv-nrail__badge">${NavRail._esc(String(it.badge))}</span>` : ""}
        <span class="fv-nrail__label">${NavRail._esc(it.label)}</span>
      </button>`;
    }).join("");

    this.el.innerHTML = `
      <div class="fv-nrail__top">${items}</div>
      <button class="fv-nrail__toggle" aria-label="${__("Toggle navigation")}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>`;

    this.el.querySelector(".fv-nrail__toggle").addEventListener("click", () => this.toggleCollapse());

    this.el.querySelectorAll(".fv-nrail__item").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.setActive(id);
        const it = this.items.find(i => i.id === id);
        if (it?.action) it.action(it);
      });
    });

    target.appendChild(this.el);
  }

  setActive(id) {
    this.active = id;
    this.el.querySelectorAll(".fv-nrail__item").forEach(btn =>
      btn.classList.toggle("fv-nrail__item--active", btn.dataset.id === id)
    );
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.el.classList.toggle("fv-nrail--collapsed", this.collapsed);
  }

  destroy() { this.el.remove(); }
}
