/**
 * QuickAction — Floating quick-action palette (slash commands)
 *
 * frappe.visual.QuickAction.create({
 *   trigger: "/",          // key to open
 *   actions: [
 *     { id: "new-invoice", label: "New Invoice", icon: "📄", handler: () => {} },
 *     { id: "search", label: "Search", icon: "🔍", shortcut: "Ctrl+K", handler: () => {} }
 *   ],
 *   categories: ["Create", "Navigate", "Settings"],
 *   theme: "glass"
 * })
 */
export class QuickAction {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new QuickAction(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      trigger: "/", actions: [], categories: [],
      placeholder: __("Type a command…"), theme: "glass"
    }, opts);
    this._open = false;
    this._filtered = [];
    this._selectedIdx = 0;
    this._build();
    this._bindKeys();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-qact fv-qact--${this.theme}`;
    this.el.innerHTML = `
      <div class="fv-qact__backdrop"></div>
      <div class="fv-qact__dialog">
        <div class="fv-qact__input-wrap">
          <span class="fv-qact__slash">/</span>
          <input class="fv-qact__input" placeholder="${QuickAction._esc(this.placeholder)}" />
        </div>
        <div class="fv-qact__list"></div>
      </div>`;

    this.input = this.el.querySelector(".fv-qact__input");
    this.list = this.el.querySelector(".fv-qact__list");

    this.el.querySelector(".fv-qact__backdrop").addEventListener("click", () => this.close());
    this.input.addEventListener("input", () => this._filter());
    document.body.appendChild(this.el);
  }

  _bindKeys() {
    document.addEventListener("keydown", (e) => {
      // Open on trigger key when not in an input
      if (e.key === this.trigger && !this._open && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.open();
        return;
      }
      if (!this._open) return;

      if (e.key === "Escape") { this.close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); this._move(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); this._move(-1); }
      if (e.key === "Enter") {
        e.preventDefault();
        const act = this._filtered[this._selectedIdx];
        if (act) { this.close(); act.handler?.(); }
      }
    });
  }

  open() {
    this._open = true;
    this.el.classList.add("fv-qact--open");
    this.input.value = "";
    this._filter();
    requestAnimationFrame(() => this.input.focus());
  }

  close() {
    this._open = false;
    this.el.classList.remove("fv-qact--open");
  }

  _filter() {
    const q = this.input.value.toLowerCase().trim();
    this._filtered = q ? this.actions.filter(a => a.label.toLowerCase().includes(q) || (a.id || "").toLowerCase().includes(q)) : [...this.actions];
    this._selectedIdx = 0;
    this._render();
  }

  _render() {
    if (!this._filtered.length) {
      this.list.innerHTML = `<div class="fv-qact__empty">${__("No matching actions")}</div>`;
      return;
    }

    // Group by category
    const grouped = {};
    this._filtered.forEach((a, idx) => {
      const cat = a.category || __("Actions");
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ ...a, _idx: idx });
    });

    let html = "";
    for (const [cat, items] of Object.entries(grouped)) {
      html += `<div class="fv-qact__cat">${QuickAction._esc(cat)}</div>`;
      items.forEach(a => {
        const sel = a._idx === this._selectedIdx ? " fv-qact__item--sel" : "";
        html += `<div class="fv-qact__item${sel}" data-idx="${a._idx}">
          ${a.icon ? `<span class="fv-qact__icon">${a.icon}</span>` : ""}
          <span class="fv-qact__label">${QuickAction._esc(a.label)}</span>
          ${a.shortcut ? `<kbd class="fv-qact__kbd">${QuickAction._esc(a.shortcut)}</kbd>` : ""}
        </div>`;
      });
    }
    this.list.innerHTML = html;

    this.list.querySelectorAll(".fv-qact__item").forEach(el => {
      el.addEventListener("click", () => {
        const act = this._filtered[+el.dataset.idx];
        if (act) { this.close(); act.handler?.(); }
      });
      el.addEventListener("mouseenter", () => {
        this._selectedIdx = +el.dataset.idx;
        this.list.querySelectorAll(".fv-qact__item").forEach(e => e.classList.toggle("fv-qact__item--sel", e === el));
      });
    });
  }

  _move(dir) {
    this._selectedIdx = Math.max(0, Math.min(this._filtered.length - 1, this._selectedIdx + dir));
    this.list.querySelectorAll(".fv-qact__item").forEach(el => {
      el.classList.toggle("fv-qact__item--sel", +el.dataset.idx === this._selectedIdx);
    });
    this.list.querySelector(".fv-qact__item--sel")?.scrollIntoView({ block: "nearest" });
  }

  addAction(action) {
    this.actions.push(action);
  }

  removeAction(id) {
    this.actions = this.actions.filter(a => a.id !== id);
  }

  destroy() { this.el.remove(); }
}
