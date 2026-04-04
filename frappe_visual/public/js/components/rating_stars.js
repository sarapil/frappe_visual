/**
 * RatingStars — Animated star-rating component with half-star support
 *
 * Renders clickable stars (or any icon) with hover preview, half-star
 * precision, readonly mode, and animated fill transitions.
 *
 * frappe.visual.RatingStars.create({
 *   container: "#rating", value: 3.5, max: 5, onChange: (v) => {}
 * })
 */
export class RatingStars {
	static create(opts = {}) { return new RatingStars(opts); }

	constructor(opts) {
		this.opts = Object.assign({
			container: null, value: 0, max: 5, allowHalf: true,
			readonly: false, size: 24, color: "#f59e0b", emptyColor: "#d1d5db",
			icon: "★", onChange: null, showValue: true, animate: true
		}, opts);
		this._value = this.opts.value;
		this._hoverValue = null;
		this._build();
	}

	/* ── public ─────────────────────────────────────────────── */

	get value() { return this._value; }
	set value(v) { this._value = Math.max(0, Math.min(this.opts.max, v)); this._render(); }

	destroy() { this._el?.remove(); }

	/* ── private ────────────────────────────────────────────── */

	_build() {
		const parent = typeof this.opts.container === "string"
			? document.querySelector(this.opts.container) : this.opts.container;
		if (!parent) return;
		this._el = document.createElement("div");
		this._el.className = "fv-rating-stars";
		this._el.setAttribute("role", "slider");
		this._el.setAttribute("aria-valuemin", "0");
		this._el.setAttribute("aria-valuemax", String(this.opts.max));
		this._el.setAttribute("aria-valuenow", String(this._value));
		this._el.setAttribute("aria-label", __("Rating"));
		parent.appendChild(this._el);
		this._render();
	}

	_render() {
		if (!this._el) return;
		const displayVal = this._hoverValue !== null ? this._hoverValue : this._value;
		let html = '<div class="fv-rs-stars">';
		for (let i = 1; i <= this.opts.max; i++) {
			let fillPct = 0;
			if (displayVal >= i) fillPct = 100;
			else if (displayVal >= i - 0.5 && this.opts.allowHalf) fillPct = 50;
			const isActive = fillPct > 0;
			html += `<span class="fv-rs-star${isActive ? " fv-rs-star--active" : ""}${this.opts.animate ? " fv-rs-star--anim" : ""}"
				data-index="${i}" style="font-size:${this.opts.size}px;color:${fillPct === 100 ? this.opts.color : this.opts.emptyColor};
				${fillPct === 50 ? `background:linear-gradient(90deg, ${this.opts.color} 50%, ${this.opts.emptyColor} 50%);
				-webkit-background-clip:text;-webkit-text-fill-color:transparent;` : ""}
				${!this.opts.readonly ? "cursor:pointer;" : ""}"
				role="option" aria-selected="${fillPct > 0}">${this.opts.icon}</span>`;
		}
		html += "</div>";
		if (this.opts.showValue) {
			html += `<span class="fv-rs-value">${displayVal.toFixed(this.opts.allowHalf ? 1 : 0)}</span>`;
		}
		this._el.innerHTML = html;
		this._el.setAttribute("aria-valuenow", String(this._value));

		if (!this.opts.readonly) {
			this._el.querySelectorAll(".fv-rs-star").forEach(star => {
				star.addEventListener("click", (e) => {
					const idx = parseInt(star.dataset.index);
					if (this.opts.allowHalf) {
						const rect = star.getBoundingClientRect();
						const half = e.clientX < rect.left + rect.width / 2;
						this._value = half ? idx - 0.5 : idx;
					} else {
						this._value = idx;
					}
					this._hoverValue = null;
					this._render();
					this.opts.onChange?.(this._value);
				});
				star.addEventListener("mouseenter", () => {
					this._hoverValue = parseInt(star.dataset.index);
					this._render();
				});
			});
			this._el.addEventListener("mouseleave", () => {
				this._hoverValue = null;
				this._render();
			});
		}
	}
}
