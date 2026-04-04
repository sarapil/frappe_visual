// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Spotlight — Feature highlight / guided tour overlay
 * ==================================================================
 * frappe.visual.Spotlight.create({ steps })
 *
 * Dims the page and highlights a specific element with a tooltip,
 * then navigates through a sequence of steps.
 */
export class Spotlight {
	static create(opts = {}) { return new Spotlight(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			steps: [],              // [{ target, title, content, position, onEnter, onLeave }]
			padding: 8,            // px around highlighted element
			borderRadius: 8,
			overlayColor: 'rgba(0,0,0,0.55)',
			showProgress: true,
			showClose: true,
			closeOnOverlay: true,
			animate: true,
			onComplete: null,
			onSkip: null,
			labels: {
				next: __('Next'),
				prev: __('Previous'),
				finish: __('Finish'),
				skip: __('Skip'),
				of: __('of'),
			},
		}, opts);

		this._currentStep = -1;
		this._build();
	}

	_build() {
		// SVG overlay with cut-out
		this.overlay = document.createElement('div');
		this.overlay.className = 'fv-sl-overlay';
		this.overlay.innerHTML = `
			<svg class="fv-sl-svg" width="100%" height="100%">
				<defs>
					<mask id="fv-sl-mask">
						<rect width="100%" height="100%" fill="white"/>
						<rect class="fv-sl-cutout" fill="black" rx="${this.o.borderRadius}" ry="${this.o.borderRadius}"/>
					</mask>
				</defs>
				<rect class="fv-sl-backdrop" width="100%" height="100%" fill="${this.o.overlayColor}" mask="url(#fv-sl-mask)"/>
			</svg>
		`;

		// Tooltip
		this.tooltip = document.createElement('div');
		this.tooltip.className = 'fv-sl-tooltip';

		this.overlay.appendChild(this.tooltip);

		if (this.o.closeOnOverlay) {
			this.overlay.addEventListener('click', (e) => {
				if (e.target === this.overlay || e.target.closest('.fv-sl-svg')) {
					this.skip();
				}
			});
		}
	}

	start() {
		document.body.appendChild(this.overlay);
		requestAnimationFrame(() => this.overlay.classList.add('fv-sl-visible'));

		this._escHandler = (e) => { if (e.key === 'Escape') this.skip(); };
		document.addEventListener('keydown', this._escHandler);

		this._resizeHandler = () => this._position();
		window.addEventListener('resize', this._resizeHandler);

		this.goTo(0);
		return this;
	}

	goTo(idx) {
		if (idx < 0 || idx >= this.o.steps.length) return;

		// Leave previous
		if (this._currentStep >= 0 && this.o.steps[this._currentStep].onLeave) {
			this.o.steps[this._currentStep].onLeave();
		}

		this._currentStep = idx;
		const step = this.o.steps[idx];

		// Enter new
		if (step.onEnter) step.onEnter();

		// Scroll target into view
		const target = typeof step.target === 'string' ? document.querySelector(step.target) : step.target;
		if (target) {
			target.scrollIntoView({ behavior: 'smooth', block: 'center' });
			setTimeout(() => this._position(), 300);
		} else {
			this._position();
		}
	}

	next() {
		if (this._currentStep < this.o.steps.length - 1) {
			this.goTo(this._currentStep + 1);
		} else {
			this.finish();
		}
	}

	prev() {
		if (this._currentStep > 0) this.goTo(this._currentStep - 1);
	}

	skip() {
		this._cleanup();
		if (this.o.onSkip) this.o.onSkip(this._currentStep);
	}

	finish() {
		this._cleanup();
		if (this.o.onComplete) this.o.onComplete();
	}

	_position() {
		const step = this.o.steps[this._currentStep];
		if (!step) return;

		const target = typeof step.target === 'string' ? document.querySelector(step.target) : step.target;
		const cutout = this.overlay.querySelector('.fv-sl-cutout');
		const pad = this.o.padding;

		if (target) {
			const rect = target.getBoundingClientRect();
			cutout.setAttribute('x', rect.left - pad);
			cutout.setAttribute('y', rect.top - pad);
			cutout.setAttribute('width', rect.width + pad * 2);
			cutout.setAttribute('height', rect.height + pad * 2);

			if (this.o.animate) {
				cutout.style.transition = 'all 0.3s ease';
			}
		} else {
			// No target — center tooltip, no cutout
			cutout.setAttribute('width', 0);
			cutout.setAttribute('height', 0);
		}

		this._renderTooltip(step, target);
	}

	_renderTooltip(step, target) {
		const t = this.tooltip;
		const total = this.o.steps.length;
		const curr = this._currentStep;
		const labels = this.o.labels;

		let html = '';
		if (this.o.showClose) {
			html += `<button class="fv-sl-close">&times;</button>`;
		}
		if (step.title) html += `<div class="fv-sl-title">${Spotlight._esc(step.title)}</div>`;
		if (step.content) html += `<div class="fv-sl-content">${step.content}</div>`;

		html += `<div class="fv-sl-footer">`;
		if (this.o.showProgress) {
			html += `<span class="fv-sl-progress">${curr + 1} ${labels.of} ${total}</span>`;
		}
		html += `<div class="fv-sl-nav">`;
		if (curr > 0) html += `<button class="fv-sl-btn fv-sl-prev">${Spotlight._esc(labels.prev)}</button>`;
		else html += `<button class="fv-sl-btn fv-sl-skip">${Spotlight._esc(labels.skip)}</button>`;
		html += `<button class="fv-sl-btn fv-sl-next fv-sl-btn-primary">${Spotlight._esc(curr < total - 1 ? labels.next : labels.finish)}</button>`;
		html += `</div></div>`;

		// Progress dots
		html += `<div class="fv-sl-dots">`;
		for (let i = 0; i < total; i++) {
			html += `<span class="fv-sl-dot ${i === curr ? 'fv-sl-dot-active' : ''} ${i < curr ? 'fv-sl-dot-done' : ''}"></span>`;
		}
		html += `</div>`;

		t.innerHTML = html;

		// Position tooltip relative to target
		if (target) {
			const rect = target.getBoundingClientRect();
			const pos = step.position || 'bottom';
			const pad = this.o.padding + 12;

			t.style.position = 'fixed';
			t.className = `fv-sl-tooltip fv-sl-tooltip-${pos}`;

			// Let browser compute sizes first
			requestAnimationFrame(() => {
				const tipRect = t.getBoundingClientRect();

				if (pos === 'bottom') {
					t.style.top = (rect.bottom + pad) + 'px';
					t.style.left = Math.max(8, rect.left + rect.width / 2 - tipRect.width / 2) + 'px';
				} else if (pos === 'top') {
					t.style.top = (rect.top - tipRect.height - pad) + 'px';
					t.style.left = Math.max(8, rect.left + rect.width / 2 - tipRect.width / 2) + 'px';
				} else if (pos === 'left') {
					t.style.top = (rect.top + rect.height / 2 - tipRect.height / 2) + 'px';
					t.style.left = (rect.left - tipRect.width - pad) + 'px';
				} else if (pos === 'right') {
					t.style.top = (rect.top + rect.height / 2 - tipRect.height / 2) + 'px';
					t.style.left = (rect.right + pad) + 'px';
				}
			});
		} else {
			// Center on screen
			t.style.position = 'fixed';
			t.style.top = '50%';
			t.style.left = '50%';
			t.style.transform = 'translate(-50%, -50%)';
		}

		// Bind buttons
		const nextBtn = t.querySelector('.fv-sl-next');
		const prevBtn = t.querySelector('.fv-sl-prev');
		const skipBtn = t.querySelector('.fv-sl-skip');
		const closeBtn = t.querySelector('.fv-sl-close');

		if (nextBtn) nextBtn.onclick = () => this.next();
		if (prevBtn) prevBtn.onclick = () => this.prev();
		if (skipBtn) skipBtn.onclick = () => this.skip();
		if (closeBtn) closeBtn.onclick = () => this.skip();
	}

	_cleanup() {
		if (this._escHandler) document.removeEventListener('keydown', this._escHandler);
		if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);

		this.overlay.classList.remove('fv-sl-visible');
		setTimeout(() => {
			if (this.overlay.parentNode) this.overlay.remove();
		}, 300);
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
