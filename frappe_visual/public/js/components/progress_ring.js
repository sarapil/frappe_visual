/**
 * ProgressRing — Circular SVG progress ring
 * ============================================
 * Animated circular progress with percentage label, sizes, colors.
 *
 * frappe.visual.ProgressRing.create({
 *   target: "#ring",
 *   value: 72,           // 0-100
 *   size: 120,           // px
 *   strokeWidth: 8,
 *   color: "#6366f1",
 *   trackColor: "#e2e8f0",
 *   label: true,          // show percentage
 *   labelFormat: (v) => `${v}%`,
 *   animate: true,
 *   duration: 1000,
 *   children: null         // innerHTML for center
 * })
 */

export class ProgressRing {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			value: 0,
			size: 120,
			strokeWidth: 8,
			color: "#6366f1",
			trackColor: "#e2e8f0",
			label: true,
			labelFormat: (v) => `${v}%`,
			animate: true,
			duration: 1000,
			children: null,
		}, opts);

		this.render();
	}

	static create(opts) { return new ProgressRing(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		const r = (this.size - this.strokeWidth) / 2;
		const circ = 2 * Math.PI * r;
		const cx = this.size / 2;

		const wrap = document.createElement("div");
		wrap.className = "fv-pr";
		wrap.style.cssText = `position:relative;width:${this.size}px;height:${this.size}px;display:inline-flex;align-items:center;justify-content:center;`;

		wrap.innerHTML = `
			<svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}" style="transform:rotate(-90deg)">
				<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${this.trackColor}" stroke-width="${this.strokeWidth}" />
				<circle class="fv-pr-bar" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${this.color}" stroke-width="${this.strokeWidth}"
					stroke-linecap="round"
					stroke-dasharray="${circ}"
					stroke-dashoffset="${circ}"
					style="transition:stroke-dashoffset ${this.animate ? this.duration : 0}ms ease" />
			</svg>
			<div class="fv-pr-center" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;">
				${this.label ? `<span class="fv-pr-label" style="font-weight:700;font-size:${this.size * 0.18}px;font-variant-numeric:tabular-nums">${this.labelFormat(0)}</span>` : ""}
				${this.children || ""}
			</div>
		`;

		el.innerHTML = "";
		el.appendChild(wrap);

		this._wrap = wrap;
		this._bar = wrap.querySelector(".fv-pr-bar");
		this._label = wrap.querySelector(".fv-pr-label");
		this._circ = circ;

		requestAnimationFrame(() => this.setValue(this.value));
	}

	setValue(v) {
		v = Math.max(0, Math.min(100, v));
		this.value = v;
		const offset = this._circ * (1 - v / 100);
		this._bar.style.strokeDashoffset = offset;

		if (this._label && this.animate) {
			this._animateLabel(v);
		} else if (this._label) {
			this._label.textContent = this.labelFormat(v);
		}
	}

	_animateLabel(target) {
		const start = parseInt(this._label.textContent) || 0;
		const diff = target - start;
		const steps = Math.max(20, Math.abs(diff));
		const step = diff / steps;
		let i = 0;
		const tick = () => {
			i++;
			const current = Math.round(start + step * i);
			this._label.textContent = this.labelFormat(current);
			if (i < steps) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}
}
