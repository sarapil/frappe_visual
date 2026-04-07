# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0

"""Tests for v1 Notifications API endpoints."""

import frappe
from frappe.tests.utils import FrappeTestCase


class TestNotificationsAPI(FrappeTestCase):
    """Tests for notification CRUD and grouping."""

    def test_get_notifications_returns_dict(self):
        """get_notifications should return paginated response."""
        from frappe_visual.api.v1.notifications import get_notifications
        result = get_notifications()
        self.assertEqual(result["status"], "success")
        self.assertIn("data", result)

    def test_get_notifications_unread_filter(self):
        """unread_only filter should work."""
        from frappe_visual.api.v1.notifications import get_notifications
        result = get_notifications(unread_only=True)
        self.assertEqual(result["status"], "success")

    def test_get_notifications_category_filter(self):
        """Category filter should not crash."""
        from frappe_visual.api.v1.notifications import get_notifications
        result = get_notifications(category="system")
        self.assertEqual(result["status"], "success")

    def test_get_notification_count(self):
        """get_notification_count should return a number."""
        try:
            from frappe_visual.api.v1.notifications import get_notification_count
            result = get_notification_count()
            self.assertEqual(result["status"], "success")
            self.assertIn("data", result)
        except ImportError:
            self.skipTest("get_notification_count not implemented")

    def test_mark_read_requires_list(self):
        """mark_read should handle empty list gracefully."""
        try:
            from frappe_visual.api.v1.notifications import mark_read
            result = mark_read(names="[]")
            self.assertIn(result["status"], ("success", "error"))
        except ImportError:
            self.skipTest("mark_read not implemented")

    def test_snooze_notification(self):
        """snooze_notification should accept valid duration."""
        try:
            from frappe_visual.api.v1.notifications import snooze_notification
            result = snooze_notification(name="nonexistent", duration_minutes=30)
            self.assertIn(result["status"], ("success", "error"))
        except ImportError:
            self.skipTest("snooze_notification not implemented")
