/**
 * FrappeVisual StatCard — Statistics display card
 * =================================================
 * frappe.visual.StatCard.create({ container, title, value, ... })
 */
export class StatCard {
	static create(opts = {}) { return new StatCard(opts); }

	constructor(opts = {}) {
		this.o = Object.assign({
			container: null,
			title: '',
			value: 0,
			prefix: '',            // $, ₹, etc.
			suffix: '',            // %, pts, etc.
			previousValue: null,   // for trend
			trendLabel: '',
			icon: null,            // SVG string
			iconColor: null,
			color: null,           // accent color
			sparkline: null,       // [numbers] for mini sparkline
			description: '',
			size: 'md',            // sm | md | lg
			animate: true,
			onClick: null,
		}, opts);

		this.el = document.createElement('div');
		this._render();

		const target = typeof this.o.container === 'string'
			? document.querySelector(this.o.container) : this.o.container;
		if (target) target.appendChild(this.el);
	}

	_render() {
		const o = this.o;
		this.el.className = `fv-sc fv-sc-${o.size}`;
		if (o.color) this.el.style.setProperty('--fv-sc-accent', o.color);
		if (o.onClick) { this.el.style.cursor = 'pointer'; this.el.onclick = o.onClick; }

		let html = `<div class="fv-sc-header">`;
		html += `<div class="fv-sc-label">${StatCard._esc(o.title)}</div>`;
		if (o.icon) html += `<div class="fv-sc-icon" ${o.iconColor ? `style="color:${o.iconColor}"` : ''}>${o.icon}</div>`;
		html += `</div>`;

		// Value
		html += `<div class="fv-sc-value">`;
		if (o.prefix) html += `<span class="fv-sc-prefix">${StatCard._esc(o.prefix)}</span>`;
		html += `<span class="fv-sc-number" ${o.animate ? 'data-animate="true"' : ''}>${StatCard._formatNum(o.value)}</span>`;
		if (o.suffix) html += `<span class="fv-sc-suffix">${StatCard._esc(o.suffix)}</span>`;
		html += `</div>`;

		// Trend
		if (o.previousValue !== null) {
			const diff = o.value - o.previousValue;
			const pct = o.previousValue !== 0 ? ((diff / Math.abs(o.previousValue)) * 100).toFixed(1) : 0;
			const isUp = diff >= 0;

			html += `<div class="fv-sc-trend fv-sc-trend-${isUp ? 'up' : 'down'}">`;
			html += `<span class="fv-sc-trend-icon">${isUp ? '↑' : '↓'}</span>`;
			html += `<span class="fv-sc-trend-pct">${Math.abs(pct)}%</span>`;
			if (o.trendLabel) html += `<span class="fv-sc-trend-label">${StatCard._esc(o.trendLabel)}</span>`;
			html += `</div>`;
		}

		// Sparkline
		if (o.sparkline && o.sparkline.length > 1) {
			html += `<div class="fv-sc-sparkline">${StatCard._svgSparkline(o.sparkline)}</div>`;
		}

		// Description
		if (o.description) html += `<div class="fv-sc-desc">${StatCard._esc(o.description)}</div>`;

		this.el.innerHTML = html;

		// Animate value
		if (o.animate) this._animateValue();
	}

	_animateValue() {
		const numEl = this.el.querySelector('.fv-sc-number');
		if (!numEl) return;
		const target = this.o.value;
		if (typeof target !== 'number') return;

		const duration = 800;
		const start = performance.now();

		const tick = (now) => {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
			const current = Math.round(target * eased);
			numEl.textContent = StatCard._formatNum(current);
			if (progress < 1) requestAnimationFrame(tick);
		};

		requestAnimationFrame(tick);
	}

	setValue(val) {
		this.o.previousValue = this.o.value;
		this.o.value = val;
		this._render();
	}

	static _formatNum(n) {
		if (typeof n !== 'number') return n;
		return n.toLocaleString();
	}

	static _svgSparkline(data) {
		const w = 120, h = 32;
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const step = w / (data.length - 1);

		const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
		const fill = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
		const fillPath = `0,${h} ${fill} ${w},${h}`;

		return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
			<polygon points="${fillPath}" fill="var(--fv-sc-accent, rgba(99,102,241,0.1))" opacity="0.2"/>
			<polyline points="${points}" fill="none" stroke="var(--fv-sc-accent, #6366f1)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>`;
	}

	static _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
}
