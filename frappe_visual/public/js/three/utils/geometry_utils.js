// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// License: GPL-3.0

/**
 * GeometryUtils — 2D and 3D math utilities
 * ==========================================
 * Domain-agnostic geometry helpers: distance, snapping, hit testing,
 * collision detection, coordinate transforms, bounding boxes.
 */

export const GeometryUtils = {
	// ── 2D Utilities ──────────────────────────────────────────

	/** Euclidean distance between two 2D points */
	distance2D(x1, y1, x2, y2) {
		return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
	},

	/** Midpoint of two 2D points */
	midpoint2D(x1, y1, x2, y2) {
		return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
	},

	/** Angle in radians between two 2D points */
	angle2D(x1, y1, x2, y2) {
		return Math.atan2(y2 - y1, x2 - x1);
	},

	/** Snap a value to the nearest grid increment */
	snapToGrid(value, gridSize) {
		return Math.round(value / gridSize) * gridSize;
	},

	/** Snap a 2D point to grid */
	snapPoint(x, y, gridSize) {
		return {
			x: Math.round(x / gridSize) * gridSize,
			y: Math.round(y / gridSize) * gridSize,
		};
	},

	/** Point-in-rectangle hit test */
	pointInRect(px, py, rx, ry, rw, rh) {
		return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
	},

	/** Minimum distance from a point to a line segment */
	pointToSegment(px, py, x1, y1, x2, y2) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) return this.distance2D(px, py, x1, y1);

		let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
		t = Math.max(0, Math.min(1, t));
		return this.distance2D(px, py, x1 + t * dx, y1 + t * dy);
	},

	/** Check if two axis-aligned rectangles overlap */
	rectsOverlap(r1, r2) {
		return !(r1.x + r1.w <= r2.x || r2.x + r2.w <= r1.x ||
				 r1.y + r1.h <= r2.y || r2.y + r2.h <= r1.y);
	},

	/** Compute a bounding box from an array of {x, y} points */
	boundingBox2D(points) {
		if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const p of points) {
			if (p.x < minX) minX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.x > maxX) maxX = p.x;
			if (p.y > maxY) maxY = p.y;
		}
		return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
	},

	/** Rotate a 2D point around a center */
	rotatePoint(px, py, cx, cy, angleDeg) {
		const rad = (angleDeg * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const dx = px - cx;
		const dy = py - cy;
		return {
			x: cx + dx * cos - dy * sin,
			y: cy + dx * sin + dy * cos,
		};
	},

	// ── 3D Utilities ──────────────────────────────────────────

	/** Euclidean distance between two 3D points */
	distance3D(x1, y1, z1, x2, y2, z2) {
		return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
	},

	/** Linear interpolation between two values */
	lerp(a, b, t) {
		return a + (b - a) * t;
	},

	/** Clamp a value between min and max */
	clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	},

	/** Convert degrees to radians */
	degToRad(degrees) {
		return degrees * (Math.PI / 180);
	},

	/** Convert radians to degrees */
	radToDeg(radians) {
		return radians * (180 / Math.PI);
	},

	/** Map a value from one range to another */
	mapRange(value, inMin, inMax, outMin, outMax) {
		return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
	},
};
