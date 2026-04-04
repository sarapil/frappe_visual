// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Confetti — Celebration confetti burst
 * =======================================
 * Canvas-based confetti particle system for celebrations.
 *
 * frappe.visual.Confetti.create({
 *   target: document.body,
 *   count: 100,
 *   spread: 70,            // degrees
 *   origin: { x: 0.5, y: 0.5 },
 *   colors: ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#f59e0b"],
 *   gravity: 1,
 *   drift: 0,
 *   duration: 3000,
 *   shapes: ["square", "circle"]
 * })
 *
 * // Quick fire:
 * frappe.visual.Confetti.fire()
 */

export class Confetti {
	constructor(opts = {}) {
		Object.assign(this, {
			target: document.body,
			count: 100,
			spread: 70,
			origin: { x: 0.5, y: 0.5 },
			colors: ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#f59e0b", "#f97316"],
			gravity: 1,
			drift: 0,
			duration: 3000,
			shapes: ["square", "circle"],
		}, opts);

		this._particles = [];
		this._canvas = null;
		this._ctx = null;
		this._raf = null;
		this.render();
	}

	static create(opts) { return new Confetti(opts); }
	static fire(opts) { return new Confetti(opts); }

	render() {
		const el = typeof this.target === "string"
			? document.querySelector(this.target)
			: this.target;
		if (!el) return;

		/* Canvas overlay */
		const canvas = document.createElement("canvas");
		canvas.className = "fv-confetti";
		canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99999;";
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		el.appendChild(canvas);

		this._canvas = canvas;
		this._ctx = canvas.getContext("2d");

		/* Generate particles */
		const rad = (this.spread / 2) * (Math.PI / 180);
		for (let i = 0; i < this.count; i++) {
			const angle = -Math.PI / 2 + (Math.random() - 0.5) * rad * 2;
			const velocity = 30 + Math.random() * 30;
			this._particles.push({
				x: this.origin.x * canvas.width,
				y: this.origin.y * canvas.height,
				vx: Math.cos(angle) * velocity + this.drift * (Math.random() - 0.5),
				vy: Math.sin(angle) * velocity,
				color: this.colors[Math.floor(Math.random() * this.colors.length)],
				shape: this.shapes[Math.floor(Math.random() * this.shapes.length)],
				size: 4 + Math.random() * 4,
				rotation: Math.random() * 360,
				rotSpeed: (Math.random() - 0.5) * 10,
				opacity: 1,
			});
		}

		this._start = performance.now();
		this._animate();
	}

	_animate() {
		const elapsed = performance.now() - this._start;
		const progress = elapsed / this.duration;

		if (progress >= 1) {
			this._canvas?.remove();
			return;
		}

		const ctx = this._ctx;
		ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

		this._particles.forEach((p) => {
			p.x += p.vx * 0.5;
			p.vy += this.gravity * 0.5;
			p.y += p.vy * 0.5;
			p.rotation += p.rotSpeed;
			p.opacity = Math.max(0, 1 - progress * 1.2);

			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate((p.rotation * Math.PI) / 180);
			ctx.globalAlpha = p.opacity;
			ctx.fillStyle = p.color;

			if (p.shape === "circle") {
				ctx.beginPath();
				ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
			}

			ctx.restore();
		});

		this._raf = requestAnimationFrame(() => this._animate());
	}

	destroy() {
		cancelAnimationFrame(this._raf);
		this._canvas?.remove();
	}
}
