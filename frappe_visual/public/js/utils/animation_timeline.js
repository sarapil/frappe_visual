/**
 * Frappe Visual — Animation Timeline Manager
 * =============================================
 * Centralized animation orchestration using GSAP.
 * Scroll-triggered sequences, stagger groups,
 * page transitions, and shared motion tokens.
 *
 * @module utils/animation_timeline
 * @since v0.2.0
 *
 * Usage:
 *   const tl = frappe.visual.animate.timeline({ name: "dashboard-entry" })
 *   tl.stagger(".card", { y: 30, opacity: 0 }, { stagger: 0.08 })
 *   tl.play()
 *
 *   frappe.visual.animate.onScroll(el, { y: 40, opacity: 0 })
 *   frappe.visual.animate.sequence([ [el1, {x:100}], [el2, {y:50}] ])
 */
(function () {
	"use strict";

	// ── Motion Tokens (Design System) ──────────────────────────
	const MOTION = {
		// Durations (seconds)
		duration: {
			instant: 0.1,
			fast: 0.2,
			normal: 0.35,
			slow: 0.5,
			dramatic: 0.8,
		},
		// Easing curves
		ease: {
			default: "power2.out",
			enter: "power3.out",
			exit: "power2.in",
			spring: "elastic.out(1, 0.7)",
			bounce: "bounce.out",
			smooth: "power1.inOut",
			snap: "back.out(1.7)",
			emphasized: "expo.out",
		},
		// Stagger presets
		stagger: {
			fast: 0.04,
			normal: 0.08,
			slow: 0.12,
			wave: { each: 0.06, from: "center" },
			grid: { each: 0.04, grid: "auto", from: "start" },
			random: { each: 0.06, from: "random" },
		},
	};

	// ── State ──────────────────────────────────────────────────
	const _timelines = new Map();   // name → gsap.timeline
	const _scrollTriggers = [];     // { element, trigger, cleanup }
	let _reducedMotion = false;
	let _gsap = null;

	function _ensureGsap() {
		if (_gsap) return _gsap;
		_gsap = frappe.visual.gsap || window.gsap;
		if (!_gsap) {
			console.warn("[FV Animate] GSAP not available. Animations disabled.");
			return null;
		}
		return _gsap;
	}

	// Check reduced motion preference
	function _checkReducedMotion() {
		_reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
			_reducedMotion = e.matches;
		});
	}

	// ── Timeline Factory ───────────────────────────────────────

	/**
	 * Create a named GSAP timeline with plugin system integration.
	 * @param {Object} options
	 * @param {string} [options.name] - Unique name for retrieval
	 * @param {boolean} [options.paused=true] - Start paused
	 * @param {boolean} [options.autoRemove=true] - Auto-cleanup on complete
	 * @param {Function} [options.onComplete] - Callback on completion
	 * @returns {Object} Enhanced timeline wrapper
	 */
	function createTimeline(options = {}) {
		const gsap = _ensureGsap();
		if (!gsap) return _createNoop();

		const {
			name = `tl_${Date.now()}`,
			paused = true,
			autoRemove = true,
			onComplete = null,
		} = options;

		const tl = gsap.timeline({
			paused,
			onComplete() {
				if (onComplete) onComplete();
				if (autoRemove) _timelines.delete(name);
				_emit("timeline:complete", { name });
			},
		});

		// Store for retrieval
		_timelines.set(name, tl);

		// Enhanced wrapper with chainable API
		const wrapper = {
			_tl: tl,
			name,

			/** Add from-to tween. */
			fromTo(targets, fromVars, toVars, position) {
				if (_reducedMotion) {
					gsap.set(targets, toVars);
					return wrapper;
				}
				tl.fromTo(targets, _applyDefaults(fromVars), _applyDefaults(toVars), position);
				return wrapper;
			},

			/** Add from tween (animate FROM these values). */
			from(targets, vars, position) {
				if (_reducedMotion) return wrapper;
				tl.from(targets, _applyDefaults(vars), position);
				return wrapper;
			},

			/** Add to tween (animate TO these values). */
			to(targets, vars, position) {
				if (_reducedMotion) {
					gsap.set(targets, vars);
					return wrapper;
				}
				tl.to(targets, _applyDefaults(vars), position);
				return wrapper;
			},

			/** Add stagger animation for a group of elements. */
			stagger(targets, fromVars, options = {}) {
				if (_reducedMotion) return wrapper;
				const staggerConfig = typeof options.stagger === "string"
					? MOTION.stagger[options.stagger] || MOTION.stagger.normal
					: options.stagger || MOTION.stagger.normal;

				tl.from(targets, {
					...fromVars,
					duration: options.duration || MOTION.duration.normal,
					ease: options.ease || MOTION.ease.enter,
					stagger: staggerConfig,
				}, options.position);
				return wrapper;
			},

			/** Add a label at the current position. */
			label(name, position) {
				tl.addLabel(name, position);
				return wrapper;
			},

			/** Add a pause point. */
			pause(position) {
				tl.addPause(position);
				return wrapper;
			},

			/** Add a callback at a position. */
			call(fn, position) {
				tl.call(fn, null, position);
				return wrapper;
			},

			/** Play the timeline. */
			play() {
				_emit("timeline:play", { name });
				tl.play();
				return wrapper;
			},

			/** Reverse the timeline. */
			reverse() {
				tl.reverse();
				return wrapper;
			},

			/** Restart from beginning. */
			restart() {
				tl.restart();
				return wrapper;
			},

			/** Kill the timeline and clean up. */
			kill() {
				tl.kill();
				_timelines.delete(name);
				return wrapper;
			},

			/** Get progress (0-1). */
			get progress() { return tl.progress(); },
			set progress(val) { tl.progress(val); },

			/** Get/set time position. */
			get time() { return tl.time(); },
			set time(val) { tl.time(val); },

			/** Get duration. */
			get duration() { return tl.duration(); },

			/** Get the raw GSAP timeline. */
			get raw() { return tl; },
		};

		return wrapper;
	}

	function _applyDefaults(vars) {
		return {
			duration: MOTION.duration.normal,
			ease: MOTION.ease.default,
			...vars,
		};
	}

	function _createNoop() {
		const noop = () => noop;
		return {
			_tl: null, name: "noop",
			fromTo: noop, from: noop, to: noop, stagger: noop,
			label: noop, pause: noop, call: noop, play: noop,
			reverse: noop, restart: noop, kill: noop,
			progress: 0, time: 0, duration: 0, raw: null,
		};
	}

	// ── Scroll-Triggered Animations ────────────────────────────

	/**
	 * Trigger an animation when element scrolls into view.
	 * Uses IntersectionObserver (no ScrollTrigger plugin needed).
	 * @param {Element|string} target - Element or selector
	 * @param {Object} fromVars - Properties to animate FROM
	 * @param {Object} [options] - { threshold, rootMargin, once, duration, ease, delay }
	 * @returns {Function} cleanup
	 */
	function onScroll(target, fromVars, options = {}) {
		const gsap = _ensureGsap();
		if (!gsap || _reducedMotion) return () => {};

		const elements = typeof target === "string"
			? [...document.querySelectorAll(target)]
			: [target];

		if (elements.length === 0) return () => {};

		const {
			threshold = 0.15,
			rootMargin = "0px 0px -50px 0px",
			once = true,
			duration = MOTION.duration.normal,
			ease = MOTION.ease.enter,
			delay = 0,
			stagger: staggerVal = 0,
		} = options;

		// Set initial state
		gsap.set(elements, fromVars);

		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					const idx = elements.indexOf(entry.target);
					gsap.to(entry.target, {
						...Object.fromEntries(
							Object.keys(fromVars).map((k) => [k, k === "opacity" ? 1 : 0])
						),
						duration,
						ease,
						delay: delay + (idx * (staggerVal || 0)),
						clearProps: "all",
					});
					if (once) observer.unobserve(entry.target);
				} else if (!once) {
					gsap.set(entry.target, fromVars);
				}
			});
		}, { threshold, rootMargin });

		elements.forEach((el) => observer.observe(el));

		const cleanup = () => {
			observer.disconnect();
		};
		_scrollTriggers.push({ elements, cleanup });
		return cleanup;
	}

	// ── Preset Animations ──────────────────────────────────────

	const PRESETS = {
		fadeIn: { opacity: 0 },
		fadeUp: { opacity: 0, y: 30 },
		fadeDown: { opacity: 0, y: -30 },
		fadeLeft: { opacity: 0, x: 30 },
		fadeRight: { opacity: 0, x: -30 },
		scaleUp: { opacity: 0, scale: 0.85 },
		scaleDown: { opacity: 0, scale: 1.15 },
		slideUp: { y: "100%", opacity: 0 },
		slideDown: { y: "-100%", opacity: 0 },
		flipX: { rotateX: -90, opacity: 0 },
		flipY: { rotateY: -90, opacity: 0 },
		zoomIn: { scale: 0, opacity: 0 },
		spring: { y: 60, opacity: 0, ease: "elastic.out(1, 0.5)" },
	};

	/**
	 * Quick animation with preset.
	 * @param {Element|string} target
	 * @param {string} preset - "fadeUp", "scaleUp", "spring", etc.
	 * @param {Object} [options] - { duration, delay, ease, stagger, onComplete }
	 * @returns {gsap.Tween}
	 */
	function preset(target, presetName, options = {}) {
		const gsap = _ensureGsap();
		if (!gsap || _reducedMotion) return null;

		const fromVars = PRESETS[presetName];
		if (!fromVars) {
			console.warn(`[FV Animate] Unknown preset: ${presetName}`);
			return null;
		}

		const targets = typeof target === "string"
			? document.querySelectorAll(target)
			: target;

		return gsap.from(targets, {
			...fromVars,
			duration: options.duration || MOTION.duration.normal,
			ease: options.ease || fromVars.ease || MOTION.ease.enter,
			delay: options.delay || 0,
			stagger: options.stagger || 0,
			onComplete: options.onComplete,
		});
	}

	// ── Sequence Runner ────────────────────────────────────────

	/**
	 * Run a sequence of animations one after another.
	 * @param {Array} steps - [ [target, vars, options], ... ]
	 * @param {Object} [options] - { gap: 0.1, name: "seq" }
	 * @returns {Object} timeline wrapper
	 */
	function sequence(steps, options = {}) {
		const tl = createTimeline({ name: options.name, paused: false });
		const gap = options.gap ?? 0;

		steps.forEach(([target, vars, stepOpts = {}], i) => {
			const position = i === 0 ? 0 : `>+${gap}`;
			tl.from(target, { ...vars, ...stepOpts }, position);
		});

		return tl;
	}

	// ── Page Transition Helper ─────────────────────────────────

	/**
	 * Animate page/section exit → enter transition.
	 * @param {Element} outElement - Element leaving
	 * @param {Element} inElement - Element entering
	 * @param {Object} [options] - { type: "fade"|"slide"|"scale", duration }
	 * @returns {Promise} resolves when complete
	 */
	function transition(outElement, inElement, options = {}) {
		const gsap = _ensureGsap();
		if (!gsap) return Promise.resolve();

		const { type = "fade", duration = MOTION.duration.normal } = options;

		return new Promise((resolve) => {
			const tl = gsap.timeline({ onComplete: resolve });

			if (_reducedMotion) {
				if (outElement) outElement.style.display = "none";
				if (inElement) inElement.style.display = "";
				resolve();
				return;
			}

			switch (type) {
				case "slide":
					if (outElement) tl.to(outElement, { x: "-100%", opacity: 0, duration, ease: MOTION.ease.exit });
					if (inElement) {
						gsap.set(inElement, { x: "100%", opacity: 0 });
						tl.to(inElement, { x: "0%", opacity: 1, duration, ease: MOTION.ease.enter }, outElement ? `>-${duration * 0.3}` : 0);
					}
					break;

				case "scale":
					if (outElement) tl.to(outElement, { scale: 0.9, opacity: 0, duration: duration * 0.6, ease: MOTION.ease.exit });
					if (inElement) {
						gsap.set(inElement, { scale: 1.1, opacity: 0 });
						tl.to(inElement, { scale: 1, opacity: 1, duration, ease: MOTION.ease.snap });
					}
					break;

				case "fade":
				default:
					if (outElement) tl.to(outElement, { opacity: 0, duration: duration * 0.5, ease: MOTION.ease.exit });
					if (inElement) {
						gsap.set(inElement, { opacity: 0 });
						tl.to(inElement, { opacity: 1, duration: duration * 0.5, ease: MOTION.ease.enter });
					}
					break;
			}
		});
	}

	// ── Utility: Quick Animate ─────────────────────────────────

	/**
	 * Simple one-shot animation.
	 * @param {Element|string} target
	 * @param {Object} vars - GSAP vars (x, y, opacity, scale, etc.)
	 * @returns {gsap.Tween}
	 */
	function animate(target, vars) {
		const gsap = _ensureGsap();
		if (!gsap || _reducedMotion) return null;
		return gsap.to(target, _applyDefaults(vars));
	}

	// ── Event Emitter ──────────────────────────────────────────
	function _emit(event, data) {
		if (frappe.visual.eventBus && typeof frappe.visual.eventBus.emit === "function") {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	// ── Init ───────────────────────────────────────────────────
	_checkReducedMotion();

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.animate");

	Object.assign(frappe.visual.animate, {
		MOTION,
		PRESETS,

		timeline: createTimeline,
		onScroll,
		preset,
		sequence,
		transition,
		animate,

		/** Get a named timeline. */
		get(name) { return _timelines.get(name) || null; },

		/** Kill a named timeline. */
		kill(name) {
			const tl = _timelines.get(name);
			if (tl) { tl.kill(); _timelines.delete(name); }
		},

		/** Kill all timelines and cleanup. */
		killAll() {
			_timelines.forEach((tl) => tl.kill());
			_timelines.clear();
			_scrollTriggers.forEach(({ cleanup }) => cleanup());
			_scrollTriggers.length = 0;
		},

		/** Whether reduced motion is active. */
		get reducedMotion() { return _reducedMotion; },

		/** Active timeline count. */
		get count() { return _timelines.size; },
	});

	console.log(
		"%c⬡ FV Animate%c ready — timeline() · onScroll() · preset() · sequence() · transition()",
		"color:#ec4899;font-weight:bold",
		"color:#94a3b8"
	);
})();
