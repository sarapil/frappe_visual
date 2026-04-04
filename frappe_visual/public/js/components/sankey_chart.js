/**
 * SankeyChart — Simple Sankey / alluvial flow diagram
 * =====================================================
 * SVG-based flow diagram showing data flow between nodes.
 *
 * frappe.visual.SankeyChart.create({
 *   target: "#sankey",
 *   nodes: [
 *     { id: "source1", label: "Direct", color: "#6366f1" },
 *     { id: "source2", label: "Referral", color: "#ec4899" },
 *     { id: "mid1", label: "Landing Page", color: "#f59e0b" },
 *     { id: "dest1", label: "Signup", color: "#10b981" },
 *     { id: "dest2", label: "Bounce", color: "#ef4444" }
 *   ],
 *   links: [
 *     { source: "source1", target: "mid1", value: 100 },
 *     { source: "source2", target: "mid1", value: 60 },
 *     { source: "mid1", target: "dest1", value: 90 },
 *     { source: "mid1", target: "dest2", value: 70 }
 *   ],
 *   width: null,
 *   height: 300,
 *   nodeWidth: 24,
 *   nodePadding: 16,
 *   animate: true,
 *   className: ""
 * })
 */

export class SankeyChart {
	constructor(opts = {}) {
		Object.assign(this, {
			target: null,
			nodes: [],
			links: [],
			width: null,
			height: 300,
			nodeWidth: 24,
			nodePadding: 16,
			animate: true,
			className: "",
		}, opts);
		this.render();
	}

	static create(opts) { return new SankeyChart(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el || !this.nodes.length) return;

		const w = this.width || el.offsetWidth || 600;
		const h = this.height;
		const pad = 24;

		/* Assign columns via BFS-like depth */
		const nodeMap = {};
		this.nodes.forEach(n => nodeMap[n.id] = { ...n, col: -1, inVal: 0, outVal: 0, y: 0, h: 0 });

		/* Determine sources (no incoming) */
		const hasIn = new Set();
		this.links.forEach(l => hasIn.add(l.target));
		const sources = this.nodes.filter(n => !hasIn.has(n.id));

		/* BFS to assign columns */
		const queue = sources.map(n => ({ id: n.id, col: 0 }));
		const visited = new Set();
		while (queue.length) {
			const { id, col } = queue.shift();
			if (visited.has(id)) { nodeMap[id].col = Math.max(nodeMap[id].col, col); continue; }
			visited.add(id);
			nodeMap[id].col = col;
			this.links.filter(l => l.source === id).forEach(l => {
				queue.push({ id: l.target, col: col + 1 });
			});
		}

		/* Compute node values */
		this.links.forEach(l => {
			nodeMap[l.source].outVal += l.value;
			nodeMap[l.target].inVal += l.value;
		});
		Object.values(nodeMap).forEach(n => {
			n.val = Math.max(n.inVal, n.outVal, 1);
		});

		/* Group by column */
		const maxCol = Math.max(...Object.values(nodeMap).map(n => n.col));
		const columns = [];
		for (let c = 0; c <= maxCol; c++) {
			columns.push(Object.values(nodeMap).filter(n => n.col === c));
		}

		/* Layout nodes in each column */
		const colW = (w - pad * 2 - this.nodeWidth) / Math.max(maxCol, 1);
		const maxColVal = Math.max(...columns.map(col => col.reduce((s, n) => s + n.val, 0)));
		const scale = (h - pad * 2) / (maxColVal + this.nodePadding * (Math.max(...columns.map(c => c.length)) - 1));

		columns.forEach((col, ci) => {
			const totalH = col.reduce((s, n) => s + n.val * scale, 0) + (col.length - 1) * this.nodePadding;
			let y = pad + (h - pad * 2 - totalH) / 2;
			col.forEach(n => {
				n.x = pad + ci * colW;
				n.y = y;
				n.h = Math.max(n.val * scale, 4);
				y += n.h + this.nodePadding;
				n._outOfs = 0;
				n._inOfs = 0;
			});
		});

		/* Draw */
		let nodesSvg = "";
		let linksSvg = "";
		let labelsSvg = "";

		/* Links */
		this.links.forEach((l, i) => {
			const src = nodeMap[l.source];
			const tgt = nodeMap[l.target];
			const lh = (l.value / src.val) * src.h;
			const th = (l.value / tgt.val) * tgt.h;

			const sy = src.y + src._outOfs;
			const ty = tgt.y + tgt._inOfs;
			src._outOfs += lh;
			tgt._inOfs += th;

			const sx = src.x + this.nodeWidth;
			const tx = tgt.x;

			const cp = (tx - sx) * 0.5;
			const d = `M${sx},${sy} C${sx + cp},${sy} ${tx - cp},${ty} ${tx},${ty}
				L${tx},${ty + th} C${tx - cp},${ty + th} ${sx + cp},${sy + lh} ${sx},${sy + lh} Z`;

			const color = src.color || "#6366f1";
			const anim = this.animate ? `opacity="0" style="animation:fvSankeyIn .5s ease ${i * 0.05}s forwards"` : `opacity="0.3"`;
			linksSvg += `<path d="${d}" fill="${color}" ${anim}/>`;
		});

		/* Nodes */
		Object.values(nodeMap).forEach((n, i) => {
			const color = n.color || `hsl(${i * 67}, 60%, 50%)`;
			nodesSvg += `<rect x="${n.x}" y="${n.y}" width="${this.nodeWidth}" height="${n.h}" fill="${color}" rx="3"/>`;
			const labelX = n.col === 0 ? n.x - 4 : n.x + this.nodeWidth + 4;
			const anchor = n.col === 0 ? "end" : "start";
			labelsSvg += `<text x="${labelX}" y="${n.y + n.h / 2 + 4}" text-anchor="${anchor}" class="fv-sankey-label">${n.label}</text>`;
		});

		const wrap = document.createElement("div");
		wrap.className = `fv-sankey ${this.className}`;
		wrap.style.overflowX = "auto";
		wrap.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${linksSvg}${nodesSvg}${labelsSvg}</svg>`;

		el.innerHTML = "";
		el.appendChild(wrap);
	}
}
