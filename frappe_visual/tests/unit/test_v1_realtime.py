# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""Tests for Realtime Collaboration API v1 endpoints."""

import pytest
from unittest.mock import patch, MagicMock
import json
import frappe


class TestRealtimeAPI:
    """Test suite for frappe_visual.api.v1.realtime endpoints."""

    # ── broadcast ──────────────────────────────────────────────

    def test_broadcast_requires_login(self):
        """Guest users cannot call broadcast."""
        from frappe_visual.api.v1.realtime import broadcast

        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                broadcast(event="test_event")
        finally:
            frappe.set_user("Administrator")

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_broadcast_valid_event(self, mock_publish):
        """broadcast should call publish_realtime with correct payload."""
        from frappe_visual.api.v1.realtime import broadcast

        broadcast(event="fv_cursor_move", data='{"x": 10, "y": 20}')

        mock_publish.assert_called_once()
        call_kwargs = mock_publish.call_args[1]
        assert call_kwargs["event"] == "fv_cursor_move"
        assert call_kwargs["message"]["x"] == 10
        assert call_kwargs["message"]["y"] == 20
        assert call_kwargs["message"]["_sender"] == "Administrator"
        assert "_timestamp" in call_kwargs["message"]

    def test_broadcast_rejects_empty_event(self):
        """broadcast should throw on empty event name."""
        from frappe_visual.api.v1.realtime import broadcast

        with pytest.raises(frappe.ValidationError):
            broadcast(event="")

    def test_broadcast_rejects_non_string_event(self):
        """broadcast should throw on non-string event."""
        from frappe_visual.api.v1.realtime import broadcast

        with pytest.raises(frappe.ValidationError):
            broadcast(event=123)

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_broadcast_handles_invalid_json(self, mock_publish):
        """broadcast should fallback to empty dict for malformed JSON."""
        from frappe_visual.api.v1.realtime import broadcast

        broadcast(event="test", data="{broken json}")

        call_kwargs = mock_publish.call_args[1]
        # Payload should still have _sender and _timestamp despite bad JSON
        assert call_kwargs["message"]["_sender"] == "Administrator"

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_broadcast_injects_sender_and_timestamp(self, mock_publish):
        """Payload must always include _sender and _timestamp fields."""
        from frappe_visual.api.v1.realtime import broadcast

        broadcast(event="test_event", data='{"key": "value"}')

        payload = mock_publish.call_args[1]["message"]
        assert payload["_sender"] == "Administrator"
        assert payload["_timestamp"] is not None
        assert payload["key"] == "value"

    # ── join_room ──────────────────────────────────────────────

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_join_room_publishes_presence(self, mock_publish):
        """join_room should publish fv_presence_update with action=join."""
        from frappe_visual.api.v1.realtime import join_room

        join_room(room="whiteboard-001")

        mock_publish.assert_called_once()
        call_kwargs = mock_publish.call_args[1]
        assert call_kwargs["event"] == "fv_presence_update"
        assert call_kwargs["message"]["room"] == "whiteboard-001"
        assert call_kwargs["message"]["action"] == "join"
        assert call_kwargs["message"]["user"] == "Administrator"

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_join_room_empty_room_returns_early(self, mock_publish):
        """join_room with empty string should not publish anything."""
        from frappe_visual.api.v1.realtime import join_room

        join_room(room="")

        mock_publish.assert_not_called()

    def test_join_room_requires_login(self):
        """Guest users cannot call join_room."""
        from frappe_visual.api.v1.realtime import join_room

        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                join_room(room="test-room")
        finally:
            frappe.set_user("Administrator")

    # ── leave_room ─────────────────────────────────────────────

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_leave_room_publishes_departure(self, mock_publish):
        """leave_room should publish fv_presence_update with action=leave."""
        from frappe_visual.api.v1.realtime import leave_room

        leave_room(room="whiteboard-001")

        mock_publish.assert_called_once()
        call_kwargs = mock_publish.call_args[1]
        assert call_kwargs["event"] == "fv_presence_update"
        assert call_kwargs["message"]["room"] == "whiteboard-001"
        assert call_kwargs["message"]["action"] == "leave"
        assert call_kwargs["message"]["user"] == "Administrator"

    @patch("frappe_visual.api.v1.realtime.frappe.publish_realtime")
    def test_leave_room_empty_room_returns_early(self, mock_publish):
        """leave_room with empty string should not publish anything."""
        from frappe_visual.api.v1.realtime import leave_room

        leave_room(room="")

        mock_publish.assert_not_called()

    def test_leave_room_requires_login(self):
        """Guest users cannot call leave_room."""
        from frappe_visual.api.v1.realtime import leave_room

        frappe.set_user("Guest")
        try:
            with pytest.raises(frappe.PermissionError):
                leave_room(room="test-room")
        finally:
            frappe.set_user("Administrator")
