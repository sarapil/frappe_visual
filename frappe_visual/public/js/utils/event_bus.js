// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Event Bus
 * ===========================
 * Lightweight pub/sub system for inter-component communication.
 * Enables 270+ components to coordinate without tight coupling.
 *
 * Built-in Events:
 * ────────────────
 *   detail:open     — { doctype, docname }    — Detail panel opened
 *   detail:close    — {}                      — Detail panel closed
 *   detail:tab      — { doctype, docname, tabId } — Tab switched
 *   layout:resize   — { region, width }       — Dock/panel resized
 *   layout:dock     — { region, visible }     — Dock panel toggled
 *   theme:change    — { mode }                — Dark/light switch
 *   notify:new      — { notification }        — New notification arrived
 *   notify:read     — { names }               — Notifications marked read
 *   search:select   — { category, value }     — Search result selected
 *   workspace:enter — { workspace }           — Workspace navigated to
 *   recent:add      — { doctype, docname }    — Recent record added
 *   shortcut:register — { key, label, action } — Shortcut registered
 *   whiteboard:save — { name }                — Whiteboard saved
 *   story:enter     — { workspace }           — Storytelling mode entered
 *
 * Usage:
 * ──────
 *   frappe.visual.eventBus.on('detail:open', (data) => { ... })
 *   frappe.visual.eventBus.emit('detail:open', { doctype: 'Sales Order', docname: 'SO-001' })
 *   frappe.visual.eventBus.off('detail:open', handler)
 *   frappe.visual.eventBus.once('theme:change', handler)
 *
 * Debug Mode:
 * ───────────
 *   frappe.visual.eventBus.debug = true  → logs all events to console
 */

frappe.provide("frappe.visual.eventBus");

(function () {
	"use strict";

	/** @type {Map<string, Set<Function>>} */
	const _listeners = new Map();

	/** @type {Map<string, Function[]>} Wildcard listeners (e.g. 'detail:*') */
	const _wildcardListeners = new Map();

	/** @type {boolean} Enable console logging of all events */
	let _debug = false;

	/** @type {Array<{event: string, data: any, timestamp: number}>} */
	const _history = [];
	const MAX_HISTORY = 100;

	/**
	 * Subscribe to an event.
	 * Supports wildcards: 'detail:*' matches 'detail:open', 'detail:close', etc.
	 *
	 * @param {string} event — Event name or pattern (e.g. 'detail:open' or 'detail:*')
	 * @param {Function} handler — Callback receiving (data, eventName)
	 * @returns {Function} Unsubscribe function
	 */
	function on(event, handler) {
		if (typeof handler !== "function") {
			console.warn("[FV EventBus] handler must be a function for event:", event);
			return () => {};
		}

		if (event.endsWith(":*")) {
			// Wildcard listener
			const prefix = event.slice(0, -1); // 'detail:'
			if (!_wildcardListeners.has(prefix)) {
				_wildcardListeners.set(prefix, []);
			}
			_wildcardListeners.get(prefix).push(handler);
		} else {
			if (!_listeners.has(event)) {
				_listeners.set(event, new Set());
			}
			_listeners.get(event).add(handler);
		}

		// Return unsubscribe function
		return () => off(event, handler);
	}

	/**
	 * Subscribe to an event — fires only once, then auto-unsubscribes.
	 *
	 * @param {string} event
	 * @param {Function} handler
	 * @returns {Function} Unsubscribe function (can cancel before it fires)
	 */
	function once(event, handler) {
		const wrapper = (data, eventName) => {
			off(event, wrapper);
			handler(data, eventName);
		};
		wrapper._originalHandler = handler;
		return on(event, wrapper);
	}

	/**
	 * Unsubscribe from an event.
	 *
	 * @param {string} event
	 * @param {Function} handler — The exact function reference passed to on()
	 */
	function off(event, handler) {
		if (event.endsWith(":*")) {
			const prefix = event.slice(0, -1);
			const handlers = _wildcardListeners.get(prefix);
			if (handlers) {
				const idx = handlers.indexOf(handler);
				if (idx !== -1) handlers.splice(idx, 1);
				// Also check for .once wrappers
				const wrapperIdx = handlers.findIndex(h => h._originalHandler === handler);
				if (wrapperIdx !== -1) handlers.splice(wrapperIdx, 1);
			}
		} else {
			const set = _listeners.get(event);
			if (set) {
				set.delete(handler);
				// Also remove .once wrappers
				for (const h of set) {
					if (h._originalHandler === handler) {
						set.delete(h);
						break;
					}
				}
			}
		}
	}

	/**
	 * Emit an event to all subscribers.
	 *
	 * @param {string} event — Event name (e.g. 'detail:open')
	 * @param {*} [data] — Payload passed to handlers
	 */
	function emit(event, data) {
		if (_debug) {
			console.log(
				`%c⬡ EventBus%c ${event}`,
				"color:#6366f1;font-weight:bold",
				"color:#94a3b8",
				data
			);
		}

		// Record history
		_history.push({ event, data, timestamp: Date.now() });
		if (_history.length > MAX_HISTORY) _history.shift();

		// Exact match listeners
		const handlers = _listeners.get(event);
		if (handlers) {
			for (const handler of handlers) {
				try {
					handler(data, event);
				} catch (err) {
					console.error(`[FV EventBus] Error in handler for '${event}':`, err);
				}
			}
		}

		// Wildcard listeners — 'detail:open' matches listeners on 'detail:*'
		const colonIdx = event.indexOf(":");
		if (colonIdx !== -1) {
			const prefix = event.slice(0, colonIdx + 1);
			const wildcardHandlers = _wildcardListeners.get(prefix);
			if (wildcardHandlers) {
				for (const handler of wildcardHandlers) {
					try {
						handler(data, event);
					} catch (err) {
						console.error(`[FV EventBus] Error in wildcard handler for '${event}':`, err);
					}
				}
			}
		}
	}

	/**
	 * Remove all listeners for a specific event, or all events.
	 * @param {string} [event] — If omitted, clears ALL listeners.
	 */
	function clear(event) {
		if (event) {
			_listeners.delete(event);
			if (event.endsWith(":*")) {
				_wildcardListeners.delete(event.slice(0, -1));
			}
		} else {
			_listeners.clear();
			_wildcardListeners.clear();
		}
	}

	/**
	 * Get the event history (last 100 events).
	 * @returns {Array<{event: string, data: any, timestamp: number}>}
	 */
	function getHistory() {
		return [..._history];
	}

	/**
	 * Get all registered event names.
	 * @returns {string[]}
	 */
	function getRegisteredEvents() {
		const events = [..._listeners.keys()];
		for (const prefix of _wildcardListeners.keys()) {
			events.push(prefix + "*");
		}
		return events;
	}

	/**
	 * Get subscriber count for a specific event.
	 * @param {string} event
	 * @returns {number}
	 */
	function listenerCount(event) {
		let count = _listeners.get(event)?.size || 0;
		const colonIdx = event.indexOf(":");
		if (colonIdx !== -1) {
			const prefix = event.slice(0, colonIdx + 1);
			count += _wildcardListeners.get(prefix)?.length || 0;
		}
		return count;
	}

	// ── Public API ─────────────────────────────────────────────────
	frappe.visual.eventBus = {
		on,
		off,
		once,
		emit,
		clear,
		getHistory,
		getRegisteredEvents,
		listenerCount,
		get debug() { return _debug; },
		set debug(v) { _debug = !!v; },
	};
})();
