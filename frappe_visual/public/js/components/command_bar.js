/**
 * CommandBar — Cmd+K / Ctrl+K spotlight search & command palette
 *
 * frappe.visual.CommandBar.create({
 *   wrapper: el,
 *   placeholder: "Search or type a command…",
 *   commands: [{ label, icon, action, group, shortcut }],
 *   onSearch: async (q) => results,
 *   hotkey: "k",                   // default Ctrl/Cmd+K
 *   theme: "glass"
 * })
 */
export class CommandBar {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new CommandBar(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, placeholder: __("Search or type a command…"),
      commands: [], onSearch: null, hotkey: "k",
      theme: "glass", maxResults: 12
    }, opts);

    this._open = false;
    this._results = [];
    this._idx = 0;
    this._build();
    this._bindHotkey();
  }

  _build() {
    this.overlay = document.createElement("div");
    this.overlay.className = `fv-cmdk fv-cmdk--${this.theme}`;
    this.overlay.innerHTML = `
      <div class="fv-cmdk__backdrop"></div>
      <div class="fv-cmdk__dialog">
        <div class="fv-cmdk__input-wrap">
          <svg class="fv-cmdk__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input class="fv-cmdk__input" placeholder="${CommandBar._esc(this.placeholder)}" spellcheck="false" />
          <kbd class="fv-cmdk__esc">ESC</kbd>
        </div>
        <div class="fv-cmdk__list"></div>
      </div>`;

    this.backdrop = this.overlay.querySelector(".fv-cmdk__backdrop");
    this.input = this.overlay.querySelector(".fv-cmdk__input");
    this.list = this.overlay.querySelector(".fv-cmdk__list");

    this.backdrop.addEventListener("click", () => this.close());
    this.overlay.querySelector(".fv-cmdk__esc").addEventListener("click", () => this.close());
    this.input.addEventListener("input", () => this._onInput());
    this.input.addEventListener("keydown", (e) => this._onKey(e));

    document.body.appendChild(this.overlay);
  }

  _bindHotkey() {
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === this.hotkey) {
        e.preventDefault();
        this._open ? this.close() : this.open();
      }
      if (e.key === "Escape" && this._open) this.close();
    });
  }

  open() {
    this._open = true;
    this.overlay.classList.add("fv-cmdk--open");
    this.input.value = "";
    this._renderCommands(this.commands);
    requestAnimationFrame(() => this.input.focus());
  }

  close() {
    this._open = false;
    this.overlay.classList.remove("fv-cmdk--open");
  }

  async _onInput() {
    const q = this.input.value.trim();
    if (!q) { this._renderCommands(this.commands); return; }
    let results = this.commands.filter(c =>
      c.label.toLowerCase().includes(q.toLowerCase()) ||
      (c.group || "").toLowerCase().includes(q.toLowerCase())
    );
    if (this.onSearch) {
      const ext = await this.onSearch(q);
      if (ext) results = results.concat(ext);
    }
    this._renderCommands(results.slice(0, this.maxResults));
  }

  _renderCommands(items) {
    this._results = items;
    this._idx = 0;
    const grouped = {};
    items.forEach(c => { const g = c.group || "Commands"; (grouped[g] = grouped[g] || []).push(c); });
    let html = "";
    for (const [g, cmds] of Object.entries(grouped)) {
      html += `<div class="fv-cmdk__group"><div class="fv-cmdk__group-label">${CommandBar._esc(g)}</div>`;
      cmds.forEach((c, i) => {
        html += `<div class="fv-cmdk__item" data-idx="${i}">
          ${c.icon ? `<span class="fv-cmdk__item-icon">${c.icon}</span>` : ""}
          <span class="fv-cmdk__item-label">${CommandBar._esc(c.label)}</span>
          ${c.shortcut ? `<kbd class="fv-cmdk__shortcut">${CommandBar._esc(c.shortcut)}</kbd>` : ""}
        </div>`;
      });
      html += `</div>`;
    }
    this.list.innerHTML = html || `<div class="fv-cmdk__empty">${__("No results")}</div>`;
    this.list.querySelectorAll(".fv-cmdk__item").forEach((el, idx) => {
      el.addEventListener("click", () => this._select(idx));
    });
    this._highlight();
  }

  _onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); this._idx = Math.min(this._idx + 1, this._results.length - 1); this._highlight(); }
    if (e.key === "ArrowUp") { e.preventDefault(); this._idx = Math.max(this._idx - 1, 0); this._highlight(); }
    if (e.key === "Enter" && this._results[this._idx]) { e.preventDefault(); this._select(this._idx); }
  }

  _highlight() {
    this.list.querySelectorAll(".fv-cmdk__item").forEach((el, i) => el.classList.toggle("fv-cmdk__item--active", i === this._idx));
    const active = this.list.querySelector(".fv-cmdk__item--active");
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  _select(idx) {
    const cmd = this._results[idx];
    if (cmd?.action) cmd.action(cmd);
    this.close();
  }

  destroy() { this.overlay.remove(); }
}
