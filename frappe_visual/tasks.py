# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Scheduled Tasks
=================================
Background jobs for cache maintenance, frecency decay,
and notification cleanup.
"""

import frappe
import time
import json


def cleanup_expired_snoozes():
    """Daily: Remove expired notification snoozes from cache."""
    from frappe.utils import now_datetime

    now = str(now_datetime())
    users = frappe.get_all("User", filters={"enabled": 1}, pluck="name")

    for user in users:
        state = frappe.cache.get_value(f"fv_notif_state:{user}")
        if not state or not state.get("snoozed"):
            continue

        snoozed = state.get("snoozed", {})
        expired = [k for k, v in snoozed.items() if v < now]

        if expired:
            for k in expired:
                del snoozed[k]
            state["snoozed"] = snoozed
            frappe.cache.set_value(
                f"fv_notif_state:{user}", state,
                expires_in_sec=86400 * 7
            )


def decay_frecency_scores():
    """Daily: Apply time-decay to frecency scores, evict stale entries."""
    users = frappe.get_all("User", filters={"enabled": 1}, pluck="name")
    now = time.time()
    threshold_hours = 30 * 24  # 30 days

    for user in users:
        key = f"fv_frecency:{user}"
        data = frappe.cache.get_value(key)
        if not data:
            continue

        cleaned = {}
        for entry_key, entry in data.items():
            age_hours = (now - entry.get("last", 0)) / 3600
            if age_hours < threshold_hours and entry.get("count", 0) > 0:
                cleaned[entry_key] = entry

        if len(cleaned) < len(data):
            frappe.cache.set_value(key, cleaned, expires_in_sec=86400 * 30)


def refresh_workspace_stats_cache():
    """Every 6 hours: Pre-warm workspace stats cache for faster Bento tiles."""
    workspaces = frappe.get_all(
        "Workspace",
        fields=["name"],
        limit_page_length=50,
    )

    for ws in workspaces:
        shortcuts = frappe.get_all(
            "Workspace Shortcut",
            filters={"parent": ws.name, "type": "DocType"},
            fields=["link_to"],
        )

        for sc in shortcuts:
            dt = sc.link_to
            try:
                if frappe.has_permission(dt, "read"):
                    count = frappe.db.count(dt)
                    cache_key = f"fv_ws_count:{dt}"
                    frappe.cache.set_value(cache_key, count, expires_in_sec=21600)
            except Exception:
                pass
