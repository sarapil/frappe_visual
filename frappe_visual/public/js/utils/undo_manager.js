/**
 * Frappe Visual — Undo / Redo Manager
 * ====================================
 * Command-pattern history manager for visual editors.
 * Integrates with deep_state.js checkpoints and
 * keyboard_shortcuts.js for Ctrl+Z / Ctrl+Shift+Z.
 *
 * @module utils/undo_manager
 * @since v0.2.0
 *
 * Usage:
 *   const mgr = frappe.visual.undo.create({ maxHistory: 100 });
 *   mgr.execute({ execute: () => addNode(n), undo: () => removeNode(n), label: "Add Node" });
 *   mgr.undo(); mgr.redo();
 *   mgr.onUpdate(({ canUndo, canRedo }) => updateButtons(canUndo, canRedo));
 */
(function () {
	"use strict";

	// ── UndoManager Class ──────────────────────────────────────

	class UndoManager {
		/**
		 * @param {Object} [options]
		 * @param {number} [options.maxHistory=100]
		 * @param {string} [options.scope] - Keyboard shortcut scope
		 * @param {boolean} [options.bindKeys=true] - Register Ctrl+Z / Ctrl+Shift+Z
		 */
		constructor(options = {}) {
			this._undoStack = [];
			this._redoStack = [];
			this._maxHistory = options.maxHistory || 100;
			this._listeners = new Set();
			this._scope = options.scope || null;
			this._groupId = 0;
			this._currentGroup = null;
			this._cleanupKeys = null;

			if (options.bindKeys !== false) {
				this._bindKeyboardShortcuts();
			}
		}

		// ── Core ───────────────────────────────────────────────

		/**
		 * Execute a command and push it onto the undo stack.
		 * @param {Object} command
		 * @param {Function} command.execute - Forward action
		 * @param {Function} command.undo - Reverse action
		 * @param {string} [command.label] - Human-readable label
		 * @param {*} [command.data] - Arbitrary metadata
		 * @returns {*} Return value of execute()
		 */
		execute(command) {
			if (typeof command.execute !== "function" || typeof command.undo !== "function") {
				throw new Error("[FV Undo] Command must have execute() and undo()");
			}

			const result = command.execute();

			const entry = {
				execute: command.execute,
				undo: command.undo,
				label: command.label || "Action",
				data: command.data || null,
				timestamp: Date.now(),
				group: this._currentGroup,
			};

			this._undoStack.push(entry);
			this._redoStack = []; // Clear redo on new action

			// Trim excess history
			while (this._undoStack.length > this._maxHistory) {
				this._undoStack.shift();
			}

			this._notify();
			_emit("undo:executed", { label: entry.label });
			return result;
		}

		/**
		 * Undo the last action (or last group).
		 * @returns {boolean} Whether something was undone
		 */
		undo() {
			if (!this.canUndo) return false;

			const entry = this._undoStack.pop();
			try {
				// If part of a group, undo all group members
				if (entry.group !== null) {
					const groupEntries = [entry];
					while (this._undoStack.length > 0 && this._undoStack[this._undoStack.length - 1].group === entry.group) {
						groupEntries.push(this._undoStack.pop());
					}
					// Undo in reverse order
					for (const e of groupEntries) {
						e.undo();
						this._redoStack.push(e);
					}
				} else {
					entry.undo();
					this._redoStack.push(entry);
				}
			} catch (err) {
				console.error("[FV Undo] Error during undo:", err);
				// Push back to undo stack on failure
				this._undoStack.push(entry);
				return false;
			}

			this._notify();
			_emit("undo:undone", { label: entry.label });
			return true;
		}

		/**
		 * Redo the last undone action (or group).
		 * @returns {boolean}
		 */
		redo() {
			if (!this.canRedo) return false;

			const entry = this._redoStack.pop();
			try {
				if (entry.group !== null) {
					const groupEntries = [entry];
					while (this._redoStack.length > 0 && this._redoStack[this._redoStack.length - 1].group === entry.group) {
						groupEntries.push(this._redoStack.pop());
					}
					// Redo in forward order (reverse of the reversed pop order)
					groupEntries.reverse();
					for (const e of groupEntries) {
						e.execute();
						this._undoStack.push(e);
					}
				} else {
					entry.execute();
					this._undoStack.push(entry);
				}
			} catch (err) {
				console.error("[FV Undo] Error during redo:", err);
				this._redoStack.push(entry);
				return false;
			}

			this._notify();
			_emit("undo:redone", { label: entry.label });
			return true;
		}

		// ── Grouping ──────────────────────────────────────────

		/**
		 * Begin a group — all commands executed between begin/end
		 * will be undone/redone as a single unit.
		 * @param {string} [label]
		 * @returns {number} Group id
		 */
		beginGroup(label) {
			this._currentGroup = ++this._groupId;
			this._currentGroupLabel = label || `Group ${this._groupId}`;
			return this._currentGroup;
		}

		/** End the current group. */
		endGroup() {
			this._currentGroup = null;
			this._currentGroupLabel = null;
		}

		/**
		 * Execute fn() within a group — syntactic sugar.
		 * @param {Function} fn
		 * @param {string} [label]
		 */
		group(fn, label) {
			this.beginGroup(label);
			try {
				fn();
			} finally {
				this.endGroup();
			}
		}

		// ── State ─────────────────────────────────────────────

		get canUndo() { return this._undoStack.length > 0; }
		get canRedo() { return this._redoStack.length > 0; }
		get undoCount() { return this._undoStack.length; }
		get redoCount() { return this._redoStack.length; }

		get undoLabel() {
			if (!this.canUndo) return null;
			return this._undoStack[this._undoStack.length - 1].label;
		}

		get redoLabel() {
			if (!this.canRedo) return null;
			return this._redoStack[this._redoStack.length - 1].label;
		}

		/** Full history for debugging. */
		get history() {
			return {
				undo: this._undoStack.map((e) => ({ label: e.label, ts: e.timestamp, group: e.group })),
				redo: this._redoStack.map((e) => ({ label: e.label, ts: e.timestamp, group: e.group })),
			};
		}

		/** Clear all history. */
		clear() {
			this._undoStack = [];
			this._redoStack = [];
			this._notify();
			_emit("undo:cleared");
		}

		// ── Listeners ─────────────────────────────────────────

		/**
		 * Subscribe to state changes.
		 * @param {Function} fn - Receives { canUndo, canRedo, undoLabel, redoLabel }
		 * @returns {Function} unsubscribe
		 */
		onUpdate(fn) {
			this._listeners.add(fn);
			return () => this._listeners.delete(fn);
		}

		_notify() {
			const state = {
				canUndo: this.canUndo,
				canRedo: this.canRedo,
				undoLabel: this.undoLabel,
				redoLabel: this.redoLabel,
				undoCount: this.undoCount,
				redoCount: this.redoCount,
			};
			this._listeners.forEach((fn) => {
				try { fn(state); } catch (err) { console.error("[FV Undo] Listener error:", err); }
			});
		}

		// ── Keyboard Integration ──────────────────────────────

		_bindKeyboardShortcuts() {
			if (!frappe.visual.keys?.register) return;

			const scope = this._scope || "global";
			const cleanups = [];

			cleanups.push(
				frappe.visual.keys.register("Ctrl+Z", () => {
					if (this.canUndo) {
						this.undo();
						frappe.show_alert({
							message: `↩ ${__("Undo")}: ${this.undoLabel || ""}`,
							indicator: "blue",
						}, 2);
					}
				}, { scope, label: __("Undo"), group: __("Edit") })
			);

			cleanups.push(
				frappe.visual.keys.register("Ctrl+Shift+Z", () => {
					if (this.canRedo) {
						this.redo();
						frappe.show_alert({
							message: `↪ ${__("Redo")}: ${this.redoLabel || ""}`,
							indicator: "green",
						}, 2);
					}
				}, { scope, label: __("Redo"), group: __("Edit") })
			);

			// Also support Ctrl+Y for redo (Windows convention)
			cleanups.push(
				frappe.visual.keys.register("Ctrl+Y", () => {
					if (this.canRedo) {
						this.redo();
						frappe.show_alert({
							message: `↪ ${__("Redo")}: ${this.redoLabel || ""}`,
							indicator: "green",
						}, 2);
					}
				}, { scope, label: __("Redo (Alt)"), group: __("Edit") })
			);

			this._cleanupKeys = () => cleanups.forEach((c) => c());
		}

		// ── Deep State Integration ────────────────────────────

		/**
		 * Wrap a ReactiveStore so that state changes are automatically tracked.
		 * Uses checkpoint/undo/redo from deep_state.js.
		 *
		 * @param {Object} store - A frappe.visual.state.create() store
		 * @param {string} [label="State Change"]
		 * @returns {Object} Wrapped store with autoTrack enabled
		 */
		trackStore(store, label = "State Change") {
			if (!store || !store.$checkpoint) {
				console.warn("[FV Undo] Store must be a ReactiveStore with checkpoint support");
				return store;
			}

			// Take initial checkpoint
			store.$checkpoint();

			// Create a proxy to intercept .set() calls
			const mgr = this;
			const originalSet = store.set.bind(store);
			const beforeState = () => store.snapshot;

			store.set = function (path, value) {
				const before = beforeState();
				const oldValue = store.get(path);
				mgr.execute({
					execute: () => originalSet(path, value),
					undo: () => originalSet(path, oldValue),
					label: `${label}: ${path}`,
					data: { path, before, after: value },
				});
			};

			return store;
		}

		/** Dispose: remove keyboard bindings and listeners. */
		dispose() {
			if (this._cleanupKeys) this._cleanupKeys();
			this._listeners.clear();
			this.clear();
		}
	}

	// ── Helpers ─────────────────────────────────────────────────

	function _emit(event, data) {
		if (frappe.visual.eventBus?.emit) {
			frappe.visual.eventBus.emit(event, data || {});
		}
	}

	// ── Factory ─────────────────────────────────────────────────

	/**
	 * Create a new UndoManager instance.
	 * @param {Object} [options]
	 * @returns {UndoManager}
	 */
	function create(options) {
		return new UndoManager(options);
	}

	// ── Default global instance ────────────────────────────────
	const _defaultManager = new UndoManager({
		maxHistory: 100,
		bindKeys: true,
		scope: "global",
	});

	// ── Public API ──────────────────────────────────────────────
	frappe.provide("frappe.visual.undo");

	Object.assign(frappe.visual.undo, {
		create,
		UndoManager,

		// Proxy default instance methods
		execute: (cmd) => _defaultManager.execute(cmd),
		undo: () => _defaultManager.undo(),
		redo: () => _defaultManager.redo(),
		beginGroup: (label) => _defaultManager.beginGroup(label),
		endGroup: () => _defaultManager.endGroup(),
		group: (fn, label) => _defaultManager.group(fn, label),
		clear: () => _defaultManager.clear(),
		trackStore: (store, label) => _defaultManager.trackStore(store, label),
		onUpdate: (fn) => _defaultManager.onUpdate(fn),

		get canUndo() { return _defaultManager.canUndo; },
		get canRedo() { return _defaultManager.canRedo; },
		get undoLabel() { return _defaultManager.undoLabel; },
		get redoLabel() { return _defaultManager.redoLabel; },
		get history() { return _defaultManager.history; },
	});

	console.log(
		"%c⬡ FV Undo%c ready — execute() · undo() · redo() · group() · trackStore()",
		"color:#f97316;font-weight:bold",
		"color:#94a3b8"
	);
})();
