/**
 * FloatingNav — Floating action button menu (expandable radial / list)
 *
 * frappe.visual.FloatingNav.create({
 *   wrapper: el,
 *   icon: "+",
 *   items: [{ label, icon, action, color }],
 *   position: "bottom-end",   // bottom-end | bottom-start | top-end | top-start
 *   mode: "list",             // "list" | "radial"
 *   theme: "glass"
 * })
 */
export class FloatingNav {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new FloatingNav(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, icon: "+", items: [],
      position: "bottom-end", mode: "list", theme: "glass"
    }, opts);
    this._open = false;
    this._build();
  }

  _build() {
    const target = this.wrapper || document.body;
    this.el = document.createElement("div");
    this.el.className = `fv-fnav fv-fnav--${this.position} fv-fnav--${this.theme}`;

    // Action items
    const items = this.items.map((it, i) => `
      <button class="fv-fnav__item" data-idx="${i}" style="--fv-fnav-delay:${i * 50}ms${it.color ? `;--fv-fnav-item-bg:${it.color}` : ""}">
        ${it.icon ? `<span class="fv-fnav__item-icon">${it.icon}</span>` : ""}
        <span class="fv-fnav__item-label">${FloatingNav._esc(it.label)}</span>
      </button>`).join("");

    this.el.innerHTML = `
      <div class="fv-fnav__menu">${items}</div>
      <button class="fv-fnav__trigger">
        <span class="fv-fnav__trigger-icon">${this.icon}</span>
      </button>`;

    this.trigger = this.el.querySelector(".fv-fnav__trigger");
    this.menu = this.el.querySelector(".fv-fnav__menu");

    this.trigger.addEventListener("click", () => this.toggle());
    this.el.querySelectorAll(".fv-fnav__item").forEach(btn => {
      btn.addEventListener("click", () => {
        const it = this.items[+btn.dataset.idx];
        if (it?.action) it.action(it);
        this.close();
      });
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (this._open && !this.el.contains(e.target)) this.close();
    });

    target.appendChild(this.el);
  }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    this._open = true;
    this.el.classList.add("fv-fnav--open");
  }

  close() {
    this._open = false;
    this.el.classList.remove("fv-fnav--open");
  }

  destroy() { this.el.remove(); }
}
