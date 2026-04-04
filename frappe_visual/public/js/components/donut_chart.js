// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * DonutChart — Lightweight SVG donut / pie chart
 * =================================================
 * No external dependencies — pure SVG with animation.
 *
 * frappe.visual.DonutChart.create({
 *   target: "#donut",
 *   data: [
 *     { label: "Desktop", value: 65, color: "#6366f1" },
 *     { label: "Mobile", value: 25, color: "#ec4899" },
 *     { label: "Tablet", value: 10, color: "#f59e0b" }
 *   ],
 *   size: 200,
 *   thickness: 40,          // 0 = full pie
 *   showLabels: true,
 *   showCenter: true,       // center text
 *   centerText: null,       // auto = total
 *   centerSubText: null,
 *   animate: true,
 *   onClick: null,
 *   className: ""
 * })
 */

export class DonutChart {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			data: [],
			size: 200,
			thickness: 40,
			showLabels: true,
			showCenter: true,
			centerText: null,
			centerSubText: null,
			animate: true,
			onClick: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new DonutChart(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.data.length) return;

		const s = this.size;
		const cx = s / 2;
		const cy = s / 2;
		const r = (s - 4) / 2;
		const inner = this.thickness > 0 ? r - this.thickness : 0;
		const total = this.data.reduce((sum, d) => sum + d.value, 0);

		let paths = "";
		let angle = -90; // start top

		this.data.forEach((d, i) => {
			const sweep = (d.value / total) * 360;
			const a1 = (angle * Math.PI) / 180;
			const a2 = ((angle + sweep) * Math.PI) / 180;

			const x1o = cx + r * Math.cos(a1);
			const y1o = cy + r * Math.sin(a1);
			const x2o = cx + r * Math.cos(a2);
			const y2o = cy + r * Math.sin(a2);

			const x1i = cx + inner * Math.cos(a2);
			const y1i = cy + inner * Math.sin(a2);
			const x2i = cx + inner * Math.cos(a1);
			const y2i = cy + inner * Math.sin(a1);

			const large = sweep > 180 ? 1 : 0;
			const color = d.color || `hsl(${i * 67}, 65%, 55%)`;

			let path;
			if (inner > 0) {
				path = `M${x1o},${y1o} A${r},${r} 0 ${large} 1 ${x2o},${y2o} L${x1i},${y1i} A${inner},${inner} 0 ${large} 0 ${x2i},${y2i} Z`;
			} else {
				path = `M${cx},${cy} L${x1o},${y1o} A${r},${r} 0 ${large} 1 ${x2o},${y2o} Z`;
			}

			const anim = this.animate
				? `class="fv-donut-seg" style="animation:fvDonutIn .5s ease ${i * 0.08}s both;transform-origin:${cx}px ${cy}px"`
				: "";
			paths += `<path d="${path}" fill="${color}" data-idx="${i}" ${anim}><title>${d.label}: ${d.value} (${((d.value / total) * 100).toFixed(1)}%)</title></path>`;

			angle += sweep;
		});

		/* Center text */
		let center = "";
		if (this.showCenter && inner > 0) {
			const txt = this.centerText ?? total.toLocaleString();
			const sub = this.centerSubText || "Total";
			center = `
				<text x="${cx}" y="${cy - 4}" text-anchor="middle" class="fv-donut-center">${txt}</text>
				<text x="${cx}" y="${cy + 14}" text-anchor="middle" class="fv-donut-sub">${sub}</text>
			`;
		}

		const wrap = document.createElement("div");
		wrap.className = `fv-donut ${this.className}`;
		wrap.style.display = "inline-flex";
		wrap.style.alignItems = "center";
		wrap.style.gap = "16px";

		let legendHtml = "";
		if (this.showLabels) {
			legendHtml = `<div class="fv-donut-legend">`;
			this.data.forEach((d, i) => {
				const pct = ((d.value / total) * 100).toFixed(1);
				legendHtml += `<div class="fv-donut-legend-item"><span class="fv-donut-dot" style="background:${d.color || `hsl(${i * 67}, 65%, 55%)`}"></span>${d.label} <span class="fv-donut-pct">${pct}%</span></div>`;
			});
			legendHtml += `</div>`;
		}

		wrap.innerHTML = `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${paths}${center}</svg>${legendHtml}`;

		el.innerHTML = "";
		el.appendChild(wrap);

		if (this.onClick) {
			wrap.querySelector("svg").addEventListener("click", (e) => {
				const p = e.target.closest("path[data-idx]");
				if (p) this.onClick(this.data[+p.dataset.idx]);
			});
		}
	}
}
