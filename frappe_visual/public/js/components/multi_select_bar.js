/**
 * MultiSelectBar — Persistent floating selection bar with count + quick actions
 *
 * frappe.visual.MultiSelectBar.create({
 *   label: "Invoices",
 *   actions: [
 *     { id: "approve", label: "Approve All", icon: "✅", handler: (ids) => {} },
 *     { id: "email",   label: "Email",       icon: "📧", handler: (ids) => {} }
 *   ],
 *   position: "bottom",  // "top" | "bottom"
 *   theme: "glass"
 * })
 */
export class MultiSelectBar {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new MultiSelectBar(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      label: __("items"), actions: [],
      position: "bottom", theme: "glass",
      maxVisible: 4
    }, opts);
    this._items = new Map(); // id → metadata
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-msbar fv-msbar--${this.theme} fv-msbar--${this.position}`;
    this._render();
    document.body.appendChild(this.el);
  }

  _render() {
    const count = this._items.size;
    const actionBtns = this.actions.slice(0, this.maxVisible).map(a =>
      `<button class="fv-msbar__btn fv-msbar__btn--${a.variant || "default"}" data-id="${MultiSelectBar._esc(a.id)}" title="${MultiSelectBar._esc(a.label)}">
        ${a.icon ? `<span>${a.icon}</span>` : ""}<span class="fv-msbar__btn-label">${MultiSelectBar._esc(a.label)}</span>
      </button>`
    ).join("");

    const overflow = this.actions.length > this.maxVisible
      ? `<button class="fv-msbar__btn fv-msbar__more" title="${__("More actions")}">⋯</button>` : "";

    this.el.innerHTML = `
      <div class="fv-msbar__content">
        <div class="fv-msbar__info">
          <span class="fv-msbar__count">${count}</span>
          <span class="fv-msbar__label">${MultiSelectBar._esc(this.label)}</span>
        </div>
        <div class="fv-msbar__divider"></div>
        <div class="fv-msbar__actions">${actionBtns}${overflow}</div>
        <button class="fv-msbar__clear" title="${__("Clear selection")}">✕</button>
      </div>`;

    this.el.classList.toggle("fv-msbar--visible", count > 0);

    // Bind action buttons
    this.el.querySelectorAll(".fv-msbar__btn[data-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = this.actions.find(a => a.id === btn.dataset.id);
        if (act?.handler) act.handler([...this._items.keys()], this._items);
      });
    });

    // Overflow menu
    const moreBtn = this.el.querySelector(".fv-msbar__more");
    if (moreBtn) {
      moreBtn.addEventListener("click", () => {
        const overflow = this.actions.slice(this.maxVisible);
        const menu = document.createElement("div");
        menu.className = "fv-msbar__overflow";
        menu.innerHTML = overflow.map(a =>
          `<button class="fv-msbar__overflow-item" data-id="${MultiSelectBar._esc(a.id)}">
            ${a.icon || ""} ${MultiSelectBar._esc(a.label)}
          </button>`
        ).join("");
        menu.querySelectorAll(".fv-msbar__overflow-item").forEach(item => {
          item.addEventListener("click", () => {
            const act = this.actions.find(a => a.id === item.dataset.id);
            if (act?.handler) act.handler([...this._items.keys()], this._items);
            menu.remove();
          });
        });
        moreBtn.after(menu);
        setTimeout(() => document.addEventListener("click", () => menu.remove(), { once: true }), 0);
      });
    }

    // Clear button
    this.el.querySelector(".fv-msbar__clear")?.addEventListener("click", () => this.clear());
  }

  add(id, meta = {}) {
    this._items.set(id, meta);
    this._render();
    return this;
  }

  remove(id) {
    this._items.delete(id);
    this._render();
    return this;
  }

  toggle(id, meta = {}) {
    this._items.has(id) ? this._items.delete(id) : this._items.set(id, meta);
    this._render();
    return this;
  }

  clear() {
    this._items.clear();
    this._render();
    return this;
  }

  has(id) { return this._items.has(id); }
  getSelected() { return [...this._items.keys()]; }
  getSelectedWithMeta() { return new Map(this._items); }
  get count() { return this._items.size; }

  destroy() { this.el.remove(); }
}
