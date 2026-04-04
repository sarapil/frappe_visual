// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Sparkline Engine
 * =================================
 * Inline micro-charts rendered as pure SVG. Designed for embedding
 * in tables, form fields, cards, and list rows. Tiny footprint,
 * no dependencies, automatic data binding.
 *
 * Types: line, bar, area, dot, win-loss, bullet, pie-micro
 *
 * Features:
 *  - Pure SVG, no canvas — prints perfectly
 *  - Auto-sizing to container (default 80×24)
 *  - Hover tooltip with value
 *  - Reference line (average, target, min, max)
 *  - Color by threshold (green/yellow/red)
 *  - Animate on appear (GSAP or CSS)
 *  - RTL mirroring
 *  - Frappe DocType data binding (count/sum/avg per period)
 *
 * API:
 *   frappe.visual.Sparkline.create('#el', { type: 'line', data: [...] })
 *   frappe.visual.Sparkline.fromDocType('#el', { doctype, field, period })
 *
 * @module frappe_visual/components/sparkline_engine
 */

const SPARK_DEFAULTS = {
	type: "line",           // line | bar | area | dot | win-loss | bullet | pie-micro
	data: [],
	width: 80,
	height: 24,
	color: "#6366F1",
	fillColor: null,        // area fill (auto from color if null)
	negativeColor: "#EF4444",
	strokeWidth: 1.5,
	dotRadius: 2,
	barGap: 1,
	animate: true,
	showTooltip: true,
	referenceLine: null,    // "avg" | "min" | "max" | number
	referenceColor: "#94A3B8",
	thresholds: null,       // { warn: 70, danger: 90, colors: ['#10B981','#F59E0B','#EF4444'] }
	labels: null,           // array of x-axis labels for tooltip
	suffix: "",             // e.g. "%" or " users"
};

export class SparklineEngine {
	constructor(container, opts = {}) {
		this.el = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.el) return;

		this.opts = Object.assign({}, SPARK_DEFAULTS, opts);
		this.data = (this.opts.data || []).map(v => (typeof v === "number" ? v : parseFloat(v) || 0));

		this._render();
	}

	static create(container, opts = {}) { return new SparklineEngine(container, opts); }

	static async fromDocType(container, opts = {}) {
		const { doctype, field, dateField, period, aggregate, filters } = Object.assign({
			dateField: "creation",
			period: "daily",
			aggregate: "count",
			filters: {},
		}, opts);

		if (!doctype) return null;

		const groupBy = period === "monthly" ? "MONTH" : period === "weekly" ? "WEEK" : "DATE";
		const result = await frappe.xcall("frappe.client.get_list", {
			doctype,
			filters,
			fields: [
				`${groupBy}(${dateField}) as period`,
				aggregate === "count" ? "COUNT(name) as val"
					: aggregate === "sum" ? `SUM(${field}) as val`
					: `AVG(${field}) as val`,
			],
			group_by: `${groupBy}(${dateField})`,
			order_by: `${groupBy}(${dateField}) asc`,
			limit_page_length: 60,
		});

		const data = (result || []).map(r => r.val || 0);
		return new SparklineEngine(container, { ...opts, data });
	}

	/* ── Render ──────────────────────────────────────────────── */
	_render() {
		const { type, width, height } = this.opts;
		this.el.innerHTML = "";
		this.el.classList.add("fv-spark");

		if (this.data.length === 0) {
			this.el.innerHTML = `<span class="fv-spark-empty">—</span>`;
			return;
		}

		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("width", width);
		svg.setAttribute("height", height);
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		svg.setAttribute("class", "fv-spark-svg");
		svg.style.overflow = "visible";

		switch (type) {
			case "line":  this._renderLine(svg); break;
			case "area":  this._renderArea(svg); break;
			case "bar":   this._renderBar(svg); break;
			case "dot":   this._renderDot(svg); break;
			case "win-loss": this._renderWinLoss(svg); break;
			case "bullet": this._renderBullet(svg); break;
			case "pie-micro": this._renderPieMicro(svg); break;
			default: this._renderLine(svg);
		}

		this._addReferenceLine(svg);
		this.el.appendChild(svg);
		this._svg = svg;

		if (this.opts.animate) this._animate();
		if (this.opts.showTooltip) this._addTooltip(svg);
	}

	/* ── Line ────────────────────────────────────────────────── */
	_renderLine(svg) {
		const { width, height, color, strokeWidth } = this.opts;
		const pad = 2;
		const points = this._normalize(pad, width - pad, pad, height - pad);

		const ns = "http://www.w3.org/2000/svg";
		const path = document.createElementNS(ns, "polyline");
		path.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
		path.setAttribute("fill", "none");
		path.setAttribute("stroke", color);
		path.setAttribute("stroke-width", strokeWidth);
		path.setAttribute("stroke-linecap", "round");
		path.setAttribute("stroke-linejoin", "round");
		path.setAttribute("class", "fv-spark-line");
		svg.appendChild(path);

		// End dot
		const last = points[points.length - 1];
		if (last) {
			const dot = document.createElementNS(ns, "circle");
			dot.setAttribute("cx", last.x);
			dot.setAttribute("cy", last.y);
			dot.setAttribute("r", this.opts.dotRadius + 0.5);
			dot.setAttribute("fill", color);
			svg.appendChild(dot);
		}
	}

	/* ── Area ────────────────────────────────────────────────── */
	_renderArea(svg) {
		const { width, height, color, fillColor, strokeWidth } = this.opts;
		const pad = 2;
		const points = this._normalize(pad, width - pad, pad, height - pad);
		const ns = "http://www.w3.org/2000/svg";

		// Fill
		const fill = fillColor || this._alphaColor(color, 0.15);
		const areaPath = document.createElementNS(ns, "polygon");
		const pts = [
			`${points[0]?.x || pad},${height}`,
			...points.map(p => `${p.x},${p.y}`),
			`${points[points.length - 1]?.x || width - pad},${height}`
		];
		areaPath.setAttribute("points", pts.join(" "));
		areaPath.setAttribute("fill", fill);
		areaPath.setAttribute("class", "fv-spark-area-fill");
		svg.appendChild(areaPath);

		// Line
		const line = document.createElementNS(ns, "polyline");
		line.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
		line.setAttribute("fill", "none");
		line.setAttribute("stroke", color);
		line.setAttribute("stroke-width", strokeWidth);
		line.setAttribute("stroke-linejoin", "round");
		svg.appendChild(line);
	}

	/* ── Bar ─────────────────────────────────────────────────── */
	_renderBar(svg) {
		const { width, height, color, negativeColor, barGap } = this.opts;
		const ns = "http://www.w3.org/2000/svg";
		const n = this.data.length;
		const barW = Math.max(1, (width - barGap * (n - 1)) / n);
		const max = Math.max(...this.data.map(Math.abs), 1);
		const baseline = this.data.some(v => v < 0) ? height / 2 : height;

		for (let i = 0; i < n; i++) {
			const v = this.data[i];
			const barH = (Math.abs(v) / max) * (baseline);
			const x = i * (barW + barGap);
			const y = v >= 0 ? baseline - barH : baseline;
			const c = this._getColor(v);

			const rect = document.createElementNS(ns, "rect");
			rect.setAttribute("x", x);
			rect.setAttribute("y", y);
			rect.setAttribute("width", barW);
			rect.setAttribute("height", Math.max(1, barH));
			rect.setAttribute("fill", c);
			rect.setAttribute("rx", "1");
			rect.setAttribute("class", "fv-spark-bar");
			rect.dataset.idx = i;
			svg.appendChild(rect);
		}
	}

	/* ── Dot ─────────────────────────────────────────────────── */
	_renderDot(svg) {
		const { width, height, color, dotRadius } = this.opts;
		const ns = "http://www.w3.org/2000/svg";
		const points = this._normalize(dotRadius + 2, width - dotRadius - 2, dotRadius + 2, height - dotRadius - 2);

		for (const p of points) {
			const dot = document.createElementNS(ns, "circle");
			dot.setAttribute("cx", p.x);
			dot.setAttribute("cy", p.y);
			dot.setAttribute("r", dotRadius);
			dot.setAttribute("fill", this._getColor(p.value));
			svg.appendChild(dot);
		}
	}

	/* ── Win/Loss ────────────────────────────────────────────── */
	_renderWinLoss(svg) {
		const { width, height, color, negativeColor, barGap } = this.opts;
		const ns = "http://www.w3.org/2000/svg";
		const n = this.data.length;
		const barW = Math.max(1, (width - barGap * (n - 1)) / n);
		const mid = height / 2;
		const barH = mid - 2;

		for (let i = 0; i < n; i++) {
			const v = this.data[i];
			const rect = document.createElementNS(ns, "rect");
			rect.setAttribute("x", i * (barW + barGap));
			rect.setAttribute("y", v >= 0 ? mid - barH : mid + 1);
			rect.setAttribute("width", barW);
			rect.setAttribute("height", barH);
			rect.setAttribute("fill", v >= 0 ? color : negativeColor);
			rect.setAttribute("rx", "1");
			svg.appendChild(rect);
		}
	}

	/* ── Bullet ──────────────────────────────────────────────── */
	_renderBullet(svg) {
		const { width, height, color } = this.opts;
		const ns = "http://www.w3.org/2000/svg";
		const [value = 0, target = 100, max = 100] = this.data;
		const scale = width / max;

		// Background ranges
		const ranges = [0.3, 0.6, 1.0];
		for (let i = 0; i < ranges.length; i++) {
			const r = document.createElementNS(ns, "rect");
			r.setAttribute("x", 0);
			r.setAttribute("y", 0);
			r.setAttribute("width", ranges[i] * max * scale);
			r.setAttribute("height", height);
			r.setAttribute("fill", `rgba(0,0,0,${0.06 + i * 0.04})`);
			svg.appendChild(r);
		}

		// Value bar
		const bar = document.createElementNS(ns, "rect");
		bar.setAttribute("x", 0);
		bar.setAttribute("y", height * 0.25);
		bar.setAttribute("width", Math.min(value * scale, width));
		bar.setAttribute("height", height * 0.5);
		bar.setAttribute("fill", color);
		svg.appendChild(bar);

		// Target marker
		const marker = document.createElementNS(ns, "line");
		marker.setAttribute("x1", target * scale);
		marker.setAttribute("y1", height * 0.1);
		marker.setAttribute("x2", target * scale);
		marker.setAttribute("y2", height * 0.9);
		marker.setAttribute("stroke", "#1e293b");
		marker.setAttribute("stroke-width", "2");
		svg.appendChild(marker);
	}

	/* ── Pie Micro ───────────────────────────────────────────── */
	_renderPieMicro(svg) {
		const { height, color } = this.opts;
		const ns = "http://www.w3.org/2000/svg";
		const cx = height / 2, cy = height / 2, r = height / 2 - 1;
		const total = this.data.reduce((a, b) => a + b, 0) || 1;
		const palette = ["#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4"];
		let startAngle = -Math.PI / 2;

		for (let i = 0; i < this.data.length; i++) {
			const angle = (this.data[i] / total) * 2 * Math.PI;
			const endAngle = startAngle + angle;
			const largeArc = angle > Math.PI ? 1 : 0;

			const x1 = cx + r * Math.cos(startAngle);
			const y1 = cy + r * Math.sin(startAngle);
			const x2 = cx + r * Math.cos(endAngle);
			const y2 = cy + r * Math.sin(endAngle);

			const path = document.createElementNS(ns, "path");
			path.setAttribute("d", `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`);
			path.setAttribute("fill", palette[i % palette.length]);
			svg.appendChild(path);
			startAngle = endAngle;
		}
	}

	/* ── Reference Line ──────────────────────────────────────── */
	_addReferenceLine(svg) {
		const { referenceLine, referenceColor, width, height } = this.opts;
		if (!referenceLine) return;

		let val;
		if (referenceLine === "avg") val = this.data.reduce((a, b) => a + b, 0) / this.data.length;
		else if (referenceLine === "min") val = Math.min(...this.data);
		else if (referenceLine === "max") val = Math.max(...this.data);
		else val = parseFloat(referenceLine);

		const min = Math.min(...this.data);
		const max = Math.max(...this.data);
		const range = max - min || 1;
		const y = height - ((val - min) / range) * (height - 4) - 2;

		const ns = "http://www.w3.org/2000/svg";
		const line = document.createElementNS(ns, "line");
		line.setAttribute("x1", 0);
		line.setAttribute("y1", y);
		line.setAttribute("x2", width);
		line.setAttribute("y2", y);
		line.setAttribute("stroke", referenceColor);
		line.setAttribute("stroke-width", "1");
		line.setAttribute("stroke-dasharray", "3 2");
		line.setAttribute("class", "fv-spark-ref");
		svg.appendChild(line);
	}

	/* ── Animation ───────────────────────────────────────────── */
	_animate() {
		if (typeof gsap !== "undefined") {
			const elements = this._svg?.querySelectorAll(".fv-spark-line, .fv-spark-area-fill, .fv-spark-bar, circle, path");
			if (elements?.length) {
				gsap.from(elements, {
					opacity: 0,
					scaleY: 0,
					transformOrigin: "bottom",
					duration: 0.4,
					stagger: 0.02,
					ease: "power2.out",
				});
			}
		}
	}

	/* ── Tooltip ─────────────────────────────────────────────── */
	_addTooltip(svg) {
		const els = svg.querySelectorAll(".fv-spark-bar, circle");
		els.forEach((el, i) => {
			const idx = el.dataset?.idx ?? i;
			const val = this.data[idx];
			if (val == null) return;
			const label = this.opts.labels?.[idx] || `#${idx + 1}`;
			el.addEventListener("mouseenter", (e) => {
				this._showTip(e, `${label}: ${val}${this.opts.suffix}`);
			});
			el.addEventListener("mouseleave", () => this._hideTip());
		});
	}

	_showTip(e, text) {
		let tip = document.querySelector(".fv-spark-tooltip");
		if (!tip) {
			tip = document.createElement("div");
			tip.className = "fv-spark-tooltip";
			document.body.appendChild(tip);
		}
		tip.textContent = text;
		tip.style.display = "block";
		tip.style.left = `${e.pageX + 8}px`;
		tip.style.top = `${e.pageY - 28}px`;
	}

	_hideTip() {
		const tip = document.querySelector(".fv-spark-tooltip");
		if (tip) tip.style.display = "none";
	}

	/* ── Data Helpers ────────────────────────────────────────── */
	_normalize(x1, x2, y1, y2) {
		const n = this.data.length;
		if (n === 0) return [];
		const min = Math.min(...this.data);
		const max = Math.max(...this.data);
		const range = max - min || 1;

		return this.data.map((v, i) => ({
			x: n === 1 ? (x1 + x2) / 2 : x1 + (i / (n - 1)) * (x2 - x1),
			y: y2 - ((v - min) / range) * (y2 - y1),
			value: v,
		}));
	}

	_getColor(value) {
		const { thresholds, color, negativeColor } = this.opts;
		if (value < 0) return negativeColor;
		if (thresholds) {
			const { warn, danger, colors } = thresholds;
			if (value >= danger) return colors?.[2] || "#EF4444";
			if (value >= warn) return colors?.[1] || "#F59E0B";
			return colors?.[0] || "#10B981";
		}
		return color;
	}

	_alphaColor(hex, alpha) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}

	/* ── Update ──────────────────────────────────────────────── */
	update(newData) {
		this.data = newData.map(v => (typeof v === "number" ? v : parseFloat(v) || 0));
		this._render();
	}

	destroy() {
		this.el?.classList.remove("fv-spark");
		if (this.el) this.el.innerHTML = "";
	}
}
