// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Data Storytelling
 * ====================================
 * Scrollytelling engine that syncs narrative text with animated data reveals.
 * Chapters scroll into view and trigger chart/number animations, annotations,
 * and call-out effects. Perfect for executive reports, onboarding, and
 * data-driven presentations.
 *
 * Features:
 *  - Chapter-based structure with scroll-triggered animations
 *  - Animated number counters (count-up)
 *  - Chart reveals (fade + draw) synced to scroll position
 *  - Annotation call-outs with pointer lines
 *  - Sticky chart panels that update per chapter
 *  - Progress indicator (breadcrumb or linear)
 *  - Auto-play / manual scroll modes
 *  - Keyboard navigation (↑↓ Space)
 *  - Print-friendly static fallback
 *  - RTL / dark mode / glass theme
 *
 * API:
 *   frappe.visual.DataStorytelling.create('#el', { chapters: [...] })
 *
 * @module frappe_visual/components/data_storytelling
 */

export class DataStorytelling {
	constructor(container, opts = {}) {
		this.container = typeof container === "string" ? document.querySelector(container) : container;
		if (!this.container) throw new Error("DataStorytelling: container not found");

		this.opts = Object.assign({
			theme: "glass",
			chapters: [],        // { title, body, chartType?, chartData?, metric?, annotation? }
			autoPlay: false,
			autoPlayDelay: 5000,
			showProgress: true,
			stickyChart: true,   // chart stays in view while text scrolls
			animationDuration: 0.8,
			countUpDuration: 2000,
		}, opts);

		this.currentChapter = -1;
		this._observers = [];
		this._autoTimer = null;
		this._init();
	}

	static create(container, opts = {}) { return new DataStorytelling(container, opts); }

	/* ── Init ────────────────────────────────────────────────── */
	_init() {
		this.container.classList.add("fv-ds", `fv-ds--${this.opts.theme}`);
		this.container.setAttribute("tabindex", "0");
		this.container.innerHTML = "";

		if (this.opts.showProgress) this._renderProgress();
		this._renderStory();
		this._setupScrollObserver();
		this._setupKeyboard();

		if (this.opts.autoPlay) this._startAutoPlay();
	}

	/* ── Progress bar ────────────────────────────────────────── */
	_renderProgress() {
		const bar = document.createElement("div");
		bar.className = "fv-ds-progress";
		bar.innerHTML = this.opts.chapters.map((ch, i) => `
			<button class="fv-ds-progress-dot ${i === 0 ? "active" : ""}"
				data-idx="${i}" title="${this._esc(ch.title || `Chapter ${i + 1}`)}">
				<span class="fv-ds-dot-inner"></span>
			</button>`).join(`<span class="fv-ds-progress-line"></span>`);
		this.container.appendChild(bar);

		bar.querySelectorAll(".fv-ds-progress-dot").forEach(btn => {
			btn.addEventListener("click", () => {
				const idx = parseInt(btn.dataset.idx);
				this._scrollToChapter(idx);
			});
		});
	}

	/* ── Story Layout ────────────────────────────────────────── */
	_renderStory() {
		const story = document.createElement("div");
		story.className = "fv-ds-story";

		this.opts.chapters.forEach((ch, i) => {
			const section = document.createElement("section");
			section.className = "fv-ds-chapter";
			section.dataset.idx = i;

			// Left: narrative
			const narrative = document.createElement("div");
			narrative.className = "fv-ds-narrative";

			// Chapter number
			const num = document.createElement("div");
			num.className = "fv-ds-chapter-num";
			num.textContent = String(i + 1).padStart(2, "0");
			narrative.appendChild(num);

			// Title
			if (ch.title) {
				const h = document.createElement("h2");
				h.className = "fv-ds-title";
				h.textContent = ch.title;
				narrative.appendChild(h);
			}

			// Metric hero number
			if (ch.metric) {
				const m = document.createElement("div");
				m.className = "fv-ds-metric";
				m.innerHTML = `
					<span class="fv-ds-metric-value" data-target="${ch.metric.value}">0</span>
					${ch.metric.suffix ? `<span class="fv-ds-metric-suffix">${this._esc(ch.metric.suffix)}</span>` : ""}
					${ch.metric.label ? `<span class="fv-ds-metric-label">${this._esc(ch.metric.label)}</span>` : ""}`;
				narrative.appendChild(m);
			}

			// Body text (supports markdown-light: **bold**, *italic*)
			if (ch.body) {
				const body = document.createElement("div");
				body.className = "fv-ds-body";
				body.innerHTML = this._renderMarkdown(ch.body);
				narrative.appendChild(body);
			}

			// Annotation
			if (ch.annotation) {
				const ann = document.createElement("div");
				ann.className = "fv-ds-annotation";
				ann.innerHTML = `<span class="fv-ds-annotation-icon">💡</span>
					<span>${this._esc(ch.annotation)}</span>`;
				narrative.appendChild(ann);
			}

			section.appendChild(narrative);

			// Right: visual (chart placeholder)
			if (ch.chartType || ch.visual) {
				const viz = document.createElement("div");
				viz.className = "fv-ds-visual";
				viz.dataset.chapterIdx = i;

				if (ch.visual) {
					// Custom HTML
					viz.innerHTML = ch.visual;
				}
				section.appendChild(viz);
			}

			story.appendChild(section);
		});

		this.container.appendChild(story);
		this._story = story;
	}

	/* ── Scroll Observer ─────────────────────────────────────── */
	_setupScrollObserver() {
		const chapters = this.container.querySelectorAll(".fv-ds-chapter");

		const io = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const idx = parseInt(entry.target.dataset.idx);
					if (idx !== this.currentChapter) {
						this._activateChapter(idx);
					}
				}
			}
		}, {
			root: null,
			threshold: 0.4,
		});

		chapters.forEach(ch => io.observe(ch));
		this._observers.push(io);
	}

	/* ── Chapter Activation ──────────────────────────────────── */
	_activateChapter(idx) {
		const prev = this.currentChapter;
		this.currentChapter = idx;
		const chapter = this.opts.chapters[idx];
		if (!chapter) return;

		// Update progress
		this.container.querySelectorAll(".fv-ds-progress-dot").forEach((d, i) => {
			d.classList.toggle("active", i === idx);
			d.classList.toggle("past", i < idx);
		});

		// Animate section in
		const section = this.container.querySelectorAll(".fv-ds-chapter")[idx];
		if (section) {
			section.classList.add("fv-ds-chapter--active");
			this._animateIn(section);
		}

		// De-activate previous
		if (prev >= 0 && prev !== idx) {
			const prevSection = this.container.querySelectorAll(".fv-ds-chapter")[prev];
			if (prevSection) prevSection.classList.remove("fv-ds-chapter--active");
		}

		// Count-up metric
		const metricEl = section?.querySelector(".fv-ds-metric-value");
		if (metricEl) this._countUp(metricEl);

		// Render chart if needed
		this._renderChapterChart(idx);

		this.container.dispatchEvent(new CustomEvent("fv-ds-chapter-change", { detail: { index: idx, chapter } }));
	}

	/* ── Count-Up Animation ──────────────────────────────────── */
	_countUp(el) {
		const target = parseFloat(el.dataset.target) || 0;
		const duration = this.opts.countUpDuration;
		const isFloat = target !== Math.floor(target);
		const start = performance.now();

		const tick = (now) => {
			const elapsed = now - start;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
			const current = target * eased;
			el.textContent = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString();
			if (progress < 1) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	/* ── Chapter Chart ───────────────────────────────────────── */
	_renderChapterChart(idx) {
		const ch = this.opts.chapters[idx];
		if (!ch.chartType || !ch.chartData) return;

		const viz = this.container.querySelector(`.fv-ds-visual[data-chapter-idx="${idx}"]`);
		if (!viz) return;

		// Use ECharts if available
		if (window.echarts && viz.clientWidth > 0) {
			let chart = echarts.getInstanceByDom(viz);
			if (!chart) chart = echarts.init(viz, null, { renderer: "svg" });

			const option = this._buildChartOption(ch.chartType, ch.chartData, ch.chartOptions);
			chart.setOption(option, true);
		} else {
			// Fallback: simple bar chart via SVG
			viz.innerHTML = this._svgBarFallback(ch.chartData);
		}
	}

	_buildChartOption(type, data, extra = {}) {
		const base = {
			animation: true,
			animationDuration: 800,
			animationEasing: "cubicOut",
			grid: { left: 40, right: 20, top: 20, bottom: 30 },
			tooltip: { trigger: "axis" },
		};

		if (type === "bar" || type === "line" || type === "area") {
			return {
				...base,
				xAxis: { type: "category", data: data.labels || [] },
				yAxis: { type: "value" },
				series: [{ type: type === "area" ? "line" : type, data: data.values || [],
					areaStyle: type === "area" ? { opacity: 0.3 } : undefined,
					itemStyle: { color: "#6366F1" } }],
				...extra,
			};
		}
		if (type === "pie") {
			return {
				...base,
				series: [{ type: "pie", radius: ["30%", "60%"],
					data: (data.labels || []).map((l, i) => ({ name: l, value: (data.values || [])[i] })) }],
				...extra,
			};
		}
		return { ...base, ...extra };
	}

	_svgBarFallback(data) {
		if (!data?.values?.length) return "";
		const vals = data.values;
		const max = Math.max(...vals) || 1;
		const w = 100 / vals.length;
		return `<svg class="fv-ds-svg-bars" viewBox="0 0 100 40" preserveAspectRatio="none">
			${vals.map((v, i) => {
				const h = (v / max) * 36;
				return `<rect x="${i * w + 1}" y="${40 - h}" width="${w - 2}" height="${h}"
					fill="var(--fv-ds-bar, #6366F1)" rx="1"/>`;
			}).join("")}
		</svg>`;
	}

	/* ── Animate In ──────────────────────────────────────────── */
	_animateIn(section) {
		if (typeof gsap !== "undefined") {
			gsap.fromTo(section.querySelector(".fv-ds-narrative"),
				{ opacity: 0, y: 30 },
				{ opacity: 1, y: 0, duration: this.opts.animationDuration, ease: "power2.out" }
			);
			const viz = section.querySelector(".fv-ds-visual");
			if (viz) {
				gsap.fromTo(viz,
					{ opacity: 0, scale: 0.95 },
					{ opacity: 1, scale: 1, duration: this.opts.animationDuration, delay: 0.2, ease: "power2.out" }
				);
			}
		}
	}

	/* ── Keyboard ────────────────────────────────────────────── */
	_setupKeyboard() {
		this.container.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown" || e.key === " ") {
				e.preventDefault();
				this._scrollToChapter(Math.min(this.currentChapter + 1, this.opts.chapters.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				this._scrollToChapter(Math.max(this.currentChapter - 1, 0));
			}
		});
	}

	_scrollToChapter(idx) {
		const section = this.container.querySelectorAll(".fv-ds-chapter")[idx];
		if (section) section.scrollIntoView({ behavior: "smooth", block: "center" });
	}

	/* ── Auto-play ───────────────────────────────────────────── */
	_startAutoPlay() {
		this._autoTimer = setInterval(() => {
			const next = this.currentChapter + 1;
			if (next < this.opts.chapters.length) {
				this._scrollToChapter(next);
			} else {
				this._stopAutoPlay();
			}
		}, this.opts.autoPlayDelay);
	}

	_stopAutoPlay() {
		if (this._autoTimer) clearInterval(this._autoTimer);
		this._autoTimer = null;
	}

	/* ── Helpers ──────────────────────────────────────────────── */
	_renderMarkdown(text) {
		return text
			.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.+?)\*/g, "<em>$1</em>")
			.replace(/\n/g, "<br>");
	}

	_esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

	goTo(idx) { this._scrollToChapter(idx); }
	next() { this.goTo(this.currentChapter + 1); }
	prev() { this.goTo(this.currentChapter - 1); }

	destroy() {
		this._stopAutoPlay();
		this._observers.forEach(o => o.disconnect());
		this.container.innerHTML = "";
		this.container.classList.remove("fv-ds", `fv-ds--${this.opts.theme}`);
	}
}
