/**
 * BackToTop — Smooth scroll-to-top button with scroll progress
 *
 * frappe.visual.BackToTop.create({
 *   threshold: 300,         // px scrolled before showing
 *   showProgress: true,     // circular progress ring
 *   icon: "↑",
 *   theme: "glass"
 * })
 */
export class BackToTop {
  static create(opts = {}) { return new BackToTop(opts); }

  constructor(opts) {
    Object.assign(this, {
      threshold: 300, showProgress: true, icon: "↑", theme: "glass"
    }, opts);
    this._build();
    this._bind();
  }

  _build() {
    this.el = document.createElement("button");
    this.el.className = `fv-btt fv-btt--${this.theme}`;
    this.el.setAttribute("aria-label", __("Back to top"));

    if (this.showProgress) {
      this.el.innerHTML = `
        <svg class="fv-btt__ring" viewBox="0 0 36 36">
          <circle class="fv-btt__ring-bg" cx="18" cy="18" r="16" fill="none" stroke-width="2"/>
          <circle class="fv-btt__ring-fg" cx="18" cy="18" r="16" fill="none" stroke-width="2"
            stroke-dasharray="100.5" stroke-dashoffset="100.5"/>
        </svg>
        <span class="fv-btt__icon">${this.icon}</span>`;
      this.ring = this.el.querySelector(".fv-btt__ring-fg");
    } else {
      this.el.innerHTML = `<span class="fv-btt__icon">${this.icon}</span>`;
    }

    this.el.addEventListener("click", () => this.scrollToTop());
    document.body.appendChild(this.el);
  }

  _bind() {
    const circ = 2 * Math.PI * 16; // ~100.5
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const pct = total > 0 ? scrolled / total : 0;

        this.el.classList.toggle("fv-btt--visible", scrolled > this.threshold);

        if (this.ring) {
          this.ring.style.strokeDashoffset = circ * (1 - pct);
        }
        ticking = false;
      });
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  destroy() { this.el.remove(); }
}
