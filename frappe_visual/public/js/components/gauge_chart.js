/**
 * Frappe Visual — GaugeChart
 * ============================
 * Circular gauge / speedometer widget for displaying a single value
 * against a range. Supports multi-zone coloring (danger/warning/ok/good),
 * animated needle, label, and optional comparison text.
 *
 * Usage:
 *   frappe.visual.GaugeChart.create('#el', {
 *     value: 73,
 *     min: 0,
 *     max: 100,
 *     label: 'Performance',
 *     zones: [
 *       { from: 0,  to: 40, color: '#ef4444' },
 *       { from: 40, to: 70, color: '#f59e0b' },
 *       { from: 70, to: 100, color: '#10b981' },
 *     ]
 *   })
 *
 * @module frappe_visual/components/gauge_chart
 */

export class GaugeChart {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("GaugeChart: container not found");

		this.opts = Object.assign({
			theme: "glass",
			value: 0,
			min: 0,
			max: 100,
			label: "",
			unit: "",
			size: 200,                // diameter in px
			startAngle: -225,         // degrees (0 = right, CCW)
			endAngle: 45,             // sweep
			arcWidth: 14,
			needleWidth: 3,
			animate: true,
			animDuration: 1200,
			showValue: true,
			showMinMax: true,
			showNeedle: true,
			zones: [],                // [{from, to, color}]
			defaultArcColor: "#e2e8f0",
			needleColor: "#1e293b",
			valueColor: null,
			subtitle: "",
			onClick: null,
		}, opts);

		this._currentAngle = this.opts.startAngle;
		this._init();
	}

	static create(container, opts = {}) { return new GaugeChart(container, opts); }

	_init() {
		this.container.classList.add("fv-gc", `fv-gc--${this.opts.theme}`);
		this._render();
		if (this.opts.animate) {
			this._animateTo(this.opts.value);
		}
	}

	_render() {
		const { size, min, max, startAngle, endAngle, arcWidth, label, unit, subtitle, showValue, showMinMax, showNeedle } = this.opts;
		const cx = size / 2, cy = size / 2, r = (size - arcWidth * 2) / 2;
		const totalAngle = endAngle - startAngle;

		this.container.innerHTML = "";
		const wrap = document.createElement("div");
		wrap.className = "fv-gc-wrap";
		wrap.style.width = size + "px";
		wrap.style.height = size + "px";

		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
		svg.setAttribute("width", size);
		svg.setAttribute("height", size);

		// Background arc
		svg.appendChild(this._createArc(cx, cy, r, startAngle, endAngle, this.opts.defaultArcColor, arcWidth));

		// Zone arcs
		if (this.opts.zones.length > 0) {
			for (const z of this.opts.zones) {
				const zStart = startAngle + ((z.from - min) / (max - min)) * totalAngle;
				const zEnd = startAngle + ((z.to - min) / (max - min)) * totalAngle;
				svg.appendChild(this._createArc(cx, cy, r, zStart, zEnd, z.color, arcWidth));
			}
		}

		// Needle
		if (showNeedle) {
			const needle = document.createElementNS("http://www.w3.org/2000/svg", "g");
			needle.setAttribute("class", "fv-gc-needle");

			const needleLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
			needleLine.setAttribute("x1", cx);
			needleLine.setAttribute("y1", cy);
			needleLine.setAttribute("x2", cx);
			needleLine.setAttribute("y2", cy - r + 8);
			needleLine.setAttribute("stroke", this.opts.needleColor);
			needleLine.setAttribute("stroke-width", this.opts.needleWidth);
			needleLine.setAttribute("stroke-linecap", "round");
			needle.appendChild(needleLine);

			// Center dot
			const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
			dot.setAttribute("cx", cx);
			dot.setAttribute("cy", cy);
			dot.setAttribute("r", 5);
			dot.setAttribute("fill", this.opts.needleColor);
			needle.appendChild(dot);

			// Set initial rotation
			const initAngle = this.opts.animate ? startAngle : this._valueToAngle(this.opts.value);
			needle.setAttribute("transform", `rotate(${initAngle} ${cx} ${cy})`);
			svg.appendChild(needle);
			this._needleEl = needle;
		}

		wrap.appendChild(svg);
		this._svgEl = svg;

		// Value text
		if (showValue) {
			const valEl = document.createElement("div");
			valEl.className = "fv-gc-value-text";
			const valColor = this.opts.valueColor || this._getValueColor();
			valEl.style.color = valColor;
			valEl.innerHTML = `<span class="fv-gc-val">${this.opts.animate ? "0" : this.opts.value}</span>
				${unit ? `<span class="fv-gc-unit">${this._esc(unit)}</span>` : ""}`;
			wrap.appendChild(valEl);
			this._valTextEl = valEl.querySelector(".fv-gc-val");
		}

		// Label
		if (label) {
			const labelEl = document.createElement("div");
			labelEl.className = "fv-gc-label";
			labelEl.textContent = label;
			wrap.appendChild(labelEl);
		}

		// Subtitle
		if (subtitle) {
			const subEl = document.createElement("div");
			subEl.className = "fv-gc-subtitle";
			subEl.textContent = subtitle;
			wrap.appendChild(subEl);
		}

		// Min/Max labels
		if (showMinMax) {
			const mmWrap = document.createElement("div");
			mmWrap.className = "fv-gc-minmax";
			mmWrap.innerHTML = `<span>${min}</span><span>${max}</span>`;
			wrap.appendChild(mmWrap);
		}

		if (this.opts.onClick) {
			wrap.style.cursor = "pointer";
			wrap.addEventListener("click", () => this.opts.onClick(this.opts.value));
		}

		this.container.appendChild(wrap);
	}

	_createArc(cx, cy, r, startDeg, endDeg, color, width) {
		const startRad = (startDeg * Math.PI) / 180;
		const endRad = (endDeg * Math.PI) / 180;
		const x1 = cx + r * Math.cos(startRad);
		const y1 = cy + r * Math.sin(startRad);
		const x2 = cx + r * Math.cos(endRad);
		const y2 = cy + r * Math.sin(endRad);
		const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;

		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`);
		path.setAttribute("fill", "none");
		path.setAttribute("stroke", color);
		path.setAttribute("stroke-width", width);
		path.setAttribute("stroke-linecap", "round");
		return path;
	}

	_valueToAngle(value) {
		const { min, max, startAngle, endAngle } = this.opts;
		const clamped = Math.max(min, Math.min(max, value));
		return startAngle + ((clamped - min) / (max - min)) * (endAngle - startAngle);
	}

	_animateTo(targetValue) {
		const { size, animDuration } = this.opts;
		const cx = size / 2, cy = size / 2;
		const startAngle = this.opts.startAngle;
		const targetAngle = this._valueToAngle(targetValue);
		const start = performance.now();

		const step = (now) => {
			const elapsed = now - start;
			const progress = Math.min(elapsed / animDuration, 1);
			const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

			const currentAngle = startAngle + (targetAngle - startAngle) * eased;

			if (this._needleEl) {
				this._needleEl.setAttribute("transform", `rotate(${currentAngle} ${cx} ${cy})`);
			}

			if (this._valTextEl) {
				const currentVal = Math.round(eased * targetValue);
				this._valTextEl.textContent = currentVal.toLocaleString();
			}

			if (progress < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}

	_getValueColor() {
		const { value } = this.opts;
		for (const z of this.opts.zones) {
			if (value >= z.from && value <= z.to) return z.color;
		}
		return "#1e293b";
	}

	/* ── Public API ──────────────────────────────────────────── */
	setValue(value) {
		this.opts.value = value;
		this._animateTo(value);
	}

	getValue() { return this.opts.value; }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-gc", `fv-gc--${this.opts.theme}`);
	}
}
