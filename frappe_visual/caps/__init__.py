# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

# CAPS Capability Definitions for Frappe Visual
# Prefix: FV_

"""
CAPS (Capability-Based Access Control) Integration for Frappe Visual.

Capabilities define fine-grained permissions that control what users can do
within the Frappe Visual application. Each capability is prefixed with FV_.

Categories:
  - Module: Access to major visual modules/features
  - Action: Specific actions users can perform
  - Report: Access to analytics and reports
  - Field:  Field-level visibility restrictions
"""

FV_CAPABILITIES = [
    # ── Module Capabilities ────────────────────────────────────────
    {
        "name": "FV_view_visual_hub",
        "category": "Module",
        "label": "View Visual Hub",
        "label_ar": "عرض المركز المرئي",
        "description": "Access the Visual Hub page and all visual components",
    },
    {
        "name": "FV_use_app_map",
        "category": "Module",
        "label": "Use App Map",
        "label_ar": "استخدام خريطة التطبيق",
        "description": "Generate and interact with application maps",
    },
    {
        "name": "FV_use_erd",
        "category": "Module",
        "label": "Use ERD Explorer",
        "label_ar": "استخدام مستكشف العلاقات",
        "description": "View Entity Relationship Diagrams",
    },
    {
        "name": "FV_use_storyboard",
        "category": "Module",
        "label": "Use Storyboard",
        "label_ar": "استخدام القصة المصورة",
        "description": "Create and view storyboard walkthroughs",
    },
    {
        "name": "FV_use_kanban",
        "category": "Module",
        "label": "Use Kanban Board",
        "label_ar": "استخدام لوحة كانبان",
        "description": "Create and interact with Kanban boards",
    },
    {
        "name": "FV_use_calendar",
        "category": "Module",
        "label": "Use Calendar",
        "label_ar": "استخدام التقويم",
        "description": "View and interact with visual calendar",
    },
    {
        "name": "FV_use_gantt",
        "category": "Module",
        "label": "Use Gantt Chart",
        "label_ar": "استخدام مخطط جانت",
        "description": "View project Gantt timelines",
    },
    {
        "name": "FV_use_map",
        "category": "Module",
        "label": "Use Map",
        "label_ar": "استخدام الخريطة",
        "description": "View geographic map with markers",
    },
    {
        "name": "FV_use_gallery",
        "category": "Module",
        "label": "Use Gallery",
        "label_ar": "استخدام المعرض",
        "description": "View image galleries",
    },
    {
        "name": "FV_use_tree",
        "category": "Module",
        "label": "Use Tree View",
        "label_ar": "استخدام عرض الشجرة",
        "description": "View hierarchical tree visualizations",
    },

    # ── Action Capabilities ────────────────────────────────────────
    {
        "name": "FV_export_svg",
        "category": "Action",
        "label": "Export as SVG",
        "label_ar": "تصدير كـ SVG",
        "description": "Export visual graphs as SVG files",
    },
    {
        "name": "FV_export_png",
        "category": "Action",
        "label": "Export as PNG",
        "label_ar": "تصدير كـ PNG",
        "description": "Export visual graphs as PNG images",
    },
    {
        "name": "FV_change_layout",
        "category": "Action",
        "label": "Change Layout Algorithm",
        "label_ar": "تغيير خوارزمية التخطيط",
        "description": "Switch between layout engines (Force, Hierarchical, ELK, etc.)",
    },
    {
        "name": "FV_manage_settings",
        "category": "Action",
        "label": "Manage Settings",
        "label_ar": "إدارة الإعدادات",
        "description": "Configure Frappe Visual Settings (license, theme, defaults)",
    },
    {
        "name": "FV_use_collaboration",
        "category": "Action",
        "label": "Use Realtime Collaboration",
        "label_ar": "استخدام التعاون المباشر",
        "description": "Broadcast events and see other users' presence in visual workspaces",
    },
    # ── Report Capabilities ────────────────────────────────────────
    {
        "name": "FV_view_statistics",
        "category": "Report",
        "label": "View Statistics",
        "label_ar": "عرض الإحصائيات",
        "description": "View app and DocType statistics in Visual Hub",
    },
]

# ── Role Bundles (Jobs) ───────────────────────────────────────────
# Each bundle groups related capabilities into a coherent job function.

FV_ROLE_BUNDLES = {
    "FV Viewer": {
        "label": "Frappe Visual Viewer",
        "label_ar": "عارض Frappe Visual",
        "description": "Can view all visual components but cannot export or configure",
        "capabilities": [
            "FV_view_visual_hub",
            "FV_use_app_map",
            "FV_use_erd",
            "FV_use_storyboard",
            "FV_use_kanban",
            "FV_use_calendar",
            "FV_use_gantt",
            "FV_use_map",
            "FV_use_gallery",
            "FV_use_tree",
            "FV_use_collaboration",
            "FV_view_statistics",
        ],
    },
    "FV Power User": {
        "label": "Frappe Visual Power User",
        "label_ar": "مستخدم متقدم Frappe Visual",
        "description": "Full access to all visual components including export",
        "capabilities": [
            "FV_view_visual_hub",
            "FV_use_app_map",
            "FV_use_erd",
            "FV_use_storyboard",
            "FV_use_kanban",
            "FV_use_calendar",
            "FV_use_gantt",
            "FV_use_map",
            "FV_use_gallery",
            "FV_use_tree",
            "FV_export_svg",
            "FV_export_png",
            "FV_change_layout",
            "FV_use_collaboration",
            "FV_view_statistics",
        ],
    },
    "FV Admin": {
        "label": "Frappe Visual Administrator",
        "label_ar": "مدير Frappe Visual",
        "description": "Full access including settings management",
        "capabilities": [
            "FV_view_visual_hub",
            "FV_use_app_map",
            "FV_use_erd",
            "FV_use_storyboard",
            "FV_use_kanban",
            "FV_use_calendar",
            "FV_use_gantt",
            "FV_use_map",
            "FV_use_gallery",
            "FV_use_tree",
            "FV_export_svg",
            "FV_export_png",
            "FV_change_layout",
            "FV_manage_settings",
            "FV_use_collaboration",
            "FV_view_statistics",
        ],
    },
}
