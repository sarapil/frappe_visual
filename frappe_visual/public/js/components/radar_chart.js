// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * RadarChart — SVG radar / spider chart
 * =======================================
 * Lightweight radar chart without external charting libs.
 *
 * frappe.visual.RadarChart.create({
 *   target: "#radar",
 *   size: 240,
 *   labels: ["Speed","Power","Range","Defense","Health"],
 *   datasets: [
 *     { label: "Player A", values: [80,65,90,40,70], color: "#6366f1" },
 *     { label: "Player B", values: [60,80,50,75,55], color: "#ec4899" }
 *   ],
 *   fillOpacity: 0.2,
 *   levels: 5,
 *   showLabels: true,
 *   showValues: false,
 *   animate: true,
 *   className: ""
 * })
 */

export class RadarChart {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			size: 240,
			labels: [],
			datasets: [],
			fillOpacity: 0.2,
			levels: 5,
			showLabels: true,
			showValues: false,
			animate: true,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new RadarChart(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.labels.length) return;

		const n = this.labels.length;
		const cx = this.size / 2;
		const cy = this.size / 2;
		const r = this.size / 2 - 30;
		const angleStep = (2 * Math.PI) / n;
		const startAngle = -Math.PI / 2;

		const toXY = (i, ratio) => ({
			x: cx + r * ratio * Math.cos(startAngle + i * angleStep),
			y: cy + r * ratio * Math.sin(startAngle + i * angleStep),
		});

		let svg = "";

		/* Grid levels */
		for (let lv = 1; lv <= this.levels; lv++) {
			const ratio = lv / this.levels;
			const pts = [];
			for (let i = 0; i < n; i++) {
				const p = toXY(i, ratio);
				pts.push(`${p.x},${p.y}`);
			}
			svg += `<polygon points="${pts.join(" ")}" class="fv-radar-grid"/>`;
		}

		/* Axis lines */
		for (let i = 0; i < n; i++) {
			const p = toXY(i, 1);
			svg += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" class="fv-radar-axis"/>`;
		}

		/* Labels */
		if (this.showLabels) {
			for (let i = 0; i < n; i++) {
				const p = toXY(i, 1.15);
				const anchor = Math.abs(p.x - cx) < 5 ? "middle" : (p.x > cx ? "start" : "end");
				svg += `<text x="${p.x}" y="${p.y}" text-anchor="${anchor}" dominant-baseline="central" class="fv-radar-label">${this.labels[i]}</text>`;
			}
		}

		/* Datasets */
		this.datasets.forEach((ds, di) => {
			const maxVal = Math.max(...ds.values, 1);
			const pts = [];
			for (let i = 0; i < n; i++) {
				const ratio = (ds.values[i] || 0) / 100; // Expect 0–100
				const p = toXY(i, Math.min(ratio, 1));
				pts.push(`${p.x},${p.y}`);
			}
			const fill = ds.color || "#6366f1";
			const anim = this.animate ? `class="fv-radar-data" style="animation:fvRadarIn .6s ease ${di * 0.15}s both"` : "";
			svg += `<polygon points="${pts.join(" ")}" fill="${fill}" fill-opacity="${this.fillOpacity}" stroke="${fill}" stroke-width="2" ${anim}/>`;

			/* Dots */
			pts.forEach(pt => {
				const [px, py] = pt.split(",");
				svg += `<circle cx="${px}" cy="${py}" r="3" fill="${fill}"/>`;
			});
		});

		const wrap = document.createElement("div");
		wrap.className = `fv-radar ${this.className}`;
		wrap.innerHTML = `<svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}">${svg}</svg>`;

		el.innerHTML = "";
		el.appendChild(wrap);
	}
}
