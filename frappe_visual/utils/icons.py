# -*- coding: utf-8 -*-

# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual - Icon Utilities
==============================
Jinja helpers and Python utilities for icon rendering.
"""

import frappe
from frappe import _

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

SIZES = {
    "xs": 12,
    "sm": 14,
    "md": 16,
    "lg": 20,
    "xl": 24,
    "2xl": 32,
    "3xl": 48,
}

COLORS = {
    "primary": "var(--primary-color)",
    "secondary": "var(--text-muted)",
    "success": "var(--green-500)",
    "warning": "var(--yellow-500)",
    "danger": "var(--red-500)",
    "info": "var(--blue-500)",
    "muted": "var(--gray-500)",
}

# Semantic icon mappings
ACTION_ICONS = {
    "create": "plus",
    "add": "plus",
    "edit": "pencil",
    "update": "pencil",
    "delete": "trash",
    "remove": "x",
    "view": "eye",
    "preview": "eye",
    "save": "device-floppy",
    "cancel": "x",
    "close": "x",
    "search": "search",
    "filter": "filter",
    "sort": "arrows-sort",
    "refresh": "refresh",
    "reload": "refresh",
    "download": "download",
    "export": "download",
    "upload": "upload",
    "import": "upload",
    "print": "printer",
    "share": "share",
    "copy": "copy",
    "paste": "clipboard",
    "link": "link",
    "unlink": "unlink",
    "settings": "settings",
    "configure": "adjustments",
    "help": "help-circle",
    "info": "info-circle",
    "warning": "alert-triangle",
    "error": "alert-circle",
    "success": "check",
    "expand": "chevron-down",
    "collapse": "chevron-up",
    "next": "chevron-right",
    "prev": "chevron-left",
    "menu": "menu-2",
    "more": "dots-vertical",
}

# Status to icon+color mapping
STATUS_ICONS = {
    "Draft": {"icon": "file", "color": "muted"},
    "Pending": {"icon": "clock", "color": "warning"},
    "Pending Review": {"icon": "eye", "color": "info"},
    "Pending Approval": {"icon": "user-check", "color": "info"},
    "Approved": {"icon": "check", "color": "success"},
    "Rejected": {"icon": "x", "color": "danger"},
    "Cancelled": {"icon": "ban", "color": "danger"},
    "Completed": {"icon": "check-all", "color": "success"},
    "Closed": {"icon": "lock", "color": "muted"},
    "On Hold": {"icon": "player-pause", "color": "warning"},
    "Submitted": {"icon": "send", "color": "primary"},
    "Active": {"icon": "check-circle", "color": "success"},
    "Inactive": {"icon": "circle-off", "color": "muted"},
    "Enabled": {"icon": "toggle-right", "color": "success"},
    "Disabled": {"icon": "toggle-left", "color": "muted"},
}

# DocType icon mapping
DOCTYPE_ICONS = {
    # Frappe Core
    "User": "user",
    "Role": "shield",
    "DocType": "file-code",
    "Module Def": "package",
    "Workspace": "layout-dashboard",
    "Report": "report-analytics",
    "Print Format": "printer",
    "Web Page": "world-www",
    "Website Settings": "settings",
    # ERPNext Common
    "Customer": "users",
    "Supplier": "building",
    "Item": "package",
    "Employee": "id-badge",
    "Lead": "target",
    "Opportunity": "bulb",
    "Project": "briefcase",
    "Task": "checkbox",
    # Frappe Visual
    "Visual Graph": "git-branch",
    "Graph Node": "circle-dot",
    "Graph Edge": "arrow-right",
    "Visual Workflow": "git-merge",
    "Visual Dashboard": "layout-dashboard",
    "Dashboard Widget": "layout-cards",
    "Visual Automation": "robot",
}


# ═══════════════════════════════════════════════════════════════════
# RENDERING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def render_icon(
    name: str,
    size: str = "md",
    color: str = None,
    library: str = "tabler",
    extra_class: str = "",
    **attrs
) -> str:
    """
    Render an icon as HTML.

    Args:
        name: Icon name (without prefix)
        size: Size key (xs, sm, md, lg, xl, 2xl, 3xl)
        color: Color key (primary, success, etc.) or hex/css value
        library: 'tabler' or 'frappe'
        extra_class: Additional CSS classes
        **attrs: Additional HTML attributes

    Returns:
        HTML string

    Usage in Jinja:
        {{ render_icon("home", size="lg") }}
        {{ render_icon("check", color="success") }}
        {{ render_icon("my-custom", library="frappe") }}
    """
    if library == "tabler":
        return _render_tabler_icon(name, size, color, extra_class, attrs)
    else:
        return _render_frappe_icon(name, size, color, extra_class, attrs)


def _render_tabler_icon(name, size, color, extra_class, attrs):
    """Render Tabler webfont icon."""
    classes = ["ti", f"ti-{name}"]

    if size and size != "md":
        classes.append(f"ti-{size}")

    if color and color in COLORS:
        classes.append(f"icon-{color}")

    if extra_class:
        classes.append(extra_class)

    attrs_str = " ".join(f'{k}="{v}"' for k, v in attrs.items())

    style = ""
    if color and color not in COLORS:
        style = f'style="color: {color}"'

    return f'<i class="{" ".join(classes)}" {style} {attrs_str}></i>'


def _render_frappe_icon(name, size, color, extra_class, attrs):
    """Render Frappe SVG sprite icon."""
    size_px = SIZES.get(size, 16)
    classes = ["icon", f"icon-{size}"]

    if color and color in COLORS:
        classes.append(f"icon-{color}")

    if extra_class:
        classes.append(extra_class)

    attrs_str = " ".join(f'{k}="{v}"' for k, v in attrs.items())

    style = ""
    if color and color not in COLORS:
        style = f'style="color: {color}"'

    return (
        f'<svg class="{" ".join(classes)}" width="{size_px}" height="{size_px}"'
        f' {style} {attrs_str}>'
        f'\n    <use href="#icon-{name}"></use>'
        f'\n</svg>'
    )


def get_icon_class(name: str, library: str = "tabler") -> str:
    """
    Get CSS class string for an icon.

    Useful when you need just the class, not full HTML.

    Args:
        name: Icon name
        library: 'tabler' or 'frappe'

    Returns:
        CSS class string
    """
    if library == "tabler":
        return f"ti ti-{name}"
    return f"icon icon-{name}"


def get_action_icon(action: str) -> str:
    """Get icon name for a semantic action."""
    return ACTION_ICONS.get(action.lower(), "circle")


def get_status_icon(status: str) -> dict:
    """Get icon config for a workflow status."""
    return STATUS_ICONS.get(status, {"icon": "circle", "color": "muted"})


def get_doctype_icon(doctype: str) -> str:
    """Get icon name for a DocType."""
    return DOCTYPE_ICONS.get(doctype, "file-text")


def render_status_badge(status: str, show_text: bool = True) -> str:
    """
    Render a status badge with icon.

    Args:
        status: Status text
        show_text: Whether to show status text

    Returns:
        HTML string
    """
    config = get_status_icon(status)
    icon_html = render_icon(config["icon"], size="xs", color=config["color"])

    text_html = f" {_(status)}" if show_text else ""
    slug = status.lower().replace(" ", "-")

    return f'<span class="status-icon status-{slug}">{icon_html}{text_html}</span>'
