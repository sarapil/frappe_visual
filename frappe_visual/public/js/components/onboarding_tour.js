/**
 * OnboardingTour — Step-by-step guided tour with highlights
 *
 * frappe.visual.OnboardingTour.create({
 *   steps: [
 *     { target: "#my-btn", title: "Click here", description: "This does X", placement: "bottom" },
 *     { target: ".sidebar", title: "Sidebar", description: "Navigate here" }
 *   ],
 *   onComplete: () => {},
 *   onSkip: () => {},
 *   showProgress: true,
 *   theme: "glass"
 * })
 */
export class OnboardingTour {
  static _esc(s) { return (s || "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[m]); }

  static create(opts = {}) { return new OnboardingTour(opts); }

  constructor(opts) {
    Object.assign(this, {
      steps: [], onComplete: null, onSkip: null,
      showProgress: true, theme: "glass"
    }, opts);
    this._idx = 0;
    if (!this.steps.length) return;
    this._build();
    this._show(0);
  }

  _build() {
    this.overlay = document.createElement("div");
    this.overlay.className = `fv-tour fv-tour--${this.theme}`;
    this.overlay.innerHTML = `
      <svg class="fv-tour__overlay" width="100%" height="100%">
        <defs><mask id="fv-tour-mask">
          <rect width="100%" height="100%" fill="white"/>
          <rect class="fv-tour__hole" rx="8" ry="8" fill="black"/>
        </mask></defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,.55)" mask="url(#fv-tour-mask)"/>
      </svg>
      <div class="fv-tour__tooltip">
        <div class="fv-tour__arrow"></div>
        <div class="fv-tour__header">
          <span class="fv-tour__title"></span>
          <button class="fv-tour__close">&times;</button>
        </div>
        <div class="fv-tour__desc"></div>
        ${this.showProgress ? `<div class="fv-tour__progress"></div>` : ""}
        <div class="fv-tour__nav">
          <button class="fv-tour__btn fv-tour__btn--skip">${__("Skip")}</button>
          <div class="fv-tour__nav-right">
            <button class="fv-tour__btn fv-tour__btn--prev">${__("Back")}</button>
            <button class="fv-tour__btn fv-tour__btn--next">${__("Next")}</button>
          </div>
        </div>
      </div>`;

    this.hole = this.overlay.querySelector(".fv-tour__hole");
    this.tooltip = this.overlay.querySelector(".fv-tour__tooltip");
    this.titleEl = this.overlay.querySelector(".fv-tour__title");
    this.descEl = this.overlay.querySelector(".fv-tour__desc");
    this.progressEl = this.overlay.querySelector(".fv-tour__progress");

    this.overlay.querySelector(".fv-tour__close").addEventListener("click", () => this.skip());
    this.overlay.querySelector(".fv-tour__btn--skip").addEventListener("click", () => this.skip());
    this.overlay.querySelector(".fv-tour__btn--prev").addEventListener("click", () => this.prev());
    this.overlay.querySelector(".fv-tour__btn--next").addEventListener("click", () => this.next());

    document.body.appendChild(this.overlay);
  }

  _show(idx) {
    this._idx = idx;
    const step = this.steps[idx];
    const target = document.querySelector(step.target);

    // Highlight target
    if (target) {
      const r = target.getBoundingClientRect();
      const pad = 6;
      this.hole.setAttribute("x", r.left - pad);
      this.hole.setAttribute("y", r.top - pad);
      this.hole.setAttribute("width", r.width + pad * 2);
      this.hole.setAttribute("height", r.height + pad * 2);
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    this.titleEl.textContent = step.title || "";
    this.descEl.innerHTML = step.description || "";

    if (this.progressEl) {
      const dots = this.steps.map((_, i) =>
        `<span class="fv-tour__dot${i === idx ? " fv-tour__dot--active" : ""}"></span>`
      ).join("");
      this.progressEl.innerHTML = dots;
    }

    // Position tooltip
    this._positionTooltip(target, step.placement || "bottom");

    // Update nav buttons
    const prevBtn = this.overlay.querySelector(".fv-tour__btn--prev");
    const nextBtn = this.overlay.querySelector(".fv-tour__btn--next");
    prevBtn.style.display = idx === 0 ? "none" : "";
    nextBtn.textContent = idx === this.steps.length - 1 ? __("Done") : __("Next");
  }

  _positionTooltip(target, placement) {
    if (!target) { this.tooltip.style.top = "50%"; this.tooltip.style.left = "50%"; return; }
    const r = target.getBoundingClientRect();
    const gap = 14;
    this.tooltip.style.position = "fixed";

    switch (placement) {
      case "top":
        this.tooltip.style.bottom = `${window.innerHeight - r.top + gap}px`;
        this.tooltip.style.left = `${r.left + r.width / 2}px`;
        this.tooltip.style.transform = "translateX(-50%)"; break;
      case "left":
        this.tooltip.style.top = `${r.top + r.height / 2}px`;
        this.tooltip.style.right = `${window.innerWidth - r.left + gap}px`;
        this.tooltip.style.transform = "translateY(-50%)"; break;
      case "right":
        this.tooltip.style.top = `${r.top + r.height / 2}px`;
        this.tooltip.style.left = `${r.right + gap}px`;
        this.tooltip.style.transform = "translateY(-50%)"; break;
      default: // bottom
        this.tooltip.style.top = `${r.bottom + gap}px`;
        this.tooltip.style.left = `${r.left + r.width / 2}px`;
        this.tooltip.style.transform = "translateX(-50%)";
    }
  }

  next() {
    if (this._idx >= this.steps.length - 1) { this.complete(); return; }
    this._show(this._idx + 1);
  }
  prev() { if (this._idx > 0) this._show(this._idx - 1); }

  complete() {
    this.overlay.remove();
    if (this.onComplete) this.onComplete();
  }

  skip() {
    this.overlay.remove();
    if (this.onSkip) this.onSkip();
  }

  destroy() { this.overlay?.remove(); }
}
