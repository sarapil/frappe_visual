# 📖 Frappe Visual — Complete Component & API Reference
# دليل مكتبة Frappe Visual الشامل — كل المكونات والواجهات الرسومية

> **آخر تحديث:** 2026-04-03
> **الإصدار:** frappe_visual 1.x — Frappe 16+
> **الحزمة:** JS 6343 Kb | CSS 69 Kb + templates.css
> **الترجمات:** 462 ترجمة عربية كاملة
> **المكتبات:** Cytoscape.js + ELK.js + GSAP + Draggable + Lottie-web + Tabler Icons v3.30

---

## 📋 فهرس المحتويات — Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Core Engine (6 modules)](#-core-engine)
3. [Visual Components (13 components)](#-visual-components)
4. [Utility Modules (7 modules)](#-utility-modules)
5. [Auto-Enhancers (3 modules)](#-auto-enhancers)
6. [CSS Effects & Theme System](#-css-effects--theme-system)
7. [Server API (12 endpoints)](#-server-api)
8. [Page Templates (8 types)](#-page-templates)
9. [App Page Generator (4 generators)](#-app-page-generator)
10. [DocType Visualizer (4 views)](#-doctype-visualizer)
11. [Bilingual Tooltip System](#-bilingual-tooltip-system)
12. [Arabic Translations](#-arabic-translations)
13. [Performance Guidelines](#-performance-guidelines)
14. [Integration Patterns](#-integration-patterns)

---

## 🏗️ Architecture Overview

```
frappe_visual/public/
├── js/
│   ├── frappe_visual.bundle.js          # Main esbuild entry point
│   ├── fv_bootstrap.js                  # Bootstrap loader
│   ├── icon_helper.js                   # Tabler Icons integration
│   ├── core/                            # 6 core engine modules
│   │   ├── graph_engine.js              #   Cytoscape.js wrapper
│   │   ├── layout_manager.js            #   9 layout algorithms (ELK)
│   │   ├── animation_engine.js          #   GSAP animation system
│   │   ├── theme_manager.js             #   Dark/light + RTL theme
│   │   ├── context_menu.js              #   Circular right-click menu
│   │   ├── floating_window.js           #   Draggable overlay panels
│   │   └── minimap.js                   #   Navigation overview
│   ├── components/                      # 13 visual components
│   │   ├── app_map.js                   #   App/module/DocType graph
│   │   ├── relationship_explorer.js     #   DocType relationship graph
│   │   ├── storyboard_wizard.js         #   Guided walkthroughs
│   │   ├── visual_dashboard.js          #   KPI + chart dashboard
│   │   ├── combo_group.js               #   Grouped node clusters
│   │   ├── summary_badge.js             #   Status/count badges
│   │   ├── kanban_board.js              #   Drag-and-drop Kanban
│   │   ├── visual_calendar.js           #   Month/week/day calendar
│   │   ├── visual_gantt.js              #   Project timeline Gantt
│   │   ├── visual_tree.js               #   Hierarchical tree view
│   │   ├── visual_map.js                #   Geographic map + markers
│   │   ├── visual_gallery.js            #   Image gallery + lightbox
│   │   └── visual_form_dashboard.js     #   Form linked-doc graph
│   └── utils/                           # 10 utility modules
│       ├── color_system.js              #   Auto-color generation
│       ├── data_adapter.js              #   API data fetching
│       ├── svg_generator.js             #   SVG export
│       ├── bilingual_tooltip.js         #   Arabic↔English tooltips
│       ├── visual_page_templates.js     #   8 page templates
│       ├── app_page_generator.js        #   Auto page generator
│       ├── doctype_visualizer.js        #   DocType visual interfaces
│       ├── form_enhancer.js             #   Auto-enhance forms
│       ├── list_enhancer.js             #   List view visual toggle
│       └── workspace_enhancer.js        #   Workspace visual cards
├── css/
│   ├── frappe_visual-variables.css      # CSS custom properties
│   ├── frappe_visual-theme.css          # Theme styles
│   ├── brand.css                        # Branding styles
│   ├── icons.css                        # Icon system styles
│   └── templates.css                    # Page template styles
```

### Namespace Map

| Namespace | Module | Type |
|-----------|--------|------|
| `frappe.visual.GraphEngine` | graph_engine.js | Class |
| `frappe.visual.LayoutManager` | layout_manager.js | Class |
| `frappe.visual.AnimationEngine` | animation_engine.js | Class |
| `frappe.visual.ThemeManager` | theme_manager.js | Class |
| `frappe.visual.ContextMenu` | context_menu.js | Class |
| `frappe.visual.Minimap` | minimap.js | Class |
| `frappe.visual.FloatingWindow` | floating_window.js | Class |
| `frappe.visual.ColorSystem` | color_system.js | Utility |
| `frappe.visual.DataAdapter` | data_adapter.js | Utility |
| `frappe.visual.SVGGenerator` | svg_generator.js | Utility |
| `frappe.visual.AppMap` | app_map.js | Component |
| `frappe.visual.RelationshipExplorer` | relationship_explorer.js | Component |
| `frappe.visual.Storyboard` | storyboard_wizard.js | Component |
| `frappe.visual.VisualDashboard` | visual_dashboard.js | Component |
| `frappe.visual.ComboGroup` | combo_group.js | Component |
| `frappe.visual.SummaryBadge` | summary_badge.js | Component |
| `frappe.visual.KanbanBoard` | kanban_board.js | Component |
| `frappe.visual.VisualCalendar` | visual_calendar.js | Component |
| `frappe.visual.VisualGantt` | visual_gantt.js | Component |
| `frappe.visual.VisualTreeView` | visual_tree.js | Component |
| `frappe.visual.VisualMap` | visual_map.js | Component |
| `frappe.visual.VisualGallery` | visual_gallery.js | Component |
| `frappe.visual.VisualFormDashboard` | visual_form_dashboard.js | Component |
| `frappe.visual.templates.*` | visual_page_templates.js | Templates |
| `frappe.visual.generator.*` | app_page_generator.js | Generators |
| `frappe.visual.doctype.*` | doctype_visualizer.js | Visualizers |
| `frappe.visual.formEnhancer` | form_enhancer.js | Auto-enhancer |
| `frappe.visual.listEnhancer` | list_enhancer.js | Auto-enhancer |
| `frappe.visual.workspaceEnhancer` | workspace_enhancer.js | Auto-enhancer |
| `frappe.visual.bilingualTooltip` | bilingual_tooltip.js | Utility |
| `frappe.visual.cytoscape` | (exposed lib) | Library |
| `frappe.visual.ELK` | (exposed lib) | Library |
| `frappe.visual.gsap` | (exposed lib) | Library |
| `frappe.visual.Draggable` | (exposed lib) | Library |
| `frappe.visual.lottie` | (exposed lib) | Library |

---

## ⚙️ Core Engine

### 1. GraphEngine — المحرك الرئيسي

```javascript
const engine = new frappe.visual.GraphEngine({
    container: '#graph',
    nodes: [
        { id: 'n1', label: 'Sales Order', type: 'transaction', status: 'active',
          badge: '5 pending', summary: { total: 120, completed: 95 } },
        { id: 'n2', label: 'Customer', type: 'master' },
    ],
    edges: [
        { source: 'n1', target: 'n2', type: 'link', label: 'customer', animated: true },
    ],
    layout: 'elk-layered',
    minimap: true, contextMenu: true, expandCollapse: true,
    animate: true, antLines: true, pulseNodes: true,
    onNodeClick: (data) => {},
    onNodeDblClick: (data) => frappe.set_route('Form', data.doctype, data.docname),
});
```

**Node types (30+):** module, transaction, master, settings, log, user, role, device, server, vpn, wifi, whatsapp, telegram, call, meeting, action, webhook, scheduler, report, page, workspace, tree, single, child-table, virtual, submittable, custom, group, flow, error

**Edge types (12):** link, child, dependency, reference, flow, data-flow, vpn-tunnel, api-call, realtime, permission, contains, shortcut

### 2. LayoutManager — 9 خوارزميات تخطيط

```javascript
engine.runLayout('fcose');          // Force-directed — complex relationships
engine.runLayout('elk-layered');    // Hierarchical — workflows
engine.runLayout('elk-mrtree');     // Tree — org charts
engine.runLayout('elk-radial');     // Radial — relationship exploration
engine.runLayout('elk-stress');     // Stress — large networks
engine.runLayout('breadthfirst');   // Level-based
engine.runLayout('circle');         // Circular — comparison
engine.runLayout('grid');           // Grid — ordered display
engine.runLayout('concentric');     // Concentric circles
```

### 3. AnimationEngine — GSAP

```javascript
frappe.visual.gsap.from('.card', { opacity: 0, y: 20, stagger: 0.05, duration: 0.4, ease: 'power2.out' });
frappe.visual.Draggable.create('.panel', { bounds: 'body', inertia: true });
```

### 4. ThemeManager — Dark/Light + RTL

```javascript
frappe.visual.ThemeManager.init();
frappe.visual.ThemeManager.setTheme('dark');
frappe.visual.ThemeManager.toggle();
```

### 5. FloatingWindow — نوافذ عائمة قابلة للسحب

```javascript
const win = new frappe.visual.FloatingWindow({
    title: __("Help"), position: 'right', width: '400px',
    minimizable: true, maximizable: true, fullscreenable: true, draggable: true,
    content: '<div>...</div>',
});
win.show(); win.minimize(); win.maximize(); win.fullscreen();
```

### 6. ContextMenu — قائمة دائرية

```javascript
new frappe.visual.ContextMenu(engine, {
    items: [
        { label: __('Open'), icon: 'external-link', action: (node) => {} },
        { label: __('Delete'), icon: 'trash', action: (node) => {}, color: 'red' },
    ]
});
```

---

## 🧩 Visual Components (13)

| # | Component | API | Purpose |
|---|-----------|-----|---------|
| 1 | AppMap | `frappe.visual.AppMap.create(el, app, opts)` | Interactive app/module/DocType graph |
| 2 | RelationshipExplorer | `frappe.visual.RelationshipExplorer.create(el, dt, opts)` | DocType relationship graph |
| 3 | Storyboard | `frappe.visual.Storyboard.create(el, { steps })` | Guided walkthroughs & onboarding |
| 4 | VisualDashboard | `frappe.visual.VisualDashboard.create(el, config)` | KPI + chart dashboard |
| 5 | KanbanBoard | `frappe.visual.KanbanBoard.create(el, config)` | Drag-and-drop Kanban |
| 6 | VisualCalendar | `frappe.visual.VisualCalendar.create(el, config)` | Month/week/day calendar |
| 7 | VisualGantt | `frappe.visual.VisualGantt.create(el, config)` | Project timeline Gantt |
| 8 | VisualTreeView | `frappe.visual.VisualTreeView.create(el, config)` | Hierarchical tree |
| 9 | VisualMap | `frappe.visual.VisualMap.create(el, config)` | Geographic map + markers |
| 10 | VisualGallery | `frappe.visual.VisualGallery.create(el, config)` | Image gallery + lightbox |
| 11 | VisualFormDashboard | `frappe.visual.VisualFormDashboard.create(el, config)` | Form linked-doc mini-graph |
| 12 | ComboGroup | `engine.addComboGroup(id, config)` | Compound node grouping |
| 13 | SummaryBadge | `frappe.visual.SummaryBadge.create(el, config)` | Status/count badges |

---

## 🔧 Utility Modules (7)

| # | Module | Namespace | Purpose |
|---|--------|-----------|---------|
| 1 | ColorSystem | `frappe.visual.ColorSystem` | Auto-color generation per string |
| 2 | DataAdapter | `frappe.visual.DataAdapter` | Server data fetching |
| 3 | SVGGenerator | `frappe.visual.SVGGenerator` | SVG/PNG export |
| 4 | Bilingual Tooltip | `frappe.visual.bilingualTooltip` | Arabic↔English hover tooltips |
| 5 | Page Templates | `frappe.visual.templates.*` | 8 pre-built page layouts |
| 6 | App Page Generator | `frappe.visual.generator.*` | Auto-generate app pages |
| 7 | DocType Visualizer | `frappe.visual.doctype.*` | Transform DocTypes to visual UI |

---

## ⚡ Auto-Enhancers (3)

### 1. Form Enhancer — تحسين النماذج تلقائياً

Injects into **every Frappe form**: stats ribbon, relationship mini-graph, quick nav links.

```javascript
frappe.visual.formEnhancer.enable();
frappe.visual.formEnhancer.disable();
frappe.visual.formEnhancer.configure({ showGraph: true, showStats: true, showQuickLinks: true, animate: true });
```

**Injected elements:** Stats ribbon (Status, Owner, Modified, Link counts) | SVG radial relationship graph | Quick navigation pills | Expand to full RelationshipExplorer

### 2. List Enhancer — تحسين القوائم تلقائياً

Adds a 4-view toggle to **every list view**: Table | Cards | Kanban | Timeline.

```javascript
frappe.visual.listEnhancer.enable();
frappe.visual.listEnhancer.disable();
```

**Views:** Default Table | Rich Card Grid | Auto-detected Kanban columns | Chronological Timeline

### 3. Workspace Enhancer — تحسين مساحات العمل تلقائياً

```javascript
frappe.visual.workspaceEnhancer.enable();
frappe.visual.workspaceEnhancer.disable();
frappe.visual.workspaceEnhancer.refresh();
```

**Injected elements:** Glass morphism shortcut cards + live doc counts | Number card sparklines | Header gradient accent | GSAP stagger entrance

---

## 🎨 CSS Effects & Theme System

| Class | Effect |
|-------|--------|
| `.fv-fx-glass` | Glassmorphism backdrop blur |
| `.fv-fx-hover-lift` | Lift + shadow on hover |
| `.fv-fx-hover-shine` | Shine sweep on hover |
| `.fv-fx-page-enter` | Fade-in + slide-up entrance |
| `.fv-fx-mouse-glow` | Glow follows cursor |
| `.fv-fx-gradient-animated` | Animated gradient background |
| `.fv-fx-gradient-text` | Gradient text fill |
| `.fv-fx-parallax-container` | Parallax depth layers |
| `.fv-fx-vertical-text` | Rotated vertical text |
| `.fv-fx-morph-blob` | Morphing background blobs |
| `.fv-fx-counter` | Number counter animation |

### Icon System (Tabler Icons v3.30 — 3000+ icons)

```javascript
frappe.visual.icons.render("building", { size: "lg", color: "blue" });
frappe.visual.icons.forDocType("Sales Order");
frappe.visual.icons.forAction("create");
frappe.visual.icons.forStatus("Active");
frappe.visual.icons.statusBadge("Pending");
frappe.visual.icons.pick(callback);    // Interactive picker dialog
```

---

## 🌐 Server API (12 endpoints)

| Endpoint | Purpose |
|----------|---------|
| `get_app_map(app_name)` | Full app graph |
| `get_doctype_relationships(doctype, depth)` | DocType relationships |
| `get_form_dashboard_data(doctype, docname, depth)` | Form dashboard data |
| `get_workspace_map()` | Workspace structure graph |
| `get_quick_stats(app_name)` | Dashboard statistics |
| `get_reverse_translation(arabic_text)` | English source for Arabic |
| `get_tree_data(doctype, parent_field)` | Hierarchical tree data |
| `get_app_info(app_name)` | App metadata (modules, doctypes, roles) |
| `get_module_reports(module)` | Module reports list |
| `get_app_doctypes(app_name)` | All app doctypes with classification |
| `get_linked_document_counts(doctype, docname)` | Linked document counts |
| `get_storyboard_data(...)` | Storyboard configuration |

---

## 📐 Page Templates (8 types)

| Template | API | Use Case |
|----------|-----|----------|
| Dashboard | `frappe.visual.templates.dashboard(el, cfg)` | KPI cards + actions + kanban |
| ERD | `frappe.visual.templates.erd(el, cfg)` | Entity relationship diagram |
| Workflow | `frappe.visual.templates.workflow(el, cfg)` | Step-by-step flow visualization |
| Tree | `frappe.visual.templates.tree(el, cfg)` | Hierarchical org/category tree |
| Wizard | `frappe.visual.templates.wizard(el, cfg)` | Multi-step setup wizard |
| Kanban | `frappe.visual.templates.kanbanWorkspace(el, cfg)` | Kanban workspace page |
| Timeline | `frappe.visual.templates.timeline(el, cfg)` | Chronological event feed |
| App Overview | `frappe.visual.templates.appOverview(el, cfg)` | App branding + features hero |

---

## 🏭 App Page Generator (4 generators)

| Generator | API | Output |
|-----------|-----|--------|
| About Page | `frappe.visual.generator.aboutPage(el, app)` | Hero + AppMap + ERD + Features |
| Settings | `frappe.visual.generator.settingsPage(el, doctype)` | Visual settings from Single DocType |
| Reports Hub | `frappe.visual.generator.reportsHub(el, module)` | Auto-discovered report cards |
| Onboarding | `frappe.visual.generator.onboardingWizard(el, app, steps)` | Guided setup wizard |

---

## 🔄 DocType Visualizer (4 views)

| View | API | Description |
|------|-----|-------------|
| Card List | `frappe.visual.doctype.cardList(el, dt, opts)` | Cards + List + Kanban toggle |
| Visual Form | `frappe.visual.doctype.visualForm(el, dt, name, opts)` | Grouped section form |
| Quick Entry | `frappe.visual.doctype.quickEntry(el, dt, opts)` | Modern quick-add dialog |
| Relationships | `frappe.visual.doctype.relationshipExplorer(el, dt, name)` | Linked doc explorer |

---

## ⚡ Performance Guidelines

| Rule | Limit |
|------|-------|
| GSAP concurrent tweens | Max 20 per screen |
| Cytoscape graph nodes | Max 500 for smooth UX |
| Lottie animations | Max 200KB JSON each |
| CSS transitions | GPU properties only (transform, opacity) |
| API caching | 3-5 min TTL |
| Event listeners | Debounce 150ms minimum |

---

## 🔌 Integration Patterns

### Required for every Frappe app:
```
/<app>-about       → frappe.visual.generator.aboutPage()
/<app>-onboarding  → frappe.visual.storyboard() in floatingWindow()
Form toolbar [❓]  → Opens contextual help in floatingWindow
```

### In hooks.py:
```python
app_include_js = ["/assets/frappe_visual/js/frappe_visual.bundle.js"]
app_include_css = ["/assets/frappe_visual/css/templates.css"]
```

### In any page JS:
```javascript
frappe.require('frappe_visual.bundle.js', () => {
    frappe.visual.templates.dashboard(container, config);
});
```

---

*حدّث هذا الملف عند إضافة أي مكون جديد — يُقرأ تلقائياً من copilot-instructions.md*
*Last updated: 2026-04-03*
