# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""FV Theme — stores custom theme configurations with CSS variable overrides."""

import json
import frappe
from frappe import _
from frappe.model.document import Document


class FVTheme(Document):
    """Controller for FV Theme DocType."""

    def validate(self):
        self._validate_css_variables()
        self._enforce_single_default()

    def _validate_css_variables(self):
        """Ensure css_variables is valid JSON."""
        if self.css_variables:
            try:
                data = json.loads(self.css_variables) if isinstance(self.css_variables, str) else self.css_variables
                if not isinstance(data, dict):
                    frappe.throw(_("CSS Variables must be a JSON object (key-value pairs)"))
            except json.JSONDecodeError:
                frappe.throw(_("CSS Variables must be valid JSON"), title=_("Validation Error"))

    def _enforce_single_default(self):
        """Only one theme can be default at a time."""
        if self.is_default:
            frappe.db.sql(
                "UPDATE `tabFV Theme` SET is_default = 0 WHERE name != %(name)s AND is_default = 1",
                {"name": self.name or ""},
            )
