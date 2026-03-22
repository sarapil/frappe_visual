# Frappe Visual — Technical Specifications

## App Metadata

| Property | Value |
|----------|-------|
| App Name | frappe_visual |
| Version | 0.1.0 |
| License | GPL-3.0 |
| Frappe Version | v16+ |
| Python | 3.11+ |
| Node.js | 18+ |

## Bundle Sizes

| Bundle | Size (gzipped) | Load Strategy |
|--------|----------------|---------------|
| fv_bootstrap.js | ~1KB | Global (every page) |
| frappe_visual.bundle.js | ~120KB | Lazy (on demand) |
| frappe_visual.bundle.css | ~15KB | Global |

## JavaScript Modules

### Core (7)
| Module | Lines | Dependencies |
|--------|-------|-------------|
| graph_engine.js | 797 | cytoscape, cytoscape-fcose, cytoscape-elk, cytoscape-cxtmenu, cytoscape-expand-collapse, cytoscape-navigator, cytoscape-node-html-label, cytoscape-popper |
| layout_manager.js | ~300 | elkjs |
| theme_manager.js | ~200 | — |
| animation_engine.js | 271 | gsap |
| floating_window.js | 239 | gsap (Draggable) |
| context_menu.js | ~50 | cytoscape-cxtmenu |
| minimap.js | ~80 | cytoscape-navigator |

### Components (6)
| Component | Lines | Description |
|-----------|-------|-------------|
| app_map.js | ~400 | Main app visualization |
| relationship_explorer.js | 117 | DocType relationship graph |
| storyboard_wizard.js | 245 | Multi-step wizard |
| visual_dashboard.js | ~150 | Card-based dashboard |
| combo_group.js | ~100 | Grouped node container |
| summary_badge.js | ~80 | Inline stat badge |

### Utils (3)
| Utility | Lines | Description |
|---------|-------|-------------|
| color_system.js | ~200 | 30+ node types, 12 edge types, palette |
| data_adapter.js | 252 | API bridge, data transformation |
| svg_generator.js | ~100 | SVG export utility |

## Node Type Taxonomy (30+)

| Type | Color | Description |
|------|-------|-------------|
| transaction | #4CAF50 | Submittable business documents |
| master | #2196F3 | Core reference data |
| setup | #FF9800 | Configuration doctypes |
| report | #9C27B0 | Report builders |
| child_table | #607D8B | Table fields |
| controller | #795548 | Business logic handlers |
| tool | #009688 | Utility doctypes |
| log | #78909C | Audit/log doctypes |
| queue | #FF5722 | Background job queues |
| singleton | #E91E63 | Single-instance doctypes |
| tree | #8BC34A | Hierarchical data |
| amendment | #CDDC39 | Amendment doctypes |
| custom | #FFC107 | User-created doctypes |

## Edge Type Taxonomy (12)

| Type | Style | Description |
|------|-------|-------------|
| Link | Solid | Standard DocType link |
| Dynamic Link | Dashed | Dynamic reference |
| Table | Thick | Child table connection |
| Table MultiSelect | Thick-dashed | Multi-select table |
| Select | Thin | Select options |
| has_child | Solid | Parent-child hierarchy |
| read | Dotted | Read-only reference |
| fetch_from | Dash-dot | Auto-fetch source |
| formula | Wavy | Calculated field |
| default | Thin-gray | Unclassified |

## Layout Algorithms (9)

| Name | Engine | Type | Best For |
|------|--------|------|----------|
| fcose | Cytoscape | Force-directed | General purpose |
| breadthfirst | Cytoscape | Hierarchical | Tree structures |
| elk-layered | ELK.js | Layered | Complex dependencies |
| elk-tree | ELK.js | Tree | Module hierarchies |
| elk-stress | ELK.js | Stress minimization | Dense graphs |
| elk-radial | ELK.js | Radial | Hub-and-spoke |
| circle | Cytoscape | Circular | Small graphs |
| grid | Cytoscape | Grid | Uniform display |
| concentric | Cytoscape | Concentric | Importance rings |

## API Endpoints (4)

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| get_app_map | POST | Required | Nodes + Edges + Modules |
| get_doctype_relationships | POST | Required | Nodes + Edges + Center |
| get_workspace_map | POST | Required | Nodes + Edges |
| get_quick_stats | POST | Required | Stats object |

## CSS Custom Properties (40+)

Organized in ThemeManager with light/dark variants:
- `--fv-bg-primary`, `--fv-bg-secondary`, `--fv-bg-tertiary`
- `--fv-text-primary`, `--fv-text-secondary`, `--fv-text-muted`
- `--fv-primary`, `--fv-primary-hover`, `--fv-primary-subtle`
- `--fv-border-color`, `--fv-border-radius`
- `--fv-node-shadow`, `--fv-hover-shadow`
- `--fv-success`, `--fv-warning`, `--fv-danger`, `--fv-info`
