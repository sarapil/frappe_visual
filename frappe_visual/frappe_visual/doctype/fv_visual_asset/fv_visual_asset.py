# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""FV Visual Asset — stores visual configs (stories, whiteboards, dashboards, etc.)."""

import json
import frappe
from frappe import _
from frappe.model.document import Document


class FVVisualAsset(Document):
    """Controller for FV Visual Asset DocType."""

    def validate(self):
        self._validate_asset_data()
        self._validate_reference()

    def _validate_asset_data(self):
        """Ensure asset_data is valid JSON."""
        if self.asset_data:
            try:
                if isinstance(self.asset_data, str):
                    json.loads(self.asset_data)
            except json.JSONDecodeError:
                frappe.throw(_("Asset Data must be valid JSON"), title=_("Validation Error"))

    def _validate_reference(self):
        """If reference_doctype is set, reference_name must also be set."""
        if self.reference_doctype and not self.reference_name:
            frappe.throw(
                _("Reference Name is required when Reference DocType is set"),
                title=_("Validation Error"),
            )
