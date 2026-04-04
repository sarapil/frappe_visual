// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * FrappeVisual Countdown — Animated countdown timer
 * ====================================================
 * frappe.visual.Countdown.create({ container, targetDate, ... })
 */
export class Countdown {
	static create(opts = {}) { return new Countdown(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			targetDate: null,        // Date or ISO string
			duration: null,          // alternative: seconds from now
			showDays: true,
			showHours: true,
			showMinutes: true,
			showSeconds: true,
			showLabels: true,
			labels: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' },
			separator: ':',
			variant: 'default',      // default | card | flip | minimal
			size: 'md',
			onComplete: null,
			onTick: null,
		}, opts);

		this._target = this.o.targetDate
			? new Date(this.o.targetDate).getTime()
			: Date.now() + (this.o.duration || 0) * 1000;

		this.el = document.createElement('div');
		this.el.className = `fv-cd2 fv-cd2-${this.o.variant} fv-cd2-${this.o.size}`;
		this._running = true;
		this._render();
		this._tick();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const segments = [];
		if (this.o.showDays) segments.push('days');
		if (this.o.showHours) segments.push('hours');
		if (this.o.showMinutes) segments.push('minutes');
		if (this.o.showSeconds) segments.push('seconds');

		this.el.innerHTML = segments.map((seg, i) => {
			const sep = i < segments.length - 1 ? `<span class="fv-cd2-sep">${Countdown._esc(this.o.separator)}</span>` : '';
			return `<div class="fv-cd2-segment" data-seg="${seg}">
				<span class="fv-cd2-value" data-value="${seg}">00</span>
				${this.o.showLabels ? `<span class="fv-cd2-label">${Countdown._esc(this.o.labels[seg])}</span>` : ''}
			</div>${sep}`;
		}).join('');
	}

	_tick() {
		if (!this._running) return;
		const now = Date.now();
		let diff = Math.max(0, this._target - now);

		const days = Math.floor(diff / 86400000); diff -= days * 86400000;
		const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
		const minutes = Math.floor(diff / 60000); diff -= minutes * 60000;
		const seconds = Math.floor(diff / 1000);

		const vals = { days, hours, minutes, seconds };

		['days', 'hours', 'minutes', 'seconds'].forEach(seg => {
			const el = this.el.querySelector(`[data-value="${seg}"]`);
			if (el) {
				const str = String(vals[seg]).padStart(seg === 'days' ? 2 : 2, '0');
				if (el.textContent !== str) {
					el.textContent = str;
					el.classList.add('fv-cd2-flip');
					setTimeout(() => el.classList.remove('fv-cd2-flip'), 300);
				}
			}
		});

		if (this.o.onTick) this.o.onTick(vals);

		if (this._target - now <= 0) {
			this._running = false;
			this.el.classList.add('fv-cd2-complete');
			if (this.o.onComplete) this.o.onComplete();
			return;
		}

		this._raf = requestAnimationFrame(() => setTimeout(() => this._tick(), 250));
	}

	stop() { this._running = false; if (this._raf) cancelAnimationFrame(this._raf); }
	reset(targetDate) {
		this._target = targetDate ? new Date(targetDate).getTime() : this._target;
		this._running = true;
		this.el.classList.remove('fv-cd2-complete');
		this._tick();
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
