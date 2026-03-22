# Frappe Visual — RAG-Optimized Embeddings

> Pre-chunked content optimized for Retrieval-Augmented Generation systems.
> Each section is a self-contained chunk for vector embedding.

---

## CHUNK: Overview
Frappe Visual is a graph-based UX framework for Frappe v16 applications. It replaces traditional list views and dashboards with interactive node-graph visualizations powered by Cytoscape.js, ELK.js, GSAP, and Lottie-web. It supports 30+ semantic node types, 12 edge types, 9 layout algorithms, dark mode, RTL, floating windows, animations, and export to SVG/PNG. Published by Arkan Lab under GPL-3.0 license.

## CHUNK: Installation
Install Frappe Visual: `bench get-app frappe_visual`, then `bench --site SITE install-app frappe_visual`, then `yarn --cwd apps/frappe_visual install`, then `bench build --app frappe_visual`. Requires Frappe v16+, Python 3.10+, Node.js 18+, MariaDB 10.6+.

## CHUNK: Quick Start
Use `await frappe.visual.appMap('#container', 'erpnext')` to create an interactive app map. The framework lazy-loads on demand — the bootstrap loader (2KB) is included globally, while the main bundle (400KB) loads only when first needed. Access Visual Hub at /app/visual-hub.

## CHUNK: GraphEngine
GraphEngine is the core Cytoscape.js wrapper. Create with `new GraphEngine({ container, nodes, edges, layout, minimap, contextMenu, expandCollapse, animate, antLines, pulseNodes })`. Supports layouts: fcose, elk-layered, elk-mrtree, elk-stress, elk-radial, breadthfirst, circle, concentric, grid. Methods: runLayout(), search(), filterByType(), addNodes(), addEdges(), zoomIn(), zoomOut(), fit(), toSVG(), toPNG(), destroy().

## CHUNK: ColorSystem
ColorSystem provides semantic colors for 30+ node types. Types include: module (indigo), doctype (blue), master (emerald), transaction (amber), settings (slate), child-table (cyan), report (purple), page (violet), workspace (purple), dashboard (teal), action (orange), webhook (rose), server (zinc), device (teal), vpn (indigo), firewall (red), whatsapp (green), telegram (blue), call (amber), meeting (violet). Use `ColorSystem.getNodeType(type)` and `ColorSystem.registerNodeType(name, config)`.

## CHUNK: AnimationEngine
AnimationEngine uses GSAP for: ant-line marching on dashed edges, pulse glow on status nodes, stagger enter/exit transitions, layout transition overlays, ambient breathing effects. Methods: startAntLines(), stopAntLines(), startPulse(), stopPulse(), animateNodeEnter(ids), animateNodeExit(ids), animateLayoutTransition(callback).

## CHUNK: ThemeManager
ThemeManager auto-detects dark/light mode and RTL direction. Watches `[data-theme]`, `body.dark`, `[dir=rtl]`, `[lang=ar]` via MutationObserver. Applies 40+ CSS custom properties (--fv-*). Use `ThemeManager.isDark`, `ThemeManager.isRTL`, `ThemeManager.onChange(fn)`, `ThemeManager.getCytoscapeTheme()`.

## CHUNK: FloatingWindow
FloatingWindow creates desktop-style draggable windows over the graph. Uses GSAP Draggable with fallback to manual drag. Features: colored title bar, minimize/close buttons, resize handle, backdrop blur, cascade positioning, open/close animations. Create: `new FloatingWindow({ title, color, content, width, height })`.

## CHUNK: AppMap Component
AppMap is the flagship component that visualizes a Frappe application's structure. Shows modules as compound nodes containing doctypes, with relationship edges between them. Features: search bar, layout toolbar, type filtering, context menus, minimap, zoom controls. Create: `AppMap.create('#container', 'erpnext', { layout: 'fcose' })`.

## CHUNK: API Endpoints
Server API at frappe_visual.api: get_app_map(app_name) returns modules+doctypes+edges for an app; get_doctype_relationships(doctype, depth) returns relationship graph from a doctype; get_workspace_map(workspace) returns workspace shortcuts; get_quick_stats(app_name) returns counts. All use @frappe.whitelist() and frappe.has_permission().

## CHUNK: Feature Gating
Open Core model with free and premium tiers. Free: basic app map, relationship explorer, dashboard, storyboard, dark mode, RTL, basic layouts, search, minimap. Premium: advanced layouts, floating windows, animation engine, SVG/PNG export, custom types, context menus, MCP integration. Use `@require_premium("feature_key")` decorator or `is_feature_enabled("key")`.

## CHUNK: License System
LicenseValidator checks premium status via: (1) Frappe Cloud detection, (2) license key validation (XXXX-XXXX-XXXX-HASH format). Results cached in Redis for 1 hour. Settings in "Frappe Visual Settings" DocType. API: get_license_status(), validate_license_key(key). Client-side: frappe_visual.is_enabled(feature), frappe_visual.require_premium(key, name, callback).
