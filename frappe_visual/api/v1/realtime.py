# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Realtime Collaboration API v1
Broadcasts events between users viewing the same visual resource.
"""

import frappe
from frappe import _
import json


@frappe.whitelist()
def broadcast(event: str, data: str = "{}", room: str | None = None):
    """Broadcast a realtime event to users in a room."""
    if not event or not isinstance(event, str):
        frappe.throw(_("Invalid event name"))

    try:
        payload = json.loads(data) if isinstance(data, str) else data
    except json.JSONDecodeError:
        payload = {}

    payload["_sender"] = frappe.session.user
    payload["_timestamp"] = frappe.utils.now()

    target_room = room or frappe.form_dict.get("room", "")

    frappe.publish_realtime(
        event=event,
        message=payload,
        after_commit=True,
    )


@frappe.whitelist()
def join_room(room: str):
    """Announce user presence in a room."""
    if not room:
        return

    user = frappe.session.user
    user_info = frappe.db.get_value(
        "User", user, ["full_name", "user_image"], as_dict=True
    ) or {}

    frappe.publish_realtime(
        event="fv_presence_update",
        message={
            "room": room,
            "action": "join",
            "user": user,
            "full_name": user_info.get("full_name", user),
            "user_image": user_info.get("user_image", ""),
        },
        after_commit=True,
    )


@frappe.whitelist()
def leave_room(room: str):
    """Announce user departure from a room."""
    if not room:
        return

    frappe.publish_realtime(
        event="fv_presence_update",
        message={
            "room": room,
            "action": "leave",
            "user": frappe.session.user,
        },
        after_commit=True,
    )
