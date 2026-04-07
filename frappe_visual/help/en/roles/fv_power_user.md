---
title: FV Power User Role
icon: bolt
context_type: role
context_reference: FV Power User
priority: 20
roles: [FV Power User]
---

# FV Power User — Role Guide

The **FV Power User** role grants full access to all visual components plus export and layout capabilities. Ideal for analysts, developers, and team leads who create reports and share visual outputs.

## Capabilities (14)

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
| `FV_export_svg`      | Export graphs as SVG files            |
| `FV_export_png`      | Export graphs as PNG images           |
| `FV_change_layout`   | Switch between layout engines         |
| `FV_view_statistics` | View app and DocType statistics       |

## What You Can Do (in addition to Viewer)

- **Export** any visual component as SVG or PNG
- **Switch layouts** — Force-directed, Hierarchical, ELK, Dagre, Circular
- **Copy to clipboard** — one-click graph-to-clipboard for presentations
- **Generate PDFs** — export dashboards as multi-page PDF documents
- **Save views** — create saved filter presets for quick access
- **Use Theme Builder** — preview different visual themes

## What You Cannot Do

- ❌ Modify Frappe Visual Settings (license, defaults, integrations)
- ❌ Manage app-wide configurations

## Export Shortcuts

| Action            | Shortcut                                             |
| ----------------- | ---------------------------------------------------- |
| Export as PNG     | `frappe.visual.exportPNG(element)`                   |
| Export as SVG     | `frappe.visual.exportSVG(element)`                   |
| Export as PDF     | `frappe.visual.exportPDF(element, { format: "a4" })` |
| Copy to clipboard | `frappe.visual.exporter.clipboard(element)`          |

## Layout Engines

| Engine           | Best For                          |
| ---------------- | --------------------------------- |
| **Force**        | General-purpose graph exploration |
| **Hierarchical** | Org charts, dependency trees      |
| **ELK**          | Complex multi-layered graphs      |
| **Dagre**        | Workflow and pipeline diagrams    |
| **Circular**     | Relationship networks             |
