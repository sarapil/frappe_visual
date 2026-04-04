// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * TreemapChart — Squarified treemap visualization
 * ==================================================
 * Nested rectangle treemap for hierarchical data.
 *
 * frappe.visual.TreemapChart.create({
 *   target: "#tree",
 *   data: [
 *     { label: "Engineering", value: 45, color: "#6366f1" },
 *     { label: "Marketing", value: 25, color: "#ec4899" },
 *     { label: "Sales", value: 20, color: "#f59e0b" },
 *     { label: "Support", value: 10, color: "#10b981" }
 *   ],
 *   width: null,      // auto from container
 *   height: 300,
 *   showLabels: true,
 *   showValues: true,
 *   animate: true,
 *   onClick: null,
 *   className: ""
 * })
 */

export class TreemapChart {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			data: [],
			width: null,
			height: 300,
			showLabels: true,
			showValues: true,
			animate: true,
			onClick: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new TreemapChart(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.data.length) return;

		const w = this.width || el.offsetWidth || 400;
		const h = this.height;
		const total = this.data.reduce((s, d) => s + d.value, 0);

		/* Squarified treemap layout */
		const sorted = [...this.data].sort((a, b) => b.value - a.value);
		const rects = this._squarify(sorted, { x: 0, y: 0, w, h }, total);

		const wrap = document.createElement("div");
		wrap.className = `fv-treemap ${this.className}`;
		wrap.style.cssText = `position:relative;width:${w}px;height:${h}px;`;

		rects.forEach((r, i) => {
			const cell = document.createElement("div");
			cell.className = "fv-treemap-cell";
			cell.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:${r.item.color || `hsl(${i * 47}, 65%, 55%)`};`;

			if (this.animate) {
				cell.style.opacity = "0";
				cell.style.transform = "scale(0.8)";
				cell.style.transition = `all 0.3s ease ${i * 0.05}s`;
				requestAnimationFrame(() => requestAnimationFrame(() => {
					cell.style.opacity = "1";
					cell.style.transform = "scale(1)";
				}));
			}

			let inner = "";
			if (this.showLabels && r.w > 40 && r.h > 24) {
				inner += `<div class="fv-treemap-lbl">${r.item.label}</div>`;
			}
			if (this.showValues && r.w > 40 && r.h > 40) {
				const pct = ((r.item.value / total) * 100).toFixed(1);
				inner += `<div class="fv-treemap-val">${pct}%</div>`;
			}
			cell.innerHTML = inner;

			if (this.onClick) cell.addEventListener("click", () => this.onClick(r.item));
			wrap.appendChild(cell);
		});

		el.innerHTML = "";
		el.appendChild(wrap);
	}

	_squarify(items, rect, total) {
		if (!items.length) return [];
		if (items.length === 1) {
			return [{ x: rect.x, y: rect.y, w: rect.w, h: rect.h, item: items[0] }];
		}

		const results = [];
		let remaining = [...items];
		let area = { ...rect };
		let remTotal = total;

		while (remaining.length) {
			const isWide = area.w >= area.h;
			const side = isWide ? area.h : area.w;

			let row = [remaining[0]];
			let rowSum = remaining[0].value;
			let bestRatio = this._worstRatio(row, rowSum, side, remTotal, isWide ? area.w : area.h);

			for (let i = 1; i < remaining.length; i++) {
				const tryRow = [...row, remaining[i]];
				const trySum = rowSum + remaining[i].value;
				const tryRatio = this._worstRatio(tryRow, trySum, side, remTotal, isWide ? area.w : area.h);
				if (tryRatio <= bestRatio) {
					row = tryRow;
					rowSum = trySum;
					bestRatio = tryRatio;
				} else break;
			}

			const rowFrac = rowSum / remTotal;
			const rowSize = isWide ? area.w * rowFrac : area.h * rowFrac;
			let offset = 0;

			row.forEach(item => {
				const frac = item.value / rowSum;
				const cellSize = side * frac;
				if (isWide) {
					results.push({ x: area.x, y: area.y + offset, w: rowSize, h: cellSize, item });
				} else {
					results.push({ x: area.x + offset, y: area.y, w: cellSize, h: rowSize, item });
				}
				offset += cellSize;
			});

			remaining = remaining.slice(row.length);
			remTotal -= rowSum;

			if (isWide) {
				area = { x: area.x + rowSize, y: area.y, w: area.w - rowSize, h: area.h };
			} else {
				area = { x: area.x, y: area.y + rowSize, w: area.w, h: area.h - rowSize };
			}
		}

		return results;
	}

	_worstRatio(row, rowSum, side, total, mainSide) {
		const rowArea = (rowSum / total) * mainSide * side;
		const rowWidth = rowArea / side;
		let worst = 0;
		row.forEach(item => {
			const h = (item.value / rowSum) * side;
			const ratio = Math.max(rowWidth / h, h / rowWidth);
			if (ratio > worst) worst = ratio;
		});
		return worst;
	}
}
