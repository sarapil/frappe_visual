/**
 * Heatmap — Customizable calendar / grid heatmap
 * =================================================
 * GitHub-style contribution heatmap or generic data heatmap.
 *
 * frappe.visual.Heatmap.create({
 *   target: "#heat",
 *   data: [ { date: "2025-01-15", value: 3 }, ... ],
 *   startDate: null,      // auto or Date
 *   endDate: null,
 *   colors: ["#ebedf0","#9be9a8","#40c463","#30a14e","#216e39"],
 *   cellSize: 12,
 *   cellGap: 2,
 *   cellRadius: 2,
 *   showMonthLabels: true,
 *   showDayLabels: true,
 *   tooltip: true,
 *   onClick: null,
 *   className: ""
 * })
 */

export class Heatmap {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			data: [],
			startDate: null,
			endDate: null,
			colors: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
			cellSize: 12,
			cellGap: 2,
			cellRadius: 2,
			showMonthLabels: true,
			showDayLabels: true,
			tooltip: true,
			onClick: null,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new Heatmap(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		/* Build date → value map */
		const map = {};
		let maxVal = 1;
		this.data.forEach(d => {
			const key = typeof d.date === "string" ? d.date : d.date.toISOString().slice(0, 10);
			map[key] = (map[key] || 0) + (d.value || 1);
			if (map[key] > maxVal) maxVal = map[key];
		});

		const end = this.endDate ? new Date(this.endDate) : new Date();
		const start = this.startDate
			? new Date(this.startDate)
			: new Date(end.getFullYear(), end.getMonth() - 11, 1);

		/* Walk weeks */
		const cs = this.cellSize;
		const cg = this.cellGap;
		const step = cs + cg;
		const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
		const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		const labelW = this.showDayLabels ? 30 : 0;
		const labelH = this.showMonthLabels ? 18 : 0;

		const d = new Date(start);
		d.setDate(d.getDate() - d.getDay()); // align to Sunday

		let rects = "";
		let week = 0;
		let prevMonth = -1;
		let monthLabels = "";

		while (d <= end) {
			const dow = d.getDay();
			const key = d.toISOString().slice(0, 10);
			const val = map[key] || 0;
			const ci = Math.min(Math.floor((val / maxVal) * (this.colors.length - 1)), this.colors.length - 1);
			const fill = val === 0 ? this.colors[0] : this.colors[ci || 1];

			const x = labelW + week * step;
			const y = labelH + dow * step;

			rects += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" rx="${this.cellRadius}" fill="${fill}" data-date="${key}" data-value="${val}"><title>${key}: ${val}</title></rect>`;

			if (this.showMonthLabels && dow === 0 && d.getMonth() !== prevMonth) {
				prevMonth = d.getMonth();
				monthLabels += `<text x="${x}" y="${labelH - 4}" class="fv-hm-month">${months[prevMonth]}</text>`;
			}

			d.setDate(d.getDate() + 1);
			if (d.getDay() === 0) week++;
		}

		/* Day labels */
		let dayLabelsSvg = "";
		if (this.showDayLabels) {
			dayLabels.forEach((l, i) => {
				if (l) dayLabelsSvg += `<text x="${labelW - 6}" y="${labelH + i * step + cs - 1}" class="fv-hm-day">${l}</text>`;
			});
		}

		const totalW = labelW + (week + 1) * step;
		const totalH = labelH + 7 * step;

		const wrap = document.createElement("div");
		wrap.className = `fv-hm ${this.className}`;
		wrap.style.overflowX = "auto";
		wrap.innerHTML = `<svg width="${totalW}" height="${totalH}" class="fv-hm-svg">${monthLabels}${dayLabelsSvg}${rects}</svg>`;

		el.innerHTML = "";
		el.appendChild(wrap);

		if (this.onClick) {
			wrap.addEventListener("click", (e) => {
				const r = e.target.closest("rect[data-date]");
				if (r) this.onClick({ date: r.dataset.date, value: +r.dataset.value });
			});
		}
	}
}
