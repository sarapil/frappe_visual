# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Notifications API v1
======================================
Server-side persistence for NotificationCenter state:
read status, snooze, preferences, and grouped retrieval.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error, paginated
import json


@frappe.whitelist()
def get_notifications(category: str = "all", page: int = 1,
                      page_size: int = 30, unread_only: bool = False) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Fetch grouped notifications for the current user.
    Returns notifications with time-group labels (today/yesterday/week/older).
    """
    user = frappe.session.user
    page = max(1, int(page))
    page_size = min(100, max(1, int(page_size)))

    filters = {"for_user": user}

    if category and category != "all":
        type_map = {
            "mention": "Mention",
            "assignment": "Assignment",
            "alert": "Alert",
            "energy": "Energy Point",
            "system": "System",
        }
        if category in type_map:
            filters["type"] = type_map[category]

    if unread_only:
        filters["read"] = 0

    total = frappe.db.count("Notification Log", filters)
    start = (page - 1) * page_size

    notifications = frappe.get_all(
        "Notification Log",
        filters=filters,
        fields=[
            "name", "subject", "email_content", "type",
            "document_type", "document_name", "from_user",
            "read", "creation", "modified",
        ],
        order_by="creation desc",
        start=start,
        limit_page_length=page_size,
    )

    # Get read & snooze state from cache
    state = _get_notification_state(user)

    for n in notifications:
        n["is_read"] = bool(n.get("read")) or n["name"] in state.get("read", set())
        n["is_snoozed"] = n["name"] in state.get("snoozed", {})
        n["priority"] = _classify_priority(n)
        n["time_group"] = _time_group(n["creation"])

    return paginated(notifications, total, page, page_size)


@frappe.whitelist()
def mark_read(notification_names: str | list | None = None,
             notification_id: str | None = None) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Mark one or more notifications as read."""
    user = frappe.session.user

    # Support single notification_id from realtime bridge
    if notification_id and not notification_names:
        notification_names = [notification_id]
    elif isinstance(notification_names, str):
        try:
            notification_names = json.loads(notification_names)
        except (json.JSONDecodeError, TypeError):
            notification_names = [notification_names]

    if not isinstance(notification_names, list):
        return error("notification_names must be a list", "INVALID_PARAM")

    # Update in DB — only mark notifications that belong to the current user
    valid_names = frappe.get_all(
        "Notification Log",
        filters={"name": ["in", notification_names], "for_user": user},
        pluck="name",
    )
    for name in valid_names:
        try:
            frappe.db.set_value("Notification Log", name, "read", 1,
                                update_modified=False)
        except Exception as e:
            frappe.log_error(
                title=f"FV Notification mark_read failed for {name}",
                message=str(e),
            )
    notification_names = valid_names

    # Update cache state
    state = _get_notification_state(user)
    state.setdefault("read", set()).update(notification_names)
    _save_notification_state(user, state)

    return success(message=f"{len(notification_names)} notification(s) marked as read")


@frappe.whitelist()
def mark_all_read() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Mark all notifications as read for current user."""
    user = frappe.session.user
    frappe.db.sql("""
        UPDATE `tabNotification Log`
        SET `read` = 1
        WHERE `for_user` = %(user)s AND `read` = 0
    """, {"user": user})

    state = _get_notification_state(user)
    state["read"] = set()
    _save_notification_state(user, state)

    return success(message="All notifications marked as read")


@frappe.whitelist()
def snooze_notification(notification_name: str, snooze_until: str) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Snooze a notification until a specific datetime."""
    user = frappe.session.user

    if not notification_name or not snooze_until:
        return error("notification_name and snooze_until are required", "MISSING_PARAMS")

    state = _get_notification_state(user)
    state.setdefault("snoozed", {})[notification_name] = snooze_until
    _save_notification_state(user, state)

    return success(message="Notification snoozed")


@frappe.whitelist()
def get_unread_count() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Get unread notification count for navbar badge."""
    user = frappe.session.user
    count = frappe.db.count(
        "Notification Log",
        {"for_user": user, "read": 0}
    )
    return success(data={"count": count})


# ── Internal Helpers ───────────────────────────────────────────

def _get_notification_state(user: str) -> dict:
    """Get cached notification state (read set, snoozed dict)."""
    state = frappe.cache.get_value(f"fv_notif_state:{user}") or {}
    if isinstance(state.get("read"), list):
        state["read"] = set(state["read"])
    elif not isinstance(state.get("read"), set):
        state["read"] = set()
    if not isinstance(state.get("snoozed"), dict):
        state["snoozed"] = {}
    return state


def _save_notification_state(user: str, state: dict) -> None:
    """Save notification state to cache."""
    save_state = {
        "read": list(state.get("read", set())),
        "snoozed": state.get("snoozed", {}),
    }
    frappe.cache.set_value(
        f"fv_notif_state:{user}", save_state,
        expires_in_sec=86400 * 7
    )


def _classify_priority(notification: dict) -> str:
    """Classify notification priority from type and content."""
    ntype = (notification.get("type") or "").lower()
    subject = (notification.get("subject") or "").lower()

    if any(w in subject for w in ("error", "fail", "critical", "urgent")):
        return "critical"
    if any(w in subject for w in ("warning", "overdue", "expire")):
        return "warning"
    return "info"


def _time_group(creation) -> str:
    """Classify creation date into time groups."""
    from frappe.utils import now_datetime, getdate
    from datetime import timedelta

    now = now_datetime()
    today = getdate(now)
    created = getdate(creation)

    if created == today:
        return "today"
    elif created == today - timedelta(days=1):
        return "yesterday"
    elif created >= today - timedelta(days=7):
        return "this_week"
    return "older"
