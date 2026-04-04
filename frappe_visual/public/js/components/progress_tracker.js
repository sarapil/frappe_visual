/**
 * Frappe Visual — ProgressTracker
 * ==================================
 * Multi-step progress indicator with milestones, phase labels,
 * status colors, timeline connector, and optional details panel.
 * Perfect for project phases, onboarding steps, order tracking,
 * and approval workflows.
 *
 * Usage:
 *   frappe.visual.ProgressTracker.create('#el', {
 *     steps: [
 *       { label: 'Order Placed', status: 'completed', date: '2026-01-01' },
 *       { label: 'Processing', status: 'current', description: 'Preparing shipment' },
 *       { label: 'Shipped', status: 'pending' },
 *       { label: 'Delivered', status: 'pending' },
 *     ]
 *   })
 *
 * @module frappe_visual/components/progress_tracker
 */

const STEP_STATUS = {
	completed:  { icon: "✓", color: "#10b981", bg: "rgba(16,185,129,0.08)" },
	current:    { icon: "●", color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
	pending:    { icon: "○", color: "#94a3b8", bg: "rgba(148,163,184,0.04)" },
	error:      { icon: "✕", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
	skipped:    { icon: "–", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
};

export class ProgressTracker {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("ProgressTracker: container not found");

		this.opts = Object.assign({
			theme: "glass",
			steps: [],
			title: "",
			orientation: "horizontal",  // horizontal | vertical
			showProgress: true,          // progress percentage bar
			showDates: true,
			showDescriptions: true,
			connectorStyle: "solid",     // solid | dashed | dotted
			animate: true,
			compact: false,
			onClick: null,
		}, opts);

		this._init();
	}

	static create(container, opts = {}) { return new ProgressTracker(container, opts); }

	_init() {
		this.container.classList.add("fv-pt", `fv-pt--${this.opts.theme}`, `fv-pt--${this.opts.orientation}`);
		if (this.opts.compact) this.container.classList.add("fv-pt--compact");
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		// Title + progress bar
		if (this.opts.title || this.opts.showProgress) {
			const header = document.createElement("div");
			header.className = "fv-pt-header";

			if (this.opts.title) {
				header.innerHTML += `<h3 class="fv-pt-title">${this._esc(this.opts.title)}</h3>`;
			}

			if (this.opts.showProgress) {
				const completed = this.opts.steps.filter(s => s.status === "completed").length;
				const total = this.opts.steps.length;
				const pct = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

				header.innerHTML += `
					<div class="fv-pt-progress">
						<div class="fv-pt-progress-bar">
							<div class="fv-pt-progress-fill" style="width:${pct}%"></div>
						</div>
						<span class="fv-pt-progress-text">${completed}/${total} ${__("completed")} (${pct}%)</span>
					</div>`;
			}

			this.container.appendChild(header);
		}

		// Steps
		const stepsWrap = document.createElement("div");
		stepsWrap.className = "fv-pt-steps";
		this.container.appendChild(stepsWrap);

		for (let i = 0; i < this.opts.steps.length; i++) {
			const step = this.opts.steps[i];
			const isLast = i === this.opts.steps.length - 1;

			stepsWrap.appendChild(this._renderStep(step, i, isLast));
		}
	}

	_renderStep(step, index, isLast) {
		const cfg = STEP_STATUS[step.status] || STEP_STATUS.pending;

		const el = document.createElement("div");
		el.className = `fv-pt-step fv-pt-step--${step.status}`;

		if (this.opts.animate && step.status === "completed") {
			el.style.animationDelay = `${index * 100}ms`;
		}

		// Custom icon or default
		const icon = step.icon || cfg.icon;

		// Connector line (except last)
		const connectorHtml = !isLast ? `<div class="fv-pt-connector fv-pt-connector--${this.opts.connectorStyle}
			${step.status === "completed" ? "fv-pt-connector--done" : ""}"></div>` : "";

		// Step content varies by orientation
		if (this.opts.orientation === "horizontal") {
			el.innerHTML = `
				<div class="fv-pt-node-wrap">
					<div class="fv-pt-node" style="background:${cfg.bg};border-color:${cfg.color};color:${cfg.color}">${icon}</div>
					${connectorHtml}
				</div>
				<div class="fv-pt-info">
					<span class="fv-pt-step-label">${this._esc(step.label || "")}</span>
					${this.opts.showDates && step.date ? `<span class="fv-pt-step-date">${this._esc(step.date)}</span>` : ""}
					${this.opts.showDescriptions && step.description ? `<span class="fv-pt-step-desc">${this._esc(step.description)}</span>` : ""}
				</div>`;
		} else {
			// Vertical layout
			el.innerHTML = `
				<div class="fv-pt-node-col">
					<div class="fv-pt-node" style="background:${cfg.bg};border-color:${cfg.color};color:${cfg.color}">${icon}</div>
					${connectorHtml}
				</div>
				<div class="fv-pt-info">
					<div class="fv-pt-step-header">
						<span class="fv-pt-step-label">${this._esc(step.label || "")}</span>
						${this.opts.showDates && step.date ? `<span class="fv-pt-step-date">${this._esc(step.date)}</span>` : ""}
					</div>
					${this.opts.showDescriptions && step.description ? `<p class="fv-pt-step-desc">${this._esc(step.description)}</p>` : ""}
					${step.details ? `<div class="fv-pt-step-details">${this._esc(step.details)}</div>` : ""}
				</div>`;
		}

		if (this.opts.onClick) {
			el.style.cursor = "pointer";
			el.addEventListener("click", () => this.opts.onClick(step, index));
		}

		return el;
	}

	/* ── Public API ──────────────────────────────────────────── */
	setSteps(steps) { this.opts.steps = steps; this._render(); }

	updateStep(index, updates) {
		if (this.opts.steps[index]) {
			Object.assign(this.opts.steps[index], updates);
			this._render();
		}
	}

	completeStep(index) { this.updateStep(index, { status: "completed" }); }
	activateStep(index) { this.updateStep(index, { status: "current" }); }

	getProgress() {
		const completed = this.opts.steps.filter(s => s.status === "completed").length;
		return { completed, total: this.opts.steps.length, percentage: this.opts.steps.length > 0 ? (completed / this.opts.steps.length) * 100 : 0 };
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-pt", `fv-pt--${this.opts.theme}`, `fv-pt--${this.opts.orientation}`, "fv-pt--compact");
	}
}
