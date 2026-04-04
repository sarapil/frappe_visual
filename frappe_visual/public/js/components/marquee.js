// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Marquee — Auto-scrolling content ticker
 * ======================================================
 * frappe.visual.Marquee.create({ container, items, ... })
 */
export class Marquee {
	static create(opts = {}) { return new Marquee(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			items: [],              // [{ html }] or strings
			direction: 'left',      // left | right | up | down
			speed: 40,              // pixels per second
			gap: 40,
			pauseOnHover: true,
			repeat: 2,              // duplicate count for seamless loop
			gradient: true,         // fade edges
			gradientWidth: 40,
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		const isHoriz = o.direction === 'left' || o.direction === 'right';
		this.el.className = `fv-mq fv-mq-${o.direction}`;
		this.el.style.setProperty('--fv-mq-gap', o.gap + 'px');

		if (o.gradient) {
			this.el.style.setProperty('--fv-mq-grad', o.gradientWidth + 'px');
			this.el.classList.add('fv-mq-gradient');
		}

		const track = document.createElement('div');
		track.className = 'fv-mq-track';

		const buildGroup = () => {
			const g = document.createElement('div');
			g.className = 'fv-mq-group';
			o.items.forEach(item => {
				const el = document.createElement('div');
				el.className = 'fv-mq-item';
				el.innerHTML = typeof item === 'string' ? item : (item.html || '');
				g.appendChild(el);
			});
			return g;
		};

		for (let i = 0; i < (o.repeat || 2); i++) {
			track.appendChild(buildGroup());
		}

		// Calculate animation duration based on speed
		requestAnimationFrame(() => {
			const group = track.querySelector('.fv-mq-group');
			if (!group) return;
			const size = isHoriz ? group.scrollWidth : group.scrollHeight;
			const duration = size / o.speed;
			track.style.animationDuration = duration + 's';

			if (o.direction === 'right') track.style.animationDirection = 'reverse';
			if (o.direction === 'down') track.style.animationDirection = 'reverse';
		});

		this.el.innerHTML = '';
		this.el.appendChild(track);

		if (o.pauseOnHover) {
			this.el.onmouseenter = () => track.style.animationPlayState = 'paused';
			this.el.onmouseleave = () => track.style.animationPlayState = 'running';
		}
	}

	pause() { const t = this.el.querySelector('.fv-mq-track'); if (t) t.style.animationPlayState = 'paused'; }
	play() { const t = this.el.querySelector('.fv-mq-track'); if (t) t.style.animationPlayState = 'running'; }
	setItems(items) { this.o.items = items; this._render(); }

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
