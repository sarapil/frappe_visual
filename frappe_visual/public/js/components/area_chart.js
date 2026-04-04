// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * AreaChart — SVG area chart with gradient fill
 * ================================================
 * Lightweight multi-series area chart, no external deps.
 *
 * frappe.visual.AreaChart.create({
 *   target: "#area",
 *   labels: ["Jan","Feb","Mar","Apr","May","Jun"],
 *   datasets: [
 *     { label: "Revenue", values: [10,25,18,32,28,40], color: "#6366f1" },
 *     { label: "Expenses", values: [8,12,15,20,22,18], color: "#ec4899" }
 *   ],
 *   width: null,
 *   height: 240,
 *   fillOpacity: 0.2,
 *   showDots: true,
 *   showGrid: true,
 *   showLabels: true,
 *   animate: true,
 *   stacked: false,
 *   smooth: true,
 *   className: ""
 * })
 */

export class AreaChart {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			labels: [],
			datasets: [],
			width: null,
			height: 240,
			fillOpacity: 0.2,
			showDots: true,
			showGrid: true,
			showLabels: true,
			animate: true,
			stacked: false,
			smooth: true,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new AreaChart(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.datasets.length) return;

		const w = this.width || el.offsetWidth || 500;
		const h = this.height;
		const pad = { top: 12, right: 16, bottom: 36, left: 48 };
		const cw = w - pad.left - pad.right;
		const ch = h - pad.top - pad.bottom;

		/* Compute Y range */
		let allVals = [];
		this.datasets.forEach(ds => allVals.push(...ds.values));
		let maxV = Math.max(...allVals, 1);
		let minV = Math.min(...allVals, 0);
		if (minV > 0) minV = 0;
		const range = maxV - minV || 1;

		const n = this.labels.length;
		const toX = (i) => pad.left + (i / (n - 1)) * cw;
		const toY = (v) => pad.top + ch - ((v - minV) / range) * ch;

		let defs = "";
		let areas = "";
		let lines = "";
		let dots = "";

		this.datasets.forEach((ds, di) => {
			const color = ds.color || `hsl(${di * 120}, 65%, 55%)`;
			const gradId = `fv-ag-${Date.now()}-${di}`;

			defs += `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="${color}" stop-opacity="${this.fillOpacity}"/>
				<stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
			</linearGradient>`;

			const pts = ds.values.map((v, i) => ({ x: toX(i), y: toY(v) }));

			let pathD;
			if (this.smooth && pts.length > 2) {
				pathD = this._smoothPath(pts);
			} else {
				pathD = `M${pts.map(p => `${p.x},${p.y}`).join("L")}`;
			}

			/* Area fill */
			const areaD = `${pathD}L${pts[pts.length - 1].x},${toY(minV)}L${pts[0].x},${toY(minV)}Z`;
			areas += `<path d="${areaD}" fill="url(#${gradId})" class="fv-area-fill"/>`;

			/* Line */
			const animStyle = this.animate
				? `stroke-dasharray="${cw * 2}" stroke-dashoffset="${cw * 2}" style="animation:fvAreaDraw .8s ease ${di * 0.2}s forwards"`
				: "";
			lines += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${animStyle}/>`;

			/* Dots */
			if (this.showDots) {
				pts.forEach((p) => {
					dots += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}" class="fv-area-dot"/>`;
				});
			}
		});

		/* Grid lines */
		let grid = "";
		if (this.showGrid) {
			const steps = 5;
			for (let i = 0; i <= steps; i++) {
				const y = pad.top + (ch / steps) * i;
				const val = maxV - (range / steps) * i;
				grid += `<line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" class="fv-area-grid"/>`;
				grid += `<text x="${pad.left - 6}" y="${y + 4}" text-anchor="end" class="fv-area-ylab">${this._fmt(val)}</text>`;
			}
		}

		/* X labels */
		let xLabels = "";
		if (this.showLabels) {
			this.labels.forEach((l, i) => {
				xLabels += `<text x="${toX(i)}" y="${h - pad.bottom + 18}" text-anchor="middle" class="fv-area-xlab">${l}</text>`;
			});
		}

		const wrap = document.createElement("div");
		wrap.className = `fv-area ${this.className}`;
		wrap.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${grid}${areas}${lines}${dots}${xLabels}</svg>`;

		el.innerHTML = "";
		el.appendChild(wrap);
	}

	_smoothPath(pts) {
		let d = `M${pts[0].x},${pts[0].y}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const cpx = (pts[i].x + pts[i + 1].x) / 2;
			d += ` C${cpx},${pts[i].y} ${cpx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
		}
		return d;
	}

	_fmt(n) {
		if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
		if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
		return Math.round(n).toString();
	}
}
