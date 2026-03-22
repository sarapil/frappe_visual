/**
 * AnimationEngine — GSAP-powered Animations for Frappe Visual
 * =============================================================
 * Manages all visual animations:
 * - Ant-line (marching ants) on dashed edges
 * - Pulse glow on status nodes
 * - Enter/exit transitions for nodes
 * - Edge flow particles
 * - Ambient "breathing" background
 * - Storyboard step transitions
 */

export class AnimationEngine {
	constructor(cy, container) {
		this.cy = cy;
		this.container = container;
		this.gsap = window.gsap || (frappe.visual && frappe.visual.gsap);
		this.timelines = {};
		this._svgOverlay = null;
		this._animFrame = null;
	}

	// ── Ant-line Animation (SVG Overlay) ─────────────────────────
	startAntLines() {
		if (!this.gsap) return;

		// Create SVG overlay for ant-line effects
		this._ensureSVGOverlay();
		this._antLineActive = true;
		this._updateAntLines();
	}

	_ensureSVGOverlay() {
		if (this._svgOverlay) return;

		this._svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		this._svgOverlay.classList.add("fv-svg-overlay");
		this._svgOverlay.setAttribute("width", "100%");
		this._svgOverlay.setAttribute("height", "100%");
		this._svgOverlay.style.cssText =
			"position:absolute;top:0;left:0;pointer-events:none;z-index:1;overflow:visible;";
		this.container.style.position = "relative";
		this.container.appendChild(this._svgOverlay);
	}

	_updateAntLines() {
		if (!this._antLineActive) return;

		const edges = this.cy.edges(".fv-ant-line");
		if (edges.length === 0) {
			this._animFrame = requestAnimationFrame(() => this._updateAntLines());
			return;
		}

		// Use CSS animation on canvas overlay
		// Cytoscape canvas doesn't support stroke-dashoffset directly,
		// so we animate the class cycling
		const time = Date.now() / 1000;
		edges.forEach((edge) => {
			const phase = (time * 30) % 18;
			edge.style("line-dash-offset", -phase);
		});

		this._animFrame = requestAnimationFrame(() => this._updateAntLines());
	}

	stopAntLines() {
		this._antLineActive = false;
		if (this._animFrame) {
			cancelAnimationFrame(this._animFrame);
		}
	}

	// ── Pulse Animation ──────────────────────────────────────────
	startPulse() {
		if (!this.gsap) return;

		this._pulseActive = true;
		this._pulseLoop();
	}

	_pulseLoop() {
		if (!this._pulseActive) return;

		const nodes = this.cy.nodes(".fv-pulse, .fv-status-active");
		if (nodes.length === 0) {
			setTimeout(() => this._pulseLoop(), 2000);
			return;
		}

		nodes.forEach((node) => {
			const currentWidth = node.numericStyle("border-width") || 3;
			node.animate(
				{
					style: { "border-width": currentWidth + 3, "border-opacity": 0.4 },
				},
				{
					duration: 800,
					easing: "ease-in-out-sine",
					complete: () => {
						node.animate(
							{
								style: { "border-width": currentWidth, "border-opacity": 1 },
							},
							{
								duration: 800,
								easing: "ease-in-out-sine",
							}
						);
					},
				}
			);
		});

		setTimeout(() => this._pulseLoop(), 2000);
	}

	stopPulse() {
		this._pulseActive = false;
	}

	// ── Node Enter Animation ─────────────────────────────────────
	animateNodeEnter(nodeIds) {
		if (!this.gsap) return;

		const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
		ids.forEach((id, index) => {
			const node = this.cy.getElementById(id);
			if (!node.length) return;

			node.style({ opacity: 0 });
			setTimeout(() => {
				node.animate(
					{ style: { opacity: 1 } },
					{
						duration: 400,
						easing: "ease-out-cubic",
					}
				);
			}, index * 80); // Stagger
		});
	}

	// ── Node Exit Animation ──────────────────────────────────────
	animateNodeExit(nodeIds) {
		const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
		return Promise.all(
			ids.map(
				(id, index) =>
					new Promise((resolve) => {
						const node = this.cy.getElementById(id);
						if (!node.length) {
							resolve();
							return;
						}
						setTimeout(() => {
							node.animate(
								{ style: { opacity: 0 } },
								{
									duration: 300,
									easing: "ease-in-cubic",
									complete: () => {
										node.remove();
										resolve();
									},
								}
							);
						}, index * 50);
					})
			)
		);
	}

	// ── Layout Transition ────────────────────────────────────────
	animateLayoutTransition(callback) {
		if (!this.gsap) {
			callback();
			return;
		}

		// Fade out, change layout, fade in
		const overlay = document.createElement("div");
		overlay.className = "fv-layout-transition";
		this.container.appendChild(overlay);

		this.gsap.fromTo(
			overlay,
			{ opacity: 0 },
			{
				opacity: 0.5,
				duration: 0.3,
				onComplete: () => {
					callback();
					this.gsap.to(overlay, {
						opacity: 0,
						duration: 0.5,
						delay: 0.3,
						onComplete: () => overlay.remove(),
					});
				},
			}
		);
	}

	// ── Ambient Breathing ────────────────────────────────────────
	startAmbient() {
		if (!this.gsap) return;

		this._ambientTimeline = this.gsap.timeline({ repeat: -1, yoyo: true });
		this._ambientTimeline.to(this.container, {
			"--fv-ambient-glow": "0.08",
			duration: 4,
			ease: "sine.inOut",
		});
	}

	stopAmbient() {
		if (this._ambientTimeline) {
			this._ambientTimeline.kill();
		}
	}

	// ── GSAP-powered HTML Element Animations ─────────────────────
	/**
	 * Animate any HTML element using GSAP.
	 * Useful for floating windows, badges, storyboard steps, etc.
	 */
	tweenElement(element, props) {
		if (!this.gsap) return;
		return this.gsap.to(element, {
			duration: 0.5,
			ease: "power2.out",
			...props,
		});
	}

	staggerElements(elements, props) {
		if (!this.gsap) return;
		return this.gsap.from(elements, {
			duration: 0.6,
			ease: "power3.out",
			stagger: 0.08,
			...props,
		});
	}

	/**
	 * Create a storyboard timeline for sequential animations.
	 */
	createTimeline(id, opts = {}) {
		if (!this.gsap) return null;
		const tl = this.gsap.timeline({
			paused: true,
			...opts,
		});
		this.timelines[id] = tl;
		return tl;
	}

	// ── Cleanup ──────────────────────────────────────────────────
	destroy() {
		this.stopAntLines();
		this.stopPulse();
		this.stopAmbient();
		Object.values(this.timelines).forEach((tl) => tl.kill());
		if (this._svgOverlay) {
			this._svgOverlay.remove();
		}
	}
}
