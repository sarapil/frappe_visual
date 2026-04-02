# Frappe Visual — Technical Context

> **Visual GUI Framework for Frappe Applications**
> Interactive graph-based UX with animations, floating windows, and a complete design system.

## Architecture

```
frappe_visual/
├── frappe_visual/
│   ├── hooks.py              # App configuration
│   ├── api.py                # 6 core API endpoints (app_map, erd, workspace, dashboard, etc.)
│   ├── seed.py               # Post-migrate seed data
│   ├── exceptions.py         # Custom exception hierarchy (FV prefix)
│   ├── caps.py               # CAPS integration (FV_ capabilities)
│   ├── frappe_visual/        # Module: Frappe Visual
│   │   └── doctype/
│   │       └── frappe_visual_settings/   # Single DocType — config & feature flags
│   ├── page/
│   │   └── visual_hub/       # Main interactive page
│   ├── utils/
│   │   ├── license.py        # License validation APIs
│   │   └── feature_flags.py  # Feature flag management
│   ├── setup/
│   │   └── icons.py          # Icon system install/uninstall
│   └── tests/
│       ├── test_api.py
│       └── test_license.py
├── public/
│   ├── js/
│   │   ├── core/             # 7 files: animation_engine, context_menu, floating_window,
│   │   │                     #   graph_engine, layout_manager, minimap, theme_manager
│   │   ├── components/       # 13 files: app_map, kanban_board, storyboard_wizard,
│   │   │                     #   visual_calendar, visual_dashboard, visual_form_dashboard,
│   │   │                     #   visual_gallery, visual_gantt, visual_map, visual_tree, etc.
│   │   ├── utils/            # 3 files: color_system, data_adapter, svg_generator
│   │   ├── frappe_visual.bundle.js
│   │   ├── fv_bootstrap.js   # Auto-injected on every page
│   │   └── icon_helper.js    # Tabler Icons integration (3000+)
│   └── css/
│       ├── frappe_visual.bundle.css
│       ├── icons.css
│       └── brand.css
├── www/
│   └── frappe_visual_about.html  # About page
├── translations/
│   └── ar.csv                # Arabic translations
└── branding/                 # Logo, favicon, desktop icons, splash
```

## Key Components (15 total)

| Component | JS File | API | Purpose |
|-----------|---------|-----|---------|
| App Map | `app_map.js` | `frappe.visual.appMap()` | Module/DocType graph |
| ERD | `relationship_explorer.js` | `frappe.visual.erd()` | Entity Relationship Diagram |
| Dependency Graph | `graph_engine.js` | `frappe.visual.dependencyGraph()` | Workflow visualization |
| Storyboard | `storyboard_wizard.js` | `frappe.visual.storyboard()` | Guided walkthroughs |
| Kanban Board | `kanban_board.js` | `frappe.visual.kanban()` | Drag-and-drop boards |
| Calendar | `visual_calendar.js` | `frappe.visual.calendar()` | Event calendar |
| Gantt Chart | `visual_gantt.js` | `frappe.visual.gantt()` | Project timelines |
| Tree View | `visual_tree.js` | `frappe.visual.treeView()` | Hierarchical tree |
| Map | `visual_map.js` | `frappe.visual.map()` | Geographic markers |
| Gallery | `visual_gallery.js` | `frappe.visual.gallery()` | Image gallery |
| Form Dashboard | `visual_form_dashboard.js` | `frappe.visual.formDashboard()` | Linked-doc dashboard |
| Floating Window | `floating_window.js` | `frappe.visual.floatingWindow()` | Overlay container |
| Minimap | `minimap.js` | minimap component | Graph navigation |
| Context Menu | `context_menu.js` | context menu component | Right-click actions |
| Icon System | `icon_helper.js` | `frappe.visual.icons` | Tabler Icons (3000+) |

## Frontend Libraries

- **Cytoscape.js** — Graph rendering and layout
- **ELK.js** — Advanced graph layout algorithms
- **GSAP + Draggable** — Animations and drag interactions
- **Lottie-web** — Animated SVG/JSON illustrations
- **Tabler Icons v3.30.0** — Icon set (3000+ icons)

## API Endpoints (10 total)

| Endpoint | Module | Description |
|----------|--------|-------------|
| `api.get_app_map` | api.py | Build complete app map (nodes/edges) |
| `api.get_doctype_relationships` | api.py | ERD for a single DocType |
| `api.get_workspace_map` | api.py | Visual workspace map |
| `api.get_dashboard_stats` | api.py | Module/doctype/report/page counts |
| `api.get_form_dashboard` | api.py | Relationship graph for a document |
| `api.get_kanban_data` | api.py | Records grouped by status for Kanban |
| `utils.license.get_license_status` | utils/ | License status check |
| `utils.license.validate_license_key` | utils/ | License key validation |
| `utils.feature_flags.get_enabled_features` | utils/ | Feature flag list |
| `utils.feature_flags.check_feature` | utils/ | Check specific feature |

## DocTypes

| DocType | Type | Purpose |
|---------|------|---------|
| Frappe Visual Settings | Single | License key, default layout, animation/minimap/dark/RTL toggles |

## CAPS Capabilities (FV_ prefix)

- `FV_admin` — Full admin access
- `FV_view_maps` — View app maps and ERDs
- `FV_edit_layouts` — Edit graph layouts
- `FV_manage_settings` — Manage settings

## Dependencies

- **frappe** >= 16.0.0, < 17.0.0
- Python >= 3.10

## Integration Points

- **All Arkan apps** use frappe_visual components
- `extend_bootinfo` injects icon system into every page load
- `app_include_js` / `app_include_css` loaded on every desk page
- Icon hooks (`override_doctype_class`, `doc_events`) for icon system
