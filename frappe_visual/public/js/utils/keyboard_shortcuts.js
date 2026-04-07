/**
 * Frappe Visual — Keyboard Shortcuts Manager
 * ============================================
 * Unified shortcut registry for all visual components.
 * Handles key combos, scope isolation, cheat-sheet display,
 * and conflict detection.
 *
 * @module utils/keyboard_shortcuts
 * @since v0.2.0
 *
 * Usage:
 *   frappe.visual.keys.register("Ctrl+S", () => save(), { scope: "editor", label: "Save" })
 *   frappe.visual.keys.register("Ctrl+Z", () => undo(), { scope: "editor" })
 *   frappe.visual.keys.setScope("editor")
 *   frappe.visual.keys.showCheatSheet()
 */
(function () {
	"use strict";

	// ── State ──────────────────────────────────────────────────
	const _shortcuts = new Map();      // id → { combo, fn, scope, label, group, enabled }
	let _activeScope = "global";
	let _enabled = true;
	let _cheatSheetEl = null;
	let _nextId = 1;

	// ── Combo Parser ───────────────────────────────────────────

	/**
	 * Normalize a key combo string to a canonical form.
	 * "Ctrl+Shift+S" → "ctrl+shift+s"
	 * "cmd+s" → "ctrl+s" (mac normalization)
	 */
	function _normalizeCombo(combo) {
		return combo
			.toLowerCase()
			.replace(/\s+/g, "")
			.replace("cmd", "ctrl")
			.replace("command", "ctrl")
			.replace("meta", "ctrl")
			.replace("option", "alt")
			.split("+")
			.sort((a, b) => {
				const order = { ctrl: 0, alt: 1, shift: 2 };
				return (order[a] ?? 3) - (order[b] ?? 3);
			})
			.join("+");
	}

	/**
	 * Check if a KeyboardEvent matches a normalized combo.
	 */
	function _matchesEvent(normalized, event) {
		const parts = normalized.split("+");
		const key = parts.filter((p) => !["ctrl", "alt", "shift"].includes(p))[0];
		const needCtrl = parts.includes("ctrl");
		const needAlt = parts.includes("alt");
		const needShift = parts.includes("shift");

		const eventKey = event.key.toLowerCase();
		const eventCode = event.code?.toLowerCase() || "";

		const keyMatch = eventKey === key
			|| eventCode === `key${key}`
			|| eventCode === key
			|| (key === "escape" && eventKey === "escape")
			|| (key === "enter" && eventKey === "enter")
			|| (key === "space" && (eventKey === " " || eventCode === "space"))
			|| (key === "delete" && (eventKey === "delete" || eventKey === "backspace"))
			|| (key === "tab" && eventKey === "tab");

		return keyMatch
			&& (event.ctrlKey || event.metaKey) === needCtrl
			&& event.altKey === needAlt
			&& event.shiftKey === needShift;
	}

	// ── Registration ───────────────────────────────────────────

	/**
	 * Register a keyboard shortcut.
	 * @param {string} combo - "Ctrl+S", "Alt+Shift+N", "Escape", etc.
	 * @param {Function} fn - Handler function
	 * @param {Object} [options]
	 * @param {string} [options.scope="global"] - When to activate
	 * @param {string} [options.label] - Human-readable label
	 * @param {string} [options.group] - Group for cheat sheet
	 * @param {boolean} [options.preventDefault=true]
	 * @returns {Function} unregister
	 */
	function register(combo, fn, options = {}) {
		const id = _nextId++;
		const normalized = _normalizeCombo(combo);
		const {
			scope = "global",
			label = "",
			group = "General",
			preventDefault = true,
		} = options;

		// Conflict warning
		for (const [, existing] of _shortcuts) {
			if (existing.combo === normalized && (existing.scope === scope || existing.scope === "global" || scope === "global")) {
				console.warn(`[FV Keys] Shortcut conflict: "${combo}" already registered as "${existing.label}" in scope "${existing.scope}"`);
			}
		}

		_shortcuts.set(id, {
			combo: normalized,
			display: combo,
			fn,
			scope,
			label,
			group,
			preventDefault,
			enabled: true,
		});

		_emit("keys:registered", { combo, label, scope });

		return () => {
			_shortcuts.delete(id);
		};
	}

	/**
	 * Register multiple shortcuts at once.
	 * @param {Array} shortcuts - [{ combo, fn, scope, label, group }]
	 * @returns {Function} unregister all
	 */
	function registerMany(shortcuts) {
		const cleanups = shortcuts.map(({ combo, fn, ...opts }) =>
			register(combo, fn, opts)
		);
		return () => cleanups.forEach((cleanup) => cleanup());
	}

	// ── Scope Management ───────────────────────────────────────

	/**
	 * Set the active shortcut scope.
	 * Only shortcuts in this scope (+ "global") will fire.
	 * @param {string} scope
	 */
	function setScope(scope) {
		const prev = _activeScope;
		_activeScope = scope;
		_emit("keys:scopeChanged", { scope, prev });
	}

	function getScope() { return _activeScope; }

	/** Push scope (saves previous for pop). */
	const _scopeStack = [];
	function pushScope(scope) {
		_scopeStack.push(_activeScope);
		setScope(scope);
	}

	function popScope() {
		const prev = _scopeStack.pop();
		if (prev) setScope(prev);
	}

	// ── Event Handler ──────────────────────────────────────────

	function _handleKeyDown(event) {
		if (!_enabled) return;

		// Skip if user is typing in an input/textarea/contenteditable
		const tag = event.target.tagName;
		const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
			|| event.target.isContentEditable;

		for (const [, shortcut] of _shortcuts) {
			if (!shortcut.enabled) continue;
			if (shortcut.scope !== "global" && shortcut.scope !== _activeScope) continue;

			// Allow global shortcuts even in inputs if they use Ctrl/Alt
			if (isInput && shortcut.scope !== "global") continue;
			if (isInput && !shortcut.combo.includes("ctrl") && !shortcut.combo.includes("alt")) continue;

			if (_matchesEvent(shortcut.combo, event)) {
				if (shortcut.preventDefault) {
					event.preventDefault();
					event.stopPropagation();
				}
				try {
					shortcut.fn(event);
				} catch (err) {
					console.error(`[FV Keys] Error in shortcut "${shortcut.display}":`, err);
				}
				return;
			}
		}
	}

	document.addEventListener("keydown", _handleKeyDown, true);

	// ── Cheat Sheet ────────────────────────────────────────────

	function showCheatSheet() {
		if (_cheatSheetEl) {
			hideCheatSheet();
			return;
		}

		const groups = {};
		for (const [, s] of _shortcuts) {
			if (!s.label) continue;
			if (!groups[s.group]) groups[s.group] = [];
			groups[s.group].push(s);
		}

		_cheatSheetEl = document.createElement("div");
		_cheatSheetEl.className = "fv-keys-cheatsheet";

		let html = `<div class="fv-keys-cheatsheet__header">
			<h3>⌨️ ${__("Keyboard Shortcuts")}</h3>
			<span class="fv-keys-cheatsheet__scope">${__("Scope")}: ${_activeScope}</span>
			<button class="fv-keys-cheatsheet__close">&times;</button>
		</div><div class="fv-keys-cheatsheet__body">`;

		Object.entries(groups)
			.sort(([a], [b]) => a.localeCompare(b))
			.forEach(([group, shortcuts]) => {
				html += `<div class="fv-keys-cheatsheet__group"><h4>${group}</h4>`;
				shortcuts.forEach((s) => {
					const keys = s.display.split("+").map((k) =>
						`<kbd>${k.trim()}</kbd>`
					).join(" + ");
					const scopeBadge = s.scope !== "global" ? `<span class="fv-keys-scope-badge">${s.scope}</span>` : "";
					html += `<div class="fv-keys-cheatsheet__row">
						<span class="fv-keys-cheatsheet__label">${s.label} ${scopeBadge}</span>
						<span class="fv-keys-cheatsheet__combo">${keys}</span>
					</div>`;
				});
				html += `</div>`;
			});

		html += `</div>`;
		_cheatSheetEl.innerHTML = html;
		document.body.appendChild(_cheatSheetEl);

		_cheatSheetEl.querySelector(".fv-keys-cheatsheet__close").addEventListener("click", hideCheatSheet);

		// Close on Escape
		const escHandler = (e) => {
			if (e.key === "Escape") { hideCheatSheet(); document.removeEventListener("keydown", escHandler); }
		};
		document.addEventListener("keydown", escHandler);

		// Close on overlay click
		_cheatSheetEl.addEventListener("click", (e) => {
			if (e.target === _cheatSheetEl) hideCheatSheet();
		});
	}

	function hideCheatSheet() {
		if (_cheatSheetEl) {
			_cheatSheetEl.remove();
			_cheatSheetEl = null;
		}
	}

	// ── Built-in Shortcut: Show Cheat Sheet ────────────────────
	register("Ctrl+/", showCheatSheet, {
		scope: "global",
		label: __("Show Keyboard Shortcuts"),
		group: __("General"),
	});

	// ── Inject Styles ──────────────────────────────────────────
	const style = document.createElement("style");
	style.textContent = `
		.fv-keys-cheatsheet {
			position: fixed; inset: 0;
			z-index: 99999;
			background: rgba(0,0,0,0.5);
			backdrop-filter: blur(4px);
			display: flex; align-items: center; justify-content: center;
		}
		.fv-keys-cheatsheet__header {
			display: flex; align-items: center; gap: 12px;
			padding: 16px 20px;
			border-bottom: 1px solid var(--border-color, #e5e7eb);
		}
		.fv-keys-cheatsheet__header h3 {
			margin: 0; font-size: 16px; flex: 1;
		}
		.fv-keys-cheatsheet__scope {
			font-size: 11px; color: var(--text-muted, #6b7280);
			background: var(--subtle-fg, #f1f5f9); padding: 2px 8px; border-radius: 4px;
		}
		.fv-keys-cheatsheet__close {
			background: none; border: none; font-size: 22px; cursor: pointer;
			color: var(--text-muted, #6b7280); line-height: 1; padding: 0 4px;
		}
		.fv-keys-cheatsheet__body {
			background: var(--fg-color, #fff);
			border-radius: 12px;
			max-width: 560px; width: 90vw;
			max-height: 70vh; overflow-y: auto;
			box-shadow: 0 24px 64px rgba(0,0,0,0.2);
			padding: 0 0 16px;
		}
		.fv-keys-cheatsheet__group {
			padding: 8px 20px;
		}
		.fv-keys-cheatsheet__group h4 {
			font-size: 11px; font-weight: 700; text-transform: uppercase;
			letter-spacing: 0.05em; color: var(--text-muted, #6b7280);
			margin: 12px 0 6px; padding-bottom: 4px;
			border-bottom: 1px solid var(--border-color, #e5e7eb);
		}
		.fv-keys-cheatsheet__row {
			display: flex; justify-content: space-between; align-items: center;
			padding: 5px 0;
		}
		.fv-keys-cheatsheet__label { font-size: 13px; }
		.fv-keys-cheatsheet__combo { display: flex; gap: 4px; }
		.fv-keys-cheatsheet__combo kbd {
			display: inline-block; padding: 2px 8px;
			background: var(--subtle-fg, #f1f5f9);
			border: 1px solid var(--border-color, #e5e7eb);
			border-radius: 4px; font-size: 11px;
			font-family: "JetBrains Mono", monospace;
			min-width: 24px; text-align: center;
		}
		.fv-keys-scope-badge {
			font-size: 10px; padding: 1px 6px;
			background: rgba(99,102,241,0.1); color: var(--primary, #6366f1);
			border-radius: 3px; margin-inline-start: 6px;
		}
		html[data-theme="dark"] .fv-keys-cheatsheet__body,
		body.dark .fv-keys-cheatsheet__body {
			background: #1a1a2e; color: #e2e8f0;
		}
		html[data-theme="dark"] .fv-keys-cheatsheet__combo kbd,
		body.dark .fv-keys-cheatsheet__combo kbd {
			background: #0f0f23; border-color: #2d2d44;
		}
	`;
	document.head.appendChild(style);

	// ── Helpers ─────────────────────────────────────────────────
	function _emit(event, data) {
		if (frappe.visual.eventBus?.emit) {
			frappe.visual.eventBus.emit(event, data);
		}
	}

	// ── Public API ─────────────────────────────────────────────
	frappe.provide("frappe.visual.keys");

	Object.assign(frappe.visual.keys, {
		register,
		registerMany,
		setScope,
		getScope,
		pushScope,
		popScope,
		showCheatSheet,
		hideCheatSheet,

		/** Enable/disable all shortcuts. */
		set enabled(val) { _enabled = !!val; },
		get enabled() { return _enabled; },

		/** List all registered shortcuts. */
		list() {
			return [..._shortcuts.values()].map(({ combo, display, label, scope, group, enabled }) =>
				({ combo, display, label, scope, group, enabled })
			);
		},

		/** Get count of registered shortcuts. */
		get count() { return _shortcuts.size; },
	});

	console.log(
		"%c⬡ FV Keys%c ready — register() · setScope() · showCheatSheet() [Ctrl+/]",
		"color:#f97316;font-weight:bold",
		"color:#94a3b8"
	);
})();
