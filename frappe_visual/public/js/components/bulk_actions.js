/**
 * BulkActions — Multi-select toolbar with batch operations
 *
 * frappe.visual.BulkActions.create({
 *   container: "#list-view",
 *   items: () => document.querySelectorAll(".list-row"),
 *   idKey: "data-name",
 *   actions: [
 *     { id: "delete", label: "Delete", icon: "🗑️", variant: "danger", handler: (ids) => {} },
 *     { id: "export", label: "Export", icon: "📥", handler: (ids) => {} }
 *   ],
 *   theme: "glass"
 * })
 */
export class BulkActions {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new BulkActions(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      container: null, items: null, idKey: "data-name",
      actions: [], theme: "glass",
      selectAllLabel: __("Select All"), position: "bottom"
    }, opts);
    this._selected = new Set();
    this._build();
  }

  _build() {
    this.bar = document.createElement("div");
    this.bar.className = `fv-bulk fv-bulk--${this.theme} fv-bulk--${this.position}`;
    this.bar.innerHTML = `
      <div class="fv-bulk__left">
        <label class="fv-bulk__check-all">
          <input type="checkbox" class="fv-bulk__cb-all" />
          <span class="fv-bulk__all-label">${BulkActions._esc(this.selectAllLabel)}</span>
        </label>
        <span class="fv-bulk__count">0 ${__("selected")}</span>
      </div>
      <div class="fv-bulk__actions">
        ${this.actions.map(a => `<button class="fv-bulk__btn fv-bulk__btn--${a.variant || "default"}" data-id="${BulkActions._esc(a.id)}" title="${BulkActions._esc(a.label)}">
          ${a.icon ? `<span>${a.icon}</span>` : ""} ${BulkActions._esc(a.label)}
        </button>`).join("")}
      </div>
      <button class="fv-bulk__close" title="${__("Cancel")}">✕</button>`;

    this.bar.querySelector(".fv-bulk__cb-all").addEventListener("change", (e) => {
      e.target.checked ? this.selectAll() : this.deselectAll();
    });

    this.bar.querySelector(".fv-bulk__close").addEventListener("click", () => this.deselectAll());

    this.bar.querySelectorAll(".fv-bulk__btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = this.actions.find(a => a.id === btn.dataset.id);
        if (act?.handler) act.handler([...this._selected]);
      });
    });

    document.body.appendChild(this.bar);
    this._attachItemListeners();
  }

  _attachItemListeners() {
    if (!this.items) return;
    const rows = typeof this.items === "function" ? this.items() : document.querySelectorAll(this.items);
    rows.forEach(row => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("a, button, input")) return;
        const id = row.getAttribute(this.idKey);
        if (!id) return;
        if (this._selected.has(id)) {
          this._selected.delete(id);
          row.classList.remove("fv-bulk--selected");
        } else {
          this._selected.add(id);
          row.classList.add("fv-bulk--selected");
        }
        this._update();
      });
    });
  }

  selectAll() {
    const rows = typeof this.items === "function" ? this.items() : document.querySelectorAll(this.items);
    rows.forEach(row => {
      const id = row.getAttribute(this.idKey);
      if (id) { this._selected.add(id); row.classList.add("fv-bulk--selected"); }
    });
    this._update();
  }

  deselectAll() {
    const rows = typeof this.items === "function" ? this.items() : document.querySelectorAll(this.items);
    rows.forEach(row => row.classList.remove("fv-bulk--selected"));
    this._selected.clear();
    this._update();
  }

  _update() {
    const count = this._selected.size;
    this.bar.querySelector(".fv-bulk__count").textContent = `${count} ${__("selected")}`;
    this.bar.classList.toggle("fv-bulk--visible", count > 0);
    this.bar.querySelector(".fv-bulk__cb-all").checked = count > 0 && count === this._getAllCount();
    this.bar.querySelector(".fv-bulk__cb-all").indeterminate = count > 0 && count < this._getAllCount();
  }

  _getAllCount() {
    const rows = typeof this.items === "function" ? this.items() : document.querySelectorAll(this.items);
    return rows.length;
  }

  getSelected() { return [...this._selected]; }

  refresh() { this._attachItemListeners(); this._update(); }

  destroy() { this.bar.remove(); }
}
