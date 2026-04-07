# Frappe Visual — App Design Standards & Transformation Guide
# معايير تصميم التطبيقات ودليل التحويل البصري

> **307+ components** · 31 Waves · Cytoscape.js · ELK.js · ECharts · GSAP · Leaflet · Lottie · Tabler Icons v3.30
> Last updated: April 2026

---

## 🏆 Golden Rule — القاعدة الذهبية

> **When designing ANY Frappe UI — ALWAYS check if frappe_visual has a component for it FIRST.**
> One rich visual screen replaces 5-10 traditional screens.

---

## 📦 Complete Component Inventory (307+ Components in 10 Tiers)

### Tier 1 — Graph & Visualization Engine (6 Core)

| Component | Namespace | Purpose |
|-----------|-----------|---------|
| **GraphEngine** | `frappe.visual.create()` | Cytoscape.js wrapper: 30+ node types, 12 edge types, search, zoom, export |
| **LayoutManager** | `engine.runLayout()` | 9 ELK.js algorithms: fcose, layered, mrtree, radial, stress, breadthfirst, circle, box, random |
| **FloatingWindow** | `frappe.visual.floatingWindow()` | Draggable/resizable overlay panels for help, quick entry, detail views |
| **ContextMenu** | `engine.contextMenu` | Circular right-click menu for node/edge actions |
| **Minimap** | `engine.minimap` | Bird's-eye navigation for large graphs |
| **ThemeManager** | `frappe.visual.ThemeManager` | Dark/light mode, CSS variable management, brand colors |

### Tier 2 — Business View Components (11)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **AppMap** | `frappe.visual.appMap(container, appName)` | Interactive DocType relationship map for any app |
| **RelationshipExplorer** | `frappe.visual.doctype.relationshipExplorer()` | Document-level relationship graph |
| **Storyboard** | `frappe.visual.storyboard(container, steps)` | Multi-step wizard/onboarding with GSAP animations |
| **VisualDashboard** | `frappe.visual.VisualDashboard` | KPI cards + charts dashboard |
| **KanbanBoard** | `frappe.visual.kanban(container, opts)` | Drag-and-drop Kanban with auto-detected status columns |
| **VisualCalendar** | `frappe.visual.calendar(container, opts)` | Interactive event calendar |
| **VisualGantt** | `frappe.visual.gantt(container, opts)` | Project timeline Gantt chart |
| **VisualTreeView** | `frappe.visual.tree(container, opts)` | Hierarchical data tree |
| **VisualMap** | `frappe.visual.map(container, opts)` | Leaflet geographic map with markers |
| **VisualGallery** | `frappe.visual.gallery(container, opts)` | Image/media gallery with lightbox |
| **VisualFormDashboard** | `frappe.visual.formDashboard(container, opts)` | Form-embedded stats ribbon + relationship graph |

### Tier 3 — ECharts Data Visualization (Wave 16, 9 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **Heatmap** | `frappe.visual.heatmap()` | Time/category heatmaps |
| **Sparkline** | `frappe.visual.sparkline()` | Inline mini-charts for cards/lists |
| **Radar** | `frappe.visual.radar()` | Multi-axis comparison charts |
| **Funnel** | `frappe.visual.funnel()` | Sales/conversion pipeline |
| **Treemap** | `frappe.visual.treemap()` | Hierarchical area composition |
| **Donut** | `frappe.visual.donut()` | Proportional composition |
| **DataCard** | `frappe.visual.dataCard()` | KPI card with embedded chart |
| **Area** | `frappe.visual.area()` | Trend area charts |
| **Sankey** | `frappe.visual.sankey()` | Flow/allocation diagrams |

### Tier 4 — Layout & Container (Wave 17, 9 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **Masonry** | `frappe.visual.masonry()` | Pinterest-style card layout |
| **Dock** | `frappe.visual.dock()` | macOS-style app dock |
| **GridStack** | `frappe.visual.gridStack()` | Draggable dashboard widget grid |
| **Bento** | `frappe.visual.bento()` | Apple-style bento grid |
| **InfiniteScroll** | `frappe.visual.infiniteScroll()` | Lazy-loading infinite lists |
| **Sortable** | `frappe.visual.sortable()` | Drag-and-drop list reordering |
| **VirtualList** | `frappe.visual.virtualList()` | Virtualized rendering for 10K+ rows |
| **StackedLayout** | `frappe.visual.stackedLayout()` | Layered card navigation |
| **Resizable** | `frappe.visual.resizable()` | Resize any panel/container |

### Tier 5 — Navigation & Wayfinding (Wave 18, 9 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **CommandBar** | `frappe.visual.commandBar()` | ⌘K universal command palette |
| **FloatingNav** | `frappe.visual.floatingNav()` | Floating page navigation |
| **PageTransition** | `frappe.visual.pageTransition()` | Route-to-route animations |
| **BackToTop** | `frappe.visual.backToTop()` | Scroll-to-top button |
| **NavRail** | `frappe.visual.navRail()` | Vertical icon navigation rail |
| **AnchorNav** | `frappe.visual.anchorNav()` | Scroll-based section navigation |
| **TabBar** | `frappe.visual.tabBar()` | Underline/pill/block tabs (3 variants) |
| **BottomNav** | `frappe.visual.bottomNav()` | Mobile bottom navigation |
| **SpeedDial** | `frappe.visual.speedDial()` | Floating action button menu |

### Tier 6 — Feedback & Overlay (Wave 19, 9 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **BottomSheet** | `frappe.visual.bottomSheet()` | Mobile-style bottom panels |
| **Lightbox** | `frappe.visual.lightbox()` | Full-screen image/media viewer |
| **ImageCompare** | `frappe.visual.imageCompare()` | Before/after image slider |
| **Popconfirm** | `frappe.visual.popconfirm()` | Inline confirmation dialogs |
| **CookieBanner** | `frappe.visual.cookieBanner()` | GDPR/consent banners |
| **OnboardingTour** | `frappe.visual.onboardingTour()` | Step-by-step feature tours |
| **ContextPanel** | `frappe.visual.contextPanel()` | Slide-in detail panels |
| **PinchZoom** | `frappe.visual.pinchZoom()` | Touch-friendly zoom |
| **NotificationStack** | `frappe.visual.notificationStack()` | Toast notifications with queue |

### Tier 7 — Productivity & Power Tools (Wave 20, 9 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **ShortcutManager** | `frappe.visual.shortcutManager()` | Global keyboard shortcut registry |
| **ClipboardManager** | `frappe.visual.clipboardManager()` | Rich copy: text/HTML/JSON/table |
| **UndoRedo** | `frappe.visual.undoRedo()` | Global undo/redo stack with ⌘Z |
| **FocusTrap** | `frappe.visual.focusTrap()` | Accessible focus trapping for modals |
| **HotkeyHint** | `frappe.visual.hotkeyHint()` | Keyboard shortcut overlay hint |
| **GlobalSearch** | `frappe.visual.globalSearch()` | Unified multi-source search (⌘K) |
| **QuickAction** | `frappe.visual.quickAction()` | Slash command palette |
| **BulkActions** | `frappe.visual.bulkActions()` | Multi-select action toolbar |
| **MultiSelectBar** | `frappe.visual.multiSelectBar()` | Floating selection counter bar |

### Tier 8 — Immersive SVG Scene Engine (Waves 21-22, 18 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **SceneEngine** | `frappe.visual.sceneEngine()` | Core SVG scene orchestrator |
| **SceneRoom** | (internal) | 1-point perspective room geometry |
| **SceneFrame** | (internal) | Wall-mounted KPI picture frames |
| **SceneDesk** | (internal) | Perspective desk with lamp |
| **SceneDocument** | (internal) | Clickable scattered desk documents |
| **SceneShelf** | (internal) | Bookshelf with colored book spines |
| **SceneBoard** | (internal) | Corkboard with pinned sticky notes |
| **SceneWidget** | (internal) | Embeddable mini-scene for headers |
| **SceneLighting** | (internal) | Ambient light, window glow, vignette |
| **ScenePresetOffice** | `frappe.visual.scenePresetOffice()` | Office: chair, plant, clock |
| **ScenePresetLibrary** | `frappe.visual.scenePresetLibrary()` | Library: globe, reading lamp |
| **ScenePresetClinic** | `frappe.visual.scenePresetClinic()` | Clinic: cross, stethoscope |
| **ScenePresetWorkshop** | `frappe.visual.scenePresetWorkshop()` | Workshop: tools, hard hat |
| **ScenePresetCafe** | `frappe.visual.scenePresetCafe()` | Café: espresso, menu board |
| **SceneDataBinder** | `frappe.visual.sceneDataBinder()` | Auto-bind Frappe API data to scenes |
| **SceneRefresher** | `frappe.visual.sceneRefresher()` | Live polling + realtime refresh |
| **SceneNavigator** | `frappe.visual.sceneNavigator()` | Clickable SVG navigation hotspots |
| **SceneExporter** | `frappe.visual.sceneExporter()` | Export scenes as PNG/JPEG/SVG/PDF |

### Tier 9 — Micro-Animations (Wave 15, 9 components)

| Component | Shorthand | Purpose |
|-----------|-----------|---------|
| **Typewriter** | `frappe.visual.typewriter()` | Animated text reveals |
| **Parallax** | `frappe.visual.parallax()` | Depth-scrolling hero sections |
| **Confetti** | `frappe.visual.confetti()` | Celebration effects on milestones |
| **Ripple** | `frappe.visual.ripple()` | Button press ripple effects |
| **TextLoop** | `frappe.visual.textLoop()` | Cycling text display |
| **NumberTicker** | `frappe.visual.numberTicker()` | Animated counting KPIs |
| **GlowCard** | `frappe.visual.glowCard()` | Hover-glow card effects |
| **MorphingText** | `frappe.visual.morphingText()` | Shape-shifting headlines |
| **DotPattern** | `frappe.visual.dotPattern()` | Decorative dot backgrounds |

### Tier 10 — Form & DocType Enhancement (Waves 23-31, 60+ components)

Additional components covering advanced form controls, data tables, file managers, rich text editors, workflow builders, and specialized industry widgets. These are registered through `frappe.visual._load()` and available via the async shorthand pattern.

### Auto-Enhancers (Zero Config — Active on Every Page)

| Enhancer | Effect |
|----------|--------|
| `formEnhancer` | Stats ribbon + relationship graph + quick links on **every form** |
| `listEnhancer` | Table/Cards/Kanban/Timeline toggle on **every list** |
| `workspaceEnhancer` | Live counts + sparklines + glassmorphism on **every workspace** |
| `bilingualTooltip` | Arabic↔English hover tooltips on **every element** |

### Page Templates (8)

```javascript
frappe.visual.templates.dashboard(container, config)     // KPI + charts
frappe.visual.templates.erd(container, config)           // Entity relationship diagram
frappe.visual.templates.workflow(container, config)      // Workflow visualization
frappe.visual.templates.tree(container, config)          // Hierarchical tree
frappe.visual.templates.wizard(container, config)        // Multi-step wizard
frappe.visual.templates.kanbanWorkspace(container, config) // Kanban board
frappe.visual.templates.timeline(container, config)      // Activity timeline
frappe.visual.templates.appOverview(container, config)   // Full app overview
```

### Page Generators (4)

```javascript
frappe.visual.generator.aboutPage('#container', 'my_app')        // Auto-generated about page
frappe.visual.generator.settingsPage('#container', 'My Settings') // Visual settings UI
frappe.visual.generator.reportsHub('#container', 'My Module')     // All reports in one view
frappe.visual.generator.onboardingWizard('#container', 'my_app', steps) // Guided onboarding
```

### DocType Visualizers (4)

```javascript
frappe.visual.doctype.cardList('#container', 'Sales Order', opts)           // Card-based list
frappe.visual.doctype.visualForm('#container', 'Sales Order', 'SO-001')     // Visual form
frappe.visual.doctype.quickEntry('#container', 'Sales Order')               // Modern quick entry
frappe.visual.doctype.relationshipExplorer('#container', 'SO', 'SO-001')    // Relationship graph
```

---

## 🎨 Premium CSS Effect Classes

Every screen MUST use at least 3 of these effects:

| Class | Effect |
|-------|--------|
| `.fv-fx-glass` | Glassmorphism frosted glass with backdrop-blur |
| `.fv-fx-hover-lift` | Lift on hover with shadow for physical response |
| `.fv-fx-parallax-container` | Parallax depth layers for spatial feel |
| `.fv-fx-page-enter` | Fade + slide-up page entrance animation |
| `.fv-fx-mouse-glow` | Dynamic glow following cursor movement |
| `.fv-fx-gradient-animated` | Animated gradient background |
| `.fv-fx-hover-shine` | Shine sweep effect on hover |
| `.fv-fx-vertical-text` | Vertical text for sidebar labels |
| `.fv-fx-morph-blob` | Morphing blob shapes in background |
| `.fv-fx-gradient-text` | Gradient-colored text |
| `.fv-fx-page-leave` | Exit animation for page transitions |

---

## 🏗️ Per-App Transformation Blueprint

### Vertex (Construction — `#E8590C` Orange)

| Screen | Component | Scene Preset |
|--------|-----------|-------------|
| Project Dashboard | `scenePresetWorkshop` + `VisualDashboard` | Hard hat, blueprints, tools on desk |
| Project Timeline | `gantt()` + `formDashboard()` | — |
| BOQ Breakdown | `tree()` + `treemap()` | — |
| Cost vs Budget | `sankey()` + `area()` + `radar()` | SceneFrames: budget vs actual |
| Task Board | `kanban()` with drag-drop | — |
| Site Map | `map()` with GeoJSON zones | — |
| Doc Relationships | `RelationshipExplorer` | — |

### Velara (Hospitality — `#C9A84C` Gold)

| Screen | Component | Scene Preset |
|--------|-----------|-------------|
| Hotel Dashboard | `scenePresetCafe` (reception variant) | Room status in SceneFrames |
| Room Calendar | `calendar()` with availability overlay | — |
| Guest Flow | `funnel()` (inquiry → booking → check-in → check-out) | — |
| Booking Kanban | `kanban()` by booking status | — |
| Revenue Analysis | `area()` + `donut()` + `heatmap()` | Frames: occupancy %, RevPAR |
| Floor Plan | `map()` with room polygons | — |

### Arrowz (VoIP/Network — `#6366F1` Indigo)

| Screen | Component | Scene Preset |
|--------|-----------|-------------|
| Network Dashboard | `scenePresetOffice` | Active calls, server uptime frames |
| Network Topology | `GraphEngine` with device node types | — |
| Call Analytics | `heatmap()` + `area()` + `sparkline()` | — |
| Extension Board | `kanban()` by status (online/busy/offline) | — |
| VPN Tunnel Map | `map()` with tunnel lines | — |

### AuraCRM (CRM — `#6366F1` Indigo)

| Screen | Component | Scene Preset |
|--------|-----------|-------------|
| Sales Dashboard | `scenePresetOffice` | Pipeline value in frames |
| Pipeline Funnel | `funnel()` + `sankey()` | — |
| Contact Network | `GraphEngine` (network layout) | — |
| Deal Board | `kanban()` by deal stage | — |
| Activity Timeline | `templates.timeline()` | — |
| Lead Scoring | `radar()` per lead | — |

### Candela (Restaurant — `#F59E0B` Amber)

| Screen | Component | Scene Preset |
|--------|-----------|-------------|
| Restaurant Dashboard | `scenePresetCafe` | Menu board, orders, revenue |
| Table Layout | `map()` or custom SVG floor plan | — |
| Order Flow | `kanban()` (new → preparing → serving → paid) | — |
| Menu Categories | `bento()` layout with images | — |
| Daily Sales | `area()` + `donut()` | — |

### ARKSpace (Coworking — `#1B365D` Navy)

| Screen | Component | Scene Preset |
|--------|-----------|-------------|
| Space Dashboard | `scenePresetOffice` | Occupancy, revenue in frames |
| Floor Map | `map()` with desk markers | — |
| Booking Calendar | `calendar()` | — |
| Member Directory | `cardList()` with filters | — |
| Revenue Analytics | `area()` + `heatmap()` | — |

---

## ✅ Screen Design Checklist (Mandatory)

Every visual screen MUST pass these checks:

```
□ 1. Uses at least 1 frappe_visual component (not plain HTML)
□ 2. Has at least 3 CSS effect classes (.fv-fx-*)
□ 3. Has GSAP entrance animation (stagger on cards/items)
□ 4. Supports dark mode (CSS variables only, no hardcoded colors)
□ 5. Uses CSS Logical Properties (margin-inline-start, NOT margin-left)
□ 6. All icons via frappe.visual.icons.render() — NEVER Font Awesome
□ 7. All strings wrapped in __() for i18n
□ 8. Has contextual help ❓ button (arkan_help integration)
□ 9. Lazy-loads via frappe.require("frappe_visual.bundle.js")
□ 10. Responsive: works from 320px to 4K
□ 11. Scene-based dashboards have SceneNavigator + SceneExporter
```

---

## 🔄 Migration Patterns

### List → Visual List
```javascript
// Before: Standard Frappe list
frappe.listview_settings["My DocType"] = { ... };

// After: Add visual card/kanban/timeline toggle (auto via listEnhancer)
// Or explicit:
frappe.visual.doctype.cardList('#container', 'My DocType', {
    filters: { status: 'Active' },
    groupBy: 'status',
    pageLength: 20,
});
```

### Form → Visual Form
```javascript
// Before: Standard Frappe form
frappe.ui.form.on("My DocType", { refresh(frm) { ... } });

// After: formEnhancer adds stats + graph automatically
// For custom: use formDashboard
frappe.visual.formDashboard(container, {
    doctype: "My DocType",
    docname: frm.doc.name,
});
```

### Dashboard → Scene Dashboard
```javascript
// Before: Number cards + charts in workspace
// After: Immersive SVG scene
const scene = await frappe.visual.scenePresetOffice({
    container: "#workspace-header",
    theme: "warm",
    frames: [
        { label: __("Revenue"), value: "$125K", status: "success" },
        { label: __("Orders"), value: "342", status: "warning" },
    ],
    documents: [
        { label: __("Pending"), count: 8, href: "/app/invoice?status=Unpaid", color: "#ef4444" },
    ],
    books: [
        { label: __("Reports"), href: "/app/query-report", color: "#6366f1" },
    ],
});

// Bind live data
await frappe.visual.sceneDataBinder({
    engine: scene,
    frames: [{
        label: "Revenue",
        doctype: "Sales Invoice",
        aggregate: "sum",
        field: "grand_total",
        filters: { status: "Paid" },
        format: "$%s",
        status_rules: { ">100000": "success", "<50000": "danger" },
    }],
    refreshInterval: 30000,
});
```

---

## 🌗 Dark Mode & RTL Rules

### Dark Mode
```css
/* ✅ ALWAYS use CSS variables */
color: var(--fv-text-primary);
background: var(--fv-bg-surface);
border-color: var(--fv-border-default);

/* ❌ NEVER hardcode colors */
color: #333333;
background: white;
```

### RTL (Right-to-Left)
```css
/* ✅ CSS Logical Properties */
margin-inline-start: 10px;     /* NOT margin-left */
padding-inline-end: 10px;      /* NOT padding-right */
text-align: start;             /* NOT text-align: left */
inset-inline-start: 0;         /* NOT left: 0 */

/* ✅ Check direction in JS */
const isRTL = frappe.visual.isRTL();
const isDark = frappe.visual.isDarkMode();
```

---

## 📊 Scene Theme Selection Guide

| App Personality | Scene Preset | Theme | Description |
|----------------|-------------|-------|-------------|
| Business/ERP | `scenePresetOffice` | `warm` or `cool` | Professional desk + frames |
| Knowledge/Docs | `scenePresetLibrary` | `warm` | Bookshelf + globe + lamp |
| Medical/Health | `scenePresetClinic` | `cool` | Clean clinical with cross |
| Construction/Manufacturing | `scenePresetWorkshop` | `warm` or `blueprint` | Tools + hard hat + blueprints |
| Hospitality/Restaurant | `scenePresetCafe` | `warm` | Espresso + menu board |
| Technical/IT | Direct `sceneEngine` | `dark` or `blueprint` | Custom technical scene |

---

*Last updated: April 2026 — v3.0 (307+ components, 31 Waves)*
*Source: /workspaces/frappe_docker/frappe-bench/apps/frappe_visual/docs/visual_app_design.md*
