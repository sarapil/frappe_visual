/**
 * GlobalSearch — Unified search across DocTypes, pages, commands
 *
 * frappe.visual.GlobalSearch.create({
 *   sources: [
 *     { id: "doctypes", label: "Documents", search: async (q) => results, icon: "📄" },
 *     { id: "pages", label: "Pages", search: async (q) => results, icon: "📑" }
 *   ],
 *   hotkey: "k",           // Ctrl/Cmd+K
 *   placeholder: "Search everywhere…",
 *   maxPerSource: 5,
 *   theme: "glass"
 * })
 */
export class GlobalSearch {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new GlobalSearch(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      sources: [], hotkey: "k",
      placeholder: __("Search everywhere…"),
      maxPerSource: 5, theme: "glass"
    }, opts);
    this._open = false;
    this._results = {};
    this._debounce = null;
    this._build();
    this._bindHotkey();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-gsearch fv-gsearch--${this.theme}`;
    this.el.innerHTML = `
      <div class="fv-gsearch__backdrop"></div>
      <div class="fv-gsearch__dialog">
        <div class="fv-gsearch__input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input class="fv-gsearch__input" placeholder="${GlobalSearch._esc(this.placeholder)}" />
          <kbd class="fv-gsearch__esc">ESC</kbd>
        </div>
        <div class="fv-gsearch__tabs"></div>
        <div class="fv-gsearch__results"></div>
      </div>`;

    this.input = this.el.querySelector(".fv-gsearch__input");
    this.tabs = this.el.querySelector(".fv-gsearch__tabs");
    this.results = this.el.querySelector(".fv-gsearch__results");

    this.el.querySelector(".fv-gsearch__backdrop").addEventListener("click", () => this.close());
    this.el.querySelector(".fv-gsearch__esc").addEventListener("click", () => this.close());
    this.input.addEventListener("input", () => this._onInput());

    // Render tabs
    this.tabs.innerHTML = `<button class="fv-gsearch__tab fv-gsearch__tab--active" data-src="all">${__("All")}</button>` +
      this.sources.map(s => `<button class="fv-gsearch__tab" data-src="${GlobalSearch._esc(s.id)}">${s.icon || ""} ${GlobalSearch._esc(s.label)}</button>`).join("");

    this._activeTab = "all";
    this.tabs.querySelectorAll(".fv-gsearch__tab").forEach(btn => {
      btn.addEventListener("click", () => {
        this._activeTab = btn.dataset.src;
        this.tabs.querySelectorAll(".fv-gsearch__tab").forEach(b => b.classList.toggle("fv-gsearch__tab--active", b === btn));
        this._renderResults();
      });
    });

    document.body.appendChild(this.el);
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
    this.el.classList.add("fv-gsearch--open");
    this.input.value = "";
    this.results.innerHTML = `<div class="fv-gsearch__hint">${__("Type to search across all sources")}</div>`;
    requestAnimationFrame(() => this.input.focus());
  }

  close() {
    this._open = false;
    this.el.classList.remove("fv-gsearch--open");
  }

  async _onInput() {
    clearTimeout(this._debounce);
    const q = this.input.value.trim();
    if (!q) { this.results.innerHTML = ""; return; }

    this._debounce = setTimeout(async () => {
      this.results.innerHTML = `<div class="fv-gsearch__loading">${__("Searching…")}</div>`;
      const promises = this.sources.map(async (src) => {
        try {
          const items = await src.search(q);
          this._results[src.id] = (items || []).slice(0, this.maxPerSource);
        } catch { this._results[src.id] = []; }
      });
      await Promise.all(promises);
      this._renderResults();
    }, 200);
  }

  _renderResults() {
    let html = "";
    const sources = this._activeTab === "all" ? this.sources : this.sources.filter(s => s.id === this._activeTab);

    for (const src of sources) {
      const items = this._results[src.id] || [];
      if (!items.length) continue;
      html += `<div class="fv-gsearch__section"><div class="fv-gsearch__section-label">${src.icon || ""} ${GlobalSearch._esc(src.label)}</div>`;
      items.forEach(item => {
        html += `<a class="fv-gsearch__item" href="${GlobalSearch._esc(item.href || "#")}">
          ${item.icon ? `<span class="fv-gsearch__item-icon">${item.icon}</span>` : ""}
          <div class="fv-gsearch__item-text">
            <span class="fv-gsearch__item-title">${GlobalSearch._esc(item.title)}</span>
            ${item.subtitle ? `<span class="fv-gsearch__item-sub">${GlobalSearch._esc(item.subtitle)}</span>` : ""}
          </div>
        </a>`;
      });
      html += `</div>`;
    }

    this.results.innerHTML = html || `<div class="fv-gsearch__empty">${__("No results found")}</div>`;

    this.results.querySelectorAll(".fv-gsearch__item").forEach(a => {
      a.addEventListener("click", () => this.close());
    });
  }

  destroy() { this.el.remove(); }
}
