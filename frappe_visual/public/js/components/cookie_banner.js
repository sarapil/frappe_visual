/**
 * CookieBanner — GDPR/privacy cookie consent banner
 *
 * frappe.visual.CookieBanner.create({
 *   message: "We use cookies…",
 *   acceptText: "Accept All",
 *   rejectText: "Reject",
 *   settingsText: "Customize",
 *   categories: [
 *     { id: "necessary", label: "Necessary", required: true },
 *     { id: "analytics", label: "Analytics" },
 *     { id: "marketing", label: "Marketing" }
 *   ],
 *   onAccept: (accepted) => {},
 *   position: "bottom",    // bottom | top
 *   cookieKey: "fv_cookie_consent",
 *   theme: "glass"
 * })
 */
export class CookieBanner {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new CookieBanner(opts); }

  constructor(opts) {
    Object.assign(this, {
      message: __("We use cookies to improve your experience."),
      acceptText: __("Accept All"), rejectText: __("Reject All"),
      settingsText: __("Customize"), categories: [],
      onAccept: null, position: "bottom",
      cookieKey: "fv_cookie_consent", theme: "glass"
    }, opts);

    // Already consented?
    if (this._getConsent()) return;
    this._build();
  }

  _build() {
    this.el = document.createElement("div");
    this.el.className = `fv-cookie fv-cookie--${this.position} fv-cookie--${this.theme}`;

    const cats = this.categories.map(c => `
      <label class="fv-cookie__cat">
        <input type="checkbox" ${c.required ? "checked disabled" : ""} data-id="${CookieBanner._esc(c.id)}" />
        <span>${CookieBanner._esc(c.label)}</span>
      </label>`).join("");

    this.el.innerHTML = `
      <div class="fv-cookie__content">
        <p class="fv-cookie__msg">${CookieBanner._esc(this.message)}</p>
        <div class="fv-cookie__cats" style="display:none">${cats}</div>
      </div>
      <div class="fv-cookie__actions">
        ${this.categories.length ? `<button class="fv-cookie__btn fv-cookie__btn--settings">${CookieBanner._esc(this.settingsText)}</button>` : ""}
        <button class="fv-cookie__btn fv-cookie__btn--reject">${CookieBanner._esc(this.rejectText)}</button>
        <button class="fv-cookie__btn fv-cookie__btn--accept">${CookieBanner._esc(this.acceptText)}</button>
      </div>`;

    this.el.querySelector(".fv-cookie__btn--accept").addEventListener("click", () => this._accept(true));
    this.el.querySelector(".fv-cookie__btn--reject").addEventListener("click", () => this._accept(false));

    const settingsBtn = this.el.querySelector(".fv-cookie__btn--settings");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        const cats = this.el.querySelector(".fv-cookie__cats");
        cats.style.display = cats.style.display === "none" ? "flex" : "none";
      });
    }

    document.body.appendChild(this.el);
    requestAnimationFrame(() => this.el.classList.add("fv-cookie--visible"));
  }

  _accept(all) {
    const accepted = {};
    if (all) {
      this.categories.forEach(c => accepted[c.id] = true);
    } else {
      this.categories.forEach(c => {
        const cb = this.el.querySelector(`[data-id="${c.id}"]`);
        accepted[c.id] = c.required || (cb?.checked || false);
      });
    }
    this._setConsent(accepted);
    if (this.onAccept) this.onAccept(accepted);
    this.close();
  }

  _getConsent() {
    try { return JSON.parse(localStorage.getItem(this.cookieKey)); } catch { return null; }
  }
  _setConsent(v) {
    localStorage.setItem(this.cookieKey, JSON.stringify(v));
  }

  close() {
    this.el.classList.remove("fv-cookie--visible");
    setTimeout(() => this.el.remove(), 350);
  }

  destroy() { this.el?.remove(); }
}
