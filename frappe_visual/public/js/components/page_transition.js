// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * PageTransition — Animated route/page transitions
 *
 * frappe.visual.PageTransition.create({
 *   wrapper: el,           // container to transition children within
 *   effect: "fade",        // fade | slide-left | slide-up | scale | flip
 *   duration: 300,
 *   easing: "ease"
 * })
 *
 * instance.transition(newContentEl)
 */
export class PageTransition {
  static create(opts = {}) { return new PageTransition(opts); }

  constructor(opts) {
    Object.assign(this, {
      wrapper: null, effect: "fade", duration: 300, easing: "ease"
    }, opts);
    if (!this.wrapper) return;
    this.wrapper.classList.add("fv-ptrans");
    this.wrapper.style.position = "relative";
    this.wrapper.style.overflow = "hidden";
  }

  async transition(newEl) {
    const old = this.wrapper.firstElementChild;
    newEl.classList.add("fv-ptrans__page", `fv-ptrans--${this.effect}-enter`);
    this.wrapper.appendChild(newEl);

    if (old) {
      old.classList.add(`fv-ptrans--${this.effect}-exit`);
      old.style.transition = `all ${this.duration}ms ${this.easing}`;
      newEl.style.transition = `all ${this.duration}ms ${this.easing}`;

      // Trigger reflow
      void newEl.offsetWidth;

      old.classList.add(`fv-ptrans--${this.effect}-exit-active`);
      newEl.classList.remove(`fv-ptrans--${this.effect}-enter`);
      newEl.classList.add(`fv-ptrans--${this.effect}-enter-active`);

      await new Promise(r => setTimeout(r, this.duration));
      old.remove();
    }

    newEl.classList.remove(
      `fv-ptrans--${this.effect}-enter-active`,
      "fv-ptrans__page"
    );
    newEl.style.transition = "";
  }

  destroy() {
    this.wrapper?.classList.remove("fv-ptrans");
  }
}
