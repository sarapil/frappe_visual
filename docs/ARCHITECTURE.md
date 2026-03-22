# Frappe Visual — Architecture

## System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Browser (Client)                   │
│                                                      │
│  ┌─────────────────────┐                             │
│  │  fv_bootstrap.js    │  2KB, loaded globally       │
│  │  (Global Namespace) │  Creates frappe.visual.*    │
│  └─────────┬───────────┘                             │
│            │ frappe.require() on first use            │
│  ┌─────────▼───────────────────────────────────────┐ │
│  │  frappe_visual.bundle.js (~400KB)               │ │
│  │                                                 │ │
│  │  ┌─────────────┐  ┌──────────────┐             │ │
│  │  │ GraphEngine │  │ ThemeManager │             │ │
│  │  │ (Cytoscape) │  │ (CSS Vars)   │             │ │
│  │  └─────────────┘  └──────────────┘             │ │
│  │  ┌─────────────┐  ┌──────────────┐             │ │
│  │  │LayoutManager│  │AnimationEngine│            │ │
│  │  │(9 Algorithms)│ │ (GSAP)       │             │ │
│  │  └─────────────┘  └──────────────┘             │ │
│  │  ┌─────────────┐  ┌──────────────┐             │ │
│  │  │ ContextMenu │  │   Minimap    │             │ │
│  │  └─────────────┘  └──────────────┘             │ │
│  │  ┌──────────────────────────────┐               │ │
│  │  │   FloatingWindowManager     │               │ │
│  │  └──────────────────────────────┘               │ │
│  │                                                 │ │
│  │  Components:                                    │ │
│  │  ┌────────┐ ┌────────────┐ ┌──────────┐        │ │
│  │  │ AppMap │ │RelExplorer │ │Storyboard│        │ │
│  │  └────────┘ └────────────┘ └──────────┘        │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐      │ │
│  │  │Dashboard │ │ComboGroup│ │SummaryBadge│      │ │
│  │  └──────────┘ └──────────┘ └────────────┘      │ │
│  │                                                 │ │
│  │  Utils:                                         │ │
│  │  ┌───────────┐ ┌───────────┐ ┌────────────┐    │ │
│  │  │ColorSystem│ │DataAdapter│ │SVGGenerator│    │ │
│  │  └───────────┘ └───────────┘ └────────────┘    │ │
│  └─────────────────────────────────────────────────┘ │
└────────────────────────┬─────────────────────────────┘
                         │ frappe.call() REST API
┌────────────────────────┴─────────────────────────────┐
│               Frappe Web Server (Python)              │
│                                                      │
│  frappe_visual/api.py                                │
│  ├── get_app_map(app_name)                           │
│  ├── get_doctype_relationships(doctype, depth)       │
│  ├── get_workspace_map(workspace)                    │
│  └── get_quick_stats(app_name)                       │
│                                                      │
│  frappe_visual/utils/                                │
│  ├── license.py (LicenseValidator)                   │
│  └── feature_flags.py (FeatureTier, gates)           │
│                                                      │
│  frappe_visual/doctype/                              │
│  └── frappe_visual_settings/ (Single DocType)        │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────┴─────────────────────────────┐
│  MariaDB (Schema metadata) │ Redis (License cache)   │
└──────────────────────────────────────────────────────┘
```

## Data Flow

1. User opens `/app/visual-hub`
2. `fv_bootstrap.js` (already loaded globally) provides `frappe.visual` namespace
3. Page JS calls `frappe.require("frappe_visual.bundle.js")`
4. Bundle loads → initializes `DataAdapter`
5. `DataAdapter` calls `frappe.call("frappe_visual.api.get_app_map", {app_name})`
6. Server queries DocType metadata via `frappe.get_meta()` and QueryBuilder
7. Response contains nodes (doctypes) and edges (relationships)
8. `GraphEngine` initializes Cytoscape.js with the elements
9. `LayoutManager` applies selected layout algorithm
10. `ThemeManager` applies CSS variables based on current theme
11. `AnimationEngine` adds GSAP animations (if enabled)
12. `Minimap` renders navigation overlay

## Module Responsibilities

| Module | Size | Responsibility |
|--------|------|---------------|
| GraphEngine | 797 lines | Cytoscape wrapper, styles, element building |
| LayoutManager | ~300 lines | 9 layout algorithms, toolbar, export |
| ThemeManager | ~200 lines | Light/dark CSS vars, auto-detection |
| AnimationEngine | 271 lines | GSAP ant-lines, pulse, transitions |
| FloatingWindow | 239 lines | Draggable desktop-style windows |
| ContextMenu | ~50 lines | Placeholder, cxtmenu bridge |
| Minimap | ~80 lines | cytoscape-navigator wrapper |

## Dependencies

### JavaScript (bundled)
- **cytoscape** ^3.30.4 — Core graph rendering
- **elkjs** ^0.9.3 — Enterprise layout algorithms
- **gsap** ^3.12.7 — Animations
- **lottie-web** ^5.12.2 — Lottie animations
- **tippy.js** ^6.3.7 — Tooltips
- **cytoscape-fcose** — Fast force-directed layout
- **cytoscape-elk** — ELK layout bridge
- **cytoscape-cxtmenu** — Radial context menu
- **cytoscape-expand-collapse** — Compound node expand/collapse
- **cytoscape-navigator** — Minimap
- **cytoscape-node-html-label** — Rich HTML labels
- **cytoscape-popper** — Tooltip positioning

### Python
- **frappe** (required_apps) — Core framework
