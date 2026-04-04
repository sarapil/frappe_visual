/**
 * StepIndicator — Horizontal / vertical step progress
 * =====================================================
 * Multi-step progress indicator with active, complete, error states.
 *
 * frappe.visual.StepIndicator.create({
 *   target: "#wizard-steps",
 *   steps: [
 *     { label: "Account", description: "Create your account", icon: "1" },
 *     { label: "Profile", description: "Fill in details" },
 *     { label: "Done", description: "All set!" }
 *   ],
 *   current: 1,            // 0-indexed
 *   direction: "horizontal", // horizontal | vertical
 *   size: "md",
 *   variant: "default",     // default | dots | numbered
 *   clickable: true,
 *   onChange: (step) => {}
 * })
 */

const _esc = (s) => {
	const d = document.createElement("div");
	d.textContent = s ?? "";
	return d.innerHTML;
};

export class StepIndicator {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			steps: [],
			current: 0,
			direction: "horizontal",
			size: "md",
			variant: "default",
			clickable: true,
			onChange: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new StepIndicator(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-step fv-step-${this.direction} fv-step-${this.size} fv-step-${this.variant}`;

		this.steps.forEach((step, i) => {
			const state = i < this.current ? "complete" : i === this.current ? "active" : "pending";

			const item = document.createElement("div");
			item.className = `fv-step-item fv-step-${state}`;
			if (this.clickable) item.style.cursor = "pointer";

			/* Indicator */
			const indicator = document.createElement("div");
			indicator.className = "fv-step-indicator";

			if (this.variant === "dots") {
				indicator.innerHTML = `<span class="fv-step-dot"></span>`;
			} else if (this.variant === "numbered" || !step.icon) {
				indicator.innerHTML = state === "complete"
					? `<span class="fv-step-check">✓</span>`
					: `<span class="fv-step-num">${i + 1}</span>`;
			} else {
				indicator.innerHTML = state === "complete"
					? `<span class="fv-step-check">✓</span>`
					: `<span class="fv-step-icon">${_esc(step.icon)}</span>`;
			}

			/* Label + description */
			const info = document.createElement("div");
			info.className = "fv-step-info";
			info.innerHTML = `
				<span class="fv-step-label">${_esc(step.label)}</span>
				${step.description ? `<span class="fv-step-desc">${_esc(step.description)}</span>` : ""}
			`;

			item.appendChild(indicator);
			item.appendChild(info);

			/* Connector line */
			if (i < this.steps.length - 1) {
				const line = document.createElement("div");
				line.className = `fv-step-line ${i < this.current ? "fv-step-line-done" : ""}`;
				item.appendChild(line);
			}

			if (this.clickable) {
				item.onclick = () => {
					this.current = i;
					this.render();
					this.onChange?.(i);
				};
			}

			wrap.appendChild(item);
		});

		el.innerHTML = "";
		el.appendChild(wrap);
		this._wrap = wrap;
	}

	setCurrent(idx) {
		this.current = idx;
		this.render();
	}

	next() { if (this.current < this.steps.length - 1) this.setCurrent(this.current + 1); }
	prev() { if (this.current > 0) this.setCurrent(this.current - 1); }
}
