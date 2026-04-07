# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — IconService
Business logic for icon management, sprite operations, and DocType icon mapping.
"""

import frappe
from frappe import _
import re
from pathlib import Path


class IconService:
    """Service class for icon business logic."""

    @staticmethod
    def list_installed_icons() -> list[str]:
        """List all icon IDs from Frappe's SVG sprite."""
        from frappe_visual.setup.icons import get_frappe_icons_path
        icons_file = get_frappe_icons_path()
        if not icons_file.exists():
            return []
        content = icons_file.read_text(encoding="utf-8")
        return sorted(set(re.findall(r'id="icon-([^"]+)"', content)))

    @staticmethod
    def icon_exists(icon_name: str) -> bool:
        """Check if a specific icon exists in the sprite."""
        return icon_name in IconService.list_installed_icons()

    @staticmethod
    def get_doctype_icon(doctype: str) -> str:
        """Get the mapped icon for a DocType, with sensible fallback."""
        from frappe_visual.setup.icons import DOCTYPE_ICONS
        return DOCTYPE_ICONS.get(doctype, "file-text")

    @staticmethod
    def get_all_doctype_icons() -> dict[str, str]:
        """Return the full DocType → icon mapping."""
        from frappe_visual.setup.icons import DOCTYPE_ICONS
        return dict(DOCTYPE_ICONS)

    @staticmethod
    def search_icons(query: str, limit: int = 50) -> list[str]:
        """Search installed icons by partial name match."""
        all_icons = IconService.list_installed_icons()
        q = query.lower()
        return [i for i in all_icons if q in i.lower()][:limit]
