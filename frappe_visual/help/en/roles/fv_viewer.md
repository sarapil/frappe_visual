---
title: FV Viewer Role
icon: eye
context_type: role
context_reference: FV Viewer
priority: 10
roles: [FV Viewer]
---

# FV Viewer — Role Guide

The **FV Viewer** role provides read-only access to all visual components in Frappe Visual. This is the default role for team members who need to explore data visually without modifying configurations.

## Capabilities (11)

| Capability           | Description                           |
| -------------------- | ------------------------------------- |
| `FV_view_visual_hub` | Access the Visual Hub dashboard       |
| `FV_use_app_map`     | Browse interactive application maps   |
| `FV_use_erd`         | View Entity Relationship Diagrams     |
| `FV_use_storyboard`  | Walk through storyboard presentations |
| `FV_use_kanban`      | Interact with Kanban boards           |
| `FV_use_calendar`    | View visual calendars                 |
| `FV_use_gantt`       | View project Gantt timelines          |
| `FV_use_map`         | Explore geographic map views          |
| `FV_use_gallery`     | Browse image galleries                |
| `FV_use_tree`        | Navigate hierarchical tree views      |
| `FV_view_statistics` | View app and DocType statistics       |

## What You Can Do

- **View** all visual components — graphs, ERDs, maps, timelines
- **Navigate** the Visual Hub and all workspaces
- **Interact** with Kanban boards, calendars, and trees (drag cards, scroll timelines)
- **View** statistics and analytics dashboards
- **Browse** storyboard walkthroughs and onboarding content

## What You Cannot Do

- ❌ Export graphs as SVG or PNG
- ❌ Change layout engines (Force, Hierarchical, ELK)
- ❌ Modify Frappe Visual Settings
- ❌ Configure themes or manage integrations

## Getting Started

1. Navigate to **Desk → Frappe Visual** from the app icon grid
2. Click **Visual Hub** to see the main dashboard
3. Use the sidebar to explore **App Map**, **ERD**, **Kanban**, and other views
4. Click the **❓** icon on any page for contextual help

## Upgrading to Power User

If you need export capabilities or layout switching, ask your administrator to assign the **FV Power User** role.
