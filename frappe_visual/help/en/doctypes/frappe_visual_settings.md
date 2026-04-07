---
title: Frappe Visual Settings
icon: settings
context_type: doctype
context_reference: Frappe Visual Settings
priority: 10
roles: [FV Admin]
---

# Frappe Visual Settings

The **Frappe Visual Settings** DocType is the central configuration panel for Frappe Visual. Only users with the `FV_manage_settings` capability can modify these settings.

## # enable_auto_enhancers

Master toggle for all auto-enhancer features (form, list, workspace enhancers). When disabled, Frappe Visual components are only available via explicit API calls.

## # enable_form_enhancer

Automatically adds stats ribbons, relationship graphs, and quick-link buttons to every form view.

## # enable_list_enhancer

Adds Cards/Kanban/Timeline toggle modes to every list view.

## # enable_workspace_enhancer

Enriches workspaces with live counts, sparklines, and glassmorphism effects.

## # enable_bilingual_tooltip

Show Arabic↔English hover tooltips on all page elements.

## # default_theme

Select the active visual theme (CSS variables + color palette) from available FV Theme records.

## # default_chart_palette

Default color palette for all chart components (ECharts, Sparklines, Heatmaps).

## # license_key

Premium license key for advanced features (Scene Engine, Data Storytelling, Whiteboard collaboration).

## # default_layout_engine

Default graph layout engine: Force, Hierarchical, Circular, Grid, ELK Layered, ELK Force, ELK Stress, ELK Radial, or ELK MR-Tree.

## # max_graph_nodes

Maximum number of nodes to render in graph visualizations. Prevents browser freezing for very large DocType structures. Default: 500.

## # cache_ttl

Cache time-to-live in seconds for workspace stats and sparkline data. Default: 300 (5 minutes).

## # enable_premium_features

Toggle premium features requiring a valid license key.
