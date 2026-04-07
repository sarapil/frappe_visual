---
title: FV Admin Role
icon: shield
context_type: role
context_reference: FV Admin
priority: 30
roles: [FV Admin]
---

# FV Admin — Role Guide

The **FV Admin** role provides complete control over Frappe Visual including all visual components, exports, layout switching, and system settings management. Assigned to system administrators and technical leads.

## Capabilities (15 — All)

| Capability           | Category | Description                           |
| -------------------- | -------- | ------------------------------------- |
| `FV_view_visual_hub` | Module   | Access the Visual Hub dashboard       |
| `FV_use_app_map`     | Module   | Browse interactive application maps   |
| `FV_use_erd`         | Module   | View Entity Relationship Diagrams     |
| `FV_use_storyboard`  | Module   | Walk through storyboard presentations |
| `FV_use_kanban`      | Module   | Interact with Kanban boards           |
| `FV_use_calendar`    | Module   | View visual calendars                 |
| `FV_use_gantt`       | Module   | View project Gantt timelines          |
| `FV_use_map`         | Module   | Explore geographic map views          |
| `FV_use_gallery`     | Module   | Browse image galleries                |
| `FV_use_tree`        | Module   | Navigate hierarchical tree views      |
| `FV_export_svg`      | Action   | Export graphs as SVG files            |
| `FV_export_png`      | Action   | Export graphs as PNG images           |
| `FV_change_layout`   | Action   | Switch between layout engines         |
| `FV_manage_settings` | Action   | Configure Frappe Visual Settings      |
| `FV_view_statistics` | Report   | View app and DocType statistics       |

## Admin-Only Features

### Settings Management

Navigate to **Frappe Visual Settings** to configure:

- **Auto-Enhancers** — Toggle form, list, and workspace enhancers
- **Default Theme** — Set the default visual theme for all users
- **Chart Palette** — Choose default color scheme for charts
- **Bilingual Tooltips** — Enable/disable Arabic↔English hover help
- **Performance** — Configure cache TTL, lazy-loading thresholds

### Plugin Management

```javascript
// Register a custom plugin
frappe.visual.registerPlugin({
  name: "my-custom-plugin",
  app: "my_app",
  version: "1.0.0",
  components: { MyWidget: MyWidgetClass },
  hooks: { afterRender: { VisualDashboard: enhanceDashboard } },
});
```

### Theme Administration

```javascript
// Create and distribute a custom theme
frappe.visual.themeBuilder.open(); // Open builder UI
frappe.visual.themeBuilder.save({ name: "corporate-blue" });
frappe.visual.themeBuilder.export("corporate-blue");
```

### Performance Monitoring

```javascript
// Enable the performance HUD for debugging
frappe.visual.perf.enable();
frappe.visual.perf.showHUD(); // Shows FPS, CLS, LCP, memory
frappe.visual.perf.report(); // Get full metrics snapshot
```

## Best Practices

1. **Test themes** on both LTR and RTL layouts before distributing
2. **Monitor performance** after enabling new plugins or enhancers
3. **Review CAPS capabilities** when onboarding new team members
4. **Export settings** before major upgrades for backup
5. **Check the Playground** (`/app/visual-playground`) to verify all components render correctly
