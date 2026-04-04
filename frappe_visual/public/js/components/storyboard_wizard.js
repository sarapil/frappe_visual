// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Storyboard — Animated Step-by-Step Wizard
 * ============================================
 * Multi-step wizard with GSAP-animated transitions.
 * Useful for: onboarding, multi-step forms, decision trees.
 *
 * Each step can contain:
 * - Custom HTML content
 * - A visual/graph mini-view
 * - Decision buttons that branch the flow
 * - Validation before proceeding
 */

export class Storyboard {
	/**
	 * @param {string|HTMLElement} container
	 * @param {Array} steps - Step definitions
	 * @param {Object} [opts]
	 */
	static create(container, steps, opts = {}) {
		return new Storyboard(container, steps, opts);
	}

	/**
	 * @param {string|HTMLElement} container
	 * @param {Array} steps - [{
	 *   title: string,
	 *   content: string | HTMLElement | Function(stepEl),
	 *   validate: Function → boolean,
	 *   onEnter: Function,
	 *   onLeave: Function,
	 *   choices: [{ label, value, color, icon }], // optional branching
	 * }]
	 * @param {Object} opts - {
	 *   onComplete: Function(data),
	 *   onStepChange: Function(stepIndex, direction),
	 *   allowSkip: boolean,
	 *   showProgress: boolean,
	 * }
	 */
	constructor(container, steps, opts) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container;
		this.steps = steps;
		this.opts = Object.assign(
			{
				showProgress: true,
				allowSkip: false,
			},
			opts
		);
		this.currentStep = 0;
		this.data = {};

		this._build();
		this._showStep(0);
	}

	_build() {
		this.container.innerHTML = "";
		this.el = document.createElement("div");
		this.el.className = "fv-storyboard fv-animate-enter";

		// Progress bar
		if (this.opts.showProgress) {
			this.progressEl = document.createElement("div");
			this.progressEl.className = "fv-storyboard-progress";
			this.steps.forEach((_, i) => {
				const dot = document.createElement("div");
				dot.className = "fv-step-dot";
				dot.dataset.step = i;
				this.progressEl.appendChild(dot);
			});
			this.el.appendChild(this.progressEl);
		}

		// Content area
		this.contentEl = document.createElement("div");
		this.contentEl.className = "fv-storyboard-content";
		this.el.appendChild(this.contentEl);

		// Navigation
		this.navEl = document.createElement("div");
		this.navEl.className = "fv-storyboard-nav";
		this.navEl.innerHTML = `
			<button class="fv-storyboard-btn fv-sb-prev">${__("Back")}</button>
			<div class="fv-sb-step-info"></div>
			<button class="fv-storyboard-btn primary fv-sb-next">${__("Next")}</button>
		`;

		this.navEl.querySelector(".fv-sb-prev").addEventListener("click", () => this.prev());
		this.navEl.querySelector(".fv-sb-next").addEventListener("click", () => this.next());

		this.el.appendChild(this.navEl);
		this.container.appendChild(this.el);
	}

	_showStep(index) {
		const step = this.steps[index];
		if (!step) return;

		// Update progress
		if (this.progressEl) {
			this.progressEl.querySelectorAll(".fv-step-dot").forEach((dot, i) => {
				dot.classList.toggle("active", i === index);
				dot.classList.toggle("completed", i < index);
			});
		}

		// Update navigation
		const prevBtn = this.navEl.querySelector(".fv-sb-prev");
		const nextBtn = this.navEl.querySelector(".fv-sb-next");
		const info = this.navEl.querySelector(".fv-sb-step-info");

		prevBtn.style.visibility = index === 0 ? "hidden" : "visible";
		nextBtn.textContent =
			index === this.steps.length - 1 ? __("Complete") : __("Next");

		info.textContent = `${index + 1} / ${this.steps.length}`;

		// Animate content transition
		const gsap = frappe.visual?.gsap;
		const direction = index > this.currentStep ? 1 : -1;

		if (gsap) {
			gsap.to(this.contentEl, {
				opacity: 0,
				x: -30 * direction,
				duration: 0.2,
				ease: "power2.in",
				onComplete: () => {
					this._renderStepContent(step);
					gsap.fromTo(
						this.contentEl,
						{ opacity: 0, x: 30 * direction },
						{
							opacity: 1,
							x: 0,
							duration: 0.35,
							ease: "power2.out",
						}
					);
				},
			});
		} else {
			this._renderStepContent(step);
		}

		this.currentStep = index;

		// Callback
		if (step.onEnter) step.onEnter(this.contentEl, this.data);
		if (this.opts.onStepChange) this.opts.onStepChange(index, direction > 0 ? "forward" : "backward");
	}

	_renderStepContent(step) {
		this.contentEl.innerHTML = "";

		// Title
		if (step.title) {
			const title = document.createElement("h2");
			title.style.cssText =
				"margin:0 0 16px;font-size:20px;font-weight:700;color:var(--fv-text-primary);";
			title.textContent = step.title;
			this.contentEl.appendChild(title);
		}

		// Content
		if (typeof step.content === "string") {
			const div = document.createElement("div");
			div.innerHTML = step.content;
			this.contentEl.appendChild(div);
		} else if (step.content instanceof HTMLElement) {
			this.contentEl.appendChild(step.content);
		} else if (typeof step.content === "function") {
			step.content(this.contentEl, this.data);
		}

		// Choices (branching)
		if (step.choices && step.choices.length > 0) {
			const choicesEl = document.createElement("div");
			choicesEl.style.cssText =
				"display:flex;gap:12px;margin-top:24px;flex-wrap:wrap;";

			step.choices.forEach((choice) => {
				const btn = document.createElement("button");
				btn.className = "fv-storyboard-btn";
				btn.style.cssText = `border-color:${choice.color || "var(--fv-accent)"};flex:1;min-width:140px;`;
				btn.innerHTML = `${choice.icon || ""} ${choice.label}`;
				btn.addEventListener("click", () => {
					this.data[`step_${this.currentStep}_choice`] = choice.value;
					if (choice.goTo !== undefined) {
						this._showStep(choice.goTo);
					} else {
						this.next();
					}
				});
				choicesEl.appendChild(btn);
			});

			this.contentEl.appendChild(choicesEl);
		}
	}

	async next() {
		const step = this.steps[this.currentStep];

		// Validate
		if (step.validate) {
			const valid = await step.validate(this.contentEl, this.data);
			if (!valid) return;
		}

		// Leave callback
		if (step.onLeave) await step.onLeave(this.contentEl, this.data);

		if (this.currentStep < this.steps.length - 1) {
			this._showStep(this.currentStep + 1);
		} else {
			// Complete
			if (this.opts.onComplete) {
				this.opts.onComplete(this.data);
			}
		}
	}

	prev() {
		if (this.currentStep > 0) {
			this._showStep(this.currentStep - 1);
		}
	}

	goTo(index) {
		if (index >= 0 && index < this.steps.length) {
			this._showStep(index);
		}
	}

	destroy() {
		this.container.innerHTML = "";
	}
}
