# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Search API v1
==============================
Unified search endpoint for CommandPalette, global search, and
frecency-ranked results. Supports fuzzy matching, category
filtering, and per-user frecency tracking.
"""

import frappe
from frappe import _
from frappe_visual.api.response import success, error, paginated
import json
import time


@frappe.whitelist()
def universal_search(query: str, categories: str | None = None,
                     page: int = 1, page_size: int = 20) -> dict:
    """
    Unified search across DocTypes, pages, reports, and recent items.
    Powers CommandPalette (Ctrl+K) and global search.

    Args:
        query: Search string (min 2 chars).
        categories: Comma-separated filter — doctype,page,report,recent,action.
        page: Page number (1-based).
        page_size: Results per page (max 50).
    """
    frappe.rate_limiter.rate_limit(limit=30, seconds=60)
    frappe.has_permission("DocType", "read", throw=True)

    query = (query or "").strip()
    if len(query) < 2:
        return error("Search query must be at least 2 characters", "QUERY_TOO_SHORT")

    page = max(1, int(page))
    page_size = min(50, max(1, int(page_size)))
    cats = set((categories or "doctype,page,report,recent").split(","))

    results = []

    # 1. DocType records search
    if "doctype" in cats:
        results.extend(_search_doctypes(query, page_size))

    # 2. Pages
    if "page" in cats:
        results.extend(_search_pages(query))

    # 3. Reports
    if "report" in cats:
        results.extend(_search_reports(query))

    # 4. Recent documents (from user's recent activity)
    if "recent" in cats:
        results.extend(_search_recent(query))

    # 5. Actions (common desk actions)
    if "action" in cats:
        results.extend(_search_actions(query))

    # Apply frecency ranking
    frecency = _get_user_frecency()
    for r in results:
        key = f"{r.get('category', '')}:{r.get('value', '')}"
        r["_score"] = frecency.get(key, 0)

    results.sort(key=lambda x: x.get("_score", 0), reverse=True)

    # Remove internal score
    for r in results:
        r.pop("_score", None)

    total = len(results)
    start = (page - 1) * page_size
    page_results = results[start:start + page_size]

    return paginated(page_results, total, page, page_size)


@frappe.whitelist()
def record_frecency(category: str, value: str, label: str | None = None) -> dict:
    """
    Record a frecency hit for a search result.
    Called when user selects a result from CommandPalette.

    Uses the formula: score = frequency * recency_weight
    """
    frappe.has_permission("DocType", "read", throw=True)

    category = (category or "").strip()
    value = (value or "").strip()
    if not category or not value:
        return error("category and value are required", "MISSING_PARAMS")

    user = frappe.session.user
    key = f"fv_frecency:{user}"
    data = frappe.cache.get_value(key) or {}

    entry_key = f"{category}:{value}"
    entry = data.get(entry_key, {"count": 0, "last": 0, "label": ""})
    entry["count"] = entry.get("count", 0) + 1
    entry["last"] = time.time()
    entry["label"] = label or entry.get("label", "")
    data[entry_key] = entry

    # Cap at 200 entries — evict lowest scores
    if len(data) > 200:
        scored = []
        now = time.time()
        for k, v in data.items():
            age_hours = (now - v.get("last", 0)) / 3600
            recency = max(0.1, 1.0 / (1 + age_hours / 24))
            scored.append((k, v.get("count", 0) * recency))
        scored.sort(key=lambda x: x[1], reverse=True)
        keep = {s[0] for s in scored[:150]}
        data = {k: v for k, v in data.items() if k in keep}

    frappe.cache.set_value(key, data, expires_in_sec=86400 * 30)
    return success(message="Frecency recorded")


# ── Internal Helpers ───────────────────────────────────────────

def _search_doctypes(query: str, limit: int = 15) -> list:
    """Search across visible DocTypes by name."""
    results = []

    # Get user-accessible doctypes
    doctypes = frappe.get_all(
        "DocType",
        filters={"issingle": 0, "istable": 0, "name": ["like", f"%{query}%"]},
        fields=["name", "module"],
        limit_page_length=limit,
    )

    for dt in doctypes:
        try:
            if frappe.has_permission(dt.name, "read"):
                results.append({
                    "category": "doctype",
                    "value": dt.name,
                    "label": _(dt.name),
                    "description": _(dt.module),
                    "route": f"/app/{frappe.scrub(dt.name)}",
                })
        except Exception:
            pass

    return results


def _search_pages(query: str) -> list:
    """Search standard pages and workspaces."""
    results = []

    workspaces = frappe.get_all(
        "Workspace",
        filters={"title": ["like", f"%{query}%"]},
        fields=["name", "title", "icon"],
        limit_page_length=10,
    )

    for ws in workspaces:
        results.append({
            "category": "page",
            "value": ws.name,
            "label": ws.title or ws.name,
            "icon": ws.icon or "layout-dashboard",
            "route": f"/app/{frappe.scrub(ws.name)}",
        })

    return results


def _search_reports(query: str) -> list:
    """Search reports."""
    results = []

    reports = frappe.get_all(
        "Report",
        filters={
            "name": ["like", f"%{query}%"],
            "disabled": 0,
        },
        fields=["name", "report_type", "ref_doctype"],
        limit_page_length=10,
    )

    for r in reports:
        try:
            if r.ref_doctype and frappe.has_permission(r.ref_doctype, "read"):
                results.append({
                    "category": "report",
                    "value": r.name,
                    "label": _(r.name),
                    "description": f"{_(r.report_type)} · {_(r.ref_doctype)}",
                    "route": f"/app/query-report/{frappe.scrub(r.name)}",
                })
        except Exception:
            pass

    return results


def _search_recent(query: str) -> list:
    """Search user's recently viewed documents."""
    results = []
    query_lower = query.lower()

    recent = frappe.cache.get_value(f"fv_recent:{frappe.session.user}") or []
    for item in recent:
        label = item.get("label", item.get("docname", ""))
        if query_lower in label.lower() or query_lower in item.get("doctype", "").lower():
            results.append({
                "category": "recent",
                "value": f"{item['doctype']}:{item['docname']}",
                "label": label,
                "description": _(item.get("doctype", "")),
                "route": f"/app/{frappe.scrub(item['doctype'])}/{item['docname']}",
            })

    return results[:10]


def _search_actions(query: str) -> list:
    """Built-in desk actions that match the query."""
    actions = [
        {"label": _("New Document"), "value": "new-doc", "route": ""},
        {"label": _("Clear Cache"), "value": "clear-cache", "route": ""},
        {"label": _("Reload Page"), "value": "reload", "route": ""},
        {"label": _("Settings"), "value": "settings", "route": "/app/settings"},
        {"label": _("User Profile"), "value": "user-profile", "route": "/app/user"},
        {"label": _("System Settings"), "value": "system-settings", "route": "/app/system-settings"},
        {"label": _("Background Jobs"), "value": "background-jobs", "route": "/app/background_jobs"},
    ]

    query_lower = query.lower()
    return [
        {**a, "category": "action"}
        for a in actions
        if query_lower in a["label"].lower()
    ]


def _get_user_frecency() -> dict:
    """Get frecency scores for the current user."""
    data = frappe.cache.get_value(f"fv_frecency:{frappe.session.user}") or {}
    now = time.time()
    scores = {}
    for key, entry in data.items():
        age_hours = (now - entry.get("last", 0)) / 3600
        recency = max(0.1, 1.0 / (1 + age_hours / 24))
        scores[key] = entry.get("count", 0) * recency
    return scores
