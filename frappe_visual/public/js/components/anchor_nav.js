/**
 * AnchorNav — Sticky table-of-contents with active scroll tracking
 *
 * frappe.visual.AnchorNav.create({
 *   wrapper: el,
 *   sections: [{ id, label, icon }],   // or auto-detect from headings
 *   scrollContainer: window,
 *   offset: 80,                         // top offset for active detection
 *   sticky: true,
 *   theme: "glass"
 * })
 */
export class AnchorNav {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new AnchorNav(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, sections: [], scrollContainer: window,
      offset: 80, sticky: true, theme: "glass"
    }, opts);
    if (!this.wrapper) return;
    this._build();
    this._bind();
  }

  _build() {
    this.el = document.createElement("nav");
    this.el.className = `fv-anav fv-anav--${this.theme}`;
    if (this.sticky) this.el.classList.add("fv-anav--sticky");

    if (!this.sections.length) {
      // Auto-detect headings
      const headings = document.querySelectorAll("h2[id], h3[id]");
      headings.forEach(h => {
        this.sections.push({ id: h.id, label: h.textContent, level: h.tagName === "H3" ? 2 : 1 });
      });
    }

    this.el.innerHTML = this.sections.map(s => `
      <a class="fv-anav__link${s.level === 2 ? " fv-anav__link--sub" : ""}" href="#${AnchorNav._esc(s.id)}" data-id="${AnchorNav._esc(s.id)}">
        ${s.icon ? `<span class="fv-anav__icon">${s.icon}</span>` : ""}
        <span class="fv-anav__text">${AnchorNav._esc(s.label)}</span>
      </a>`).join("");

    // Indicator bar
    this.indicator = document.createElement("div");
    this.indicator.className = "fv-anav__indicator";
    this.el.prepend(this.indicator);

    // Smooth scroll on click
    this.el.querySelectorAll(".fv-anav__link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.id);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    this.wrapper.appendChild(this.el);
  }

  _bind() {
    let ticking = false;
    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        this._updateActive();
        ticking = false;
      });
    };
    (this.scrollContainer === window ? window : this.scrollContainer)
      .addEventListener("scroll", handler, { passive: true });
    handler();
  }

  _updateActive() {
    let activeId = null;
    for (const s of this.sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= this.offset + 10) activeId = s.id;
    }
    this.el.querySelectorAll(".fv-anav__link").forEach(link => {
      const isActive = link.dataset.id === activeId;
      link.classList.toggle("fv-anav__link--active", isActive);
      if (isActive) {
        this.indicator.style.top = `${link.offsetTop}px`;
        this.indicator.style.height = `${link.offsetHeight}px`;
      }
    });
  }

  destroy() { this.el.remove(); }
}
