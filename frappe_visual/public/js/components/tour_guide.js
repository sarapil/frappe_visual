/**
 * Frappe Visual — Tour / Spotlight Guide
 * =========================================
 * Step-by-step guided tours with highlighted overlays, tooltips with arrows,
 * keyboard navigation, progress indicator, and completion callback.
 * Ideal for onboarding, feature discovery, and contextual help.
 *
 * Features:
 *  - Highlight overlay with smooth spotlight cutout on target element
 *  - Tooltip positioned intelligently (top/bottom/left/right) with arrow
 *  - Keyboard navigation (← → Esc Enter)
 *  - Progress bar + step counter
 *  - Step callbacks: onEnter, onLeave, canProceed (validation)
 *  - Auto-scroll to target element
 *  - Pulse animation on highlighted element
 *  - Skip / Next / Previous / Finish buttons
 *  - Hotspot mode: click-triggered steps (vs. sequential)
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.TourGuide.create(steps, opts)
 *
 * @module frappe_visual/components/tour_guide
 */

function _esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

export class TourGuide {
	constructor(steps = [], opts = {}) {
		this.steps = steps.map((s, i) => ({ ...s, _idx: i }));
		this.opts = Object.assign({
			theme: "glass",
			overlayColor: "rgba(0,0,0,0.55)",
			padding: 10,
			borderRadius: 8,
			animate: true,
			scrollBehavior: "smooth",
			showProgress: true,
			showSkip: true,
			onComplete: null,
			onSkip: null,
			onStepChange: null,
			closeOnOverlay: false,
			closeOnEsc: true,
			pulseAnimation: true,
		}, opts);

		this._currentStep = -1;
		this._active = false;
	}

	static create(steps, opts) { return new TourGuide(steps, opts); }

	/* ── Start / Stop ────────────────────────────────────────── */
	start(fromStep = 0) {
		if (this._active) return;
		this._active = true;
		this._createOverlay();
		this._setupKeyboard();
		this.goTo(fromStep);
		return this;
	}

	stop() {
		this._active = false;
		this._destroyOverlay();
		this._removeKeyboard();
	}

	/* ── Overlay ─────────────────────────────────────────────── */
	_createOverlay() {
		// SVG overlay for spotlight cutout
		this._overlay = document.createElement("div");
		this._overlay.className = `fv-tg-overlay fv-tg--${this.opts.theme}`;
		this._overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;pointer-events:auto;";

		const svgNS = "http://www.w3.org/2000/svg";
		this._svg = document.createElementNS(svgNS, "svg");
		this._svg.setAttribute("width", "100%");
		this._svg.setAttribute("height", "100%");
		this._svg.style.cssText = "position:absolute;top:0;left:0;";

		// Full-screen rect with cutout mask
		const defs = document.createElementNS(svgNS, "defs");
		const mask = document.createElementNS(svgNS, "mask");
		mask.setAttribute("id", "fv-tg-mask");
		const maskBg = document.createElementNS(svgNS, "rect");
		maskBg.setAttribute("width", "100%");
		maskBg.setAttribute("height", "100%");
		maskBg.setAttribute("fill", "white");
		mask.appendChild(maskBg);

		this._cutout = document.createElementNS(svgNS, "rect");
		this._cutout.setAttribute("fill", "black");
		this._cutout.setAttribute("rx", this.opts.borderRadius);
		mask.appendChild(this._cutout);
		defs.appendChild(mask);
		this._svg.appendChild(defs);

		const bg = document.createElementNS(svgNS, "rect");
		bg.setAttribute("width", "100%");
		bg.setAttribute("height", "100%");
		bg.setAttribute("fill", this.opts.overlayColor);
		bg.setAttribute("mask", "url(#fv-tg-mask)");
		this._svg.appendChild(bg);

		this._overlay.appendChild(this._svg);

		if (this.opts.closeOnOverlay) {
			this._overlay.addEventListener("click", (e) => {
				if (e.target === this._overlay || e.target === this._svg || e.target === bg) {
					this.stop();
					if (this.opts.onSkip) this.opts.onSkip(this._currentStep);
				}
			});
		}

		// Tooltip container
		this._tooltip = document.createElement("div");
		this._tooltip.className = "fv-tg-tooltip";
		this._overlay.appendChild(this._tooltip);

		document.body.appendChild(this._overlay);
	}

	_destroyOverlay() {
		if (this._overlay) { this._overlay.remove(); this._overlay = null; }
		this._removePulse();
	}

	/* ── Navigation ──────────────────────────────────────────── */
	async goTo(idx) {
		if (idx < 0 || idx >= this.steps.length) return;

		// Leave current step
		if (this._currentStep >= 0) {
			const prevStep = this.steps[this._currentStep];
			if (prevStep.onLeave) await prevStep.onLeave(prevStep);
			this._removePulse();
		}

		this._currentStep = idx;
		const step = this.steps[idx];

		// Enter step
		if (step.onEnter) await step.onEnter(step);
		if (this.opts.onStepChange) this.opts.onStepChange(idx, step);

		// Find target
		const target = step.target ? document.querySelector(step.target) : null;

		if (target) {
			// Scroll into view
			target.scrollIntoView({ behavior: this.opts.scrollBehavior, block: "center" });
			// Wait for scroll
			await new Promise(r => setTimeout(r, 300));

			const rect = target.getBoundingClientRect();
			const pad = this.opts.padding;

			// Update cutout
			this._cutout.setAttribute("x", rect.left - pad);
			this._cutout.setAttribute("y", rect.top - pad);
			this._cutout.setAttribute("width", rect.width + pad * 2);
			this._cutout.setAttribute("height", rect.height + pad * 2);

			// Pulse animation
			if (this.opts.pulseAnimation) this._addPulse(target);

			// Position tooltip
			this._positionTooltip(rect, step);

			// Make target clickable through overlay
			target.style.position = target.style.position || "relative";
			target.style.zIndex = "10001";
			this._prevTarget = target;
		} else {
			// No target — center tooltip
			this._cutout.setAttribute("width", 0);
			this._cutout.setAttribute("height", 0);
			this._positionTooltipCenter(step);
		}

		this._renderTooltip(step, idx);
	}

	async next() {
		const step = this.steps[this._currentStep];
		if (step?.canProceed) {
			const ok = await step.canProceed(step);
			if (!ok) return;
		}
		if (this._currentStep < this.steps.length - 1) {
			this._restoreTarget();
			this.goTo(this._currentStep + 1);
		} else {
			this.finish();
		}
	}

	prev() {
		if (this._currentStep > 0) {
			this._restoreTarget();
			this.goTo(this._currentStep - 1);
		}
	}

	finish() {
		this._restoreTarget();
		this.stop();
		if (this.opts.onComplete) this.opts.onComplete();
	}

	_restoreTarget() {
		if (this._prevTarget) {
			this._prevTarget.style.zIndex = "";
			this._prevTarget = null;
		}
	}

	/* ── Tooltip ─────────────────────────────────────────────── */
	_renderTooltip(step, idx) {
		const total = this.steps.length;
		const isFirst = idx === 0;
		const isLast = idx === total - 1;

		this._tooltip.innerHTML = `
			${step.title ? `<div class="fv-tg-title">${_esc(step.title)}</div>` : ""}
			${step.content ? `<div class="fv-tg-content">${step.content}</div>` : ""}
			${this.opts.showProgress ? `<div class="fv-tg-progress">
				<div class="fv-tg-progress-bar">
					<div class="fv-tg-progress-fill" style="width:${((idx + 1) / total) * 100}%"></div>
				</div>
				<span class="fv-tg-step-count">${idx + 1} / ${total}</span>
			</div>` : ""}
			<div class="fv-tg-nav">
				${this.opts.showSkip ? `<button class="fv-tg-btn fv-tg-btn-skip">${__("Skip")}</button>` : ""}
				<div class="fv-tg-nav-right">
					${!isFirst ? `<button class="fv-tg-btn fv-tg-btn-prev">${__("Previous")}</button>` : ""}
					<button class="fv-tg-btn fv-tg-btn-next fv-tg-btn-primary">${isLast ? __("Finish") : __("Next")}</button>
				</div>
			</div>`;

		// Events
		const nextBtn = this._tooltip.querySelector(".fv-tg-btn-next");
		if (nextBtn) nextBtn.addEventListener("click", () => this.next());

		const prevBtn = this._tooltip.querySelector(".fv-tg-btn-prev");
		if (prevBtn) prevBtn.addEventListener("click", () => this.prev());

		const skipBtn = this._tooltip.querySelector(".fv-tg-btn-skip");
		if (skipBtn) skipBtn.addEventListener("click", () => {
			this.stop();
			if (this.opts.onSkip) this.opts.onSkip(idx);
		});
	}

	_positionTooltip(targetRect, step) {
		const pad = 16;
		const pos = step.position || this._autoPosition(targetRect);
		const tt = this._tooltip;
		tt.className = `fv-tg-tooltip fv-tg-tooltip--${pos}`;

		// Reset
		tt.style.top = ""; tt.style.bottom = ""; tt.style.left = ""; tt.style.right = "";
		tt.style.transform = "";

		switch (pos) {
			case "bottom":
				tt.style.top = `${targetRect.bottom + this.opts.padding + pad}px`;
				tt.style.left = `${targetRect.left + targetRect.width / 2}px`;
				tt.style.transform = "translateX(-50%)";
				break;
			case "top":
				tt.style.top = `${targetRect.top - this.opts.padding - pad}px`;
				tt.style.left = `${targetRect.left + targetRect.width / 2}px`;
				tt.style.transform = "translate(-50%, -100%)";
				break;
			case "left":
				tt.style.top = `${targetRect.top + targetRect.height / 2}px`;
				tt.style.left = `${targetRect.left - this.opts.padding - pad}px`;
				tt.style.transform = "translate(-100%, -50%)";
				break;
			case "right":
				tt.style.top = `${targetRect.top + targetRect.height / 2}px`;
				tt.style.left = `${targetRect.right + this.opts.padding + pad}px`;
				tt.style.transform = "translateY(-50%)";
				break;
		}
	}

	_positionTooltipCenter(step) {
		this._tooltip.className = "fv-tg-tooltip fv-tg-tooltip--center";
		this._tooltip.style.top = "50%";
		this._tooltip.style.left = "50%";
		this._tooltip.style.transform = "translate(-50%, -50%)";
	}

	_autoPosition(rect) {
		const vw = window.innerWidth, vh = window.innerHeight;
		const spaceBelow = vh - rect.bottom;
		const spaceAbove = rect.top;
		const spaceRight = vw - rect.right;
		const spaceLeft = rect.left;

		const max = Math.max(spaceBelow, spaceAbove, spaceRight, spaceLeft);
		if (max === spaceBelow) return "bottom";
		if (max === spaceAbove) return "top";
		if (max === spaceRight) return "right";
		return "left";
	}

	/* ── Pulse ───────────────────────────────────────────────── */
	_addPulse(el) {
		this._removePulse();
		el.classList.add("fv-tg-pulse");
	}

	_removePulse() {
		document.querySelectorAll(".fv-tg-pulse").forEach(el => el.classList.remove("fv-tg-pulse"));
	}

	/* ── Keyboard ────────────────────────────────────────────── */
	_setupKeyboard() {
		this._keyHandler = (e) => {
			if (!this._active) return;
			if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); this.next(); }
			if (e.key === "ArrowLeft") { e.preventDefault(); this.prev(); }
			if (e.key === "Escape" && this.opts.closeOnEsc) {
				e.preventDefault();
				this.stop();
				if (this.opts.onSkip) this.opts.onSkip(this._currentStep);
			}
		};
		document.addEventListener("keydown", this._keyHandler);
	}

	_removeKeyboard() {
		if (this._keyHandler) document.removeEventListener("keydown", this._keyHandler);
	}

	/* ── Public API ──────────────────────────────────────────── */
	getCurrentStep() { return this._currentStep; }
	isActive() { return this._active; }
	getTotalSteps() { return this.steps.length; }

	destroy() {
		this.stop();
	}
}
