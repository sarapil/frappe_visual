/**
 * Frappe Visual — Plugin / Extension System
 * ===========================================
 * Component registry, lifecycle hooks, slot composition,
 * and auto-enhancer extension points for 14+ dependent apps.
 *
 * @module utils/plugin_system
 * @since v0.2.0
 *
 * Usage:
 *   frappe.visual.plugins.register("MyChart", MyChartClass, { category: "chart" })
 *   frappe.visual.plugins.hook("beforeRender", "KanbanBoard", fn)
 *   frappe.visual.plugins.extend("formEnhancer", { customTab: fn })
 *   frappe.visual.plugins.create("MyChart", container, config)
 */
(function () {
	"use strict";

	// ── Registry ───────────────────────────────────────────────
	const _registry = new Map();       // name → { constructor, meta }
	const _hooks = new Map();          // "event:ComponentName" → Set<fn>
	const _enhancerExtensions = {};    // enhancerName → { slotName: fn[] }
	const _slots = new Map();          // componentName → { slotName: fn[] }
	const _categories = new Map();     // category → Set<name>
	const _middlewares = [];           // global middleware chain

	// Lifecycle event names
	const LIFECYCLE_EVENTS = [
		"beforeCreate",
		"afterCreate",
		"beforeRender",
		"afterRender",
		"beforeUpdate",
		"afterUpdate",
		"beforeDestroy",
		"afterDestroy",
		"onError",
	];

	// Built-in auto-enhancers that can be extended
	const EXTENSIBLE_ENHANCERS = [
		"formEnhancer",
		"listEnhancer",
		"workspaceEnhancer",
	];

	// ── Component Registration ─────────────────────────────────

	/**
	 * Register a component with the visual system.
	 * @param {string} name - Component name (PascalCase)
	 * @param {Function} constructor - Component class or factory function
	 * @param {Object} meta - { category, version, app, description, icon, slots }
	 */
	function register(name, constructor, meta = {}) {
		if (!name || typeof name !== "string") {
			console.error("[FV Plugin] register: name must be a non-empty string");
			return false;
		}
		if (!constructor || (typeof constructor !== "function" && typeof constructor !== "object")) {
			console.error(`[FV Plugin] register: ${name} constructor must be a function or object`);
			return false;
		}

		const entry = {
			constructor,
			meta: {
				name,
				category: meta.category || "custom",
				version: meta.version || "1.0.0",
				app: meta.app || "unknown",
				description: meta.description || "",
				icon: meta.icon || null,
				slots: meta.slots || [],
				registeredAt: Date.now(),
			},
		};

		const wasExisting = _registry.has(name);
		_registry.set(name, entry);

		// Track category
		const cat = entry.meta.category;
		if (!_categories.has(cat)) _categories.set(cat, new Set());
		_categories.get(cat).add(name);

		// Also register on frappe.visual namespace
		frappe.visual[name] = constructor;

		// Emit registration event
		_emitEvent("componentRegistered", { name, meta: entry.meta, replaced: wasExisting });

		return true;
	}

	/**
	 * Unregister a component.
	 * @param {string} name
	 */
	function unregister(name) {
		const entry = _registry.get(name);
		if (!entry) return false;

		_registry.delete(name);
		const cat = entry.meta.category;
		if (_categories.has(cat)) _categories.get(cat).delete(name);

		_emitEvent("componentUnregistered", { name });
		return true;
	}

	/**
	 * Check if a component is registered.
	 * @param {string} name
	 * @returns {boolean}
	 */
	function has(name) {
		return _registry.has(name) || typeof frappe.visual[name] === "function";
	}

	/**
	 * Get a registered component constructor.
	 * @param {string} name
	 * @returns {Function|null}
	 */
	function get(name) {
		const entry = _registry.get(name);
		if (entry) return entry.constructor;
		return frappe.visual[name] || null;
	}

	/**
	 * Get component metadata.
	 * @param {string} name
	 * @returns {Object|null}
	 */
	function getMeta(name) {
		return _registry.get(name)?.meta || null;
	}

	/**
	 * List all registered components, optionally filtered by category.
	 * @param {string} [category]
	 * @returns {Array<{ name, meta }>}
	 */
	function list(category) {
		if (category) {
			const names = _categories.get(category);
			if (!names) return [];
			return [...names].map((n) => ({ name: n, meta: _registry.get(n)?.meta }));
		}
		return [..._registry.entries()].map(([name, entry]) => ({
			name,
			meta: entry.meta,
		}));
	}

	/**
	 * List all categories with component counts.
	 * @returns {Object} { category: count }
	 */
	function listCategories() {
		const result = {};
		_categories.forEach((names, cat) => { result[cat] = names.size; });
		return result;
	}

	// ── Lifecycle Hooks ────────────────────────────────────────

	/**
	 * Register a lifecycle hook for a component.
	 * @param {string} event - Lifecycle event name
	 * @param {string} componentName - "*" for all components, or specific name
	 * @param {Function} fn - Hook function. Receives { component, args }
	 * @returns {Function} unsubscribe
	 */
	function hook(event, componentName, fn) {
		if (!LIFECYCLE_EVENTS.includes(event)) {
			console.warn(`[FV Plugin] Unknown lifecycle event: ${event}. Valid: ${LIFECYCLE_EVENTS.join(", ")}`);
		}

		const key = `${event}:${componentName}`;
		if (!_hooks.has(key)) _hooks.set(key, new Set());
		_hooks.get(key).add(fn);

		return () => _hooks.get(key)?.delete(fn);
	}

	/**
	 * Execute lifecycle hooks for a component event.
	 * Called internally by components that support the plugin system.
	 * @param {string} event
	 * @param {string} componentName
	 * @param {Object} context - { instance, args, ... }
	 * @returns {boolean} false if any hook prevented default
	 */
	function executeHooks(event, componentName, context = {}) {
		let prevented = false;
		const ctx = {
			...context,
			event,
			componentName,
			preventDefault() { prevented = true; },
		};

		// Wildcard hooks first
		const wildcardKey = `${event}:*`;
		if (_hooks.has(wildcardKey)) {
			for (const fn of _hooks.get(wildcardKey)) {
				try { fn(ctx); }
				catch (e) { console.error(`[FV Plugin] Hook error (${wildcardKey}):`, e); }
				if (prevented) return false;
			}
		}

		// Specific component hooks
		const specificKey = `${event}:${componentName}`;
		if (_hooks.has(specificKey)) {
			for (const fn of _hooks.get(specificKey)) {
				try { fn(ctx); }
				catch (e) { console.error(`[FV Plugin] Hook error (${specificKey}):`, e); }
				if (prevented) return false;
			}
		}

		// Global middleware
		for (const mw of _middlewares) {
			try { mw(ctx); }
			catch (e) { console.error("[FV Plugin] Middleware error:", e); }
			if (prevented) return false;
		}

		return true;
	}

	// ── Slot Composition ───────────────────────────────────────

	/**
	 * Register a slot renderer for a component.
	 * Slots are named injection points where external apps can add content.
	 * @param {string} componentName
	 * @param {string} slotName
	 * @param {Function} renderer - (container, context) => void
	 * @param {Object} [options] - { priority: 10, app: "my_app" }
	 * @returns {Function} unsubscribe
	 */
	function slot(componentName, slotName, renderer, options = {}) {
		if (!_slots.has(componentName)) _slots.set(componentName, {});
		const componentSlots = _slots.get(componentName);
		if (!componentSlots[slotName]) componentSlots[slotName] = [];

		const entry = {
			renderer,
			priority: options.priority || 10,
			app: options.app || "unknown",
		};

		componentSlots[slotName].push(entry);
		// Sort by priority (lower = first)
		componentSlots[slotName].sort((a, b) => a.priority - b.priority);

		return () => {
			const idx = componentSlots[slotName].indexOf(entry);
			if (idx >= 0) componentSlots[slotName].splice(idx, 1);
		};
	}

	/**
	 * Render a named slot's content.
	 * Called by components at their slot injection points.
	 * @param {string} componentName
	 * @param {string} slotName
	 * @param {Element} container - DOM container for slot content
	 * @param {Object} context - Component-specific context data
	 */
	function renderSlot(componentName, slotName, container, context = {}) {
		const componentSlots = _slots.get(componentName);
		if (!componentSlots || !componentSlots[slotName]) return;

		for (const entry of componentSlots[slotName]) {
			try {
				const wrapper = document.createElement("div");
				wrapper.className = `fv-slot fv-slot--${slotName}`;
				wrapper.dataset.fvSlotApp = entry.app;
				entry.renderer(wrapper, context);
				container.appendChild(wrapper);
			} catch (e) {
				console.error(`[FV Plugin] Slot render error (${componentName}.${slotName}):`, e);
			}
		}
	}

	/**
	 * Check if a slot has any registered renderers.
	 */
	function hasSlot(componentName, slotName) {
		const cs = _slots.get(componentName);
		return cs && cs[slotName] && cs[slotName].length > 0;
	}

	// ── Auto-Enhancer Extensions ───────────────────────────────

	/**
	 * Extend a built-in auto-enhancer with custom behavior.
	 * @param {string} enhancerName - "formEnhancer" | "listEnhancer" | "workspaceEnhancer"
	 * @param {Object} extensions - { tabName: { label, icon, render(container, context) }, ... }
	 * @returns {Function} unsubscribe
	 */
	function extendEnhancer(enhancerName, extensions) {
		if (!EXTENSIBLE_ENHANCERS.includes(enhancerName)) {
			console.warn(`[FV Plugin] Enhancer "${enhancerName}" is not extensible. Valid: ${EXTENSIBLE_ENHANCERS.join(", ")}`);
			return () => {};
		}

		if (!_enhancerExtensions[enhancerName]) {
			_enhancerExtensions[enhancerName] = {};
		}

		const ids = [];
		Object.entries(extensions).forEach(([key, ext]) => {
			if (!_enhancerExtensions[enhancerName][key]) {
				_enhancerExtensions[enhancerName][key] = [];
			}
			_enhancerExtensions[enhancerName][key].push(ext);
			ids.push(key);
		});

		_emitEvent("enhancerExtended", { enhancer: enhancerName, extensions: ids });

		return () => {
			ids.forEach((key) => {
				const arr = _enhancerExtensions[enhancerName][key];
				if (arr) {
					const idx = arr.indexOf(extensions[key]);
					if (idx >= 0) arr.splice(idx, 1);
				}
			});
		};
	}

	/**
	 * Get extensions for an enhancer.
	 * Called by auto-enhancers to discover and render extensions.
	 */
	function getEnhancerExtensions(enhancerName) {
		return _enhancerExtensions[enhancerName] || {};
	}

	// ── Middleware ──────────────────────────────────────────────

	/**
	 * Add a global middleware that runs on every lifecycle event.
	 * @param {Function} fn - (context) => void
	 * @returns {Function} unsubscribe
	 */
	function use(fn) {
		_middlewares.push(fn);
		return () => {
			const idx = _middlewares.indexOf(fn);
			if (idx >= 0) _middlewares.splice(idx, 1);
		};
	}

	// ── Component Factory with Hooks ───────────────────────────

	/**
	 * Create a component instance with full lifecycle hook support.
	 * @param {string} name - Registered component name
	 * @param {Element} container - DOM container
	 * @param {Object} config - Component configuration
	 * @returns {Object|null} component instance
	 */
	function create(name, container, config = {}) {
		const Constructor = get(name);
		if (!Constructor) {
			console.error(`[FV Plugin] Component "${name}" not found`);
			return null;
		}

		// beforeCreate
		const proceed = executeHooks("beforeCreate", name, { config, container });
		if (!proceed) return null;

		let instance;
		try {
			if (typeof Constructor === "function" && Constructor.create) {
				// Static factory (e.g., Component.create(container, config))
				instance = Constructor.create(container, config);
			} else if (typeof Constructor === "function") {
				// Class constructor
				instance = new Constructor(container, config);
			} else if (typeof Constructor.create === "function") {
				// Object with factory method
				instance = Constructor.create(container, config);
			}
		} catch (e) {
			executeHooks("onError", name, { error: e, phase: "create" });
			console.error(`[FV Plugin] Error creating "${name}":`, e);
			return null;
		}

		if (instance) {
			// Tag the instance
			instance.__fv_component = name;
			instance.__fv_createdAt = Date.now();

			// afterCreate
			executeHooks("afterCreate", name, { instance, config, container });

			// Render slots if component supports them
			if (container && hasSlot(name, "default")) {
				const slotContainer = document.createElement("div");
				slotContainer.className = "fv-slots-container";
				container.appendChild(slotContainer);
				renderSlot(name, "default", slotContainer, { instance, config });
			}
		}

		return instance;
	}

	// ── Helper: Emit to EventBus ───────────────────────────────
	function _emitEvent(event, data) {
		if (frappe.visual.eventBus && typeof frappe.visual.eventBus.emit === "function") {
			frappe.visual.eventBus.emit(`plugin:${event}`, data);
		}
	}

	// ── Plugin Manifest ────────────────────────────────────────

	/**
	 * Register a complete plugin manifest from an external app.
	 * @param {Object} manifest - { name, app, version, components, hooks, enhancers, slots }
	 */
	function registerPlugin(manifest) {
		const { name, app, version, components = [], hooks: pluginHooks = [], enhancers = {}, slots: pluginSlots = [] } = manifest;

		if (!name || !app) {
			console.error("[FV Plugin] registerPlugin: name and app are required");
			return;
		}

		console.log(
			`%c⬡ FV Plugin%c ${name} v${version || "1.0"} (${app}) — ${components.length} components`,
			"color:#10b981;font-weight:bold",
			"color:#94a3b8"
		);

		// Register components
		components.forEach(({ name: cName, constructor: cCtor, ...cMeta }) => {
			register(cName, cCtor, { ...cMeta, app });
		});

		// Register hooks
		pluginHooks.forEach(({ event, component, handler }) => {
			hook(event, component || "*", handler);
		});

		// Extend enhancers
		Object.entries(enhancers).forEach(([enhancerName, exts]) => {
			extendEnhancer(enhancerName, exts);
		});

		// Register slots
		pluginSlots.forEach(({ component, slot: sName, renderer, priority }) => {
			slot(component, sName, renderer, { priority, app });
		});

		_emitEvent("pluginRegistered", { name, app, version });
	}

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.plugins");

	Object.assign(frappe.visual.plugins, {
		// Component Registry
		register,
		unregister,
		has,
		get,
		getMeta,
		list,
		listCategories,

		// Lifecycle Hooks
		hook,
		executeHooks,
		LIFECYCLE_EVENTS,

		// Slots
		slot,
		renderSlot,
		hasSlot,

		// Enhancer Extensions
		extend: extendEnhancer,
		getEnhancerExtensions,
		EXTENSIBLE_ENHANCERS,

		// Middleware
		use,

		// Factory
		create,

		// Plugin Manifest
		registerPlugin,

		/** Get registry stats. */
		stats() {
			return {
				totalComponents: _registry.size,
				categories: Object.fromEntries([..._categories.entries()].map(([k, v]) => [k, v.size])),
				hooks: _hooks.size,
				slots: _slots.size,
				enhancerExtensions: Object.keys(_enhancerExtensions).length,
				middlewares: _middlewares.length,
			};
		},
	});

	console.log(
		"%c⬡ FV Plugin System%c ready — register() · hook() · extend() · slot() · create()",
		"color:#10b981;font-weight:bold",
		"color:#94a3b8"
	);
})();
