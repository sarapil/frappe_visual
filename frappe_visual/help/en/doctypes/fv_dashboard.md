---
title: FV Dashboard
icon: layout-dashboard
context_type: doctype
context_reference: FV Dashboard
priority: 20
roles: [FV Admin, FV Manager]
---

# FV Dashboard

**FV Dashboard** is a configurable visual dashboard with multiple widget types. Dashboards can be embedded in workspaces, forms, or standalone pages.

## # title

Dashboard display name shown in the header and navigation.

## # dashboard_layout

Grid layout configuration: `grid-2`, `grid-3`, `grid-4`, or `masonry`. Controls how widgets arrange on the page.

## # refresh_interval

Auto-refresh interval in seconds. Set to 0 to disable auto-refresh. Minimum: 10 seconds.

## # is_public

When enabled, dashboard is accessible to all users with the `FV_view_visual_hub` capability. Private dashboards are only visible to the owner.

## # workspace

Optional link to a Workspace — makes this dashboard appear as a tab within that workspace.

## Widgets (Child Table)

Each dashboard contains one or more **FV Dashboard Widget** rows:

| Field           | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `widget_type`   | Chart type: number_card, bar, line, donut, heatmap, sparkline, kanban |
| `widget_config` | JSON configuration for the widget (DocType, filters, colors, etc.)    |
| `width`         | Grid width: 1-12 columns                                              |
| `height`        | Grid height in rows                                                   |
| `position`      | Sort order within the dashboard                                       |
