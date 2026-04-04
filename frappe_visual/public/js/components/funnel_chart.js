/**
 * FunnelChart — Vertical / horizontal funnel visualization
 * ==========================================================
 * Conversion funnel with animated segments.
 *
 * frappe.visual.FunnelChart.create({
 *   target: "#funnel",
 *   data: [
 *     { label: "Visits", value: 5000, color: "#6366f1" },
 *     { label: "Signups", value: 3200, color: "#818cf8" },
 *     { label: "Trials", value: 1800, color: "#a78bfa" },
 *     { label: "Paid", value: 600, color: "#c084fc" }
 *   ],
 *   direction: "vertical",   // "vertical" | "horizontal"
 *   showPercentage: true,
 *   showValues: true,
 *   animate: true,
 *   height: 320,
 *   width: null,             // auto
 *   gap: 4,
 *   className: ""
 * })
 */

export class FunnelChart {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			data: [],
			direction: "vertical",
			showPercentage: true,
			showValues: true,
			animate: true,
			height: 320,
			width: null,
			gap: 4,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new FunnelChart(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.data.length) return;

		const wrap = document.createElement("div");
		wrap.className = `fv-funnel fv-funnel-${this.direction} ${this.className}`;

		const maxVal = this.data[0]?.value || 1;

		this.data.forEach((item, i) => {
			const pct = ((item.value / maxVal) * 100).toFixed(1);
			const convPct = i > 0 ? ((item.value / this.data[i - 1].value) * 100).toFixed(1) : "100.0";
			const color = item.color || `hsl(${240 + i * 30}, 70%, 60%)`;

			const seg = document.createElement("div");
			seg.className = "fv-funnel-seg";
			if (this.animate) {
				seg.style.opacity = "0";
				seg.style.transform = this.direction === "vertical" ? "scaleX(0)" : "scaleY(0)";
				seg.style.transition = `all 0.4s ease ${i * 0.1}s`;
				requestAnimationFrame(() => requestAnimationFrame(() => {
					seg.style.opacity = "1";
					seg.style.transform = "scale(1)";
				}));
			}

			const bar = document.createElement("div");
			bar.className = "fv-funnel-bar";
			bar.style.background = color;
			if (this.direction === "vertical") {
				bar.style.width = `${pct}%`;
				bar.style.height = `${(this.height - this.gap * (this.data.length - 1)) / this.data.length}px`;
			} else {
				bar.style.height = `${pct}%`;
				bar.style.width = `${(this.height - this.gap * (this.data.length - 1)) / this.data.length}px`;
			}

			const lbl = document.createElement("div");
			lbl.className = "fv-funnel-label";
			let text = `<strong>${item.label}</strong>`;
			if (this.showValues) text += ` <span class="fv-funnel-val">${this._fmt(item.value)}</span>`;
			if (this.showPercentage && i > 0) text += ` <span class="fv-funnel-pct">${convPct}%</span>`;
			lbl.innerHTML = text;

			seg.appendChild(bar);
			seg.appendChild(lbl);
			wrap.appendChild(seg);
		});

		el.innerHTML = "";
		el.appendChild(wrap);
	}

	_fmt(n) {
		if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
		if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
		return n.toString();
	}
}
