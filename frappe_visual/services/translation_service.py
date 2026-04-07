# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Translation Service
Reverse translation lookup and bilingual utilities.
"""

import frappe
from frappe import _


class TranslationService:
    """Service layer for translation and bilingual utilities."""

    @staticmethod
    def reverse_lookup(arabic_text: str) -> str | None:
        """
        Find the English source string for a given Arabic translation.

        Args:
            arabic_text: Arabic text to reverse-translate.

        Returns:
            English source string or None.
        """
        if not arabic_text or not isinstance(arabic_text, str):
            return None

        arabic_text = arabic_text.strip()
        if not arabic_text:
            return None

        try:
            # Exact match first
            translations = frappe.get_all(
                "Translation",
                filters={
                    "language": ["in", ["ar", "ar-SA", "ar-EG", "ar-AE"]],
                    "translated_text": arabic_text,
                },
                fields=["source_text"],
                limit=1,
            )
            if translations:
                return translations[0].source_text

            # Fuzzy match for longer strings
            if len(arabic_text) > 5:
                translations = frappe.get_all(
                    "Translation",
                    filters={
                        "language": ["in", ["ar", "ar-SA", "ar-EG", "ar-AE"]],
                        "translated_text": ["like", f"%{arabic_text}%"],
                    },
                    fields=["source_text", "translated_text"],
                    limit=5,
                )
                for t in translations:
                    if t.translated_text.strip() == arabic_text:
                        return t.source_text
        except Exception:
            frappe.log_error("Reverse translation lookup failed")

        return None
