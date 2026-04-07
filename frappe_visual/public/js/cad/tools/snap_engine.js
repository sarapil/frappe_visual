// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * SnapEngine — Grid snap, edge snap, intersection snap for 2D CAD
 * =================================================================
 */

export class SnapEngine {
	constructor(opts = {}) {
		this.opts = Object.assign({
			gridSize: 10,
			snapDistance: 8,
			gridSnap: true,
			edgeSnap: true,
			intersectionSnap: true,
			guideLines: true,
		}, opts);
		this._objects = [];
	}

	/** Set the objects to snap against (edges, lines) */
	setObjects(objects) {
		this._objects = objects;
	}

	/** Snap a point to the nearest snap target */
	snap(point, zoom = 1) {
		const threshold = this.opts.snapDistance / zoom;
		let best = { ...point };
		let bestDist = Infinity;
		let snapType = null;

		// Grid snap
		if (this.opts.gridSnap) {
			const gs = this.opts.gridSize;
			const gx = Math.round(point.x / gs) * gs;
			const gy = Math.round(point.y / gs) * gs;
			const gDist = Math.hypot(point.x - gx, point.y - gy);
			if (gDist < threshold && gDist < bestDist) {
				best = { x: gx, y: gy };
				bestDist = gDist;
				snapType = "grid";
			}
		}

		// Edge snap — snap to nearest point on edges of objects
		if (this.opts.edgeSnap) {
			for (const obj of this._objects) {
				const endpoints = this._getEndpoints(obj);
				for (const ep of endpoints) {
					const d = Math.hypot(point.x - ep.x, point.y - ep.y);
					if (d < threshold && d < bestDist) {
						best = ep;
						bestDist = d;
						snapType = "endpoint";
					}
				}

				// Midpoint snap
				const mids = this._getMidpoints(obj);
				for (const mp of mids) {
					const d = Math.hypot(point.x - mp.x, point.y - mp.y);
					if (d < threshold && d < bestDist) {
						best = mp;
						bestDist = d;
						snapType = "midpoint";
					}
				}
			}
		}

		// Intersection snap
		if (this.opts.intersectionSnap) {
			const intersections = this._findIntersections();
			for (const ip of intersections) {
				const d = Math.hypot(point.x - ip.x, point.y - ip.y);
				if (d < threshold && d < bestDist) {
					best = ip;
					bestDist = d;
					snapType = "intersection";
				}
			}
		}

		return { point: best, type: snapType, snapped: snapType !== null };
	}

	_getEndpoints(obj) {
		if (obj.type === "wall" || obj.type === "line") {
			return [obj.start, obj.end].filter(Boolean);
		}
		if (obj.type === "rect") {
			return [
				{ x: obj.x, y: obj.y },
				{ x: obj.x + obj.width, y: obj.y },
				{ x: obj.x, y: obj.y + obj.height },
				{ x: obj.x + obj.width, y: obj.y + obj.height },
			];
		}
		return [];
	}

	_getMidpoints(obj) {
		if (obj.type === "wall" || obj.type === "line") {
			const s = obj.start;
			const e = obj.end;
			if (s && e) return [{ x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 }];
		}
		return [];
	}

	_findIntersections() {
		const lines = this._objects.filter(o => o.type === "wall" || o.type === "line");
		const intersections = [];
		for (let i = 0; i < lines.length; i++) {
			for (let j = i + 1; j < lines.length; j++) {
				const pt = this._lineIntersect(lines[i], lines[j]);
				if (pt) intersections.push(pt);
			}
		}
		return intersections;
	}

	_lineIntersect(l1, l2) {
		if (!l1.start || !l1.end || !l2.start || !l2.end) return null;
		const x1 = l1.start.x, y1 = l1.start.y, x2 = l1.end.x, y2 = l1.end.y;
		const x3 = l2.start.x, y3 = l2.start.y, x4 = l2.end.x, y4 = l2.end.y;
		const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		if (Math.abs(denom) < 1e-10) return null;

		const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
		const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

		if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
			return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
		}
		return null;
	}

	/** Draw snap indicator (call from render layer) */
	renderSnapIndicator(ctx, point, snapType, zoom = 1) {
		if (!snapType) return;
		const size = 6 / zoom;
		ctx.save();
		ctx.strokeStyle = "#f59e0b";
		ctx.lineWidth = 1.5 / zoom;

		if (snapType === "grid") {
			ctx.strokeRect(point.x - size / 2, point.y - size / 2, size, size);
		} else if (snapType === "endpoint") {
			ctx.beginPath();
			ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
			ctx.stroke();
		} else if (snapType === "midpoint") {
			ctx.beginPath();
			ctx.moveTo(point.x, point.y - size / 2);
			ctx.lineTo(point.x + size / 2, point.y + size / 2);
			ctx.lineTo(point.x - size / 2, point.y + size / 2);
			ctx.closePath();
			ctx.stroke();
		} else if (snapType === "intersection") {
			ctx.beginPath();
			ctx.moveTo(point.x - size / 2, point.y - size / 2);
			ctx.lineTo(point.x + size / 2, point.y + size / 2);
			ctx.moveTo(point.x + size / 2, point.y - size / 2);
			ctx.lineTo(point.x - size / 2, point.y + size / 2);
			ctx.stroke();
		}
		ctx.restore();
	}
}
