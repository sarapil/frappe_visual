# -*- coding: utf-8 -*-
"""
Frappe Visual - Icon Setup Module
=================================
Handles installation, migration, and removal of custom icons.
Integrates with Frappe's native SVG sprite system.
"""

import frappe
import os
import re
from pathlib import Path

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

APP_NAME = "frappe_visual"

# Custom icons to inject into Frappe's timeless sprite
# Place SVG files in: frappe_visual/public/icons/
CUSTOM_ICONS = [
    # App branding
    {"name": "frappe-visual", "file": "frappe-visual.svg"},
    {"name": "fv-graph", "file": "graph.svg"},
    {"name": "fv-node", "file": "node.svg"},
    {"name": "fv-edge", "file": "edge.svg"},
    {"name": "fv-automation", "file": "automation.svg"},
    {"name": "fv-workflow", "file": "workflow.svg"},
    # Dashboard specific
    {"name": "fv-dashboard", "file": "dashboard.svg"},
    {"name": "fv-widget", "file": "widget.svg"},
    {"name": "fv-chart", "file": "chart.svg"},
    # Workspace specific
    {"name": "fv-workspace", "file": "workspace.svg"},
    {"name": "fv-module", "file": "module.svg"},
]

# DocType to icon mapping for frappe_visual DocTypes
DOCTYPE_ICONS = {
    "Visual Graph": "fv-graph",
    "Graph Node": "fv-node",
    "Graph Edge": "fv-edge",
    "Visual Workflow": "fv-workflow",
    "Visual Dashboard": "fv-dashboard",
    "Dashboard Widget": "fv-widget",
    "Visual Automation": "fv-automation",
}


# ═══════════════════════════════════════════════════════════════════
# PATH HELPERS
# ═══════════════════════════════════════════════════════════════════

def get_frappe_icons_path() -> Path:
    """Get path to Frappe's icons.svg sprite file."""
    return Path(
        os.path.dirname(frappe.get_site_path()),
        "assets", "frappe", "icons", "timeless", "icons.svg"
    )


def get_app_icons_path() -> Path:
    """Get path to app's custom icons folder."""
    return Path(frappe.get_app_path(APP_NAME), "public", "icons")


# ═══════════════════════════════════════════════════════════════════
# SVG CONVERSION
# ═══════════════════════════════════════════════════════════════════

def svg_to_symbol(svg_content: str, symbol_id: str) -> str:
    """
    Convert standalone SVG file to <symbol> format for sprite inclusion.

    Args:
        svg_content: Raw SVG file content
        symbol_id: ID for the symbol element (without 'icon-' prefix)

    Returns:
        Formatted <symbol> element string
    """
    # Extract viewBox (default to 24x24 if not found)
    viewbox = "0 0 24 24"
    match = re.search(r'viewBox=["\']([^"\']+)["\']', svg_content)
    if match:
        viewbox = match.group(1)

    # Extract inner content between <svg> tags
    inner = re.search(r'<svg[^>]*>(.*)</svg>', svg_content, re.DOTALL)
    inner_content = inner.group(1) if inner else ""

    # Clean up XML declarations, comments, and extra whitespace
    inner_content = re.sub(r'<\?xml[^?]*\?>', '', inner_content)
    inner_content = re.sub(r'<!--.*?-->', '', inner_content, flags=re.DOTALL)
    inner_content = re.sub(r'\s+', ' ', inner_content).strip()

    return (
        f'\t<symbol id="icon-{symbol_id}" viewBox="{viewbox}">'
        f'\n\t\t{inner_content}'
        f'\n\t</symbol>'
    )


# ═══════════════════════════════════════════════════════════════════
# INSTALLATION HOOKS
# ═══════════════════════════════════════════════════════════════════

def after_install():
    """
    Called after app installation.
    Injects custom icons into Frappe's SVG sprite.
    """
    frappe.logger().info(f"[{APP_NAME}] Installing custom icons...")

    icons_file = get_frappe_icons_path()
    app_icons = get_app_icons_path()

    if not icons_file.exists():
        frappe.log_error(
            f"Frappe icons.svg not found at {icons_file}",
            f"{APP_NAME} Icon Installation"
        )
        return

    content = icons_file.read_text(encoding="utf-8")
    modified = False
    installed = []
    skipped = []
    errors = []

    for icon_config in CUSTOM_ICONS:
        icon_name = icon_config["name"]
        icon_file = app_icons / icon_config["file"]

        # Skip if already exists
        if f'id="icon-{icon_name}"' in content:
            skipped.append(icon_name)
            continue

        # Check file exists
        if not icon_file.exists():
            errors.append(f"{icon_name} ({icon_file.name} not found)")
            continue

        try:
            svg_content = icon_file.read_text(encoding="utf-8")
            symbol = svg_to_symbol(svg_content, icon_name)

            # Insert before closing </svg>
            content = content.replace('</svg>', f'{symbol}\n</svg>')
            modified = True
            installed.append(icon_name)

        except Exception as e:
            errors.append(f"{icon_name} ({str(e)})")

    if modified:
        icons_file.write_text(content, encoding="utf-8")

    # Log summary
    if installed:
        frappe.logger().info(f"  ✓ Installed: {', '.join(installed)}")
    if skipped:
        frappe.logger().info(f"  ⏭ Already exist: {', '.join(skipped)}")
    if errors:
        frappe.logger().warning(f"  ⚠ Errors: {', '.join(errors)}")

    frappe.logger().info(f"[{APP_NAME}] Icon installation complete")


def after_migrate():
    """
    Called after bench migrate.
    Re-injects icons that may have been lost during Frappe update.
    """
    frappe.logger().info(f"[{APP_NAME}] Checking icons after migrate...")
    after_install()


def before_uninstall():
    """
    Called before app uninstallation.
    Removes custom icons from Frappe's sprite.
    """
    frappe.logger().info(f"[{APP_NAME}] Removing custom icons...")

    icons_file = get_frappe_icons_path()

    if not icons_file.exists():
        return

    content = icons_file.read_text(encoding="utf-8")
    removed = []

    for icon_config in CUSTOM_ICONS:
        icon_name = icon_config["name"]

        # Remove the symbol tag with flexible whitespace matching
        pattern = rf'\s*<symbol id="icon-{re.escape(icon_name)}"[^>]*>.*?</symbol>'
        new_content = re.sub(pattern, '', content, flags=re.DOTALL)

        if new_content != content:
            content = new_content
            removed.append(icon_name)

    if removed:
        icons_file.write_text(content, encoding="utf-8")
        frappe.logger().info(f"  ✗ Removed: {', '.join(removed)}")

    frappe.logger().info(f"[{APP_NAME}] Icon removal complete")


# ═══════════════════════════════════════════════════════════════════
# BOOT SESSION
# ═══════════════════════════════════════════════════════════════════

def extend_bootinfo(bootinfo):
    """
    Add icon configuration to boot session.
    Makes icon info available to frontend.
    """
    bootinfo.frappe_visual_icons = {
        "libraries": {
            "tabler": {
                "enabled": True,
                "prefix": "ti ti-",
                "browse_url": "https://tabler.io/icons",
            },
            "frappe": {
                "enabled": True,
                "prefix": "icon-",
            },
        },
        "doctype_icons": DOCTYPE_ICONS,
        "custom_icons": [ic["name"] for ic in CUSTOM_ICONS],
    }


# ═══════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def list_installed_icons() -> list:
    """List all icons in Frappe's sprite."""
    icons_file = get_frappe_icons_path()

    if not icons_file.exists():
        return []

    content = icons_file.read_text(encoding="utf-8")
    icons = re.findall(r'id="icon-([^"]+)"', content)

    return sorted(set(icons))


def icon_exists(icon_name: str) -> bool:
    """Check if an icon exists in Frappe's sprite."""
    return icon_name in list_installed_icons()


def get_doctype_icon(doctype: str) -> str:
    """Get the icon name for a DocType."""
    return DOCTYPE_ICONS.get(doctype, "file-text")
