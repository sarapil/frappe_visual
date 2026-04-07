# Frappe Visual 3D Expansion Proposal — مقترح التوسع ثلاثي الأبعاد

> **Version:** 1.0 — July 2025
> **Status:** Proposal (Draft)
> **Author:** AI Architecture Session
> **Scope:** Extend frappe_visual from 2D SVG/Canvas to 3D WebGL/WebXR

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Masar 3D — What We Can Extract](#masar-3d--what-we-can-extract)
4. [Proposed Architecture — New Tiers](#proposed-architecture--new-tiers)
5. [Tier 11: 3D Core Engine](#tier-11-3d-core-engine)
6. [Tier 12: 3D Visual Components](#tier-12-3d-visual-components)
7. [Tier 13: 2D CAD Engine](#tier-13-2d-cad-engine)
8. [Tier 14: Render Pipeline](#tier-14-render-pipeline)
9. [Tier 15: WebXR & Immersive](#tier-15-webxr--immersive)
10. [Domain Overlays (Per-App)](#domain-overlays-per-app)
11. [Bundle Strategy & Performance](#bundle-strategy--performance)
12. [API Design](#api-design)
13. [Integration with Existing Tiers](#integration-with-existing-tiers)
14. [Migration Plan from Masar](#migration-plan-from-masar)
15. [Implementation Phases](#implementation-phases)
16. [Risk Analysis](#risk-analysis)

---

## Executive Summary

### The Opportunity — الفرصة

frappe_visual currently has **307+ components across 10 tiers**, all operating in **2D** (SVG + Canvas2D + DOM). The Masar interior design app independently built a **mature 3D stack** using Three.js with 7-format model loading, PBR lighting, hybrid rendering, and a full 2D CAD engine.

**The proposal:** Extract Masar's 3D infrastructure into **5 new reusable tiers (Tiers 11-15)** in frappe_visual, making 3D visualization a **first-class framework capability** available to ALL Arkan Lab apps.

### What This Enables — ماذا يتيح هذا

| App                         | 3D Capability                                                                |
| --------------------------- | ---------------------------------------------------------------------------- |
| **Vertex** (Construction)   | 3D building models, BIM viewers, site visualization, progress tracking in 3D |
| **Masar** (Interior Design) | Reuses framework components instead of independent stack                     |
| **Velara** (Hospitality)    | 3D hotel floor plans, room visualization, virtual tours                      |
| **ARKSpace** (Coworking)    | 3D office layouts, space planning, virtual walkthroughs                      |
| **Candela** (Restaurant)    | 3D restaurant layouts, kitchen design, table management                      |
| **Arrowz** (VoIP/Network)   | 3D network topology, data center rack visualization                          |
| **AuraCRM** (CRM)           | 3D pipeline visualization, territory maps                                    |
| **Any Frappe App**          | Generic 3D model viewer, product configurators, data visualization           |

### Key Numbers — أرقام رئيسية

| Metric            | Current        | After Expansion                              |
| ----------------- | -------------- | -------------------------------------------- |
| Component Tiers   | 10             | 15                                           |
| Total Components  | 307+           | ~380+                                        |
| Rendering Engines | SVG + Canvas2D | SVG + Canvas2D + **WebGL** + **WebXR**       |
| 3D Model Formats  | 0              | **7** (glTF, OBJ, FBX, STL, DAE, PLY, DRACO) |
| Bundle Strategy   | 1 main bundle  | 1 main + **3 lazy-loaded 3D bundles**        |

---

## Current State Analysis

### frappe_visual v0.1.0 — What Exists

```
Tier 1:  Graph Engine (Cytoscape.js) — graph visualization & layout
Tier 2:  Business Views — AppMap, Kanban, Calendar, Gantt, Gallery
Tier 3:  Data Viz (ECharts) — Heatmap, Sparkline, Radar, Funnel, etc.
Tier 4:  Layout — Masonry, Dock, GridStack, Bento, Virtual Lists
Tier 5:  Navigation — CommandBar, FloatingNav, TabBar, BottomNav
Tier 6:  Feedback — BottomSheet, Lightbox, Popconfirm, Notifications
Tier 7:  Productivity — Shortcuts, Clipboard, UndoRedo, BulkActions
Tier 8:  Scene Engine — SVG-based immersive workspace dashboards
Tier 9:  Micro-Animation — GSAP effects (Typewriter, Parallax, etc.)
Tier 10: Form Enhancement — Advanced form controls, data tables
```

**Key Observations:**

- **ZERO WebGL/3D code** in the entire codebase
- Scene Engine (Tier 8) is **pure SVG** with 1-point perspective illusion
- All animation uses **GSAP** (CPU-based, not GPU)
- Bundled libraries: Cytoscape, ELK.js, ECharts, GSAP, Leaflet, Lottie, Tabler Icons
- Three.js is **NOT** a dependency

### Masar 3D — What Exists Independently

```
2D CAD Engine:    HTML5 Canvas, scene graph, undo/redo, tools, panels
3D Preview:       Three.js v0.170, 7 format loaders, PBR, OrbitControls
Render Pipeline:  Client (browser) + Server (headless) + Hybrid
Model Catalog:    5 provider types for sourcing 3D models
Math Utilities:   2D geometry helpers (distance, snap, hit-test, collision)
```

**Key Observations:**

- Masar's code is **tightly coupled to interior design** (kitchen cabinets, room types, etc.)
- The **underlying architecture** is generic and reusable
- Three.js loaders are from official examples (production-ready ESM)
- 2D→3D conversion pipeline is well-architected

---

## Masar 3D — What We Can Extract

### Extractable Components (Domain-Agnostic)

| Masar Component                                                  | Framework Component                 | Reuse Level                                |
| ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| `MasarScene3D` core (Three.js setup, renderer, lights, controls) | `ThreeEngine`                       | 85% — remove Masar-specific scene building |
| Multi-format loader (7 formats + DRACO)                          | `ModelLoader`                       | 95% — already generic                      |
| OrbitControls + raycasting + selection                           | `SceneControls`                     | 90% — remove hardcoded component types     |
| PBR material system                                              | `MaterialLibrary`                   | 70% — generalize beyond furniture colors   |
| SceneGraph (JSON data model)                                     | `SceneGraph3D`                      | 60% — extend to arbitrary 3D objects       |
| CanvasRenderer (2D viewport)                                     | `Canvas2DEngine`                    | 80% — remove wall/kitchen specifics        |
| UndoRedoManager                                                  | Already exists as Tier 7 `UndoRedo` | 0% — use existing                          |
| Math utilities                                                   | `GeometryUtils`                     | 95% — domain-agnostic already              |
| RenderService (quality/camera presets)                           | `RenderPipeline`                    | 75% — generalize quality/camera APIs       |
| Panel architecture (catalog, properties, toolbar)                | `EditorPanels`                      | 65% — generalize panel types               |

### What Stays in Masar (Domain-Specific)

- Kitchen/furniture component types and colors
- Room shape presets (L-shape, U-shape, etc.)
- Wall/door/window drawing tools with kitchen constraints
- BOM generation from design data
- Quotation/Sales Order integration
- Catalog providers for furniture models

---

## Proposed Architecture — New Tiers

```
EXISTING (unchanged):
  Tier 1-10: 307+ components (SVG/Canvas2D/DOM)

NEW 3D EXPANSION:
  Tier 11: 3D Core Engine          — Three.js wrapper, model loading, controls
  Tier 12: 3D Visual Components    — Viewers, editors, product configurators
  Tier 13: 2D CAD Engine           — Canvas-based floor plan editing
  Tier 14: Render Pipeline         — Screenshot, render, export (client + server)
  Tier 15: WebXR & Immersive       — VR/AR viewer, spatial navigation

DOMAIN OVERLAYS (in each app, NOT in frappe_visual):
  Vertex:   Construction-specific 3D components (BIM, progress, site)
  Masar:    Interior design tools (refactored to use Tier 11-14)
  Velara:   Hotel room/floor plan components
  ARKSpace: Office space layout components
```

### Layer Diagram

```
┌──────────────────────────────────────────────────────────────┐
│              Domain Overlays (per-app)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐          │
│  │ Vertex  │ │  Masar  │ │ Velara  │ │ ARKSpace │  ...     │
│  │  BIM    │ │Interior │ │ Hotel   │ │  Office  │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘          │
├───────┼──────────┼──────────┼──────────┼─────────────────────┤
│  Tier 15: WebXR    │ VR/AR viewer, spatial UI               │
├────────────────────┼─────────────────────────────────────────┤
│  Tier 14: Render   │ Screenshot, quality presets, export     │
├────────────────────┼─────────────────────────────────────────┤
│  Tier 13: 2D CAD   │ Canvas floor plans, tools, panels      │
├────────────────────┼─────────────────────────────────────────┤
│  Tier 12: 3D Views │ ModelViewer, SceneEditor, Configurator  │
├────────────────────┼─────────────────────────────────────────┤
│  Tier 11: 3D Core  │ ThreeEngine, ModelLoader, Materials     │
├────────────────────┴─────────────────────────────────────────┤
│  Tier 1-10: Existing 307+ Components (SVG/Canvas2D/DOM)      │
│  (GraphEngine, Kanban, Dashboard, Scene, Charts, etc.)       │
└──────────────────────────────────────────────────────────────┘
```

---

## Tier 11: 3D Core Engine

> **Purpose:** Low-level Three.js wrapper providing the foundation for all 3D features.
> **Bundle:** `fv_three_core.bundle.js` (~180KB gzipped with Three.js)
> **Dependency:** Three.js v0.170+

### Components (8)

| Component         | Purpose                                              | Extracted From                |
| ----------------- | ---------------------------------------------------- | ----------------------------- |
| `ThreeEngine`     | Three.js scene/renderer/camera lifecycle manager     | `MasarScene3D` (core setup)   |
| `ModelLoader`     | Unified async loader for 7 formats + DRACO           | `MasarScene3D._load*` methods |
| `SceneControls`   | OrbitControls + raycasting + object selection        | `MasarScene3D` (interaction)  |
| `MaterialLibrary` | PBR material registry with presets                   | `MasarScene3D` (materials)    |
| `LightingRig`     | Preset lighting configurations (5+ presets)          | `MasarScene3D` (lights)       |
| `GeometryUtils`   | 3D math utilities (transforms, bounds, intersection) | `math_utils.js` + new 3D math |
| `SceneGraph3D`    | Serializable 3D scene data model                     | `SceneGraph` (extended to 3D) |
| `ThreeExporter`   | Export scene to glTF/OBJ/screenshot                  | New                           |

### ThreeEngine API

```javascript
// Initialize a Three.js viewport
const engine = await frappe.visual.three("#container", {
  antialias: true,
  shadows: true,
  toneMapping: "aces",
  background: "#f0f0f0", // or 'transparent' or 'environment'
  camera: {
    type: "perspective", // or 'orthographic'
    fov: 50,
    position: [0, 5, 10],
    target: [0, 0, 0],
  },
  controls: {
    type: "orbit", // or 'fly' or 'first-person'
    damping: true,
    maxPolarAngle: Math.PI / 2,
  },
  lighting: "studio", // preset name or custom config
});

// Load models
const model = await engine.loadModel("/path/to/model.glb", {
  scale: 1.0,
  position: [0, 0, 0],
  shadows: true,
});

// Interact
engine.onSelect((object) => {
  /* handle selection */
});
engine.onHover((object) => {
  /* handle hover */
});

// Export
const screenshot = await engine.screenshot({ width: 1920, height: 1080 });
const gltf = await engine.exportGLTF();

// Cleanup
engine.dispose();
```

### ModelLoader API

```javascript
// Standalone loader (without full engine)
const loader = frappe.visual.modelLoader();

// Load any format — auto-detected from extension
const model = await loader.load("/assets/model.glb");
const model = await loader.load("/assets/model.fbx");
const model = await loader.load("/assets/model.obj");

// Supported formats
loader.supportedFormats; // ['gltf', 'glb', 'obj', 'fbx', 'stl', 'dae', 'ply']

// DRACO is automatically enabled for compressed glTF
```

### LightingRig Presets

| Preset      | Description                         | Use Case                 |
| ----------- | ----------------------------------- | ------------------------ |
| `studio`    | 3-point lighting (key + fill + rim) | Product viewing, generic |
| `daylight`  | Sun + ambient + sky hemisphere      | Architectural, outdoor   |
| `interior`  | Warm ambient + point lights         | Room interiors           |
| `dramatic`  | High contrast single source         | Presentations            |
| `blueprint` | Flat uniform lighting + blue tint   | Technical/engineering    |

---

## Tier 12: 3D Visual Components

> **Purpose:** High-level ready-to-use 3D components for common use cases.
> **Bundle:** `fv_three_views.bundle.js` (lazy-loaded, ~50KB on top of core)
> **Depends on:** Tier 11

### Components (9)

| Component             | Purpose                                      | API                             |
| --------------------- | -------------------------------------------- | ------------------------------- |
| `ModelViewer`         | Drop-in 3D model viewer with rotate/zoom/pan | `frappe.visual.modelViewer()`   |
| `ModelCompare`        | Side-by-side or overlay 3D model comparison  | `frappe.visual.modelCompare()`  |
| `SceneBuilder`        | Drag-and-drop 3D scene composition           | `frappe.visual.sceneBuilder()`  |
| `ProductConfigurator` | Configurable 3D product with options         | `frappe.visual.productConfig()` |
| `FloorPlan3D`         | 2D floor plan to 3D extrusion                | `frappe.visual.floorPlan3D()`   |
| `DataViz3D`           | 3D charts (bar, scatter, surface)            | `frappe.visual.chart3D()`       |
| `PointCloud`          | Point cloud viewer (PLY/LAS)                 | `frappe.visual.pointCloud()`    |
| `Annotation3D`        | 3D annotations/hotspots on models            | `frappe.visual.annotate3D()`    |
| `MeasureTool3D`       | Distance/angle measurement in 3D             | `frappe.visual.measure3D()`     |

### ModelViewer — The Universal 3D Viewer

```javascript
// Simple usage — drop a 3D viewer into any Frappe form
await frappe.visual.modelViewer("#container", {
  src: "/files/building.glb",
  autoRotate: true,
  lighting: "studio",
  background: "#1a1a2e",
  annotations: [
    { position: [2, 3, 0], label: __("Main Entrance"), icon: "door" },
    { position: [-1, 5, 2], label: __("Roof"), icon: "home" },
  ],
  toolbar: true, // Show rotate/zoom/fullscreen controls
  ar: true, // Show "View in AR" button (WebXR)
});
```

### FloorPlan3D — 2D → 3D Conversion

```javascript
// Convert a 2D floor plan (JSON) to interactive 3D walkable model
await frappe.visual.floorPlan3D("#container", {
  floorPlan: sceneGraphJSON, // SceneGraph3D or Masar-format JSON
  wallHeight: 2.8, // meters
  wallThickness: 0.15,
  floorTexture: "wood", // or custom URL
  wallTexture: "plaster",
  ceilingVisible: false,
  furniture: true, // Load 3D furniture models
  walkable: true, // First-person navigation
  minimap: true, // 2D minimap overlay
});
```

---

## Tier 13: 2D CAD Engine

> **Purpose:** Generic 2D drawing/editing engine for floor plans, diagrams, blueprints.
> **Bundle:** `fv_cad_2d.bundle.js` (lazy-loaded, ~30KB)
> **Extracted from:** Masar's design_engine/ (generalized)

### Components (7)

| Component         | Purpose                                              | Extracted From         |
| ----------------- | ---------------------------------------------------- | ---------------------- |
| `Canvas2DEngine`  | Viewport management (zoom, pan, grid, DPR)           | `CanvasRenderer`       |
| `DrawingTools`    | Pluggable tool system (select, draw, measure, erase) | `DesignCanvas` (tools) |
| `SnapEngine`      | Grid snap, edge snap, intersection snap              | `math_utils.js` (snap) |
| `CatalogPanel`    | Side panel for dragging items onto canvas            | `catalog_panel.js`     |
| `PropertiesPanel` | Side panel for editing selected item properties      | `properties_panel.js`  |
| `ToolbarPanel`    | Top toolbar for tool selection and actions           | `toolbar.js`           |
| `FloorPlanEditor` | Complete pre-assembled floor plan editor             | New (composes above)   |

### FloorPlanEditor — The Complete 2D Editor

```javascript
// Full 2D floor plan editor with all panels
const editor = await frappe.visual.floorPlanEditor("#container", {
  catalog: {
    provider: "frappe", // Load catalog items from Frappe
    doctype: "FV Catalog Item", // Or app-specific DocType
    categories: ["Furniture", "Fixtures", "Equipment"],
  },
  tools: ["select", "wall", "door", "window", "measure", "text", "erase"],
  grid: { size: 10, snap: true },
  units: "cm", // or 'mm', 'in', 'ft'
  maxUndo: 50,
  onSave: (sceneJSON) => {
    // Persist to Frappe
  },
});

// Get scene data
const data = editor.getScene();

// Load existing
editor.loadScene(existingJSON);

// Switch to 3D preview (uses Tier 12)
editor.preview3D();
```

---

## Tier 14: Render Pipeline

> **Purpose:** Production-quality rendering and export from 3D scenes.
> **Bundle:** Part of `fv_three_core.bundle.js` (backend is Python)
> **Extracted from:** Masar's RenderService

### Components (5)

| Component          | Purpose                                                | Side                           |
| ------------------ | ------------------------------------------------------ | ------------------------------ |
| `RenderConfig`     | Quality presets, camera presets, resolution management | JS + Python                    |
| `ClientRenderer`   | Browser-side screenshot using Three.js                 | JS                             |
| `ServerRenderer`   | Headless rendering via external service                | Python                         |
| `RenderJobManager` | Job queue, status tracking, result storage             | Python (FV Render Job DocType) |
| `ExportManager`    | Multi-format export (PNG, JPEG, WebP, PDF, glTF, OBJ)  | JS + Python                    |

### Quality Presets

| Preset     | Samples | Shadows  | AO   | Reflections | Resolution | Target             |
| ---------- | ------- | -------- | ---- | ----------- | ---------- | ------------------ |
| `preview`  | 1       | Off      | Off  | Off         | 800×600    | Instant thumbnail  |
| `draft`    | 16      | Basic    | Off  | Off         | 1280×720   | Quick preview      |
| `standard` | 64      | PCF Soft | Off  | Off         | 1920×1080  | General use        |
| `high`     | 256     | PCF Soft | SSAO | SSR         | 2560×1440  | Presentations      |
| `ultra`    | 1024    | PCF Soft | SSAO | SSR         | 3840×2160  | Print/marketing    |
| `print`    | 1024    | PCF Soft | SSAO | SSR         | 7680×4320  | Large format print |

### Camera Presets

```javascript
frappe.visual.renderConfig.cameras = {
  perspective: { position: [300, 400, 300], fov: 50 },
  topDown: { position: [0, 600, 0], fov: 35, ortho: true },
  frontElevation: { position: [0, 150, 500], fov: 45 },
  sideElevation: { position: [500, 150, 0], fov: 45 },
  cornerView: { position: [350, 250, 350], fov: 50 },
  birdEye: { position: [0, 1000, 500], fov: 30 },
  walkthrough: { position: [0, 170, 0], fov: 75 }, // eye-level
};
```

### API (Python Backend)

```python
# frappe_visual/api/v1/render.py

@frappe.whitelist()
def submit_render(
    scene_data: str,                    # JSON scene configuration
    quality_preset: str = "standard",
    camera_preset: str = "perspective",
    output_format: str = "PNG",
    resolution: str = "1920x1080",
    render_engine: str = "client"       # client | server | hybrid
) -> str:
    """Submit a render job. Returns job name."""

@frappe.whitelist()
def get_render_status(job_name: str) -> dict:
    """Poll render job status."""

@frappe.whitelist()
def get_render_result(job_name: str) -> dict:
    """Get completed render image URL."""
```

---

## Tier 15: WebXR & Immersive

> **Purpose:** Virtual Reality (VR) and Augmented Reality (AR) experiences.
> **Bundle:** `fv_webxr.bundle.js` (lazy-loaded, ~20KB on top of core)
> **Depends on:** Tier 11 + WebXR Device API

### Components (5)

| Component      | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `VRViewer`     | Immersive VR walkthrough of 3D scenes                    |
| `AROverlay`    | Camera + 3D model overlay (place furniture in real room) |
| `SpatialUI`    | VR-compatible UI panels and menus                        |
| `TeleportNav`  | Point-and-click VR navigation                            |
| `HandTracking` | Basic hand gesture recognition for VR/AR                 |

### VR Viewer API

```javascript
// Launch VR walkthrough of a 3D scene
await frappe.visual.vrViewer("#container", {
  scene: engine.scene, // ThreeEngine scene reference
  startPosition: [0, 1.7, 0], // Standing height
  teleport: true, // Point-to-move navigation
  spatialUI: true, // Floating info panels in VR
  controllers: true, // VR controller support
});

// AR model placement
await frappe.visual.arOverlay("#container", {
  model: "/files/furniture.glb",
  scale: 1.0,
  shadowPlane: true,
  measurements: true, // Show real-world dimensions
});
```

### WebXR Requirements

- **VR:** Requires WebXR-compatible browser + headset (Meta Quest, Pico, etc.)
- **AR:** Requires WebXR AR module support (Chrome Android, WebXR Viewer iOS)
- **Fallback:** Always falls back to regular 3D viewer when XR not available
- **Progressive Enhancement:** All XR features are additive (3D works without XR)

---

## Domain Overlays (Per-App)

These components live in **each app** (NOT in frappe_visual) and use Tier 11-15 as foundations:

### Vertex (Construction) — مشاريع البناء

```javascript
// BIM-like building viewer
frappe.vertex.buildingViewer("#container", {
  project: "VX-PRJ-001",
  layers: ["structure", "electrical", "plumbing", "hvac"],
  progress: true, // Color by completion %
  timeline: true, // Slider for construction phases
});

// Site layout with 3D terrain
frappe.vertex.sitePlan("#container", {
  project: "VX-PRJ-001",
  terrain: true,
  buildings: true,
  equipment: true,
});

// Progress tracking in 3D (4D BIM)
frappe.vertex.progressViewer("#container", {
  project: "VX-PRJ-001",
  dateRange: ["2025-01", "2025-12"],
  colorScheme: "completion", // green→yellow→red
});
```

### Masar (Interior Design) — refactored

```javascript
// Masar refactors to use frappe_visual components:
// BEFORE: new frappe.masar.Scene3D(container)
// AFTER:
const engine = await frappe.visual.three("#container", {
  lighting: "interior",
});
frappe.masar.loadDesign(engine, designName); // Masar-specific scene builder

// BEFORE: new frappe.masar.DesignStudio(container)
// AFTER:
const editor = await frappe.visual.floorPlanEditor("#container", {
  catalog: { doctype: "MS Catalog Item" },
  tools: ["select", "wall", "door", "window", "cabinet", "appliance"],
  // Masar adds custom tools via plugin system
});
```

### Velara (Hospitality) — الضيافة

```javascript
// Interactive hotel floor map
frappe.velara.floorViewer("#container", {
  floor: 3,
  colorBy: "status", // available/occupied/maintenance
  clickable: true, // Click room to see details
  realtime: true, // Live status updates
});

// Virtual room tour
frappe.velara.roomTour("#container", {
  roomType: "VL-DELUXE",
  panoramic: true,
  annotations: true,
});
```

### ARKSpace (Coworking) — مساحات العمل المشتركة

```javascript
// 3D office space planner
frappe.arkspace.spacePlanner("#container", {
  floor: 1,
  desks: true,
  meetingRooms: true,
  availability: true, // Color by booking status
});
```

---

## Bundle Strategy & Performance

### Bundle Splitting — Critical for Performance

```
fv_bootstrap.js (50KB gz)          ← Always loaded (Tier 1-10 entry)
  ↓ user clicks 3D feature
fv_three_core.bundle.js (180KB gz) ← Three.js + Tier 11 (on-demand)
  ↓ user opens viewer/editor
fv_three_views.bundle.js (50KB gz) ← Tier 12 components (on-demand)
  ↓ user opens 2D editor
fv_cad_2d.bundle.js (30KB gz)      ← Tier 13 2D engine (on-demand)
  ↓ user clicks "View in VR"
fv_webxr.bundle.js (20KB gz)       ← Tier 15 WebXR (on-demand)
```

### Loading Strategy

```javascript
// 3D bundles are NEVER loaded unless explicitly requested
// Zero impact on existing 2D performance

// Pattern 1: Shorthand (recommended)
const viewer = await frappe.visual.modelViewer("#c", { src: "model.glb" });
// ^ Automatically loads: fv_three_core → fv_three_views → instantiate

// Pattern 2: Manual core access
const THREE = await frappe.visual.three.core();
// ^ Only loads fv_three_core.bundle.js

// Pattern 3: Full editor
const editor = await frappe.visual.floorPlanEditor("#c", opts);
// ^ Loads: fv_cad_2d + optionally fv_three_core for 3D preview
```

### Memory Management

```javascript
// Three.js scenes MUST be properly disposed
engine.dispose(); // Releases GPU memory, textures, geometries

// Auto-cleanup when container is removed from DOM (MutationObserver)
// Warning system when memory exceeds threshold
```

### Build Configuration (esbuild)

```javascript
// frappe_visual/esbuild.config.js
{
    entryPoints: {
        'frappe_visual.bundle': 'public/js/main.js',           // Existing
        'fv_three_core.bundle': 'public/js/three/core.js',     // NEW
        'fv_three_views.bundle': 'public/js/three/views.js',   // NEW
        'fv_cad_2d.bundle': 'public/js/cad/cad_2d.js',         // NEW
        'fv_webxr.bundle': 'public/js/xr/webxr.js'             // NEW
    },
    splitting: true,
    format: 'esm',
    external: ['three'],     // Tree-shake unused Three.js parts
    target: ['es2022']
}
```

---

## API Design

### Namespace Extension

```javascript
// EXISTING — unchanged
frappe.visual.engine(); // Graph engine
frappe.visual.kanban(); // Kanban board
frappe.visual.scenePresetOffice(); // SVG scene

// NEW — 3D namespace
frappe.visual.three(); // ThreeEngine (Tier 11)
frappe.visual.three.core(); // Raw Three.js access
frappe.visual.modelViewer(); // Model viewer (Tier 12)
frappe.visual.modelCompare(); // Compare models
frappe.visual.sceneBuilder(); // 3D scene builder
frappe.visual.productConfig(); // Product configurator
frappe.visual.floorPlan3D(); // 2D→3D extrusion
frappe.visual.chart3D(); // 3D data viz
frappe.visual.pointCloud(); // Point cloud viewer
frappe.visual.annotate3D(); // 3D annotations
frappe.visual.measure3D(); // 3D measurements

// NEW — 2D CAD namespace
frappe.visual.floorPlanEditor(); // Full 2D editor (Tier 13)
frappe.visual.canvas2D(); // Raw 2D engine

// NEW — Render namespace
frappe.visual.render(); // Submit render job (Tier 14)
frappe.visual.renderConfig; // Quality/camera presets

// NEW — XR namespace
frappe.visual.vrViewer(); // VR walkthrough (Tier 15)
frappe.visual.arOverlay(); // AR placement
```

### CAPS Capabilities (New)

```python
# hooks.py additions
caps_capabilities = [
    # Existing FV_ capabilities...

    # Tier 11
    {"name": "FV_use_3d_engine", "category": "Module", "description": "Access 3D visualization engine"},
    {"name": "FV_load_3d_models", "category": "Action", "description": "Load and view 3D models"},

    # Tier 12
    {"name": "FV_use_model_viewer", "category": "Module", "description": "View 3D models"},
    {"name": "FV_use_scene_builder", "category": "Module", "description": "Build 3D scenes"},
    {"name": "FV_use_product_config", "category": "Module", "description": "Configure 3D products"},

    # Tier 13
    {"name": "FV_use_cad_editor", "category": "Module", "description": "Use 2D CAD floor plan editor"},

    # Tier 14
    {"name": "FV_submit_renders", "category": "Action", "description": "Submit render jobs"},
    {"name": "FV_export_3d_models", "category": "Action", "description": "Export 3D model files"},

    # Tier 15
    {"name": "FV_use_vr", "category": "Module", "description": "Use VR viewer"},
    {"name": "FV_use_ar", "category": "Module", "description": "Use AR overlay"},
]
```

---

## Integration with Existing Tiers

### Scene Engine (Tier 8) + 3D Engine (Tier 11)

The existing SVG Scene Engine stays for dashboard use (lightweight, fast). But a new option allows upgrading any scene to 3D:

```javascript
// Existing: SVG scene (fast, lightweight)
const scene = await frappe.visual.scenePresetOffice({ container: "#header" });

// NEW: Upgrade to 3D version (immersive, heavy)
const scene3d = await frappe.visual.scenePresetOffice3D({
  container: "#header",
  interactive: true, // Walk around the office
  quality: "standard",
});
```

### Graph Engine (Tier 1) + 3D Viz (Tier 12)

```javascript
// Existing: 2D graph (Cytoscape)
const graph = await frappe.visual.engine();

// NEW: 3D graph visualization
const graph3d = await frappe.visual.chart3D("#container", {
  type: "force-directed-3d",
  data: graph.getCytoscape().elements().jsons(),
});
```

### ECharts (Tier 3) + 3D Charts (Tier 12)

```javascript
// Existing: 2D heatmap
await frappe.visual.heatmap(opts);

// NEW: 3D surface chart
await frappe.visual.chart3D("#container", {
  type: "surface",
  data: heatmapData,
});
```

---

## Migration Plan from Masar

### Phase 1: Extract Core (Tier 11)

```
1. Copy math_utils.js → frappe_visual/public/js/three/utils/geometry.js
   - Remove: Masar-specific constants
   - Add: 3D math (Vector3, Quaternion helpers)

2. Extract ThreeEngine from MasarScene3D
   - Keep: Scene setup, renderer config, lights, controls, dispose
   - Remove: loadFromScene(), kitchen component creation
   - Add: Generic scene lifecycle, plugin system

3. Extract ModelLoader
   - Keep: All 7 loaders + DRACO + auto-detection + shadow setup
   - Remove: Nothing (already generic)
   - Add: Progress callbacks, caching, preloading API

4. Extract MaterialLibrary
   - Keep: PBR material creation
   - Remove: Hardcoded furniture colors
   - Add: Material registry, named presets, texture loader
```

### Phase 2: Build Views (Tier 12) & CAD (Tier 13)

```
5. Build ModelViewer as wrapper around ThreeEngine
6. Build FloorPlan3D using ThreeEngine + wall extrusion logic from Masar

7. Extract Canvas2DEngine from CanvasRenderer
   - Keep: Viewport (zoom/pan/grid), coordinate transforms, DPR
   - Remove: Wall/component-specific rendering
   - Add: Plugin-based rendering layers

8. Extract DrawingTools from DesignCanvas
   - Keep: Tool state machine, mouse handling, snap
   - Remove: Kitchen-specific tools
   - Add: Plugin tool registration

9. Build FloorPlanEditor by composing Canvas2DEngine + tools + panels
```

### Phase 3: Render Pipeline (Tier 14) & WebXR (Tier 15)

```
10. Port RenderService quality/camera presets → RenderConfig
11. Create FV Render Job DocType
12. Build ClientRenderer (browser screenshot)
13. Build ServerRenderer (headless API connector)
14. Build VRViewer (Three.js + WebXR session management)
15. Build AROverlay (WebXR AR + hit testing)
```

### Masar Refactoring (After Framework Components Exist)

```
16. Update Masar to import from frappe_visual instead of local implementations:
    - BEFORE: import { MasarScene3D } from './3d_engine/masar_3d.bundle.js'
    - AFTER:  const engine = await frappe.visual.three('#container', opts);

17. Masar keeps domain-specific code:
    - Kitchen tool definitions
    - Cabinet/appliance component types
    - BOM generation logic
    - Quotation integration

18. Masar 3D bundle shrinks from ~600KB → ~100KB (domain code only)
```

---

## Implementation Phases

### Phase 1: Foundation (Tier 11 Core) — 3-4 weeks

**Deliverables:**

- `fv_three_core.bundle.js` with ThreeEngine, ModelLoader, SceneControls
- MaterialLibrary with 5 presets
- LightingRig with 5 presets
- GeometryUtils (2D + 3D math)
- Basic tests and documentation

**Dependencies:** Three.js v0.170+ added to package.json

**Validation:** Load and display a .glb model inside any Frappe form

### Phase 2: Viewers (Tier 12 Partial) — 2-3 weeks

**Deliverables:**

- ModelViewer component (universal 3D viewer)
- FloorPlan3D component (2D → 3D extrusion)
- Annotation3D overlay system
- MeasureTool3D

**Validation:** Show 3D building model in Vertex project form

### Phase 3: 2D CAD (Tier 13) — 3-4 weeks

**Deliverables:**

- Canvas2DEngine with viewport management
- DrawingTools with plugin system
- FloorPlanEditor (complete pre-assembled editor)
- CatalogPanel, PropertiesPanel, ToolbarPanel

**Validation:** Create floor plan from scratch, save as JSON, load into 3D viewer

### Phase 4: Render Pipeline (Tier 14) — 2 weeks

**Deliverables:**

- RenderConfig (quality + camera presets)
- ClientRenderer (browser screenshot)
- FV Render Job DocType
- ExportManager (PNG, JPEG, glTF, OBJ)

**Validation:** Render a 3D scene at 4K quality with configurable camera angles

### Phase 5: WebXR (Tier 15) — 3-4 weeks

**Deliverables:**

- VRViewer with teleport navigation
- AROverlay with hit testing
- SpatialUI for VR panels
- Fallback handling (graceful degradation when XR unavailable)

**Validation:** Walk through a building model in VR headset

### Phase 6: Masar Migration — 2 weeks

**Deliverables:**

- Masar refactored to use frappe_visual Tier 11-14
- Masar 3D bundle size reduced ~80%
- All Masar features working unchanged
- Migration guide documented

### Phase 7: Domain Overlays — Ongoing

**Per-app 3D features built using the framework:**

- Vertex: BIM viewer, progress tracker, site planner
- Velara: Floor maps, room tours
- ARKSpace: Space planner
- Candela: Kitchen/restaurant layout

---

## Risk Analysis

### Technical Risks

| Risk                                  | Probability | Impact        | Mitigation                                 |
| ------------------------------------- | ----------- | ------------- | ------------------------------------------ |
| Three.js bundle too large             | Medium      | Performance   | Tree-shaking, code splitting, lazy load    |
| WebGL not supported on target devices | Low         | Functionality | Canvas2D fallback, feature detection       |
| Memory leaks in 3D scenes             | Medium      | Stability     | Strict dispose() protocol, monitoring      |
| Conflicts with Frappe's jQuery DOM    | Low         | Integration   | Isolated WebGL canvas, no DOM interference |
| WebXR browser support limited         | High        | Tier 15 reach | Progressive enhancement, VR optional       |
| Build system compatibility (esbuild)  | Low         | Build         | Three.js ESM is esbuild-native             |

### Business Risks

| Risk                                   | Probability | Impact      | Mitigation                             |
| -------------------------------------- | ----------- | ----------- | -------------------------------------- |
| Scope creep (too many features)        | High        | Timeline    | Strict phase gates, MVP per phase      |
| Masar regression during migration      | Medium      | User impact | Parallel operation, feature flags      |
| Maintenance burden of 2 render engines | Medium      | Long-term   | Clear SVG vs WebGL use-case guidelines |

### Performance Targets

| Metric                         | Target                                         |
| ------------------------------ | ---------------------------------------------- |
| Time to first 3D render        | < 3 seconds (cached), < 6 seconds (first load) |
| Three.js core bundle (gzipped) | < 200KB                                        |
| 60fps on mid-range devices     | Yes (with quality auto-adjustment)             |
| Memory per 3D scene            | < 100MB                                        |
| Impact on non-3D pages         | Zero (lazy-loaded only)                        |

---

## Summary — ملخص

**نعم، يمكننا بالتأكيد الاستفادة من مكتبات Masar ثلاثية الأبعاد لتوسيع frappe_visual.** الخطة تتضمن:

1. **5 مستويات جديدة** (Tiers 11-15) مع ~73 مكوّن إضافي
2. **Three.js** كمحرك ثلاثي الأبعاد مع دعم 7 صيغ نماذج
3. **محرر رسومات ثنائي الأبعاد** مستخلص من Masar ومعمّم للاستخدام العام
4. **خط أنابيب التصيير** (Render Pipeline) بجودات متعددة
5. **الواقع الافتراضي والمعزز** (WebXR) للتجول داخل النماذج
6. **أغطية تخصصية** لكل تطبيق (Vertex للبناء، Velara للفنادق، إلخ)
7. **أداء صفري التأثير** على الصفحات التي لا تستخدم الثلاثي الأبعاد (تحميل كسول)
