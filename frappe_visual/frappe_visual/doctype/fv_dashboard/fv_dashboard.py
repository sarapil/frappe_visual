# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""FV Dashboard — stores dashboard layouts with widget configurations."""

import json
import frappe
from frappe import _
from frappe.model.document import Document


class FVDashboard(Document):
    """Controller for FV Dashboard DocType."""

    def validate(self):
        self._validate_layout_config()
        self._validate_refresh_interval()

    def _validate_layout_config(self):
        """Ensure layout_config is valid JSON if provided."""
        if self.layout_config:
            try:
                if isinstance(self.layout_config, str):
                    json.loads(self.layout_config)
            except json.JSONDecodeError:
                frappe.throw(_("Layout Config must be valid JSON"), title=_("Validation Error"))

    def _validate_refresh_interval(self):
        """Refresh interval must be non-negative."""
        if self.refresh_interval and int(self.refresh_interval) < 0:
            frappe.throw(_("Refresh Interval cannot be negative"), title=_("Validation Error"))
