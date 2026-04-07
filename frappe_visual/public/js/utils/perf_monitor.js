/**
 * Frappe Visual — Web Vitals & Memory Monitor
 * =============================================
 * Tracks CLS, LCP, FID, INP, FCP, TTFB + custom metrics.
 * Shows an optional HUD overlay for devs and logs
 * performance data to console / server.
 *
 * @module utils/perf_monitor
 * @since v0.2.0
 *
 * Usage:
 *   frappe.visual.perf.enable()       // start monitoring
 *   frappe.visual.perf.showHUD()      // toggle overlay
 *   frappe.visual.perf.report()       // get metrics snapshot
 *   frappe.visual.perf.mark("phase1") // custom timing mark
 */
(function () {
	"use strict";

	// ── State ──────────────────────────────────────────────────
	let _enabled = false;
	let _hudVisible = false;
	let _hudElement = null;
	let _rafId = null;
	const _metrics = {
		cls: 0,
		lcp: 0,
		fid: 0,
		inp: 0,
		fcp: 0,
		ttfb: 0,
		domNodes: 0,
		jsHeap: 0,
		jsHeapLimit: 0,
		fps: 0,
		longTasks: 0,
		customMarks: {},
	};
	const _observers = [];
	const _fpsBuffer = [];
	let _lastFrameTime = 0;

	// ── Thresholds (Google Web Vitals) ─────────────────────────
	const THRESHOLDS = {
		cls: { good: 0.1, poor: 0.25 },
		lcp: { good: 2500, poor: 4000 },
		fid: { good: 100, poor: 300 },
		inp: { good: 200, poor: 500 },
		fcp: { good: 1800, poor: 3000 },
		ttfb: { good: 800, poor: 1800 },
		fps: { good: 55, poor: 30 },
	};

	// ── Enable Monitoring ──────────────────────────────────────

	function enable() {
		if (_enabled) return;
		_enabled = true;

		_observeCLS();
		_observeLCP();
		_observeFID();
		_observeINP();
		_observeFCP();
		_observeTTFB();
		_observeLongTasks();
		_startFPSCounter();
		_startMemoryPolling();

		console.log("[FV Perf] Monitoring enabled");
		_emit("perf:enabled");
	}

	function disable() {
		_enabled = false;
		_observers.forEach((obs) => obs.disconnect?.());
		_observers.length = 0;
		if (_rafId) cancelAnimationFrame(_rafId);
		_rafId = null;
		hideHUD();
		_emit("perf:disabled");
	}

	// ── Core Web Vitals Observers ──────────────────────────────

	function _observeCLS() {
		if (!PerformanceObserver.supportedEntryTypes?.includes("layout-shift")) return;

		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (!entry.hadRecentInput) {
					_metrics.cls += entry.value;
				}
			}
		});
		observer.observe({ type: "layout-shift", buffered: true });
		_observers.push(observer);
	}

	function _observeLCP() {
		if (!PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) return;

		const observer = new PerformanceObserver((list) => {
			const entries = list.getEntries();
			if (entries.length) {
				_metrics.lcp = entries[entries.length - 1].startTime;
			}
		});
		observer.observe({ type: "largest-contentful-paint", buffered: true });
		_observers.push(observer);
	}

	function _observeFID() {
		if (!PerformanceObserver.supportedEntryTypes?.includes("first-input")) return;

		const observer = new PerformanceObserver((list) => {
			const entry = list.getEntries()[0];
			if (entry) _metrics.fid = entry.processingStart - entry.startTime;
		});
		observer.observe({ type: "first-input", buffered: true });
		_observers.push(observer);
	}

	function _observeINP() {
		if (!PerformanceObserver.supportedEntryTypes?.includes("event")) return;

		let maxDuration = 0;
		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.duration > maxDuration) {
					maxDuration = entry.duration;
					_metrics.inp = entry.duration;
				}
			}
		});
		observer.observe({ type: "event", buffered: true, durationThreshold: 16 });
		_observers.push(observer);
	}

	function _observeFCP() {
		if (!PerformanceObserver.supportedEntryTypes?.includes("paint")) return;

		const observer = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.name === "first-contentful-paint") {
					_metrics.fcp = entry.startTime;
				}
			}
		});
		observer.observe({ type: "paint", buffered: true });
		_observers.push(observer);
	}

	function _observeTTFB() {
		const nav = performance.getEntriesByType("navigation")[0];
		if (nav) _metrics.ttfb = nav.responseStart;
	}

	function _observeLongTasks() {
		if (!PerformanceObserver.supportedEntryTypes?.includes("longtask")) return;

		const observer = new PerformanceObserver((list) => {
			_metrics.longTasks += list.getEntries().length;
		});
		observer.observe({ type: "longtask" });
		_observers.push(observer);
	}

	// ── FPS Counter ────────────────────────────────────────────

	function _startFPSCounter() {
		function frame(now) {
			if (_lastFrameTime) {
				const delta = now - _lastFrameTime;
				_fpsBuffer.push(1000 / delta);
				if (_fpsBuffer.length > 60) _fpsBuffer.shift();
				_metrics.fps = Math.round(
					_fpsBuffer.reduce((a, b) => a + b, 0) / _fpsBuffer.length
				);
			}
			_lastFrameTime = now;
			if (_enabled) _rafId = requestAnimationFrame(frame);
		}
		_rafId = requestAnimationFrame(frame);
	}

	// ── Memory Polling ─────────────────────────────────────────

	function _startMemoryPolling() {
		setInterval(() => {
			if (!_enabled) return;

			// JS Heap (Chrome only)
			if (performance.memory) {
				_metrics.jsHeap = performance.memory.usedJSHeapSize;
				_metrics.jsHeapLimit = performance.memory.jsHeapSizeLimit;
			}

			// DOM node count
			_metrics.domNodes = document.querySelectorAll("*").length;

			// Update HUD if visible
			if (_hudVisible) _updateHUD();
		}, 2000);
	}

	// ── Custom Marks / Measures ────────────────────────────────

	/**
	 * Start a custom timing mark.
	 * @param {string} name
	 */
	function mark(name) {
		performance.mark(`fv-${name}`);
		_metrics.customMarks[name] = { start: performance.now() };
	}

	/**
	 * End a custom timing mark and return duration.
	 * @param {string} name
	 * @returns {number} duration in ms
	 */
	function measure(name) {
		const markData = _metrics.customMarks[name];
		if (!markData) return 0;

		performance.mark(`fv-${name}-end`);
		try {
			performance.measure(`fv-${name}`, `fv-${name}`, `fv-${name}-end`);
		} catch { /* ignore */ }

		const duration = performance.now() - markData.start;
		markData.duration = duration;
		return duration;
	}

	// ── HUD Overlay ────────────────────────────────────────────

	function showHUD() {
		if (_hudVisible) return;
		_hudVisible = true;

		if (!_enabled) enable();

		_hudElement = document.createElement("div");
		_hudElement.className = "fv-perf-hud";
		_hudElement.setAttribute("data-fv-no-export", "");
		document.body.appendChild(_hudElement);
		_updateHUD();
	}

	function hideHUD() {
		_hudVisible = false;
		if (_hudElement) {
			_hudElement.remove();
			_hudElement = null;
		}
	}

	function toggleHUD() {
		_hudVisible ? hideHUD() : showHUD();
	}

	function _updateHUD() {
		if (!_hudElement) return;

		const heap = _metrics.jsHeap
			? `${(_metrics.jsHeap / 1048576).toFixed(1)}MB / ${(_metrics.jsHeapLimit / 1048576).toFixed(0)}MB`
			: "N/A";

		_hudElement.innerHTML = `
			<div class="fv-perf-hud__header">⚡ Perf Monitor</div>
			<div class="fv-perf-hud__row">
				<span>FPS</span>
				<span class="${_grade("fps", _metrics.fps)}">${_metrics.fps}</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>CLS</span>
				<span class="${_grade("cls", _metrics.cls)}">${_metrics.cls.toFixed(3)}</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>LCP</span>
				<span class="${_grade("lcp", _metrics.lcp)}">${(_metrics.lcp / 1000).toFixed(2)}s</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>FID</span>
				<span class="${_grade("fid", _metrics.fid)}">${_metrics.fid.toFixed(0)}ms</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>INP</span>
				<span class="${_grade("inp", _metrics.inp)}">${_metrics.inp.toFixed(0)}ms</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>DOM</span>
				<span>${_metrics.domNodes.toLocaleString()}</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>Heap</span>
				<span>${heap}</span>
			</div>
			<div class="fv-perf-hud__row">
				<span>Long Tasks</span>
				<span>${_metrics.longTasks}</span>
			</div>
		`;
	}

	function _grade(metric, value) {
		const t = THRESHOLDS[metric];
		if (!t) return "";
		if (metric === "fps") {
			return value >= t.good ? "fv-perf-good" : value >= t.poor ? "fv-perf-avg" : "fv-perf-poor";
		}
		return value <= t.good ? "fv-perf-good" : value <= t.poor ? "fv-perf-avg" : "fv-perf-poor";
	}

	// ── Report ─────────────────────────────────────────────────

	/**
	 * Get a snapshot of all metrics.
	 * @returns {Object}
	 */
	function report() {
		return {
			timestamp: new Date().toISOString(),
			url: window.location.href,
			userAgent: navigator.userAgent,
			vitals: {
				cls: _metrics.cls,
				lcp: _metrics.lcp,
				fid: _metrics.fid,
				inp: _metrics.inp,
				fcp: _metrics.fcp,
				ttfb: _metrics.ttfb,
			},
			runtime: {
				fps: _metrics.fps,
				domNodes: _metrics.domNodes,
				jsHeapMB: _metrics.jsHeap ? (_metrics.jsHeap / 1048576).toFixed(1) : null,
				longTasks: _metrics.longTasks,
			},
			customMarks: { ..._metrics.customMarks },
		};
	}

	function _emit(event, data) {
		if (frappe.visual.eventBus?.emit) {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	// ── Inject HUD Styles ──────────────────────────────────────
	const style = document.createElement("style");
	style.textContent = `
		.fv-perf-hud {
			position: fixed;
			bottom: 12px;
			inset-inline-end: 12px;
			z-index: 99999;
			background: rgba(15, 23, 42, 0.92);
			backdrop-filter: blur(8px);
			color: #e2e8f0;
			font-family: "JetBrains Mono", "Fira Code", monospace;
			font-size: 11px;
			padding: 10px 14px;
			border-radius: 10px;
			min-width: 180px;
			box-shadow: 0 4px 24px rgba(0,0,0,0.3);
			pointer-events: auto;
			user-select: none;
		}
		.fv-perf-hud__header {
			font-weight: 700;
			font-size: 12px;
			margin-bottom: 6px;
			padding-bottom: 4px;
			border-bottom: 1px solid rgba(255,255,255,0.1);
		}
		.fv-perf-hud__row {
			display: flex;
			justify-content: space-between;
			padding: 2px 0;
		}
		.fv-perf-good { color: #4ade80; }
		.fv-perf-avg { color: #fbbf24; }
		.fv-perf-poor { color: #f87171; }
	`;
	document.head.appendChild(style);

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.perf");

	Object.assign(frappe.visual.perf, {
		THRESHOLDS,

		enable,
		disable,
		showHUD,
		hideHUD,
		toggleHUD,
		mark,
		measure,
		report,

		/** Get current metrics (live reference). */
		get metrics() { return _metrics; },

		/** Whether monitoring is active. */
		get enabled() { return _enabled; },
	});

	console.log(
		"%c⬡ FV Perf%c ready — enable() · showHUD() · mark() · report()",
		"color:#22c55e;font-weight:bold",
		"color:#94a3b8"
	);
})();
