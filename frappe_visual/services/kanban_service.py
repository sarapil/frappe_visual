# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Kanban Service
Business logic for Kanban board data fetching.
"""

import frappe
from frappe import _
import json


class KanbanService:
    """Service layer for Kanban board operations."""

    @staticmethod
    def get_kanban_data(
        doctype: str,
        fieldname: str,
        fields: list | None = None,
        filters: dict | None = None,
        order_by: str | None = None,
        limit: int = 200,
    ) -> dict:
        """
        Fetch records grouped by a select/status field for Kanban display.

        Args:
            doctype: Source DocType name.
            fieldname: Select field to group by.
            fields: List of fields to return.
            filters: Filter dict.
            order_by: SQL ORDER BY clause.
            limit: Max records.

        Returns:
            dict with 'cards', 'columns', and 'total' keys.
        """
        meta = frappe.get_meta(doctype)
        valid_fields = {df.fieldname for df in meta.fields}
        valid_fields |= {"name", "modified", "creation", "owner", "_comments", "_assign"}

        # Resolve fields
        if not fields:
            fields = ["name", fieldname, "modified"]
        fields = list(
            {f for f in set(fields) | {"name", fieldname, "modified"} if f in valid_fields}
        )

        # Fetch records
        cards = frappe.get_list(
            doctype,
            fields=fields,
            filters=filters or {},
            order_by=order_by or "modified desc",
            limit_page_length=limit,
        )

        # Enrich cards
        for card in cards:
            card["_doctype"] = doctype
            if "_comments" in card and card["_comments"]:
                try:
                    card["_comment_count"] = len(json.loads(card["_comments"]))
                except Exception:
                    card["_comment_count"] = 0
            else:
                card["_comment_count"] = 0
            card.pop("_comments", None)

        # Build columns from field options
        columns = []
        field_meta = meta.get_field(fieldname)
        if field_meta and field_meta.fieldtype == "Select" and field_meta.options:
            for option in field_meta.options.split("\n"):
                option = option.strip()
                if option:
                    columns.append({"value": option, "label": _(option)})

        return {"cards": cards, "columns": columns, "total": len(cards)}
