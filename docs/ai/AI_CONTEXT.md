# Frappe Visual AI Context

> Token-optimized context for LLM consumption (~2000 tokens)
> Load into system prompts for AI assistants

## SYSTEM: Frappe Visual v0.1.0

TYPE: Frappe v16 App (Visual UX Framework)
DOMAIN: Developer Tools / Data Visualization
LANG: Python + JavaScript (ES Modules)
DB: MariaDB (via Frappe QueryBuilder)
CACHE: Redis
GRAPH: Cytoscape.js + ELK.js
ANIM: GSAP + Lottie-web
ORG: Arkan Lab

## PURPOSE

Graph-based UX framework that transforms how Frappe apps display data.
Interactive node-graph visualizations, animations, floating windows, and complete design system.
Replaces traditional list views, dashboards, and workspaces with rich visual experiences.

## ARCHITECTURE

```
fv_bootstrap.js (2KB, global) → lazy-loads → frappe_visual.bundle.js (400KB)
Components → DataAdapter → frappe.xcall() → api.py → frappe.qb → MariaDB
```

## CORE MODULES

| Module | Purpose |
|--------|---------|
| GraphEngine | Cytoscape.js wrapper — theming, compound nodes, context menus, minimap |
| LayoutManager | 9 layout algorithms (fcose, elk-layered, mrtree, stress, radial, etc.) |
| AnimationEngine | GSAP ant-lines, pulse glow, stagger enter, layout transitions |
| ThemeManager | Dark/light auto-detection, RTL, CSS variables, MutationObserver |
| FloatingWindow | Desktop-style draggable windows with GSAP Draggable |
| ColorSystem | 30+ semantic node types, 12 edge types, auto-color by hash |
| DataAdapter | Frappe ↔ Graph data bridge |

## COMPONENTS

| Component | Purpose |
|-----------|---------|
| AppMap | Full app structure visualization (modules → doctypes → relationships) |
| RelationshipExplorer | DocType relationship graph with depth expansion |
| Storyboard | Multi-step animated wizard with branching |
| VisualDashboard | Card-based dashboard widgets |
| ComboGroup | Collapsible compound nodes with summary |
| SummaryBadge | Compact status indicator badges |

## APIS

| Endpoint | Purpose |
|----------|---------|
| `frappe_visual.api.get_app_map` | Full app structure (modules + doctypes + edges) |
| `frappe_visual.api.get_doctype_relationships` | Relationship graph from a doctype |
| `frappe_visual.api.get_workspace_map` | Workspace shortcuts as graph |
| `frappe_visual.api.get_quick_stats` | Quick counts for dashboard |
| `frappe_visual.utils.license.get_license_status` | License tier info |
| `frappe_visual.utils.feature_flags.get_enabled_features` | Feature gating |

## FEATURE TIERS

FREE: app_map_basic, relationship_explorer_basic, visual_dashboard, storyboard_wizard, dark_mode, rtl_support, basic_layouts, search_filter, minimap
PREMIUM: advanced_layouts, floating_windows, animation_engine, export_svg/png, custom_node/edge_types, context_menus, combo_groups, mcp_integration

## USAGE

```javascript
// Lazy-load on demand
await frappe.visual.appMap('#container', 'erpnext');

// Manual engine creation
const engine = await frappe.visual.create({
  container: '#graph',
  nodes: [...], edges: [...],
  layout: 'fcose',
  minimap: true, animate: true
});

// Extend with custom types
ColorSystem.registerNodeType('my-type', { palette: 'emerald', icon: '🔥' });
```

## PATTERNS

### QueryBuilder (v16)
```python
DocType = frappe.qb.DocType("DocType")
frappe.qb.from_(DocType).select(DocType.name).where(DocType.custom == 0).run()
```

### Feature Gating
```python
from frappe_visual.utils.feature_flags import require_premium
@require_premium("animation_engine")
def premium_function(): ...
```

### Client-Side Feature Check
```javascript
frappe_visual.is_enabled('advanced_layouts')
frappe_visual.require_premium('export_svg', 'SVG Export', callback)
```

## FILE STRUCTURE

```
frappe_visual/
├── api.py                    # Server APIs
├── hooks.py                  # App hooks
├── utils/
│   ├── license.py           # License validation
│   └── feature_flags.py     # Feature gating
├── frappe_visual/
│   ├── page/visual_hub/     # Main page
│   └── doctype/
│       └── frappe_visual_settings/
├── public/
│   ├── js/core/             # Engine, Layout, Animation, Theme, etc.
│   ├── js/components/       # AppMap, Explorer, Storyboard, etc.
│   ├── js/utils/            # ColorSystem, DataAdapter, SVGGenerator
│   └── scss/                # Design tokens, components, dark, RTL
```

---
*Condensed from full docs. See CONTEXT.md for complete reference.*
