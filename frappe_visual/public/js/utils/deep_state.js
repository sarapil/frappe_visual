/**
 * Frappe Visual — Deep State Reactivity
 * =======================================
 * Proxy-based reactive state management with automatic
 * change tracking, computed properties, watchers, and
 * DOM binding helpers.
 *
 * @module utils/deep_state
 * @since v0.2.0
 *
 * Usage:
 *   const state = frappe.visual.state.create({ count: 0, items: [] })
 *   state.$watch("count", (val, old) => console.log(val))
 *   state.count++                    // triggers watcher
 *   state.items.push("a")           // deep reactivity
 *
 *   const doubled = state.$computed("doubled", () => state.count * 2)
 *   state.$bind(el, "textContent", () => `Count: ${state.count}`)
 */
(function () {
	"use strict";

	// ── Dependency Tracking ────────────────────────────────────
	let _activeEffect = null;
	const _targetMap = new WeakMap(); // target → Map<key, Set<effect>>

	function track(target, key) {
		if (!_activeEffect) return;
		let depsMap = _targetMap.get(target);
		if (!depsMap) {
			depsMap = new Map();
			_targetMap.set(target, depsMap);
		}
		let deps = depsMap.get(key);
		if (!deps) {
			deps = new Set();
			depsMap.set(key, deps);
		}
		deps.add(_activeEffect);
	}

	function trigger(target, key) {
		const depsMap = _targetMap.get(target);
		if (!depsMap) return;
		const deps = depsMap.get(key);
		if (deps) {
			[...deps].forEach((effect) => {
				if (effect !== _activeEffect) {
					effect._scheduler ? effect._scheduler(effect) : effect();
				}
			});
		}
	}

	// ── Reactive Proxy Handler ─────────────────────────────────

	const _reactiveCache = new WeakMap();

	function reactive(obj) {
		if (obj === null || typeof obj !== "object") return obj;
		if (_reactiveCache.has(obj)) return _reactiveCache.get(obj);

		const proxy = new Proxy(obj, {
			get(target, key, receiver) {
				if (key === "__isReactive") return true;
				if (key === "__raw") return target;

				const result = Reflect.get(target, key, receiver);
				track(target, key);

				// Auto-wrap nested objects and arrays
				if (result !== null && typeof result === "object") {
					return reactive(result);
				}
				return result;
			},

			set(target, key, value, receiver) {
				const oldValue = target[key];
				const hadKey = Object.prototype.hasOwnProperty.call(target, key);
				const result = Reflect.set(target, key, value, receiver);

				if (!hadKey || !Object.is(oldValue, value)) {
					trigger(target, key);
					// Also trigger length for arrays
					if (Array.isArray(target) && key === "length") {
						trigger(target, "length");
					}
				}
				return result;
			},

			deleteProperty(target, key) {
				const hadKey = Object.prototype.hasOwnProperty.call(target, key);
				const result = Reflect.deleteProperty(target, key);
				if (hadKey) {
					trigger(target, key);
				}
				return result;
			},
		});

		_reactiveCache.set(obj, proxy);
		return proxy;
	}

	// ── Effect System ──────────────────────────────────────────

	function effect(fn, options = {}) {
		const effectFn = () => {
			_activeEffect = effectFn;
			try {
				return fn();
			} finally {
				_activeEffect = null;
			}
		};
		effectFn._scheduler = options.scheduler || null;

		// Run immediately unless lazy
		if (!options.lazy) effectFn();
		return effectFn;
	}

	// ── ReactiveStore Class ────────────────────────────────────

	class ReactiveStore {
		constructor(initialState = {}) {
			this._raw = initialState;
			this._proxy = reactive(initialState);
			this._watchers = new Map();        // key → Set<{ fn, deep }>
			this._computedCache = new Map();   // name → { fn, effect, value }
			this._bindings = [];               // { el, prop, effectFn }
			this._history = [];                // for undo support
			this._historyIndex = -1;
			this._maxHistory = 50;
			this._batchDepth = 0;
			this._batchCallbacks = new Set();
		}

		// ── Proxy Access ────────────────────────────────────────

		get state() { return this._proxy; }

		/** Get raw (non-reactive) snapshot. */
		get snapshot() {
			return JSON.parse(JSON.stringify(this._raw));
		}

		/** Set a value by path (dot-notation). */
		set(path, value) {
			const keys = path.split(".");
			let obj = this._proxy;
			for (let i = 0; i < keys.length - 1; i++) {
				obj = obj[keys[i]];
				if (obj === undefined) return;
			}
			const oldVal = obj[keys[keys.length - 1]];
			obj[keys[keys.length - 1]] = value;
			this._notifyWatchers(path, value, oldVal);
		}

		/** Get a value by path (dot-notation). */
		get(path) {
			const keys = path.split(".");
			let obj = this._proxy;
			for (const key of keys) {
				obj = obj?.[key];
			}
			return obj;
		}

		// ── Watchers ────────────────────────────────────────────

		/**
		 * Watch a state path for changes.
		 * @param {string} path - dot-notation path
		 * @param {Function} fn - callback(newVal, oldVal)
		 * @param {Object} [opts] - { immediate: false, deep: false }
		 * @returns {Function} unwatch
		 */
		$watch(path, fn, opts = {}) {
			if (!this._watchers.has(path)) {
				this._watchers.set(path, new Set());
			}
			const entry = { fn, deep: opts.deep || false };
			this._watchers.get(path).add(entry);

			// Set up reactive effect for auto-tracking
			const keys = path.split(".");
			const effectFn = effect(() => {
				let obj = this._proxy;
				for (const key of keys) {
					obj = obj?.[key];
				}
				return obj;
			}, {
				lazy: true,
				scheduler: () => {
					const val = this.get(path);
					fn(val, undefined);
				},
			});

			if (opts.immediate) {
				fn(this.get(path), undefined);
			}

			return () => {
				this._watchers.get(path)?.delete(entry);
			};
		}

		_notifyWatchers(path, newVal, oldVal) {
			// Exact match
			this._watchers.get(path)?.forEach(({ fn }) => {
				if (this._batchDepth > 0) {
					this._batchCallbacks.add(() => fn(newVal, oldVal));
				} else {
					fn(newVal, oldVal);
				}
			});

			// Parent watchers (deep)
			const parts = path.split(".");
			for (let i = parts.length - 1; i > 0; i--) {
				const parentPath = parts.slice(0, i).join(".");
				this._watchers.get(parentPath)?.forEach(({ fn, deep }) => {
					if (deep) fn(this.get(parentPath), undefined);
				});
			}
		}

		// ── Computed Properties ─────────────────────────────────

		/**
		 * Create a computed property that auto-updates.
		 * @param {string} name
		 * @param {Function} getter
		 * @returns {Function} accessor
		 */
		$computed(name, getter) {
			const entry = { fn: getter, value: undefined };

			const effectFn = effect(() => {
				entry.value = getter();
			});

			this._computedCache.set(name, entry);

			// Return getter function
			return () => entry.value;
		}

		/** Get computed value by name. */
		getComputed(name) {
			return this._computedCache.get(name)?.value;
		}

		// ── DOM Bindings ────────────────────────────────────────

		/**
		 * Bind a reactive expression to a DOM element property.
		 * @param {Element} el
		 * @param {string} prop - "textContent", "innerHTML", "value", "className", etc.
		 * @param {Function} expr - expression that reads from state
		 * @returns {Function} unbind
		 */
		$bind(el, prop, expr) {
			const effectFn = effect(() => {
				const value = expr();
				if (prop === "className") {
					el.className = value;
				} else if (prop === "style") {
					Object.assign(el.style, value);
				} else if (prop === "dataset") {
					Object.entries(value).forEach(([k, v]) => {
						el.dataset[k] = v;
					});
				} else if (prop.startsWith("attr:")) {
					el.setAttribute(prop.slice(5), value);
				} else {
					el[prop] = value;
				}
			});

			const binding = { el, prop, effectFn };
			this._bindings.push(binding);

			return () => {
				const idx = this._bindings.indexOf(binding);
				if (idx >= 0) this._bindings.splice(idx, 1);
			};
		}

		/**
		 * Bind visibility of an element.
		 * @param {Element} el
		 * @param {Function} condition
		 * @returns {Function} unbind
		 */
		$show(el, condition) {
			return this.$bind(el, "style", () => ({
				display: condition() ? "" : "none",
			}));
		}

		/**
		 * Two-way binding for an input element.
		 * @param {HTMLInputElement} input
		 * @param {string} path - state path
		 * @returns {Function} cleanup
		 */
		$model(input, path) {
			// State → DOM
			const unbind = this.$bind(input, "value", () => this.get(path) ?? "");

			// DOM → State
			const handler = (e) => this.set(path, e.target.value);
			input.addEventListener("input", handler);

			return () => {
				unbind();
				input.removeEventListener("input", handler);
			};
		}

		// ── Batching ────────────────────────────────────────────

		/**
		 * Batch multiple state changes to fire watchers once.
		 * @param {Function} fn
		 */
		$batch(fn) {
			this._batchDepth++;
			try {
				fn();
			} finally {
				this._batchDepth--;
				if (this._batchDepth === 0) {
					const cbs = [...this._batchCallbacks];
					this._batchCallbacks.clear();
					cbs.forEach((cb) => cb());
				}
			}
		}

		// ── Undo/Redo Integration ───────────────────────────────

		/** Save current state to history. */
		$checkpoint() {
			const snap = this.snapshot;
			// Trim redo stack
			this._history = this._history.slice(0, this._historyIndex + 1);
			this._history.push(snap);
			if (this._history.length > this._maxHistory) {
				this._history.shift();
			}
			this._historyIndex = this._history.length - 1;
		}

		/** Undo to previous checkpoint. */
		$undo() {
			if (this._historyIndex <= 0) return false;
			this._historyIndex--;
			this._restoreSnapshot(this._history[this._historyIndex]);
			return true;
		}

		/** Redo to next checkpoint. */
		$redo() {
			if (this._historyIndex >= this._history.length - 1) return false;
			this._historyIndex++;
			this._restoreSnapshot(this._history[this._historyIndex]);
			return true;
		}

		_restoreSnapshot(snap) {
			Object.keys(snap).forEach((key) => {
				this._proxy[key] = snap[key];
			});
		}

		get canUndo() { return this._historyIndex > 0; }
		get canRedo() { return this._historyIndex < this._history.length - 1; }

		// ── Cleanup ─────────────────────────────────────────────

		destroy() {
			this._watchers.clear();
			this._computedCache.clear();
			this._bindings.length = 0;
			this._history.length = 0;
		}
	}

	// ── Event Bridge ───────────────────────────────────────────
	function _emit(event, data) {
		if (frappe.visual.eventBus?.emit) {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.state");

	Object.assign(frappe.visual.state, {
		/**
		 * Create a reactive store.
		 * @param {Object} initialState
		 * @returns {ReactiveStore}
		 */
		create(initialState = {}) {
			const store = new ReactiveStore(initialState);
			_emit("state:created");
			return store;
		},

		/**
		 * Make a plain object reactive (low-level).
		 * @param {Object} obj
		 * @returns {Proxy}
		 */
		reactive,

		/**
		 * Create a side-effect that auto-tracks dependencies (low-level).
		 * @param {Function} fn
		 * @param {Object} [options]
		 * @returns {Function}
		 */
		effect,
	});

	console.log(
		"%c⬡ FV State%c ready — create() · reactive() · $watch · $bind · $model · $batch",
		"color:#8b5cf6;font-weight:bold",
		"color:#94a3b8"
	);
})();
