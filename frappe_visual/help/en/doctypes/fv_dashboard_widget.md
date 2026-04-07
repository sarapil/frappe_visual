---
title: FV Dashboard Widget
icon: puzzle
context_type: doctype
context_reference: FV Dashboard Widget
priority: 25
roles: [FV Admin, FV Manager]
---

# FV Dashboard Widget

**FV Dashboard Widget** is a child table of **FV Dashboard**. Each row represents one visual widget rendered inside the dashboard grid.

## # widget_type

The visualization type for this widget. Supported types:

| Type          | Description                                |
| ------------- | ------------------------------------------ |
| `number_card` | Single KPI value with trend indicator      |
| `bar`         | Vertical or horizontal bar chart           |
| `line`        | Line/area chart with time series           |
| `donut`       | Donut/pie chart for proportions            |
| `heatmap`     | Color-coded matrix for density data        |
| `sparkline`   | Compact inline trend chart                 |
| `kanban`      | Kanban board view                          |

## # widget_config

JSON configuration for the widget. Each widget type has its own schema:

```json
{
  "label": "Monthly Revenue",
  "doctype": "Sales Invoice",
  "aggregate": "sum",
  "field": "grand_total",
  "filters": { "status": "Paid" }
}
```

## # width

Column span in the dashboard grid (1–12). Controls horizontal size.

## # height

Row span in the dashboard grid. Controls vertical size.

## # sort_order

Display order within the dashboard. Lower numbers appear first.
