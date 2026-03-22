# Frappe Visual — Copilot Instructions for Visual UX Framework

> **This file is a reusable prompt.** Copy it into any new Frappe app's `.github/copilot-instructions.md` to make AI assistants apply the Frappe Visual design patterns automatically.

---

## What is Frappe Visual?

Frappe Visual (`frappe_visual`) is a shared UX framework app that provides rich, interactive graph-based visualizations for any Frappe application. Instead of traditional list views and basic dashboards, it renders **interactive node-graphs, animated transitions, floating windows, combo groups with summary badges, and a complete dark mode + RTL design system**.

## Technology Stack

| Layer | Library | Why |
|-------|---------|-----|
| Graph Engine | **Cytoscape.js** (+ fcose, elk, cxtmenu, expand-collapse, navigator, node-html-label, popper extensions) | MIT, 90KB gzip, canvas rendering, 50+ extensions, compound nodes |
| Layout Algorithms | **ELK.js** via `cytoscape-elk` | Layered, tree, stress, radial, force — runs in Web Worker |
| Animations | **GSAP** + Draggable | Ant-line effects, pulse glow, stagger enter, layout transitions, draggable floating windows |
| Micro-animations | **Lottie-web** | Pre-built After Effects animations for loading states, empty states |
| Tooltips | **Tippy.js** | Lightweight, accessible, positioned popovers |

## Architecture

```
frappe_visual/
├── public/js/
│   ├── fv_bootstrap.js              ← Global loader (always loaded, provides frappe.visual namespace)
│   ├── frappe_visual.bundle.js       ← Main esbuild bundle (lazy-loaded on demand)
│   ├── core/
│   │   ├── graph_engine.js           ← Cytoscape.js wrapper with all features
│   │   ├── animation_engine.js       ← GSAP animation controller
│   │   ├── theme_manager.js          ← Dark/light/RTL, CSS variables, MutationObserver
│   │   ├── floating_window.js        ← Desktop-style draggable windows
│   │   ├── layout_manager.js         ← Toolbar, search bar, view controls builder
│   │   ├── context_menu.js           ← Radial context menu (cxtmenu)
│   │   └── minimap.js                ← Navigator minimap wrapper
│   ├── components/
│   │   ├── app_map.js                ← Full application structure visualization
│   │   ├── relationship_explorer.js  ← DocType relationship graph with depth expansion
│   │   ├── storyboard_wizard.js      ← Multi-step animated wizard with branching
│   │   ├── visual_dashboard.js       ← Card-based dashboard with visual widgets
│   │   ├── combo_group.js            ← Collapsible compound nodes with summary
│   │   └── summary_badge.js          ← Compact status indicator badges
│   └── utils/
│       ├── color_system.js           ← 30 palette colors, 25+ node types, auto-color by hash
│       ├── data_adapter.js           ← Frappe ↔ Graph data bridge (API calls + transforms)
│       └── svg_generator.js          ← Programmatic SVG art generator
├── public/scss/
│   ├── frappe_visual.bundle.scss     ← Main SCSS entry
│   ├── _variables.scss               ← Design tokens (colors, spacing, radius, shadows)
│   ├── _animations.scss              ← @keyframes (ant-march, pulse, fade-in, stagger, breathe)
│   ├── _components.scss              ← All component styles
│   ├── _floating_windows.scss        ← Window chrome styles
│   ├── _dark_mode.scss               ← Complete dark theme overrides
│   └── _rtl.scss                     ← RTL direction overrides
└── api.py                            ← Server-side: get_app_map, get_doctype_relationships, etc.
```

## How to Use in Your App

### 1. Ensure frappe_visual is installed
```bash
bench get-app frappe_visual
bench --site <site> install-app frappe_visual
```

### 2. Use the lazy-load API (no bundle cost if unused)
```javascript
// fv_bootstrap.js provides frappe.visual globally
// The main bundle is loaded ONLY when first needed

// Option A: Load the engine and create manually
const { GraphEngine, AppMap, AnimationEngine } = await frappe.visual.engine();
const map = await AppMap.create('#my-container', 'erpnext');

// Option B: Use convenience methods
await frappe.visual.appMap('#container', 'my_app');
const wizard = await frappe.visual.storyboard('#container', steps);

// Option C: Quick create any component
await frappe.visual.create('RelationshipExplorer', '#container', 'Sales Invoice', { depth: 3 });
```

### 3. Custom graph in your own doctype form
```javascript
frappe.ui.form.on('My DocType', {
    refresh(frm) {
        const container = frm.fields_dict.my_html_field.$wrapper[0];
        frappe.visual.create('RelationshipExplorer', container, frm.doc.doctype, {
            depth: 2,
            layout: 'elk-radial',
        });
    }
});
```

### 4. Custom node types for your app
```javascript
const { ColorSystem } = await frappe.visual.engine();
ColorSystem.registerNodeType('my-custom-type', '#ff6b6b');
ColorSystem.registerEdgeType('custom-relation', '#4ecdc4');
```

## Design Patterns to Follow

### Node Color Semantics
Always use `ColorSystem.getNodeColor(type)` — never hardcode colors. Pre-defined types:
- `module` → indigo, `doctype` → blue, `master` → emerald, `transaction` → amber
- `settings` → slate, `child-table` → teal, `report` → purple, `page` → pink
- `workspace` → cyan, `dashboard` → orange, `action` → red, `log` → stone
- Network: `server`, `device`, `interface`, `vpn`, `firewall`, `wifi`
- Comms: `whatsapp`, `telegram`, `call`, `meeting`
- Status: `status-active` → green, `status-warning` → yellow, `status-error` → red

### Edge Types
- `link` → solid blue, `child-table` → dashed teal, `dependency` → dotted purple
- `reference` → dash-dot gray, `data-flow` → solid + animated ant-line

### Layout Selection Guide
| Use Case | Layout | Why |
|----------|--------|-----|
| App structure (modules → doctypes) | `fcose` or `elk-layered` | Hierarchical grouping |
| Relationships from one root | `elk-radial` | Radiates outward |
| Dependency tree | `elk-mrtree` | Clear parent-child |
| Large flat networks | `elk-stress` | Minimal edge crossings |
| Overview/exploration | `fcose` | Compound-aware force |

### Animations
- **Ant-lines**: Use on data-flow edges. Animated dash pattern marching along edges.
- **Pulse glow**: On active/selected nodes. Gentle border-color cycling.
- **Stagger enter**: When adding multiple nodes. Each appears with slight delay.
- **Layout transition**: Smooth overlay during layout recalculation.
- **Ambient breathing**: Subtle scale oscillation on idle graphs.

### Dark Mode
ThemeManager watches `[data-theme="dark"]` and `body.dark` via MutationObserver. All components automatically adapt. Use CSS variables (`--fv-*`) for any custom styling.

### RTL Support
ThemeManager watches `[dir="rtl"]` and `[lang="ar"]`. Layout toolbar and floating windows mirror automatically. All text uses `__()` for translation.

### Floating Windows
Use for detail panels, logs, stats that shouldn't block the main view:
```javascript
const { FloatingWindow } = await frappe.visual.engine();
const win = new FloatingWindow({
    title: 'Node Details',
    color: '#818cf8',
    width: 360,
    height: 400,
});
win.setContent(myElement);
win.show();
```

## Code Style Rules for This Framework

1. **Always use `__()` for all user-visible strings** (Frappe i18n)
2. **Never hardcode colors** — use `ColorSystem` or `--fv-*` CSS variables
3. **Lazy-load everything** — use `frappe.require()` / `frappe.visual.engine()` pattern
4. **GSAP for all animations** — no raw CSS transitions for complex effects
5. **Compound nodes for grouping** — use Cytoscape parent property, not manual positioning
6. **Data flows through DataAdapter** — never call `frappe.call()` directly from components
7. **Every component must support `destroy()`** — clean up Cytoscape instances, GSAP timelines, event listeners
8. **Mobile-first responsive** — components must work at 320px minimum width

## Server-Side API Reference

```python
# Get full app structure (modules + doctypes + relationships)
frappe.call({ method: 'frappe_visual.api.get_app_map', args: { app_name: 'erpnext' } })

# Get doctype relationships with depth
frappe.call({ method: 'frappe_visual.api.get_doctype_relationships', args: { doctype: 'Sales Invoice', depth: 3 } })

# Get workspace structure
frappe.call({ method: 'frappe_visual.api.get_workspace_map', args: { workspace: 'Accounting' } })

# Get quick stats for dashboard
frappe.call({ method: 'frappe_visual.api.get_quick_stats', args: { app_name: 'erpnext' } })
```

## When Building New Visual Components

1. Extend or compose from existing core classes
2. Register in `frappe_visual.bundle.js` exports
3. Add CSS to appropriate SCSS partial
4. Add server API if needed in `api.py`
5. Test in dark mode + RTL + mobile viewport
6. Add `destroy()` method for cleanup
