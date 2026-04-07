// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — User Preferences Sync
 * ========================================
 * Synchronizes UI preferences stored in localStorage with the server
 * via api/v1/preferences.py endpoints. This ensures consistent UX
 * when a user logs in from a different device or after cache-clear.
 *
 * Synced preferences:
 *  - Split mode per DocType (fv_dw_split_*)
 *  - Panel width (fv_dw_panel_width)
 *  - Nav sidebar state (fv_dw_nav_sidebar)
 *  - List view modes (fv_list_view_*)
 *  - Form enhancer enabled (fv_form_enhancer_enabled)
 *  - Workspace enhancer enabled (fv_ws_enhancer_enabled)
 *  - Shortcut cheatsheet shown (fv_shortcut_cheatsheet)
 *  - Theme preferences
 *
 * Sync strategy:
 *  - On login: pull all server prefs → merge into localStorage (server wins for conflicts)
 *  - On change: debounced push to server (2s after last change)
 *  - Conflict resolution: server timestamp wins
 *
 * @module frappe_visual/utils/user_preferences_sync
 */

frappe.provide("frappe.visual.preferencesSync");

(function () {
	"use strict";

	const SYNC_DEBOUNCE_MS = 2000;
	const SYNC_PREFIX = "fv_";
	const LAST_SYNC_KEY = "fv_prefs_last_sync";

	// Keys to sync (all start with fv_)
	const TRACKED_KEYS = [
		"fv_dw_panel_width",
		"fv_dw_nav_sidebar",
		"fv_form_enhancer_enabled",
		"fv_ws_enhancer_enabled",
		"fv_list_enhancer_enabled",
		"fv_ws_storytelling_enabled",
		"fv_notif_sound",
		"fv_notif_desktop",
	];

	// Pattern-matched keys (stored per-doctype)
	const TRACKED_PATTERNS = [
		/^fv_dw_split_/,
		/^fv_list_view_/,
	];

	let _syncTimer = null;
	let _pendingChanges = {};
	let _initialSyncDone = false;

	/* ── Init ─────────────────────────────────────────────────── */
	function init() {
		// Pull from server on login
		_pullFromServer();

		// Intercept localStorage setItem to detect changes
		_interceptLocalStorage();

		// Listen for EventBus preference changes
		if (frappe.visual?.eventBus) {
			frappe.visual.eventBus.on("preference:changed", _onPreferenceChanged);
		}

		// Cross-tab sync via storage event
		window.addEventListener("storage", _onStorageEvent);
	}

	/* ── Pull Preferences from Server ─────────────────────────── */
	async function _pullFromServer() {
		try {
			const result = await frappe.xcall(
				"frappe_visual.api.v1.preferences.get_all_preferences"
			);

			if (result?.data && typeof result.data === "object") {
				const serverPrefs = result.data;
				const serverTimestamp = result.timestamp || 0;
				const localTimestamp = parseInt(localStorage.getItem(LAST_SYNC_KEY)) || 0;

				// Merge: server wins for conflicts if server is newer
				for (const [key, value] of Object.entries(serverPrefs)) {
					if (_isTrackedKey(key)) {
						const localValue = localStorage.getItem(key);
						if (localValue === null || serverTimestamp >= localTimestamp) {
							localStorage.setItem(key, value);
						}
					}
				}

				localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
				_initialSyncDone = true;

				// Apply synced preferences to active components
				_applyPreferences();

				frappe.visual?.eventBus?.emit("preferences:synced", {
					source: "server",
					count: Object.keys(serverPrefs).length,
				});
			}
		} catch {
			// Server unavailable — use local prefs
			_initialSyncDone = true;
		}
	}

	/* ── Push Preferences to Server ───────────────────────────── */
	async function _pushToServer() {
		if (!Object.keys(_pendingChanges).length) return;

		const changes = { ..._pendingChanges };
		_pendingChanges = {};

		try {
			await frappe.xcall(
				"frappe_visual.api.v1.preferences.save_preferences",
				{ preferences: changes }
			);
			localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
		} catch {
			// Re-queue failed changes
			Object.assign(_pendingChanges, changes);
		}
	}

	function _schedulePush() {
		clearTimeout(_syncTimer);
		_syncTimer = setTimeout(_pushToServer, SYNC_DEBOUNCE_MS);
	}

	/* ── Intercept localStorage ───────────────────────────────── */
	function _interceptLocalStorage() {
		const origSetItem = localStorage.setItem.bind(localStorage);

		localStorage.setItem = function (key, value) {
			origSetItem(key, value);

			// Track FV preference changes
			if (_isTrackedKey(key)) {
				_pendingChanges[key] = value;
				_schedulePush();
			}
		};
	}

	/* ── Storage Event (cross-tab) ────────────────────────────── */
	function _onStorageEvent(e) {
		if (!e.key || !_isTrackedKey(e.key)) return;

		// Another tab changed a preference — apply immediately
		frappe.visual?.eventBus?.emit("preference:changed", {
			key: e.key,
			value: e.newValue,
			source: "cross-tab",
		});

		_applyPreferences();
	}

	/* ── EventBus Handler ─────────────────────────────────────── */
	function _onPreferenceChanged(data) {
		if (data?.key && data?.value !== undefined && data?.source !== "sync") {
			localStorage.setItem(data.key, data.value);
		}
	}

	/* ── Check if Key Should be Tracked ───────────────────────── */
	function _isTrackedKey(key) {
		if (!key?.startsWith(SYNC_PREFIX)) return false;
		if (TRACKED_KEYS.includes(key)) return true;
		return TRACKED_PATTERNS.some(p => p.test(key));
	}

	/* ── Apply Preferences to Active Components ───────────────── */
	function _applyPreferences() {
		// Form enhancer
		const formEnabled = localStorage.getItem("fv_form_enhancer_enabled");
		if (formEnabled !== null && frappe.visual?.formEnhancer) {
			if (formEnabled === "1") frappe.visual.formEnhancer.enable?.();
			else frappe.visual.formEnhancer.disable?.();
		}

		// List enhancer
		const listEnabled = localStorage.getItem("fv_list_enhancer_enabled");
		if (listEnabled !== null && frappe.visual?.listEnhancer) {
			if (listEnabled === "1") frappe.visual.listEnhancer.enable?.();
			else frappe.visual.listEnhancer.disable?.();
		}

		// Workspace enhancer
		const wsEnabled = localStorage.getItem("fv_ws_enhancer_enabled");
		if (wsEnabled !== null && frappe.visual?.workspaceEnhancer) {
			if (wsEnabled === "1") frappe.visual.workspaceEnhancer.enable?.();
			else frappe.visual.workspaceEnhancer.disable?.();
		}

		// Notification sound
		const soundEnabled = localStorage.getItem("fv_notif_sound");
		if (soundEnabled !== null && frappe.visual?.notificationRealtime) {
			frappe.visual.notificationRealtime.enableSound(soundEnabled === "1");
		}
	}

	/* ── Get All FV Preferences ───────────────────────────────── */
	function getAllPreferences() {
		const prefs = {};
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (_isTrackedKey(key)) {
				prefs[key] = localStorage.getItem(key);
			}
		}
		return prefs;
	}

	/* ── Reset All Preferences ────────────────────────────────── */
	async function resetAll() {
		const keys = [];
		for (let i = localStorage.length - 1; i >= 0; i--) {
			const key = localStorage.key(i);
			if (_isTrackedKey(key)) {
				keys.push(key);
			}
		}
		keys.forEach(k => localStorage.removeItem(k));

		try {
			await frappe.xcall(
				"frappe_visual.api.v1.preferences.clear_all_preferences"
			);
		} catch { /* silent */ }

		frappe.visual?.eventBus?.emit("preferences:reset");
		_applyPreferences();
	}

	/* ── Force Sync ───────────────────────────────────────────── */
	async function forceSync() {
		// Push any pending local changes
		await _pushToServer();
		// Then pull from server
		await _pullFromServer();
	}

	/* ── Public API ───────────────────────────────────────────── */
	frappe.visual.preferencesSync = {
		init,
		forceSync,
		getAllPreferences,
		resetAll,
		get isSynced() { return _initialSyncDone; },
		get pendingChanges() { return Object.keys(_pendingChanges).length; },
	};

	/* ── Boot ─────────────────────────────────────────────────── */
	$(document).on("app_ready", () => {
		// Defer to let other modules initialize first
		setTimeout(init, 800);
	});
})();
