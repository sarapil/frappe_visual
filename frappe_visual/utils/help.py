# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Help Utilities
Resolves contextual help for frappe_visual DocTypes, pages, and fields.
Integrates with arkan_help if available, otherwise serves file-based help.
"""

import os
import json

import frappe
from frappe import _


def get_help(
    doctype: str | None = None,
    fieldname: str | None = None,
    page: str | None = None,
    lang: str | None = None,
) -> dict:
    """
    Resolve help content for a frappe_visual context.

    Priority:
    1. arkan_help (if installed) — database-stored help articles
    2. File-based help — help/{lang}/{slug}.md

    Args:
        doctype: DocType name (e.g., 'FV Dashboard').
        fieldname: Field name within the DocType.
        page: Page name (e.g., 'visual_hub').
        lang: Language code (defaults to user language).

    Returns:
        dict with keys: content (str), source ('arkan_help'|'file'|'none'), title (str)
    """
    lang = lang or frappe.local.lang or "en"

    # Try arkan_help first (if installed)
    help_content = _resolve_from_arkan_help(doctype, fieldname, page, lang)
    if help_content:
        return help_content

    # Fallback to file-based help
    help_content = _resolve_from_files(doctype, fieldname, page, lang)
    if help_content:
        return help_content

    # Fallback language (en)
    if lang != "en":
        help_content = _resolve_from_files(doctype, fieldname, page, "en")
        if help_content:
            return help_content

    return {"content": "", "source": "none", "title": ""}


def _resolve_from_arkan_help(
    doctype: str | None,
    fieldname: str | None,
    page: str | None,
    lang: str,
) -> dict | None:
    """Try to resolve help via arkan_help app (if installed)."""
    try:
        from arkan_help.arkan_help.api.help import get_help as ah_get_help

        result = ah_get_help(
            doctype=doctype,
            fieldname=fieldname,
            view_type="form" if doctype else "page",
        )
        if result and result.get("content"):
            return {
                "content": result["content"],
                "source": "arkan_help",
                "title": result.get("title", ""),
            }
    except (ImportError, ModuleNotFoundError):
        pass  # arkan_help not installed
    except Exception:
        pass  # arkan_help available but query failed

    return None


def _resolve_from_files(
    doctype: str | None,
    fieldname: str | None,
    page: str | None,
    lang: str,
) -> dict | None:
    """Resolve help from the help/{lang}/ markdown files."""
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    help_dir = os.path.join(app_dir, "help", lang)

    if not os.path.isdir(help_dir):
        return None

    # Determine which file to look for
    slug = None
    if page:
        slug = page.lower().replace(" ", "_")
    elif doctype:
        slug = doctype.lower().replace(" ", "_")

    if not slug:
        slug = "_app"

    file_path = os.path.join(help_dir, f"{slug}.md")
    if not os.path.isfile(file_path):
        return None

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract title from frontmatter or first heading
    title = _extract_title(content)

    # If fieldname is specified, try to find the anchor
    if fieldname and doctype:
        anchor = f"## # {fieldname}"
        if anchor in content:
            idx = content.index(anchor)
            # Extract section until next heading or EOF
            section = content[idx + len(anchor):]
            next_heading = section.find("\n## ")
            if next_heading > 0:
                section = section[:next_heading]
            content = section.strip()

    return {
        "content": content,
        "source": "file",
        "title": title,
    }


def _extract_title(markdown: str) -> str:
    """Extract title from markdown content (frontmatter or first heading)."""
    lines = markdown.strip().split("\n")

    # Check for YAML frontmatter
    if lines and lines[0].strip() == "---":
        for i, line in enumerate(lines[1:], start=1):
            if line.strip() == "---":
                # Parse frontmatter
                for fm_line in lines[1:i]:
                    if fm_line.startswith("title:"):
                        return fm_line.split(":", 1)[1].strip()
                break

    # Fallback: first # heading
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            return stripped[2:].strip()

    return ""


def get_help_meta() -> dict:
    """Return help system metadata for frappe_visual."""
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    meta_path = os.path.join(app_dir, "help", "_meta.json")

    if os.path.isfile(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)

    return {
        "app": "frappe_visual",
        "icon": "palette",
        "color": "#6366F1",
        "languages": ["en", "ar"],
    }
