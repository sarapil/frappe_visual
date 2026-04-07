---
title: General Topics
icon: book
context_type: index
priority: 1
---

# General Topics — Frappe Visual

This section covers general topics about Frappe Visual that don't fit into specific DocType or page categories.

## Getting Started

1. **Install frappe_visual** — Add to your bench with `bench get-app frappe_visual`
2. **Build assets** — Run `bench build --app frappe_visual`
3. **Visit the Visual Hub** — Navigate to `/desk#visual-hub` to see all components

## Key Concepts

- **Lazy Loading**: The main bundle is loaded on-demand via `frappe.require("frappe_visual.bundle.js")`
- **Auto-Enhancers**: Form, list, and workspace enhancers activate automatically on every page
- **Async Shorthands**: Use `frappe.visual.kanban()`, `frappe.visual.heatmap()`, etc. from any app
- **Icon System**: Always use `frappe.visual.icons` — never Font Awesome or raw SVG

## Architecture

```
fv_bootstrap.js   → Lightweight global loader (~20 KB)
frappe_visual.bundle.js → Full component library (lazy-loaded)
frappe_visual.bundle.css → Styles + dark mode + RTL
```

## Need Help?

- Click the ❓ button on any form or page for contextual help
- Visit the [Onboarding Wizard](/desk#frappe-visual-onboarding) for a guided tour
- Try the [Playground](/desk#visual-playground) for hands-on experimentation
