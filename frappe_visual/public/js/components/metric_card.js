/**
 * Frappe Visual — MetricCard
 * ============================
 * Beautiful KPI metric cards with inline sparklines, trend indicators,
 * delta comparison, target progress, and animated value counters.
 * Supports single card or responsive grid of multiple cards.
 *
 * Usage:
 *   frappe.visual.MetricCard.create('#el', {
 *     metrics: [
 *       { label: 'Revenue', value: 125000, prefix: '$', trend: 12.5,
 *         sparkline: [80,95,110,105,120,125], target: 150000 },
 *       { label: 'Orders', value: 342, trend: -3.2, suffix: ' orders' },
 *     ]
 *   })
 *
 * @module frappe_visual/components/metric_card
 */

export class MetricCard {
	constructor(container, opts = {}) {
		this.container = typeof container === "string"
			? document.querySelector(container) : container;
		if (!this.container) throw new Error("MetricCard: container not found");

		this.opts = Object.assign({
			theme: "glass",            // glass | flat | minimal
			metrics: [],
			columns: 0,               // 0 = auto-fit
			animate: true,
			animDuration: 1200,
			sparkHeight: 36,
			sparkWidth: 80,
			showTarget: true,
			showTrend: true,
			showSparkline: true,
			onClick: null,
			compactMode: false,
		}, opts);

		this._init();
	}

	static create(container, opts = {}) { return new MetricCard(container, opts); }

	_init() {
		this.container.classList.add("fv-mc", `fv-mc--${this.opts.theme}`);
		if (this.opts.compactMode) this.container.classList.add("fv-mc--compact");
		this._render();
	}

	_render() {
		this.container.innerHTML = "";

		const grid = document.createElement("div");
		grid.className = "fv-mc-grid";
		if (this.opts.columns > 0) {
			grid.style.gridTemplateColumns = `repeat(${this.opts.columns}, 1fr)`;
		}
		this.container.appendChild(grid);

		for (const m of this.opts.metrics) {
			grid.appendChild(this._renderCard(m));
		}
	}

	_renderCard(m) {
		const card = document.createElement("div");
		card.className = "fv-mc-card";
		if (m.color) card.style.setProperty("--mc-accent", m.color);

		// Icon
		const iconHtml = m.icon ? `<div class="fv-mc-icon">${this._esc(m.icon)}</div>` : "";

		// Value with optional prefix/suffix
		const prefix = m.prefix || "";
		const suffix = m.suffix || "";
		const formattedVal = this._formatNumber(m.value);

		// Trend arrow
		let trendHtml = "";
		if (this.opts.showTrend && m.trend !== undefined && m.trend !== null) {
			const up = m.trend >= 0;
			const trendColor = (m.invertTrend ? !up : up) ? "#10b981" : "#ef4444";
			const arrow = up ? "↑" : "↓";
			trendHtml = `<span class="fv-mc-trend" style="color:${trendColor}">${arrow} ${Math.abs(m.trend).toFixed(1)}%</span>`;
		}

		// Sparkline SVG
		let sparkHtml = "";
		if (this.opts.showSparkline && m.sparkline && m.sparkline.length > 1) {
			sparkHtml = this._renderSparkline(m.sparkline, m.color || "#6366f1");
		}

		// Target progress bar
		let targetHtml = "";
		if (this.opts.showTarget && m.target && m.target > 0) {
			const pct = Math.min(100, (m.value / m.target) * 100);
			const pctColor = pct >= 100 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";
			targetHtml = `
				<div class="fv-mc-target">
					<div class="fv-mc-target-bar"><div class="fv-mc-target-fill" style="width:${pct.toFixed(0)}%;background:${pctColor}"></div></div>
					<span class="fv-mc-target-text">${pct.toFixed(0)}% ${__("of")} ${prefix}${this._formatNumber(m.target)}${suffix}</span>
				</div>`;
		}

		// Delta comparison
		let deltaHtml = "";
		if (m.previousValue !== undefined) {
			const delta = m.value - m.previousValue;
			const deltaSign = delta >= 0 ? "+" : "";
			deltaHtml = `<span class="fv-mc-delta">${deltaSign}${this._formatNumber(delta)} ${m.deltaLabel || __("vs last period")}</span>`;
		}

		card.innerHTML = `
			<div class="fv-mc-top">
				${iconHtml}
				<div class="fv-mc-label">${this._esc(m.label || "")}</div>
				${sparkHtml}
			</div>
			<div class="fv-mc-value-row">
				<span class="fv-mc-value" data-target="${m.value}" data-prefix="${this._esc(prefix)}" data-suffix="${this._esc(suffix)}">
					${prefix}${formattedVal}${suffix}
				</span>
				${trendHtml}
			</div>
			${deltaHtml}
			${targetHtml}
			${m.subtitle ? `<div class="fv-mc-subtitle">${this._esc(m.subtitle)}</div>` : ""}`;

		if (this.opts.onClick) {
			card.style.cursor = "pointer";
			card.addEventListener("click", () => this.opts.onClick(m));
		}

		// Animate counter
		if (this.opts.animate && typeof m.value === "number") {
			requestAnimationFrame(() => this._animateValue(card.querySelector(".fv-mc-value"), m.value, prefix, suffix));
		}

		return card;
	}

	_renderSparkline(data, color) {
		const w = this.opts.sparkWidth;
		const h = this.opts.sparkHeight;
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const stepX = w / (data.length - 1);

		const points = data.map((v, i) => {
			const x = i * stepX;
			const y = h - ((v - min) / range) * (h - 4) - 2;
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		}).join(" ");

		// Gradient fill
		const fillPoints = `0,${h} ${points} ${w},${h}`;

		return `<svg class="fv-mc-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
			<defs><linearGradient id="mcg_${color.replace("#","")}" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
				<stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
			</linearGradient></defs>
			<polygon points="${fillPoints}" fill="url(#mcg_${color.replace("#","")})" />
			<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			<circle cx="${(data.length-1)*stepX}" cy="${h - ((data[data.length-1]-min)/range)*(h-4)-2}" r="2.5" fill="${color}"/>
		</svg>`;
	}

	_animateValue(el, target, prefix, suffix) {
		if (!el) return;
		const duration = this.opts.animDuration;
		const start = performance.now();
		const from = 0;

		const step = (now) => {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			// Ease out cubic
			const eased = 1 - Math.pow(1 - progress, 3);
			const current = from + (target - from) * eased;
			el.textContent = `${prefix}${this._formatNumber(Math.round(current))}${suffix}`;
			if (progress < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	}

	_formatNumber(n) {
		if (typeof n !== "number") return String(n);
		if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B";
		if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
		if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + "K";
		return n.toLocaleString();
	}

	/* ── Public API ──────────────────────────────────────────── */
	setMetrics(metrics) { this.opts.metrics = metrics; this._render(); }
	updateMetric(index, updates) {
		if (this.opts.metrics[index]) {
			Object.assign(this.opts.metrics[index], updates);
			this._render();
		}
	}
	getMetrics() { return JSON.parse(JSON.stringify(this.opts.metrics)); }

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	destroy() {
		this.container.innerHTML = "";
		this.container.classList.remove("fv-mc", `fv-mc--${this.opts.theme}`, "fv-mc--compact");
	}
}
