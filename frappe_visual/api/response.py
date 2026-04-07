# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Standard API Response Helpers
Consistent response format for all Frappe Visual API endpoints.
"""

import frappe
from frappe import _
import math


def success(data=None, message=None):
    """Return a standardized success response.

    Args:
        data: Response payload (dict, list, or scalar).
        message: Optional human-readable message.

    Returns:
        dict: {"status": "success", "data": ..., "message": ...}
    """
    response = {"status": "success"}
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = _(message)
    return response


def error(message, error_code="UNKNOWN_ERROR", details=None, http_status=400):
    """Return a standardized error response.

    Args:
        message: Human-readable error description.
        error_code: Machine-readable error code (e.g. "VALIDATION_ERROR").
        details: Additional context (dict).
        http_status: HTTP status code (default 400).

    Returns:
        dict: {"status": "error", "error_code": ..., "message": ..., "details": ...}
    """
    response = {
        "status": "error",
        "error_code": error_code,
        "message": _(message),
    }
    if details:
        response["details"] = details
    frappe.local.response.http_status_code = http_status
    return response


def paginated(data, total, page=1, page_size=20):
    """Return a standardized paginated list response.

    Args:
        data: List of items for current page.
        total: Total count of matching items.
        page: Current page number (1-based).
        page_size: Items per page.

    Returns:
        dict: {"status": "success", "data": [...], "meta": {...}}
    """
    page_size = min(page_size, 100)  # Cap at 100
    return {
        "status": "success",
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size else 1,
            "has_next": (page * page_size) < total,
        },
    }
