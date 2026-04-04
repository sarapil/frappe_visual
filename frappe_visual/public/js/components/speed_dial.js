/**
 * SpeedDial — FAB with expanding action buttons (Material 3 style)
 *
 * frappe.visual.SpeedDial.create({
 *   icon: "+",
 *   items: [{ icon, label, action, color }],
 *   direction: "up",       // up | down | left | right
 *   position: "bottom-end",
 *   theme: "glass"
 * })
 */
export class SpeedDial {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new SpeedDial(opts); }

  constructor(opts) {
    Object.assign(this, {
      icon: "+", items: [], direction: "up",
      position: "bottom-end", theme: "glass"
    }, opts);
    this._open = false;
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-sdial fv-sdial--${this.position} fv-sdial--${this.direction} fv-sdial--${this.theme}`;

    const items = this.items.map((it, i) => `
      <div class="fv-sdial__action" style="--fv-sdial-i:${i}${it.color ? `;--fv-sdial-color:${it.color}` : ""}">
        <button class="fv-sdial__action-btn" data-idx="${i}" aria-label="${SpeedDial._esc(it.label)}">
          ${it.icon || ""}
        </button>
        <span class="fv-sdial__action-label">${SpeedDial._esc(it.label)}</span>
      </div>`).join("");

    this.el.innerHTML = `
      <div class="fv-sdial__actions">${items}</div>
      <button class="fv-sdial__fab">
        <span class="fv-sdial__fab-icon">${this.icon}</span>
      </button>`;

    this.fab = this.el.querySelector(".fv-sdial__fab");
    this.fab.addEventListener("click", () => this.toggle());

    this.el.querySelectorAll(".fv-sdial__action-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const it = this.items[+btn.dataset.idx];
        if (it?.action) it.action(it);
        this.close();
      });
    });

    document.addEventListener("click", (e) => {
      if (this._open && !this.el.contains(e.target)) this.close();
    });

    document.body.appendChild(this.el);
  }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    this._open = true;
    this.el.classList.add("fv-sdial--open");
    this.fab.querySelector(".fv-sdial__fab-icon").style.transform = "rotate(45deg)";
  }

  close() {
    this._open = false;
    this.el.classList.remove("fv-sdial--open");
    this.fab.querySelector(".fv-sdial__fab-icon").style.transform = "";
  }

  destroy() { this.el.remove(); }
}
