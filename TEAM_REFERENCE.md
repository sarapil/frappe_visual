# Frappe Visual — Team Reference Guide
> **Version 0.1.0** | Arkan Lab | GPL-3.0

مرجع شامل للمطورين، مصممي UX، ومحللي النظم — كل ما يتعلق بقدرات Frappe Visual وكيفية استخدامها.

---

## 📋 Overview — ما هو Frappe Visual؟

Frappe Visual هو **إطار UX مرئي تفاعلي** يعمل كطبقة فوق Frappe Framework. يوفر مكونات بصرية متقدمة مع رسوم متحركة، تأثيرات احترافية، ودعم كامل للوضع الداكن و RTL.

### المبادئ الأساسية
- ✅ **غير تدخلي** — لا يستبدل شاشات Frappe الأصلية، بل يوفر بدائل بصرية يتم تفعيلها حسب الطلب
- ✅ **تحميل كسول** — المكتبات الثقيلة (~400KB) تُحمّل فقط عند الحاجة
- ✅ **قابل للتوسيع** — كل مكون يعمل مستقلاً ويمكن تخصيصه عبر الخيارات
- ✅ **ثنائي اللغة** — دعم كامل لـ RTL/Arabic + Light/Dark themes

---

## 🧩 All Available Screen Types

| # | Component | Type | Status | Usage |
|---|-----------|------|--------|-------|
| 1 | **AppMap** | App Architecture | ✅ Ready | `frappe.visual.appMap('#el', 'erpnext')` |
| 2 | **RelationshipExplorer** | DocType Graph | ✅ Ready | `frappe.visual.RelationshipExplorer.create(...)` |
| 3 | **Storyboard** | Multi-Step Wizard | ✅ Ready | `frappe.visual.storyboard('#el', steps)` |
| 4 | **VisualDashboard** | Dashboard Cards | ✅ Ready | `frappe.visual.VisualDashboard.create(...)` |
| 5 | **KanbanBoard** | Trello-Style Board | ✅ Ready | `frappe.visual.kanban('#el', {doctype, fieldname})` |
| 6 | **VisualCalendar** | Month/Week/Day | ✅ Ready | `frappe.visual.calendar('#el', {doctype})` |
| 7 | **VisualGantt** | Gantt Timeline | ✅ Ready | `frappe.visual.gantt('#el', {doctype})` |
| 8 | **VisualTreeView** | Org Chart / Tree | ✅ Ready | `frappe.visual.tree('#el', {doctype})` |
| 9 | **VisualMap** | Geographic Map | ✅ Ready | `frappe.visual.map('#el', {doctype})` |
| 10 | **VisualGallery** | Image Masonry | ✅ Ready | `frappe.visual.gallery('#el', {doctype})` |
| 11 | **VisualFormDashboard** | Form Relationships | ✅ Ready | `frappe.visual.formDashboard('#el', {doctype, docname})` |
| 12 | **ComboGroup** | Collapsible Groups | ✅ Ready | `frappe.visual.ComboGroup.create(...)` |
| 13 | **SummaryBadge** | Status Indicators | ✅ Ready | `frappe.visual.SummaryBadge.create(...)` |
| 14 | **FloatingWindow** | Draggable Window | ✅ Ready | `frappe.visual.FloatingWindow.create(...)` |
| 15 | **GraphEngine** | Core Cytoscape | ✅ Ready | `frappe.visual.create({container, nodes, edges})` |

### Core Libraries Exposed
| Library | Access | Purpose |
|---------|--------|---------|
| Cytoscape.js | `frappe.visual.cytoscape` | Graph rendering engine |
| ELK.js | `frappe.visual.ELK` | Layout algorithms |
| GSAP | `frappe.visual.gsap` | Animation engine |
| Draggable | `frappe.visual.Draggable` | Drag-and-drop |
| Lottie | `frappe.visual.lottie` | SVG/JSON animations |

---

## 🎨 For UX Designers — Design System Reference

### Design Tokens (`_variables.scss`)
```
Colors:     $fv-accent (#6366f1), $fv-success, $fv-warning, $fv-danger, $fv-info
Typography: Inter font, sizes from 11px to 24px
Spacing:    4px increments ($fv-space-1 through $fv-space-10)
Radii:      6px (sm), 10px (md), 16px (lg), 9999px (full)
Shadows:    sm, md, lg, glow
Transitions: fast (0.15s), base (0.25s), slow (0.4s), spring (0.5s bounce)
```

### Premium Effects (`_effects.scss`)
All effects are utility classes, add them to any element:

| Effect Class | Description |
|-------------|-------------|
| `.fv-fx-glass` | Glassmorphism (blur + translucency) |
| `.fv-fx-glass-strong` | Stronger glass effect |
| `.fv-fx-mouse-glow` | Mouse-following radial glow (needs JS for `--mouse-x/y`) |
| `.fv-fx-ripple` | Material-style click ripple |
| `.fv-fx-hover-lift` | Lift on hover (translateY -4px + shadow) |
| `.fv-fx-hover-glow` | Glow border on hover |
| `.fv-fx-hover-scale` | Scale up 1.04x on hover |
| `.fv-fx-hover-shine` | Diagonal shine sweep on hover |
| `.fv-fx-gradient-animated` | Animated 4-color gradient background |
| `.fv-fx-gradient-text` | Gradient text color |
| `.fv-fx-border-animated` | Color-cycling border |
| `.fv-fx-vertical-text` | Vertical text (writing-mode) |
| `.fv-fx-vertical-text-upright` | Vertical text with upright characters |
| `.fv-fx-skeleton` | Loading shimmer placeholder |
| `.fv-fx-morph-blob` | Ambient morphing blob shape |
| `.fv-fx-notification-dot` | Pulsing notification indicator |
| `.fv-fx-counter` | Tabular number layout |
| `.fv-fx-page-enter` | Page entrance animation |
| `.fv-fx-page-leave` | Page exit animation |
| `.fv-fx-parallax-*` | Parallax depth layers (container, front, mid, back) |

### Animations (`_animations.scss`)
| Keyframe | Duration | Use |
|----------|----------|-----|
| `fv-ant-march` | 12s linear ∞ | Connecting lines animation |
| `fv-pulse` | 2s ease ∞ | Pulsing elements |
| `fv-fade-in-up` | 0.35s | Entrance: up + fade |
| `fv-fade-in-scale` | 0.4s | Entrance: scale + fade |
| `fv-slide-in-right` | 0.35s | Slide from right |
| `fv-breathe` | 4s ease ∞ | Ambient glow |
| `fv-spin` | 1s linear ∞ | Loading spinner |
| `fv-shimmer` | 1.5s ease ∞ | Skeleton loading |
| `fv-morph-blob` | 8s ease ∞ | Shape morphing |
| `fv-gradient-shift` | 6s ease ∞ | Gradient animation |
| `fv-ripple-expand` | 0.6s | Click ripple |

### Dark Mode
- Auto-detected via `data-theme="dark"` or `prefers-color-scheme`
- All components have full dark overrides in `_dark_mode.scss`
- Glass effects automatically adjust opacity for dark backgrounds

### RTL Support
- Auto-detected via `dir="rtl"` or `lang="ar"`
- All borders, margins, directions flip correctly
- Vertical text adjusts `writing-mode` for RTL
- Calendar navigation reverses

---

## 💻 For Developers — Integration Patterns

### Quick Start — Add Visual View to Any DocType

```javascript
// In your DocType's form script or page script:

// 1. Calendar view for any DocType with date fields
frappe.visual.calendar('#calendar-container', {
    doctype: 'Event',
    fieldMap: { start: 'starts_on', end: 'ends_on', title: 'subject' },
});

// 2. Gantt chart for task-like DocTypes
frappe.visual.gantt('#gantt-container', {
    doctype: 'Task',
    fieldMap: { start: 'exp_start_date', end: 'exp_end_date', title: 'subject', progress: 'progress' },
});

// 3. Tree view for hierarchical DocTypes
frappe.visual.tree('#tree-container', {
    doctype: 'Department',
    parentField: 'parent_department',  // auto-detected if omitted
    titleField: 'name',
});

// 4. Map view for geo-located data
frappe.visual.map('#map-container', {
    doctype: 'Customer',
    latField: 'latitude',
    lngField: 'longitude',
    titleField: 'customer_name',
});

// 5. Gallery for image-heavy DocTypes
frappe.visual.gallery('#gallery-container', {
    doctype: 'Item',
    imageField: 'image',
    titleField: 'item_name',
});

// 6. Enhanced form dashboard
frappe.visual.formDashboard('#dash-container', {
    doctype: 'Sales Order',
    docname: 'SO-00001',
});

// 7. Kanban board
frappe.visual.kanban('#kanban-container', {
    doctype: 'ToDo',
    fieldname: 'status',
});
```

### API Endpoints

| Endpoint | Args | Returns |
|----------|------|---------|
| `frappe_visual.api.get_app_map` | `app_name` | `{nodes, edges}` |
| `frappe_visual.api.get_doctype_relationships` | `doctype, depth` | `{nodes, edges}` |
| `frappe_visual.api.get_workspace_map` | `workspace?` | `{nodes, edges}` |
| `frappe_visual.api.get_quick_stats` | `app_name?` | `{modules, doctypes, ...}` |
| `frappe_visual.api.get_kanban_data` | `doctype, fieldname, ...` | `{cards, columns, total}` |
| `frappe_visual.api.get_form_dashboard_data` | `doctype, docname, depth` | `{nodes, edges, stats}` |

### Component Creation Pattern
Every component follows this structure:
```javascript
import { ColorSystem } from "../utils/color_system";

export class MyComponent {
    static create(container, opts) {
        return new MyComponent(container, opts);
    }
    constructor(container, opts) {
        this.container = typeof container === "string"
            ? document.querySelector(container) : container;
        this.opts = Object.assign({ /* defaults */ }, opts);
        this._gsap = frappe.visual?.gsap || window.gsap;
        this._init();
    }
    // Public API: setData(), refresh(), destroy()
}
```

### Adding a New Component (Checklist)
1. ☐ Create `components/my_component.js` with class + `static create()`
2. ☐ Import + register in `frappe_visual.bundle.js`
3. ☐ Add shorthand in `fv_bootstrap.js`
4. ☐ Create `scss/_my_component.scss` with styles
5. ☐ Import in `frappe_visual.bundle.scss` (before `_dark_mode`)
6. ☐ Add dark mode overrides in `_dark_mode.scss`
7. ☐ Add RTL overrides in `_rtl.scss` (if needed)
8. ☐ Add API endpoint in `api.py` (if needed)
9. ☐ Add Arabic translations in `translations/ar.csv`
10. ☐ Add tests in `tests/`

---

## 📊 For System Analysts — Integration Decision Matrix

### When to Use Visual vs Standard Frappe Views

| Frappe View | Visual Alternative | Use Visual When... |
|-------------|-------------------|-------------------|
| List View | — | Standard is sufficient |
| Calendar View | **VisualCalendar** | Need glassmorphism, GSAP animations, ColorSystem integration |
| Gantt View | **VisualGantt** | Need animated bar transitions, gradient fills, zoom levels |
| Tree View | **VisualTreeView** | Need animated expand/collapse, color-coded nodes, horizontal layout |
| Map View | **VisualMap** | Need colored markers, animated entrance, FloatingWindow popups |
| Image View | **VisualGallery** | Need masonry grid, lightbox, lazy-loading, hover zoom |
| Form Dashboard | **VisualFormDashboard** | Need relationship graph, stat cards, visual link navigation |
| Kanban Board | **KanbanBoard** | Need drag-drop, swimlanes, WIP limits, custom card fields |
| Report Builder | — | Too complex, use standard |
| Print View | — | Different domain (Vue 3) |
| File Manager | — | Limited value vs effort |

### Non-Invasive Integration Strategy
- Frappe Visual does **NOT** override any standard routes
- Components are opt-in: you choose when and where to mount them
- The bootstrap loader adds zero overhead to pages that don't use it
- CSS is ~15KB gzipped; JS bundle loads on-demand (~400KB)

### Recommended Integration Points
1. **Custom Pages** — Best for dedicated visual views
2. **Form Scripts** — Inject visual dashboard below form header
3. **Workspace Widgets** — Custom HTML blocks with visual components
4. **Client Scripts** — Add visual buttons/panels to any DocType form
5. **API Consumers** — Use endpoints directly for custom frontends

---

## 📁 File Structure

```
frappe_visual/
├── public/js/
│   ├── frappe_visual.bundle.js    # Entry: imports + namespace registration
│   ├── fv_bootstrap.js            # Global: lazy-load + shorthands
│   ├── core/
│   │   ├── graph_engine.js        # Cytoscape wrapper (797 lines)
│   │   ├── animation_engine.js    # GSAP controller (271 lines)
│   │   ├── theme_manager.js       # Dark/Light/RTL (199 lines)
│   │   ├── layout_manager.js      # 9 layout algorithms
│   │   ├── floating_window.js     # Draggable windows
│   │   ├── context_menu.js        # Right-click menus
│   │   └── minimap.js             # Navigation minimap
│   ├── utils/
│   │   ├── color_system.js        # 30+ node types, auto-color
│   │   ├── data_adapter.js        # Frappe↔Cytoscape bridge
│   │   └── svg_generator.js       # SVG art generation
│   └── components/
│       ├── app_map.js             # App architecture map
│       ├── relationship_explorer.js # Radial relationship graph
│       ├── storyboard_wizard.js   # Multi-step wizard
│       ├── visual_dashboard.js    # Dashboard cards
│       ├── kanban_board.js        # Kanban board (946 lines)
│       ├── visual_calendar.js     # Calendar views
│       ├── visual_gantt.js        # Gantt timeline
│       ├── visual_tree.js         # Org chart / tree
│       ├── visual_map.js          # Geographic map
│       ├── visual_gallery.js      # Image gallery
│       ├── visual_form_dashboard.js # Form dashboard
│       ├── combo_group.js         # Collapsible groups
│       └── summary_badge.js       # Status badges
├── public/scss/
│   ├── frappe_visual.bundle.scss  # Entry: all imports
│   ├── _variables.scss            # Design tokens
│   ├── _animations.scss           # Keyframes + animation classes
│   ├── _effects.scss              # Premium effects (341 lines)
│   ├── _components.scss           # Core component styles
│   ├── _floating_windows.scss     # Window styles
│   ├── _kanban.scss               # Kanban styles (470 lines)
│   ├── _calendar.scss             # Calendar styles
│   ├── _gantt.scss                # Gantt styles
│   ├── _tree.scss                 # Tree styles
│   ├── _map.scss                  # Map styles
│   ├── _gallery.scss              # Gallery + lightbox styles
│   ├── _form_dashboard.scss       # Form dashboard styles
│   ├── _dark_mode.scss            # Dark theme overrides
│   └── _rtl.scss                  # RTL overrides
├── api.py                         # 6 API endpoints
├── hooks.py                       # Desk includes (bootstrap + CSS)
└── translations/ar.csv            # 170+ Arabic translations
```

---

## 🔧 Useful Commands

```bash
# Build frappe_visual assets
bench build --app frappe_visual

# Watch for changes during development
bench watch --apps frappe_visual

# Clear cache after updates
bench --site dev.localhost clear-cache

# Run tests
bench --site dev.localhost run-tests --app frappe_visual
```

---

*Last updated: March 2026 — Frappe Visual v0.1.0*
