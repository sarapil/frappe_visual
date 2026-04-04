/**
 * Frappe Visual — WaterfallChart
 * =================================
 * Waterfall (bridge) chart for financial analysis showing how individual
 * positive/negative values contribute to a running total. Essential for
 * income statements, variance analysis, and cash flow visualization.
 *
 * Usage:
 *   frappe.visual.WaterfallChart.create('#el', {
 *     items: [
 *       { label: 'Revenue', value: 500000 },
 *       { label: 'COGS', value: -200000 },
 *       { label: 'Gross Profit', isSubtotal: true },
 *       { label: 'OpEx', value: -150000 },
 *       { label: 'Net Income', isTotal: true },
 *     ],
 *     currency: '$',
 *   })
 *
 * @module frappe_visual/components/waterfall_chart
 */

export class WaterfallChart {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("WaterfallChart: container not found");

		this.opts = Object.assign({
			theme: "glass",
			items: [],
			title: "",
			currency: "",
			barWidth: 0.6,            // fraction of available space
			positiveColor: "#10b981",
			negativeColor: "#ef4444",
			subtotalColor: "#6366f1",
			totalColor: "#1e293b",
			connectorColor: "#94a3b8",
			showValues: true,
			showConnectors: true,
			animate: true,
			animDuration: 800,
			height: 320,
			onClick: null,
		}, opts);

		this._init();
	}

	static create(container, opts = {}) { return new WaterfallChart(container, opts); }

	_init() {
		this.container.classList.add("fv-wc", `fv-wc--${this.opts.theme}`);
		this._computeItems();
		this._render();
	}

	_computeItems() {
		// Calculate running total and bar positions
		this._computed = [];
		let running = 0;

		for (const item of this.opts.items) {
			if (item.isTotal) {
				this._computed.push({
					...item,
					start: 0,
					end: running,
					value: running,
					type: "total",
				});
			} else if (item.isSubtotal) {
				this._computed.push({
					...item,
					start: 0,
					end: running,
					value: running,
					type: "subtotal",
				});
			} else {
				const val = item.value || 0;
				this._computed.push({
					...item,
					start: running,
					end: running + val,
					value: val,
					type: val >= 0 ? "positive" : "negative",
				});
				running += val;
			}
		}

		// Find min/max for Y axis
		let minVal = 0, maxVal = 0;
		for (const c of this._computed) {
			minVal = Math.min(minVal, c.start, c.end);
			maxVal = Math.max(maxVal, c.start, c.end);
		}
		// Add padding
		const range = maxVal - minVal || 1;
		this._yMin = minVal - range * 0.05;
		this._yMax = maxVal + range * 0.1;
	}

	_render() {
		this.container.innerHTML = "";

		// Title
		if (this.opts.title) {
			const titleEl = document.createElement("div");
			titleEl.className = "fv-wc-title";
			titleEl.textContent = this.opts.title;
			this.container.appendChild(titleEl);
		}

		const chartWrap = document.createElement("div");
		chartWrap.className = "fv-wc-chart";
		chartWrap.style.height = this.opts.height + "px";

		const svgNS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(svgNS, "svg");
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.style.overflow = "visible";

		// We'll use percentages for x and compute y positions
		const n = this._computed.length;
		if (n === 0) {
			chartWrap.innerHTML = `<div class="fv-wc-empty">${__("No data")}</div>`;
			this.container.appendChild(chartWrap);
			return;
		}

		const pad = { top: 30, bottom: 50, left: 60, right: 20 };
		const chartH = this.opts.height;

		chartWrap.appendChild(svg);
		this.container.appendChild(chartWrap);

		// After DOM insertion, get actual width
		requestAnimationFrame(() => {
			const totalW = chartWrap.clientWidth;
			const plotW = totalW - pad.left - pad.right;
			const plotH = chartH - pad.top - pad.bottom;
			const barSlotW = plotW / n;
			const barW = barSlotW * this.opts.barWidth;

			svg.setAttribute("viewBox", `0 0 ${totalW} ${chartH}`);

			const yScale = (v) => pad.top + plotH - ((v - this._yMin) / (this._yMax - this._yMin)) * plotH;

			// Zero line
			if (this._yMin < 0) {
				const zeroY = yScale(0);
				const zeroLine = document.createElementNS(svgNS, "line");
				zeroLine.setAttribute("x1", pad.left);
				zeroLine.setAttribute("x2", totalW - pad.right);
				zeroLine.setAttribute("y1", zeroY);
				zeroLine.setAttribute("y2", zeroY);
				zeroLine.setAttribute("stroke", "#94a3b8");
				zeroLine.setAttribute("stroke-width", "1");
				zeroLine.setAttribute("stroke-dasharray", "4,4");
				svg.appendChild(zeroLine);
			}

			// Y axis labels (5 ticks)
			const ticks = 5;
			for (let t = 0; t <= ticks; t++) {
				const v = this._yMin + (this._yMax - this._yMin) * (t / ticks);
				const y = yScale(v);

				// Grid line
				const grid = document.createElementNS(svgNS, "line");
				grid.setAttribute("x1", pad.left);
				grid.setAttribute("x2", totalW - pad.right);
				grid.setAttribute("y1", y);
				grid.setAttribute("y2", y);
				grid.setAttribute("stroke", "#e2e8f0");
				grid.setAttribute("stroke-width", "0.5");
				svg.appendChild(grid);

				// Label
				const txt = document.createElementNS(svgNS, "text");
				txt.setAttribute("x", pad.left - 8);
				txt.setAttribute("y", y + 4);
				txt.setAttribute("text-anchor", "end");
				txt.setAttribute("font-size", "11");
				txt.setAttribute("fill", "#64748b");
				txt.textContent = this._formatVal(v);
				svg.appendChild(txt);
			}

			// Bars + connectors
			for (let i = 0; i < n; i++) {
				const c = this._computed[i];
				const cx = pad.left + barSlotW * i + barSlotW / 2;
				const x = cx - barW / 2;

				const y1 = yScale(Math.max(c.start, c.end));
				const y2 = yScale(Math.min(c.start, c.end));
				const barH = Math.max(y2 - y1, 1);

				// Color
				let color;
				if (c.type === "total") color = this.opts.totalColor;
				else if (c.type === "subtotal") color = this.opts.subtotalColor;
				else if (c.type === "positive") color = this.opts.positiveColor;
				else color = this.opts.negativeColor;

				// Bar rect
				const rect = document.createElementNS(svgNS, "rect");
				rect.setAttribute("x", x);
				rect.setAttribute("y", y1);
				rect.setAttribute("width", barW);
				rect.setAttribute("height", this.opts.animate ? 0 : barH);
				rect.setAttribute("fill", color);
				rect.setAttribute("rx", 3);
				rect.style.cursor = this.opts.onClick ? "pointer" : "default";

				if (this.opts.animate) {
					rect.style.transition = `height ${this.opts.animDuration}ms cubic-bezier(0.22,1,0.36,1), y ${this.opts.animDuration}ms cubic-bezier(0.22,1,0.36,1)`;
					requestAnimationFrame(() => {
						rect.setAttribute("y", y1);
						rect.setAttribute("height", barH);
					});
				}

				if (this.opts.onClick) {
					rect.addEventListener("click", () => this.opts.onClick(c, i));
				}

				svg.appendChild(rect);

				// Connector line to next bar
				if (this.opts.showConnectors && i < n - 1) {
					const nextC = this._computed[i + 1];
					const connY = yScale(c.end);
					const nextX = pad.left + barSlotW * (i + 1) + barSlotW / 2 - barW / 2;

					const conn = document.createElementNS(svgNS, "line");
					conn.setAttribute("x1", x + barW);
					conn.setAttribute("x2", nextX);
					conn.setAttribute("y1", connY);
					conn.setAttribute("y2", connY);
					conn.setAttribute("stroke", this.opts.connectorColor);
					conn.setAttribute("stroke-width", "1");
					conn.setAttribute("stroke-dasharray", "3,3");
					svg.appendChild(conn);
				}

				// Value label above/below bar
				if (this.opts.showValues) {
					const valTxt = document.createElementNS(svgNS, "text");
					valTxt.setAttribute("x", cx);
					const isNeg = c.value < 0;
					valTxt.setAttribute("y", isNeg ? y2 + 15 : y1 - 6);
					valTxt.setAttribute("text-anchor", "middle");
					valTxt.setAttribute("font-size", "11");
					valTxt.setAttribute("font-weight", "600");
					valTxt.setAttribute("fill", color);
					valTxt.textContent = this._formatVal(c.value);
					svg.appendChild(valTxt);
				}

				// X-axis label
				const xLabel = document.createElementNS(svgNS, "text");
				xLabel.setAttribute("x", cx);
				xLabel.setAttribute("y", chartH - pad.bottom + 18);
				xLabel.setAttribute("text-anchor", "middle");
				xLabel.setAttribute("font-size", "11");
				xLabel.setAttribute("fill", "#64748b");
				xLabel.textContent = c.label || "";
				svg.appendChild(xLabel);
			}
		});
	}

	_formatVal(v) {
		const sign = v < 0 ? "-" : "";
		const abs = Math.abs(v);
		let s;
		if (abs >= 1e6) s = (abs / 1e6).toFixed(1) + "M";
		else if (abs >= 1e3) s = (abs / 1e3).toFixed(0) + "K";
		else s = abs.toFixed(0);
		return `${sign}${this.opts.currency}${s}`;
	}

	/* ── Public API ──────────────────────────────────────────── */
	setItems(items) { this.opts.items = items; this._computeItems(); this._render(); }
	getItems() { return JSON.parse(JSON.stringify(this._computed)); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-wc", `fv-wc--${this.opts.theme}`);
	}
}
