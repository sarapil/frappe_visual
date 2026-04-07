/**
 * Frappe Visual — Responsive Design System
 * ==========================================
 * Centralized breakpoint management, container queries,
 * and responsive component variants for 307+ components.
 *
 * @module utils/responsive_system
 * @since v0.2.0
 *
 * Usage:
 *   frappe.visual.responsive.current   → "desktop"
 *   frappe.visual.responsive.on("mobile", fn)
 *   frappe.visual.responsive.observe(el, callback)
 *   frappe.visual.responsive.isMobile  → true/false
 */
(function () {
	"use strict";

	// ── Named Breakpoints ─────────────────────────────────────
	const BREAKPOINTS = {
		xs: 0,      // Extra small phones (portrait)
		sm: 480,    // Small phones (landscape)
		md: 768,    // Tablets (portrait)
		lg: 1024,   // Tablets (landscape) / small laptops
		xl: 1280,   // Desktops
		xxl: 1536,  // Large desktops / ultrawide
	};

	// Named aliases for semantic usage
	const ALIASES = {
		mobile: "xs",      // 0–479
		phone: "sm",       // 480–767
		tablet: "md",      // 768–1023
		laptop: "lg",      // 1024–1279
		desktop: "xl",     // 1280–1535
		widescreen: "xxl", // 1536+
	};

	// ── Responsive Variants Config ────────────────────────────
	// Map breakpoint → layout adaptation
	const LAYOUT_VARIANTS = {
		xs: { columns: 1, sidebarVisible: false, compactMode: true, touchTargetMin: 44 },
		sm: { columns: 1, sidebarVisible: false, compactMode: true, touchTargetMin: 44 },
		md: { columns: 2, sidebarVisible: true, compactMode: false, touchTargetMin: 40 },
		lg: { columns: 3, sidebarVisible: true, compactMode: false, touchTargetMin: 36 },
		xl: { columns: 4, sidebarVisible: true, compactMode: false, touchTargetMin: 32 },
		xxl: { columns: 6, sidebarVisible: true, compactMode: false, touchTargetMin: 32 },
	};

	// ── State ──────────────────────────────────────────────────
	let _current = "xl";
	let _previous = null;
	const _listeners = {};          // breakpoint → Set<fn>
	const _rangeListeners = [];     // { min, max, fn, active }
	const _changeListeners = new Set();
	const _observedElements = new Map(); // element → { observer, callback }
	let _mediaQueries = {};         // breakpoint → MediaQueryList
	let _initialized = false;

	// ── Breakpoint Detection ───────────────────────────────────
	function _detectBreakpoint() {
		const w = window.innerWidth;
		const keys = Object.keys(BREAKPOINTS);
		for (let i = keys.length - 1; i >= 0; i--) {
			if (w >= BREAKPOINTS[keys[i]]) return keys[i];
		}
		return "xs";
	}

	function _setupMediaQueries() {
		const keys = Object.keys(BREAKPOINTS);
		keys.forEach((bp, i) => {
			const min = BREAKPOINTS[bp];
			const max = i < keys.length - 1 ? BREAKPOINTS[keys[i + 1]] - 1 : Infinity;
			const query = max === Infinity
				? `(min-width: ${min}px)`
				: `(min-width: ${min}px) and (max-width: ${max}px)`;

			const mql = window.matchMedia(query);
			_mediaQueries[bp] = mql;

			const handler = (e) => {
				if (e.matches) {
					_previous = _current;
					_current = bp;
					_notifyListeners(bp);
				}
			};

			// Modern API
			if (mql.addEventListener) {
				mql.addEventListener("change", handler);
			} else {
				mql.addListener(handler);
			}
		});
	}

	function _notifyListeners(bp) {
		// Specific breakpoint listeners
		if (_listeners[bp]) {
			_listeners[bp].forEach((fn) => {
				try { fn({ breakpoint: bp, previous: _previous, variant: LAYOUT_VARIANTS[bp] }); }
				catch (e) { console.error("[FV Responsive] Listener error:", e); }
			});
		}

		// Alias listeners (e.g., "mobile")
		Object.entries(ALIASES).forEach(([alias, target]) => {
			if (target === bp && _listeners[alias]) {
				_listeners[alias].forEach((fn) => {
					try { fn({ breakpoint: bp, alias, previous: _previous, variant: LAYOUT_VARIANTS[bp] }); }
					catch (e) { console.error("[FV Responsive] Alias listener error:", e); }
				});
			}
		});

		// Range listeners
		const width = BREAKPOINTS[bp];
		_rangeListeners.forEach((rl) => {
			const inRange = width >= rl.min && (rl.max === Infinity || width <= rl.max);
			if (inRange && !rl.active) {
				rl.active = true;
				try { rl.fn({ enter: true, breakpoint: bp, width }); }
				catch (e) { console.error("[FV Responsive] Range listener error:", e); }
			} else if (!inRange && rl.active) {
				rl.active = false;
				try { rl.fn({ enter: false, breakpoint: bp, width }); }
				catch (e) { console.error("[FV Responsive] Range listener error:", e); }
			}
		});

		// Global change listeners
		_changeListeners.forEach((fn) => {
			try { fn({ breakpoint: bp, previous: _previous, variant: LAYOUT_VARIANTS[bp] }); }
			catch (e) { console.error("[FV Responsive] Change listener error:", e); }
		});

		// Set CSS class on body
		_updateBodyClass(bp);

		// Emit on EventBus if available
		if (frappe.visual.eventBus && typeof frappe.visual.eventBus.emit === "function") {
			frappe.visual.eventBus.emit("responsive:change", {
				breakpoint: bp,
				previous: _previous,
				variant: LAYOUT_VARIANTS[bp],
			});
		}
	}

	function _updateBodyClass(bp) {
		const body = document.body;
		// Remove all breakpoint classes
		Object.keys(BREAKPOINTS).forEach((k) => body.classList.remove(`fv-bp-${k}`));
		Object.keys(ALIASES).forEach((k) => body.classList.remove(`fv-${k}`));
		// Add current
		body.classList.add(`fv-bp-${bp}`);
		// Add semantic aliases
		Object.entries(ALIASES).forEach(([alias, target]) => {
			if (target === bp) body.classList.add(`fv-${alias}`);
		});
		// Add touch/pointer class
		if (BREAKPOINTS[bp] < BREAKPOINTS.lg) {
			body.classList.add("fv-touch");
			body.classList.remove("fv-pointer");
		} else {
			body.classList.remove("fv-touch");
			body.classList.add("fv-pointer");
		}
		// Compact mode data attribute
		body.dataset.fvCompact = LAYOUT_VARIANTS[bp].compactMode ? "1" : "0";
	}

	// ── Container Query Polyfill ───────────────────────────────
	// Uses ResizeObserver to simulate container-query behavior
	// for components that need to adapt to their container, not viewport.
	function _observeContainer(element, callback, options = {}) {
		if (!element || !(element instanceof Element)) {
			console.warn("[FV Responsive] observe: invalid element");
			return null;
		}

		const breakpoints = options.breakpoints || {
			compact: 0,
			normal: 400,
			wide: 700,
			full: 1000,
		};

		const detectContainerSize = (width, height) => {
			const keys = Object.keys(breakpoints);
			let matched = keys[0];
			for (let i = keys.length - 1; i >= 0; i--) {
				if (width >= breakpoints[keys[i]]) {
					matched = keys[i];
					break;
				}
			}
			return matched;
		};

		let lastSize = null;
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				const size = detectContainerSize(width, height);
				if (size !== lastSize) {
					lastSize = size;
					// Update data attribute
					element.dataset.fvContainer = size;
					// Remove old size classes
					Object.keys(breakpoints).forEach((k) =>
						element.classList.remove(`fv-container-${k}`)
					);
					element.classList.add(`fv-container-${size}`);
					// Notify
					try {
						callback({
							size,
							width,
							height,
							element,
							breakpoints,
						});
					} catch (e) {
						console.error("[FV Responsive] Container observer error:", e);
					}
				}
			}
		});

		observer.observe(element);
		_observedElements.set(element, { observer, callback });

		// Return cleanup function
		return () => {
			observer.disconnect();
			_observedElements.delete(element);
		};
	}

	// ── Responsive Grid Helper ─────────────────────────────────
	function _responsiveGrid(container, options = {}) {
		const {
			minItemWidth = 280,
			gap = 16,
			maxColumns = 6,
		} = options;

		if (!container) return null;

		// Set CSS grid with auto-fit
		container.style.display = "grid";
		container.style.gap = `${gap}px`;
		container.style.gridTemplateColumns =
			`repeat(auto-fit, minmax(min(${minItemWidth}px, 100%), 1fr))`;

		// Observe container for column count updates
		return _observeContainer(container, ({ width }) => {
			const cols = Math.min(
				Math.max(1, Math.floor((width + gap) / (minItemWidth + gap))),
				maxColumns
			);
			container.dataset.fvColumns = cols;
			container.style.gridTemplateColumns =
				`repeat(${cols}, 1fr)`;
		});
	}

	// ── Touch Detection ────────────────────────────────────────
	let _hasTouch = false;
	let _hasMouse = false;

	function _detectInputModes() {
		_hasTouch = "ontouchstart" in window ||
			navigator.maxTouchPoints > 0 ||
			window.matchMedia("(pointer: coarse)").matches;

		_hasMouse = window.matchMedia("(pointer: fine)").matches;

		document.body.classList.toggle("fv-has-touch", _hasTouch);
		document.body.classList.toggle("fv-has-mouse", _hasMouse);
	}

	// ── Orientation Detection ──────────────────────────────────
	let _orientation = "landscape";

	function _detectOrientation() {
		if (screen.orientation) {
			_orientation = screen.orientation.type.includes("portrait")
				? "portrait"
				: "landscape";
		} else {
			_orientation = window.innerHeight > window.innerWidth
				? "portrait"
				: "landscape";
		}
		document.body.dataset.fvOrientation = _orientation;
	}

	function _setupOrientationListener() {
		if (screen.orientation) {
			screen.orientation.addEventListener("change", () => {
				_detectOrientation();
				_changeListeners.forEach((fn) => {
					try {
						fn({
							breakpoint: _current,
							previous: _previous,
							variant: LAYOUT_VARIANTS[_current],
							orientation: _orientation,
						});
					} catch (e) { /* ignore */ }
				});
			});
		} else {
			window.addEventListener("orientationchange", () => {
				setTimeout(() => {
					_detectOrientation();
				}, 100);
			});
		}
	}

	// ── Responsive Image Helper ────────────────────────────────
	function _responsiveImage(img, sources = {}) {
		// sources: { xs: "url", md: "url", xl: "url" }
		const updateSrc = () => {
			const keys = Object.keys(BREAKPOINTS);
			for (let i = keys.indexOf(_current); i >= 0; i--) {
				if (sources[keys[i]]) {
					img.src = sources[keys[i]];
					return;
				}
			}
		};
		updateSrc();
		_changeListeners.add(updateSrc);
		return () => _changeListeners.delete(updateSrc);
	}

	// ── Visibility Helper ──────────────────────────────────────
	function _showOnlyAt(element, breakpoints) {
		// breakpoints: ["md", "lg", "xl"] or "md+" or "md-lg"
		if (typeof breakpoints === "string") {
			breakpoints = _parseBreakpointRange(breakpoints);
		}
		const update = () => {
			const visible = breakpoints.includes(_current);
			element.style.display = visible ? "" : "none";
			element.setAttribute("aria-hidden", !visible);
		};
		update();
		_changeListeners.add(update);
		return () => _changeListeners.delete(update);
	}

	function _parseBreakpointRange(range) {
		const keys = Object.keys(BREAKPOINTS);
		if (range.endsWith("+")) {
			const start = range.slice(0, -1);
			const idx = keys.indexOf(start);
			return idx >= 0 ? keys.slice(idx) : [start];
		}
		if (range.includes("-")) {
			const [start, end] = range.split("-");
			const s = keys.indexOf(start);
			const e = keys.indexOf(end);
			return s >= 0 && e >= 0 ? keys.slice(s, e + 1) : [start, end];
		}
		return [range];
	}

	// ── Safe Area Insets (Notch / Dynamic Island) ──────────────
	function _getSafeAreaInsets() {
		const style = getComputedStyle(document.documentElement);
		return {
			top: parseInt(style.getPropertyValue("env(safe-area-inset-top)") || "0", 10),
			right: parseInt(style.getPropertyValue("env(safe-area-inset-right)") || "0", 10),
			bottom: parseInt(style.getPropertyValue("env(safe-area-inset-bottom)") || "0", 10),
			left: parseInt(style.getPropertyValue("env(safe-area-inset-left)") || "0", 10),
		};
	}

	// ── Init ───────────────────────────────────────────────────
	function init() {
		if (_initialized) return;
		_initialized = true;

		_current = _detectBreakpoint();
		_setupMediaQueries();
		_detectInputModes();
		_detectOrientation();
		_setupOrientationListener();
		_updateBodyClass(_current);

		// Re-detect on resize (debounced fallback for edge cases)
		let resizeTimer;
		window.addEventListener("resize", () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				_detectInputModes();
				_detectOrientation();
			}, 150);
		});

		console.log(
			`%c⬡ FV Responsive%c ${_current} · ${_orientation} · touch:${_hasTouch} · mouse:${_hasMouse}`,
			"color:#6366f1;font-weight:bold",
			"color:#94a3b8"
		);
	}

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.responsive");

	Object.defineProperties(frappe.visual.responsive, {
		current: { get: () => _current, enumerable: true },
		previous: { get: () => _previous, enumerable: true },
		orientation: { get: () => _orientation, enumerable: true },
		isMobile: { get: () => ["xs", "sm"].includes(_current), enumerable: true },
		isTablet: { get: () => _current === "md", enumerable: true },
		isDesktop: { get: () => ["lg", "xl", "xxl"].includes(_current), enumerable: true },
		isCompact: { get: () => LAYOUT_VARIANTS[_current].compactMode, enumerable: true },
		hasTouch: { get: () => _hasTouch, enumerable: true },
		hasMouse: { get: () => _hasMouse, enumerable: true },
		columns: { get: () => LAYOUT_VARIANTS[_current].columns, enumerable: true },
		variant: { get: () => ({ ...LAYOUT_VARIANTS[_current] }), enumerable: true },
	});

	Object.assign(frappe.visual.responsive, {
		BREAKPOINTS,
		ALIASES,
		LAYOUT_VARIANTS,

		init,

		/**
		 * Listen for a specific breakpoint activation.
		 * @param {string} breakpoint - "xs"|"sm"|"md"|"lg"|"xl"|"xxl" or alias "mobile"|"tablet"|"desktop"
		 * @param {Function} fn - callback({ breakpoint, previous, variant })
		 * @returns {Function} unsubscribe
		 */
		on(breakpoint, fn) {
			if (!_listeners[breakpoint]) _listeners[breakpoint] = new Set();
			_listeners[breakpoint].add(fn);
			return () => _listeners[breakpoint]?.delete(fn);
		},

		/**
		 * Listen for any breakpoint change.
		 * @param {Function} fn - callback({ breakpoint, previous, variant })
		 * @returns {Function} unsubscribe
		 */
		onChange(fn) {
			_changeListeners.add(fn);
			return () => _changeListeners.delete(fn);
		},

		/**
		 * Listen for a width range (enter/leave).
		 * @param {number} min - minimum width
		 * @param {number} max - maximum width (Infinity for open-ended)
		 * @param {Function} fn - callback({ enter, breakpoint, width })
		 * @returns {Function} unsubscribe
		 */
		onRange(min, max, fn) {
			const entry = { min, max, fn, active: false };
			// Check initial state
			const currentWidth = window.innerWidth;
			entry.active = currentWidth >= min && (max === Infinity || currentWidth <= max);
			_rangeListeners.push(entry);
			return () => {
				const idx = _rangeListeners.indexOf(entry);
				if (idx >= 0) _rangeListeners.splice(idx, 1);
			};
		},

		/**
		 * Observe a container element for size changes (container query polyfill).
		 * @param {Element} element - the container to observe
		 * @param {Function} callback - callback({ size, width, height, element })
		 * @param {Object} [options] - { breakpoints: { compact: 0, normal: 400, wide: 700 } }
		 * @returns {Function} cleanup
		 */
		observe: _observeContainer,

		/**
		 * Auto-create responsive CSS grid on a container.
		 * @param {Element} container
		 * @param {Object} options - { minItemWidth, gap, maxColumns }
		 * @returns {Function} cleanup
		 */
		grid: _responsiveGrid,

		/**
		 * Show/hide element based on breakpoint(s).
		 * @param {Element} element
		 * @param {string|Array} breakpoints - "md+", "xs-md", ["sm", "md"]
		 * @returns {Function} cleanup
		 */
		showAt: _showOnlyAt,

		/**
		 * Responsive image source switching.
		 * @param {HTMLImageElement} img
		 * @param {Object} sources - { xs: "url", md: "url", xl: "url" }
		 * @returns {Function} cleanup
		 */
		image: _responsiveImage,

		/** Get safe area insets (for notch devices). */
		getSafeAreaInsets: _getSafeAreaInsets,

		/**
		 * Check if current breakpoint matches a query.
		 * @param {string} query - "md", "md+", "xs-lg", "mobile"
		 * @returns {boolean}
		 */
		matches(query) {
			const resolved = ALIASES[query] || query;
			const targets = typeof resolved === "string" && (resolved.includes("+") || resolved.includes("-"))
				? _parseBreakpointRange(resolved)
				: [resolved];
			return targets.includes(_current);
		},

		/**
		 * Get value from a responsive map.
		 * @param {Object} map - { xs: val1, md: val2, xl: val3 }
		 * @returns {*} Value for current breakpoint (falls back to smaller)
		 */
		value(map) {
			const keys = Object.keys(BREAKPOINTS);
			for (let i = keys.indexOf(_current); i >= 0; i--) {
				if (map[keys[i]] !== undefined) return map[keys[i]];
			}
			return Object.values(map)[0];
		},

		/**
		 * Stop observing a container.
		 * @param {Element} element
		 */
		unobserve(element) {
			const entry = _observedElements.get(element);
			if (entry) {
				entry.observer.disconnect();
				_observedElements.delete(element);
			}
		},

		/** Destroy all listeners and observers. */
		destroy() {
			Object.keys(_listeners).forEach((k) => _listeners[k].clear());
			_rangeListeners.length = 0;
			_changeListeners.clear();
			_observedElements.forEach(({ observer }) => observer.disconnect());
			_observedElements.clear();
			_initialized = false;
		},
	});

	// Auto-init when DOM is ready
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
