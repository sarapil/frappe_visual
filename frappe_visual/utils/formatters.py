# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Formatters
Display formatting utilities for Frappe Visual.
"""

import frappe
from frappe.utils import fmt_money, format_date, format_datetime, flt


def format_currency(amount, currency=None):
    """Format amount as currency string."""
    currency = currency or frappe.defaults.get_global_default("currency") or "USD"
    return fmt_money(flt(amount), currency=currency)


def format_percentage(value, precision=1):
    """Format value as percentage string."""
    return f"{flt(value, precision)}%"


def format_date_short(date_value):
    """Format date in short user-friendly format."""
    return format_date(date_value, "dd MMM yyyy") if date_value else ""


def format_datetime_short(dt_value):
    """Format datetime in short user-friendly format."""
    return format_datetime(dt_value, "dd MMM yyyy HH:mm") if dt_value else ""


def truncate(text: str, max_length: int = 100) -> str:
    """Truncate text with ellipsis."""
    if not text or len(text) <= max_length:
        return text or ""
    return text[:max_length - 3] + "..."


def format_file_size(size_bytes: int) -> str:
    """Format bytes into human-readable size."""
    for unit in ("B", "KB", "MB", "GB"):
        if abs(size_bytes) < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


# --- Arabic / Bilingual Formatters ---

ARABIC_DIGITS = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
WESTERN_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")

ARABIC_MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
]


def to_arabic_digits(text: str) -> str:
    """Convert Western digits to Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)."""
    return str(text).translate(ARABIC_DIGITS) if text else ""


def to_western_digits(text: str) -> str:
    """Convert Arabic-Indic digits back to Western digits."""
    return str(text).translate(WESTERN_DIGITS) if text else ""


def format_date_ar(date_value) -> str:
    """Format date in Arabic: ١٥ يناير ٢٠٢٥."""
    if not date_value:
        return ""
    from frappe.utils import getdate
    d = getdate(date_value)
    day = to_arabic_digits(str(d.day))
    month = ARABIC_MONTHS[d.month - 1]
    year = to_arabic_digits(str(d.year))
    return f"{day} {month} {year}"


def format_currency_ar(amount, currency=None) -> str:
    """Format currency with Arabic digits: ١٢٣٬٤٥٦٫٧٨ ر.س."""
    currency = currency or frappe.defaults.get_global_default("currency") or "SAR"
    formatted = fmt_money(flt(amount), currency=currency)
    return to_arabic_digits(formatted)


def format_number_ar(value, precision: int = 2) -> str:
    """Format a number with Arabic-Indic digits."""
    return to_arabic_digits(f"{flt(value):.{precision}f}")


def format_bilingual(en_text: str, ar_text: str, separator: str = " | ") -> str:
    """Combine English and Arabic text with a separator for bilingual display."""
    if ar_text and en_text:
        return f"{en_text}{separator}{ar_text}"
    return ar_text or en_text or ""
