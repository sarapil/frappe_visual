/**
 * HotkeyHint — Display available hotkeys overlay (press ? to show)
 *
 * frappe.visual.HotkeyHint.create({
 *   hints: [
 *     { keys: ["Ctrl", "K"], label: "Search", group: "Navigation" },
 *     { keys: ["?"], label: "Show shortcuts", group: "Help" }
 *   ],
 *   triggerKey: "?",
 *   theme: "glass"
 * })
 */
export class HotkeyHint {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new HotkeyHint(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      hints: [], triggerKey: "?", theme: "glass"
    }, opts);
    this._visible = false;
    this._el = null;
    this._bind();
  }

  _bind() {
    document.addEventListener("keydown", (e) => {
      if (e.key === this.triggerKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
        e.preventDefault();
        this.toggle();
      }
      if (e.key === "Escape" && this._visible) this.hide();
    });
  }

  toggle() { this._visible ? this.hide() : this.show(); }

  show() {
    if (this._visible) return;
    this._visible = true;

    this._el = document.createElement("div");
    this._el.className = `fv-hkhint fv-hkhint--${this.theme}`;

    const grouped = {};
    this.hints.forEach(h => (grouped[h.group || __("General")] = grouped[h.group || __("General")] || []).push(h));

    let cols = "";
    for (const [group, hints] of Object.entries(grouped)) {
      cols += `<div class="fv-hkhint__col"><div class="fv-hkhint__group">${HotkeyHint._esc(group)}</div>`;
      hints.forEach(h => {
        const keys = h.keys.map(k => `<kbd class="fv-hkhint__key">${HotkeyHint._esc(k)}</kbd>`).join(`<span class="fv-hkhint__plus">+</span>`);
        cols += `<div class="fv-hkhint__row">${keys}<span class="fv-hkhint__label">${HotkeyHint._esc(h.label)}</span></div>`;
      });
      cols += `</div>`;
    }

    this._el.innerHTML = `
      <div class="fv-hkhint__backdrop"></div>
      <div class="fv-hkhint__dialog">
        <div class="fv-hkhint__header">
          <h3>${__("Keyboard Shortcuts")}</h3>
          <button class="fv-hkhint__close">&times;</button>
        </div>
        <div class="fv-hkhint__grid">${cols}</div>
        <div class="fv-hkhint__footer">${__("Press")} <kbd>?</kbd> ${__("to toggle this overlay")}</div>
      </div>`;

    this._el.querySelector(".fv-hkhint__backdrop").addEventListener("click", () => this.hide());
    this._el.querySelector(".fv-hkhint__close").addEventListener("click", () => this.hide());

    document.body.appendChild(this._el);
    requestAnimationFrame(() => this._el.classList.add("fv-hkhint--open"));
  }

  hide() {
    if (!this._el) return;
    this._visible = false;
    this._el.classList.remove("fv-hkhint--open");
    setTimeout(() => { this._el?.remove(); this._el = null; }, 250);
  }

  addHint(hint) { this.hints.push(hint); }

  destroy() { this.hide(); }
}
