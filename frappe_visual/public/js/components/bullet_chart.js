/**
 * Frappe Visual — BulletChart
 * ============================
 * Stephen Few-style bullet charts for comparing a measure against
 * a target with qualitative ranges. Ideal for KPI dashboards showing
 * actual vs target with contextual performance zones.
 *
 * Usage:
 *   frappe.visual.BulletChart.create('#el', {
 *     bullets: [
 *       { label: 'Revenue', value: 275, target: 300, ranges: [150, 225, 300], unit: '$K' },
 *       { label: 'Profit', value: 22, target: 25, ranges: [10, 18, 25], unit: '%' },
 *     ]
 *   })
 *
 * @module frappe_visual/components/bullet_chart
 */

const RANGE_OPACITIES = [0.3, 0.18, 0.08];

export class BulletChart {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("BulletChart: container not found");

		this.opts = Object.assign({
			theme: "glass",
			bullets: [],
			barHeight: 24,
			barGap: 32,
			labelWidth: 120,
			showLabels: true,
			showValues: true,
			showTarget: true,
			animate: true,
			animDuration: 800,
			color: "#6366f1",
			targetColor: "#1e293b",
			rangeColor: "#64748b",
			orientation: "horizontal",   // horizontal | vertical
			onClick: null,
		}, opts);

		this._init();
	}

	static create(container, opts = {}) { return new BulletChart(container, opts); }

	_init() {
		this.container.classList.add("fv-bc", `fv-bc--${this.opts.theme}`);
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		if (this.opts.orientation === "vertical") {
			this._renderVertical();
		} else {
			this._renderHorizontal();
		}
	}

	_renderHorizontal() {
		const { bullets, barHeight, barGap, labelWidth, showLabels, showValues, showTarget } = this.opts;
		const wrap = document.createElement("div");
		wrap.className = "fv-bc-wrap";

		for (let i = 0; i < bullets.length; i++) {
			const b = bullets[i];
			const maxRange = Math.max(b.ranges ? b.ranges[b.ranges.length - 1] : b.value, b.target || 0, b.value) * 1.1;

			const row = document.createElement("div");
			row.className = "fv-bc-row";
			row.style.height = (barHeight + barGap) + "px";

			// Label
			if (showLabels) {
				const label = document.createElement("div");
				label.className = "fv-bc-label";
				label.style.width = labelWidth + "px";
				label.innerHTML = `<span class="fv-bc-label-text">${this._esc(b.label || "")}</span>
					${showValues ? `<span class="fv-bc-label-value">${this._formatVal(b.value, b.unit)}</span>` : ""}`;
				row.appendChild(label);
			}

			// Bar area
			const barArea = document.createElement("div");
			barArea.className = "fv-bc-bar-area";
			barArea.style.height = barHeight + "px";

			// Qualitative ranges (background bands)
			if (b.ranges && b.ranges.length > 0) {
				let prevPct = 0;
				for (let r = b.ranges.length - 1; r >= 0; r--) {
					const pct = (b.ranges[r] / maxRange) * 100;
					const rangeEl = document.createElement("div");
					rangeEl.className = "fv-bc-range";
					rangeEl.style.width = pct + "%";
					rangeEl.style.background = this.opts.rangeColor;
					rangeEl.style.opacity = RANGE_OPACITIES[Math.min(r, RANGE_OPACITIES.length - 1)];
					barArea.appendChild(rangeEl);
				}
			}

			// Actual value bar
			const valPct = (b.value / maxRange) * 100;
			const valBar = document.createElement("div");
			valBar.className = "fv-bc-value";
			valBar.style.background = b.color || this.opts.color;
			valBar.style.height = Math.round(barHeight * 0.4) + "px";
			valBar.style.width = this.opts.animate ? "0%" : valPct + "%";
			barArea.appendChild(valBar);

			if (this.opts.animate) {
				requestAnimationFrame(() => {
					valBar.style.transition = `width ${this.opts.animDuration}ms cubic-bezier(0.22,1,0.36,1)`;
					valBar.style.width = valPct + "%";
				});
			}

			// Target marker
			if (showTarget && b.target) {
				const tgtPct = (b.target / maxRange) * 100;
				const tgt = document.createElement("div");
				tgt.className = "fv-bc-target";
				tgt.style.insetInlineStart = tgtPct + "%";
				tgt.style.background = this.opts.targetColor;
				tgt.style.height = barHeight + "px";
				barArea.appendChild(tgt);
			}

			row.appendChild(barArea);

			if (this.opts.onClick) {
				row.style.cursor = "pointer";
				row.addEventListener("click", () => this.opts.onClick(b, i));
			}

			wrap.appendChild(row);
		}

		this.container.appendChild(wrap);
	}

	_renderVertical() {
		const { bullets, barHeight, showLabels, showTarget } = this.opts;
		const wrap = document.createElement("div");
		wrap.className = "fv-bc-wrap fv-bc-wrap--vertical";

		for (let i = 0; i < bullets.length; i++) {
			const b = bullets[i];
			const maxRange = Math.max(b.ranges ? b.ranges[b.ranges.length - 1] : b.value, b.target || 0, b.value) * 1.1;

			const col = document.createElement("div");
			col.className = "fv-bc-col";

			const barArea = document.createElement("div");
			barArea.className = "fv-bc-bar-area fv-bc-bar-area--vertical";

			// Ranges
			if (b.ranges) {
				for (let r = b.ranges.length - 1; r >= 0; r--) {
					const pct = (b.ranges[r] / maxRange) * 100;
					const rangeEl = document.createElement("div");
					rangeEl.className = "fv-bc-range fv-bc-range--vertical";
					rangeEl.style.height = pct + "%";
					rangeEl.style.background = this.opts.rangeColor;
					rangeEl.style.opacity = RANGE_OPACITIES[Math.min(r, RANGE_OPACITIES.length - 1)];
					barArea.appendChild(rangeEl);
				}
			}

			// Value
			const valPct = (b.value / maxRange) * 100;
			const valBar = document.createElement("div");
			valBar.className = "fv-bc-value fv-bc-value--vertical";
			valBar.style.background = b.color || this.opts.color;
			valBar.style.width = Math.round(barHeight * 0.4) + "px";
			valBar.style.height = this.opts.animate ? "0%" : valPct + "%";
			barArea.appendChild(valBar);

			if (this.opts.animate) {
				requestAnimationFrame(() => {
					valBar.style.transition = `height ${this.opts.animDuration}ms cubic-bezier(0.22,1,0.36,1)`;
					valBar.style.height = valPct + "%";
				});
			}

			// Target
			if (showTarget && b.target) {
				const tgtPct = (b.target / maxRange) * 100;
				const tgt = document.createElement("div");
				tgt.className = "fv-bc-target fv-bc-target--vertical";
				tgt.style.bottom = tgtPct + "%";
				tgt.style.background = this.opts.targetColor;
				barArea.appendChild(tgt);
			}

			col.appendChild(barArea);

			// Label
			if (showLabels) {
				const label = document.createElement("div");
				label.className = "fv-bc-col-label";
				label.textContent = b.label || "";
				col.appendChild(label);
			}

			wrap.appendChild(col);
		}

		this.container.appendChild(wrap);
	}

	_formatVal(v, unit) {
		const s = typeof v === "number" ? v.toLocaleString() : String(v);
		return unit ? `${s} ${this._esc(unit)}` : s;
	}

	/* ── Public API ──────────────────────────────────────────── */
	setBullets(bullets) { this.opts.bullets = bullets; this._render(); }
	getBullets() { return JSON.parse(JSON.stringify(this.opts.bullets)); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-bc", `fv-bc--${this.opts.theme}`);
	}
}
