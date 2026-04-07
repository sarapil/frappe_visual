// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Notification Realtime Bridge
 * ===============================================
 * Wires frappe.realtime events into the NotificationCenter component
 * and the EventBus. Handles:
 *
 *  1. Real-time push: new notifications appear instantly
 *  2. Server read-state sync: mark-read persisted to server cache
 *  3. Sound notifications with user-configurable volume
 *  4. Desktop notifications (Notification API) for background tabs
 *  5. EventBus integration: notification:new, notification:read, notification:count
 *
 * @module frappe_visual/utils/notification_realtime
 */

frappe.provide("frappe.visual.notificationRealtime");

(function () {
	"use strict";

	const SOUND_KEY = "fv_notif_sound";
	const DESKTOP_KEY = "fv_notif_desktop";
	let _soundEnabled = false;
	let _desktopEnabled = false;
	let _audioCtx = null;
	let _nc = null; // NotificationCenter instance reference

	/* ── Init ─────────────────────────────────────────────────── */
	function init() {
		_soundEnabled = localStorage.getItem(SOUND_KEY) === "1";
		_desktopEnabled = localStorage.getItem(DESKTOP_KEY) === "1";

		_bindRealtimeEvents();
		_requestDesktopPermission();

		// Get reference to NotificationCenter once it's ready
		setTimeout(() => {
			_nc = frappe.visual?.NotificationCenter?._instance || null;
		}, 1000);
	}

	/* ── Realtime Event Binding ───────────────────────────────── */
	function _bindRealtimeEvents() {
		if (!frappe.realtime) return;

		// Standard Frappe notification events
		frappe.realtime.on("notification", _onNewNotification);
		frappe.realtime.on("doc_update", _onDocUpdate);
		frappe.realtime.on("mention", _onMention);
		frappe.realtime.on("assignment", _onAssignment);
		frappe.realtime.on("energy_point", _onEnergyPoint);

		// Custom FV notification channel
		frappe.realtime.on("fv_notification", _onNewNotification);

		// Bulk read sync from another tab/device
		frappe.realtime.on("fv_notif_sync", _onSyncFromServer);
	}

	/* ── New Notification Handler ─────────────────────────────── */
	function _onNewNotification(data) {
		const notification = _normalizeNotification(data);
		if (!notification) return;

		// Push to NotificationCenter
		if (_nc && _nc.notifications) {
			_nc.notifications.unshift(notification);
			if (_nc.notifications.length > (_nc.opts?.maxItems || 100)) {
				_nc.notifications.pop();
			}
			_nc._updateBadge?.();
			if (_nc.isOpen) _nc._renderItems?.();
		}

		// Emit to EventBus
		frappe.visual?.eventBus?.emit("notification:new", notification);
		frappe.visual?.eventBus?.emit("notification:count", {
			unread: _nc?.notifications?.filter(n => !n.read).length || 0,
		});

		// Sound
		if (_soundEnabled) _playNotificationSound(notification.priority);

		// Desktop notification
		if (_desktopEnabled && document.hidden) {
			_showDesktopNotification(notification);
		}

		// Toast for in-app
		_showToast(notification);
	}

	/* ── Specialized Event Handlers ───────────────────────────── */
	function _onDocUpdate(data) {
		if (!data?.doctype || !data?.name) return;
		_onNewNotification({
			category: "system",
			title: __("{0} updated", [data.doctype]),
			message: data.name,
			priority: "info",
			doctype: data.doctype,
			docname: data.name,
		});
	}

	function _onMention(data) {
		_onNewNotification({
			category: "mention",
			title: __("You were mentioned"),
			message: data?.comment || data?.message || "",
			priority: "info",
			owner: data?.owner,
			doctype: data?.doctype,
			docname: data?.name,
		});
	}

	function _onAssignment(data) {
		_onNewNotification({
			category: "assignment",
			title: data?.assigned_by
				? __("{0} assigned you", [data.assigned_by])
				: __("New assignment"),
			message: data?.description || `${data?.doctype}: ${data?.name}`,
			priority: "warning",
			doctype: data?.doctype,
			docname: data?.name,
		});
	}

	function _onEnergyPoint(data) {
		_onNewNotification({
			category: "energy",
			title: __("Energy Points"),
			message: data?.message || __("{0} points", [data?.points || 0]),
			priority: "info",
		});
	}

	/* ── Normalize Notification Shape ─────────────────────────── */
	function _normalizeNotification(data) {
		if (!data) return null;
		return {
			id: data.name || `fv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			category: data.category || data.type || "system",
			title: data.title || data.subject || __("Notification"),
			message: data.message || data.email_content || "",
			priority: data.priority || "info",
			read: false,
			timestamp: data.creation || frappe.datetime?.now_datetime() || new Date().toISOString(),
			owner: data.owner || data.from_user || "",
			doctype: data.doctype || data.document_type || "",
			docname: data.docname || data.document_name || "",
			link: data.link || (data.doctype && data.docname
				? `/app/${frappe.router?.slug(data.doctype)}/${data.docname}`
				: ""),
		};
	}

	/* ── Mark Read — Server Sync ──────────────────────────────── */
	async function markRead(notificationId) {
		// Update local state
		if (_nc?.notifications) {
			const notif = _nc.notifications.find(n => n.id === notificationId);
			if (notif) notif.read = true;
			_nc._updateBadge?.();
			if (_nc.isOpen) _nc._renderItems?.();
		}

		frappe.visual?.eventBus?.emit("notification:read", { id: notificationId });

		// Sync to server
		try {
			await frappe.xcall(
				"frappe_visual.api.v1.notifications.mark_read",
				{ notification_id: notificationId }
			);
		} catch { /* best-effort */ }
	}

	async function markAllRead() {
		if (_nc?.notifications) {
			_nc.notifications.forEach(n => { n.read = true; });
			_nc._updateBadge?.();
			if (_nc.isOpen) _nc._renderItems?.();
		}

		frappe.visual?.eventBus?.emit("notification:count", { unread: 0 });

		try {
			await frappe.xcall(
				"frappe_visual.api.v1.notifications.mark_all_read"
			);
		} catch { /* best-effort */ }
	}

	/* ── Server Sync Incoming ─────────────────────────────────── */
	function _onSyncFromServer(data) {
		if (data?.read_ids && _nc?.notifications) {
			const readSet = new Set(data.read_ids);
			_nc.notifications.forEach(n => {
				if (readSet.has(n.id)) n.read = true;
			});
			_nc._updateBadge?.();
		}
	}

	/* ── Sound ────────────────────────────────────────────────── */
	function _playNotificationSound(priority) {
		try {
			if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			const osc = _audioCtx.createOscillator();
			const gain = _audioCtx.createGain();
			osc.connect(gain);
			gain.connect(_audioCtx.destination);

			// Different tones for priority
			const freq = priority === "critical" ? 880 : priority === "warning" ? 660 : 440;
			osc.frequency.value = freq;
			osc.type = "sine";
			gain.gain.value = 0.1;
			gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.3);

			osc.start(_audioCtx.currentTime);
			osc.stop(_audioCtx.currentTime + 0.3);
		} catch {
			// Audio not available
		}
	}

	/* ── Desktop Notification ─────────────────────────────────── */
	function _requestDesktopPermission() {
		if (_desktopEnabled && "Notification" in window && Notification.permission === "default") {
			Notification.requestPermission();
		}
	}

	function _showDesktopNotification(notif) {
		if (!("Notification" in window) || Notification.permission !== "granted") return;

		try {
			const n = new Notification(notif.title, {
				body: notif.message?.replace(/<[^>]*>/g, "").slice(0, 120),
				icon: "/assets/frappe_visual/images/frappe_visual-logo.svg",
				tag: notif.id,
				silent: true, // We handle sound ourselves
			});

			n.onclick = () => {
				window.focus();
				if (notif.link) frappe.set_route(notif.link);
				n.close();
			};

			setTimeout(() => n.close(), 8000);
		} catch {
			// Desktop notifications not available
		}
	}

	/* ── In-App Toast ─────────────────────────────────────────── */
	function _showToast(notif) {
		// Use Frappe's built-in show_alert for non-intrusive notification
		const indicator = notif.priority === "critical" ? "red"
			: notif.priority === "warning" ? "orange" : "blue";

		frappe.show_alert({
			message: `<strong>${frappe.utils.escape_html(notif.title)}</strong><br>
					  <small>${frappe.utils.escape_html((notif.message || "").replace(/<[^>]*>/g, "").slice(0, 80))}</small>`,
			indicator,
		}, 5);
	}

	/* ── Settings ─────────────────────────────────────────────── */
	function enableSound(val = true) {
		_soundEnabled = val;
		localStorage.setItem(SOUND_KEY, val ? "1" : "0");
	}

	function enableDesktopNotifications(val = true) {
		_desktopEnabled = val;
		localStorage.setItem(DESKTOP_KEY, val ? "1" : "0");
		if (val) _requestDesktopPermission();
	}

	/* ── Public API ───────────────────────────────────────────── */
	frappe.visual.notificationRealtime = {
		init,
		markRead,
		markAllRead,
		enableSound,
		enableDesktopNotifications,
		get soundEnabled() { return _soundEnabled; },
		get desktopEnabled() { return _desktopEnabled; },
	};

	/* ── Boot ─────────────────────────────────────────────────── */
	$(document).on("app_ready", () => {
		setTimeout(init, 500);
	});
})();
