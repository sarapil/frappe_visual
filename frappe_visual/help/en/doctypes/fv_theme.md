---
title: FV Theme
icon: palette
context_type: doctype
context_reference: FV Theme
priority: 20
roles: [FV Admin]
---

# FV Theme

**FV Theme** defines a complete visual theme with CSS custom properties, chart color palettes, and component styling overrides. Only one theme can be active (default) at a time.

## # theme_name

Unique identifier for the theme (e.g., "arkan-default", "midnight-blue", "desert-sand").

## # title

Human-readable display name shown in the Theme Builder and Settings.

## # css_variables

JSON object mapping CSS custom property names to values. These override Frappe Visual defaults site-wide. Example:

```json
{
  "--fv-primary": "#6366F1",
  "--fv-bg-glass": "rgba(99, 102, 241, 0.08)",
  "--fv-border-radius": "12px"
}
```

## # chart_palette

JSON array of hex colors used as the default palette for all chart components (ECharts, Sparklines, Heatmaps).

## # is_default

Only one theme can be default. Setting a new theme as default automatically deactivates the previous default.

## # status

Active themes are available for selection. Inactive themes are hidden from the Theme Builder but preserved for future use.

## # preview_image

Screenshot or thumbnail of the theme applied to a sample dashboard. Shown in the Theme Builder gallery.
