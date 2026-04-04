/**
 * Sparkline — Inline SVG sparkline chart
 * ========================================
 * Tiny line/area/bar chart for inline data visualization.
 *
 * frappe.visual.Sparkline.create({
 *   target: "#spark",
 *   data: [4, 7, 2, 9, 5, 3, 8, 6],
 *   type: "line",          // "line" | "area" | "bar"
 *   width: 120,
 *   height: 32,
 *   color: "var(--primary)",
 *   fillOpacity: 0.15,
 *   strokeWidth: 1.5,
 *   animate: true,
 *   dotLast: true,         // dot on last data point
 *   tooltip: true,
 *   className: ""
 * })
 */

export class Sparkline {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			data: [],
			type: "line",
			width: 120,
			height: 32,
			color: "var(--primary, #6366f1)",
			fillOpacity: 0.15,
			strokeWidth: 1.5,
			animate: true,
			dotLast: true,
			tooltip: true,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new Sparkline(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.data.length) return;

		const { data, width: w, height: h, strokeWidth: sw } = this;
		const max = Math.max(...data);
		const min = Math.min(...data);
		const range = max - min || 1;
		const pad = sw + 2;

		const toX = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
		const toY = (v) => pad + (1 - (v - min) / range) * (h - pad * 2);

		let content = "";

		if (this.type === "bar") {
			const bw = Math.max(1, (w - pad * 2) / data.length - 1);
			data.forEach((v, i) => {
				const bh = ((v - min) / range) * (h - pad * 2);
				const x = pad + i * (bw + 1);
				const y = h - pad - bh;
				content += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${this.color}" rx="1" opacity="0.8"/>`;
			});
		} else {
			const pts = data.map((v, i) => `${toX(i)},${toY(v)}`);
			const path = `M${pts.join("L")}`;

			if (this.type === "area") {
				const area = `${path}L${toX(data.length - 1)},${h - pad}L${toX(0)},${h - pad}Z`;
				content += `<path d="${area}" fill="${this.color}" opacity="${this.fillOpacity}" class="fv-spark-area"/>`;
			}

			content += `<path d="${path}" fill="none" stroke="${this.color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" class="fv-spark-line"`;
			if (this.animate) {
				const len = this._pathLen(data.map((v, i) => [toX(i), toY(v)]));
				content += ` stroke-dasharray="${len}" stroke-dashoffset="${len}" style="animation:fvSparkDraw .8s ease forwards"`;
			}
			content += "/>";

			if (this.dotLast) {
				const lx = toX(data.length - 1);
				const ly = toY(data[data.length - 1]);
				content += `<circle cx="${lx}" cy="${ly}" r="2.5" fill="${this.color}" class="fv-spark-dot"/>`;
			}
		}

		const svg = document.createElement("div");
		svg.className = `fv-spark ${this.className}`;
		svg.style.display = "inline-block";
		svg.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;

		el.innerHTML = "";
		el.appendChild(svg);
	}

	_pathLen(pts) {
		let len = 0;
		for (let i = 1; i < pts.length; i++) {
			len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
		}
		return Math.ceil(len);
	}
}
