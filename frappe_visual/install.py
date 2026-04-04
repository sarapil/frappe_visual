# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Post-Install Setup
Runs after `bench install-app frappe_visual`.
"""

import frappe
from frappe import _


def after_install():
    """Post-installation setup for Frappe Visual."""
    inject_desktop_icon()
    print(f"✅ {_("Frappe Visual")}: post-install complete")


def inject_desktop_icon():
    """Create desktop shortcut icon for Frappe Visual."""
    if frappe.db.exists("Desktop Icon", {"module_name": "Frappe Visual"}):
        return

    try:
        frappe.get_doc({
            "doctype": "Desktop Icon",
            "module_name": "Frappe Visual",
            "label": _("Frappe Visual"),
            "icon": "octicon octicon-bookmark",
            "color": "#6366F1",
            "type": "module",
            "standard": 1,
        }).insert(ignore_permissions=True)
    except Exception:
        pass  # May not exist in all Frappe versions
