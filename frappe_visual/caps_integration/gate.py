# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — CAPS Gate
Capability gating utilities for CAPS ↔ Frappe Visual integration.
"""

import frappe
from frappe import _
from functools import wraps


class CapabilityDenied(frappe.PermissionError):
    """Raised when a user lacks the required CAPS capability."""

    def __init__(self, capability_code: str, user: str = None):
        self.capability_code = capability_code
        self.user = user or frappe.session.user
        super().__init__(
            _("You do not have the '{0}' capability. Contact your administrator.").format(
                capability_code
            )
        )


def check_capability(capability_code: str, user: str = None) -> bool:
    """Check if user has a specific CAPS capability. Returns True/False."""
    user = user or frappe.session.user

    if "System Manager" in frappe.get_roles(user):
        return True
    if user == "Administrator":
        return True
    if not frappe.db.exists("DocType", "CAPS Capability"):
        return True  # CAPS not installed = no gating

    return bool(
        frappe.db.exists(
            "CAPS User Capability",
            {"user": user, "capability": capability_code, "enabled": 1},
        )
    )


def require_capability(capability_code: str):
    """Decorator: ensure calling user has a CAPS capability."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not check_capability(capability_code):
                raise CapabilityDenied(capability_code)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def on_before_save(doc, method=None):
    """
    doc_events hook for FV DocTypes.
    Ensures the user has the FV_manage_settings capability to modify
    public/shared Visual Assets, Dashboards, or Themes.
    """
    # Skip for Administrator
    if frappe.session.user == "Administrator":
        return

    # Only gate public/shared items — personal items are always allowed
    is_shared = getattr(doc, "is_public", 0) or getattr(doc, "is_default", 0)
    if not is_shared:
        return

    if not check_capability("FV_manage_settings"):
        raise CapabilityDenied("FV_manage_settings")
