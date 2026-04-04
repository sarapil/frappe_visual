/**
 * FocusTrap — Trap keyboard focus within a container (for accessibility)
 *
 * const trap = frappe.visual.FocusTrap.create({ container: modalEl });
 * trap.activate();   // trap focus inside
 * trap.deactivate(); // release focus
 */
export class FocusTrap {
  static create(opts = {}) { return new FocusTrap(opts); }

  constructor(opts = {}) {
    Object.assign(this, {
      container: null,
      initialFocus: null,     // selector or element to focus on activate
      returnFocus: true,      // return focus to previously focused el
      escapeDeactivates: true,
      clickOutsideDeactivates: false,
      onDeactivate: null
    }, opts);
    this._active = false;
    this._prevFocus = null;
    this._handleKeydown = this._handleKeydown.bind(this);
    this._handleClick = this._handleClick.bind(this);
  }

  activate() {
    if (!this.container || this._active) return;
    this._active = true;
    this._prevFocus = document.activeElement;

    document.addEventListener("keydown", this._handleKeydown);
    if (this.clickOutsideDeactivates) {
      document.addEventListener("click", this._handleClick);
    }

    // Focus initial element
    requestAnimationFrame(() => {
      if (this.initialFocus) {
        const el = typeof this.initialFocus === "string"
          ? this.container.querySelector(this.initialFocus) : this.initialFocus;
        if (el) { el.focus(); return; }
      }
      const first = this._getFocusable()[0];
      if (first) first.focus();
    });
  }

  deactivate() {
    if (!this._active) return;
    this._active = false;
    document.removeEventListener("keydown", this._handleKeydown);
    document.removeEventListener("click", this._handleClick);

    if (this.returnFocus && this._prevFocus) {
      this._prevFocus.focus();
    }
    if (this.onDeactivate) this.onDeactivate();
  }

  _getFocusable() {
    const sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(this.container.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
  }

  _handleKeydown(e) {
    if (e.key === "Escape" && this.escapeDeactivates) {
      e.preventDefault();
      this.deactivate();
      return;
    }
    if (e.key !== "Tab") return;

    const focusable = this._getFocusable();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  _handleClick(e) {
    if (!this.container.contains(e.target)) {
      this.deactivate();
    }
  }

  isActive() { return this._active; }

  destroy() { this.deactivate(); }
}
