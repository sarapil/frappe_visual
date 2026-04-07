---
title: Reports & Analytics
icon: chart-bar
context_type: index
priority: 5
---

# Reports & Analytics — Frappe Visual

Frappe Visual enhances Frappe's reporting capabilities with visual data representations.

## Available Report Components

| Component     | Usage                       | Description                             |
| ------------- | --------------------------- | --------------------------------------- |
| **Heatmap**   | `frappe.visual.heatmap()`   | Activity/density heatmap (GitHub-style) |
| **Sparkline** | `frappe.visual.sparkline()` | Inline mini-charts for dashboards       |
| **Donut**     | `frappe.visual.donut()`     | Proportional data visualization         |
| **Area**      | `frappe.visual.area()`      | Time-series trend analysis              |
| **Radar**     | `frappe.visual.radar()`     | Multi-dimensional comparison            |
| **Funnel**    | `frappe.visual.funnel()`    | Pipeline/conversion analysis            |
| **Treemap**   | `frappe.visual.treemap()`   | Hierarchical data proportions           |
| **Sankey**    | `frappe.visual.sankey()`    | Flow/connection visualization           |
| **DataCard**  | `frappe.visual.dataCard()`  | KPI number cards                        |

## Workspace Stats API

The Workspace Stats API provides real-time counts, sparklines, and dashboard data:

```javascript
// Batch counts for multiple DocTypes
const result = await frappe.xcall(
  "frappe_visual.api.v1.workspace_stats.get_batch_counts",
  { doctypes: JSON.stringify(["Sales Order", "Purchase Order"]) },
);
```

## Data Storytelling

Create interactive data narratives with the Storytelling API:

```javascript
// Save a data story
await frappe.xcall(
    "frappe_visual.api.v1.storytelling.save_story",
    { title: "Q4 Analysis", chapters: JSON.stringify([...]) }
);
```

## CAPS Requirement

Viewing statistics requires the **FV_view_statistics** capability.
