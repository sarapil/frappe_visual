# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Test Configuration
Shared fixtures and helpers for Frappe Visual tests.
"""

import frappe
import pytest


@pytest.fixture(scope="module")
def site_setup():
    """Ensure test site is set up correctly."""
    frappe.set_user("Administrator")
    yield
    frappe.set_user("Administrator")


@pytest.fixture
def as_admin():
    """Run test as Administrator."""
    frappe.set_user("Administrator")
    yield
    frappe.set_user("Administrator")


@pytest.fixture
def as_guest():
    """Run test as Guest user."""
    frappe.set_user("Guest")
    yield
    frappe.set_user("Administrator")


@pytest.fixture
def test_user():
    """Create and return a temporary test user with proper roles."""
    user_email = "test_frappe_visual@example.com"
    if not frappe.db.exists("User", user_email):
        user = frappe.get_doc({
            "doctype": "User",
            "email": user_email,
            "first_name": "Test",
            "last_name": "Frappe Visual",
            "enabled": 1,
            "user_type": "System User",
            "roles": [
                {"role": "System Manager"},
                {"role": "All"},
            ],
        })
        user.insert(ignore_permissions=True)
    else:
        # Ensure roles are up-to-date
        user = frappe.get_doc("User", user_email)
        existing_roles = {r.role for r in user.roles}
        for role_name in ("System Manager", "All"):
            if role_name not in existing_roles:
                user.append("roles", {"role": role_name})
        user.save(ignore_permissions=True)

    frappe.set_user(user_email)
    yield user_email
    frappe.set_user("Administrator")
    if frappe.db.exists("User", user_email):
        frappe.delete_doc("User", user_email, force=True)
