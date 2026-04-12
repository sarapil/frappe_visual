# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — User Preferences API v1
=========================================
Server-side sync for UI preferences (split mode, panel width,
view mode, recent records). Replaces localStorage-only storage
with server-backed persistence for cross-device sync.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error
import json


PREF_CACHE_KEY = "fv_user_prefs:{user}"
MAX_RECENT = 30
ALLOWED_KEYS = {
    "split_mode", "panel_width", "nav_sidebar", "list_view_modes",
    "form_enhancer", "workspace_enhancer", "theme_mode",
    "shortcut_cheatsheet_seen", "onboarding_completed",
    "notification_sound", "notification_position",
    "dock_layout", "recent_records",
}


@frappe.whitelist()
def get_preferences() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Get all Frappe Visual preferences for the current user.
    Merges server-stored values with defaults.
    """
    user = frappe.session.user
    prefs = _load_prefs(user)
    return success(data=prefs)


@frappe.whitelist()
def set_preference(key: str, value: str) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Set a single preference key.

    Args:
        key: Preference key (must be in ALLOWED_KEYS).
        value: JSON-encoded value.
    """
    user = frappe.session.user

    if key not in ALLOWED_KEYS:
        return error(f"Unknown preference key: {key}", "INVALID_KEY")

    prefs = _load_prefs(user)
    try:
        prefs[key] = json.loads(value) if isinstance(value, str) else value
    except (json.JSONDecodeError, TypeError):
        prefs[key] = value

    _save_prefs(user, prefs)
    return success(message=f"Preference '{key}' updated")


@frappe.whitelist()
def set_preferences_bulk(preferences: str) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Set multiple preferences at once.

    Args:
        preferences: JSON object of {key: value} pairs.
    """
    user = frappe.session.user

    if isinstance(preferences, str):
        preferences = json.loads(preferences)

    if not isinstance(preferences, dict):
        return error("preferences must be a JSON object", "INVALID_PARAM")

    prefs = _load_prefs(user)

    for key, value in preferences.items():
        if key in ALLOWED_KEYS:
            prefs[key] = value

    _save_prefs(user, prefs)
    return success(message=f"{len(preferences)} preference(s) updated")


@frappe.whitelist()
def add_recent_record(doctype: str, docname: str, label: str | None = None) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Add a document to the user's recent records list.
    Maintains a FIFO queue of MAX_RECENT items.
    """
    user = frappe.session.user

    if not doctype or not docname:
        return error("doctype and docname are required", "MISSING_PARAMS")

    prefs = _load_prefs(user)
    recent = prefs.get("recent_records", [])

    # Remove existing entry for same doc (dedup)
    recent = [r for r in recent if not (r["doctype"] == doctype and r["docname"] == docname)]

    # Prepend new record
    recent.insert(0, {
        "doctype": doctype,
        "docname": docname,
        "label": label or docname,
        "timestamp": frappe.utils.now(),
    })

    # Trim to max
    prefs["recent_records"] = recent[:MAX_RECENT]
    _save_prefs(user, prefs)

    return success(data={"recent_count": len(prefs["recent_records"])})


@frappe.whitelist()
def get_recent_records(limit: int = 20) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Get the user's recent records list."""
    user = frappe.session.user
    prefs = _load_prefs(user)
    recent = prefs.get("recent_records", [])
    limit = min(MAX_RECENT, max(1, int(limit)))
    return success(data=recent[:limit])


@frappe.whitelist()
def clear_recent_records() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Clear all recent records for the current user."""
    user = frappe.session.user
    prefs = _load_prefs(user)
    prefs["recent_records"] = []
    _save_prefs(user, prefs)
    return success(message="Recent records cleared")


@frappe.whitelist()
def get_all_preferences() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Get all FV preferences for the current user with sync timestamp.
    Used by user_preferences_sync.js for cross-device sync.
    """
    user = frappe.session.user
    prefs = _load_prefs(user)

    # Also collect fv_* keys from User Settings
    fv_keys = {}
    try:
        settings = frappe.db.get_value(
            "User Settings",
            {"user": user, "doctype": "FV Sync Preferences"},
            "data",
        )
        if settings:
            fv_keys = json.loads(settings)
    except Exception:
        pass

    # Merge structured prefs into flat fv_ keys
    merged = {**fv_keys}
    if prefs.get("panel_width"):
        merged["fv_dw_panel_width"] = str(prefs["panel_width"])
    if prefs.get("nav_sidebar") is not None:
        merged["fv_dw_nav_sidebar"] = "1" if prefs["nav_sidebar"] else "0"
    if prefs.get("form_enhancer") is not None:
        merged["fv_form_enhancer_enabled"] = "1" if prefs["form_enhancer"] else "0"
    if prefs.get("workspace_enhancer") is not None:
        merged["fv_ws_enhancer_enabled"] = "1" if prefs["workspace_enhancer"] else "0"
    if prefs.get("notification_sound") is not None:
        merged["fv_notif_sound"] = "1" if prefs["notification_sound"] else "0"

    return success(data=merged, message=str(frappe.utils.now_datetime()))


@frappe.whitelist()
def save_preferences(preferences: str | dict) -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """
    Save a batch of flat fv_* key-value preferences.
    Used by user_preferences_sync.js for cross-device sync.
    """
    user = frappe.session.user

    if isinstance(preferences, str):
        preferences = json.loads(preferences)

    if not isinstance(preferences, dict):
        return error("preferences must be a JSON object", "INVALID_PARAM")

    # Load existing flat prefs
    existing = {}
    try:
        settings = frappe.db.get_value(
            "User Settings",
            {"user": user, "doctype": "FV Sync Preferences"},
            ["name", "data"],
            as_dict=True,
        )
        if settings and settings.data:
            existing = json.loads(settings.data)
    except Exception:
        settings = None

    # Merge incoming
    for key, value in preferences.items():
        if key.startswith("fv_"):
            existing[key] = value

    # Save
    data_json = json.dumps(existing)
    try:
        if settings and settings.name:
            frappe.db.set_value("User Settings", settings.name, "data", data_json)
        else:
            frappe.get_doc({
                "doctype": "User Settings",
                "user": user,
                "doctype_or_field": "FV Sync Preferences",
                "data": data_json,
            }).insert(ignore_permissions=True)
    except Exception:
        # Fall back to cache-only
        frappe.cache.set_value(
            f"fv_sync_prefs:{user}", existing,
            expires_in_sec=86400 * 30
        )

    return success(message=f"{len(preferences)} preference(s) synced")


@frappe.whitelist()
def clear_all_preferences() -> dict:
    frappe.only_for(["System Manager", "Website Manager"])
    """Clear all FV preferences for the current user."""
    user = frappe.session.user

    # Clear structured prefs
    _save_prefs(user, _get_defaults())

    # Clear flat sync prefs
    try:
        existing = frappe.db.get_value(
            "User Settings",
            {"user": user, "doctype": "FV Sync Preferences"},
            "name",
        )
        if existing:
            frappe.db.set_value("User Settings", existing, "data", "{}")
    except Exception:
        pass

    frappe.cache.delete_value(f"fv_sync_prefs:{user}")
    return success(message="All preferences cleared")


# ── Internal Helpers ───────────────────────────────────────────

def _load_prefs(user: str) -> dict:
    """Load preferences from cache, falling back to User Settings."""
    cache_key = PREF_CACHE_KEY.format(user=user)
    prefs = frappe.cache.get_value(cache_key)
    if prefs is not None:
        return prefs

    # Try loading from User Settings (if DocType exists)
    try:
        settings = frappe.db.get_value(
            "User Settings",
            {"user": user, "doctype": "FV Visual Preferences"},
            "data",
        )
        if settings:
            prefs = json.loads(settings)
            frappe.cache.set_value(cache_key, prefs, expires_in_sec=3600)
            return prefs
    except Exception:
        pass

    # Return defaults
    defaults = _get_defaults()
    frappe.cache.set_value(cache_key, defaults, expires_in_sec=3600)
    return defaults


def _save_prefs(user: str, prefs: dict) -> None:
    """Save preferences to cache and User Settings."""
    cache_key = PREF_CACHE_KEY.format(user=user)
    frappe.cache.set_value(cache_key, prefs, expires_in_sec=3600)

    # Persist to User Settings
    try:
        existing = frappe.db.get_value(
            "User Settings",
            {"user": user, "doctype": "FV Visual Preferences"},
            "name",
        )
        data_json = json.dumps(prefs)
        if existing:
            frappe.db.set_value("User Settings", existing, "data", data_json)
        else:
            frappe.get_doc({
                "doctype": "User Settings",
                "user": user,
                "doctype_or_field": "FV Visual Preferences",
                "data": data_json,
            }).insert(ignore_permissions=True)
    except Exception:
        # User Settings might not support this — cache is still saved
        pass


def _get_defaults() -> dict:
    """Default preference values."""
    return {
        "split_mode": {},
        "panel_width": 42,
        "nav_sidebar": False,
        "list_view_modes": {},
        "form_enhancer": True,
        "workspace_enhancer": True,
        "theme_mode": "auto",
        "notification_sound": False,
        "notification_position": "end",
        "recent_records": [],
    }
