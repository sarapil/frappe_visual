/**
 * ShortcutManager — Register and display global keyboard shortcuts
 *
 * const sm = frappe.visual.ShortcutManager.create();
 * sm.register({ keys: "ctrl+shift+p", label: "Command Palette", action: () => {} });
 * sm.register({ keys: "ctrl+s", label: "Save", action: () => {}, scope: "form" });
 * sm.showOverlay();  // show all registered shortcuts
 */
export class ShortcutManager {
  static create(opts = {}) { return new ShortcutManager(opts); }

  constructor(opts = {}) {
    Object.assign(this, { theme: "glass" }, opts);
    this._shortcuts = [];
    this._scopes = new Set(["global"]);
    this._activeScope = "global";
    this._overlay = null;
    this._listen();
  }

  register({ keys, label, action, scope = "global", group = "General" }) {
    const combo = keys.toLowerCase().split("+").map(k => k.trim()).sort();
    this._shortcuts.push({ keys, combo, label, action, scope, group });
    this._scopes.add(scope);
    return this;
  }

  unregister(keys) {
    const combo = keys.toLowerCase().split("+").map(k => k.trim()).sort();
    this._shortcuts = this._shortcuts.filter(s => s.combo.join("+") !== combo.join("+"));
  }

  setScope(scope) { this._activeScope = scope; }

  _listen() {
    document.addEventListener("keydown", (e) => {
      // ? key shows overlay
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = e.target.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !e.target.isContentEditable) {
          e.preventDefault();
          this.showOverlay();
          return;
        }
      }

      const pressed = [];
      if (e.ctrlKey || e.metaKey) pressed.push("ctrl");
      if (e.shiftKey) pressed.push("shift");
      if (e.altKey) pressed.push("alt");
      if (e.key && !["Control","Meta","Shift","Alt"].includes(e.key)) {
        pressed.push(e.key.toLowerCase());
      }
      const combo = pressed.sort();

      for (const sc of this._shortcuts) {
        if (sc.scope !== "global" && sc.scope !== this._activeScope) continue;
        if (sc.combo.join("+") === combo.join("+")) {
          e.preventDefault();
          sc.action(sc);
          return;
        }
      }
    });
  }

  showOverlay() {
    if (this._overlay) { this.hideOverlay(); return; }
    this._overlay = document.createElement("div");
    this._overlay.className = `fv-scuts fv-scuts--${this.theme}`;

    const grouped = {};
    this._shortcuts
      .filter(s => s.scope === "global" || s.scope === this._activeScope)
      .forEach(s => (grouped[s.group] = grouped[s.group] || []).push(s));

    let html = `<div class="fv-scuts__backdrop"></div><div class="fv-scuts__dialog">
      <div class="fv-scuts__header"><h3>${__("Keyboard Shortcuts")}</h3>
      <button class="fv-scuts__close">&times;</button></div><div class="fv-scuts__body">`;

    for (const [group, items] of Object.entries(grouped)) {
      html += `<div class="fv-scuts__group"><div class="fv-scuts__group-label">${group}</div>`;
      items.forEach(s => {
        const keys = s.keys.split("+").map(k => `<kbd>${k}</kbd>`).join("");
        html += `<div class="fv-scuts__row"><span class="fv-scuts__label">${s.label}</span><span class="fv-scuts__keys">${keys}</span></div>`;
      });
      html += `</div>`;
    }
    html += `</div></div>`;
    this._overlay.innerHTML = html;

    this._overlay.querySelector(".fv-scuts__backdrop").addEventListener("click", () => this.hideOverlay());
    this._overlay.querySelector(".fv-scuts__close").addEventListener("click", () => this.hideOverlay());
    document.body.appendChild(this._overlay);
    requestAnimationFrame(() => this._overlay.classList.add("fv-scuts--open"));
  }

  hideOverlay() {
    if (!this._overlay) return;
    this._overlay.remove();
    this._overlay = null;
  }

  getAll(scope) {
    return scope ? this._shortcuts.filter(s => s.scope === scope) : this._shortcuts;
  }

  destroy() { this.hideOverlay(); }
}
