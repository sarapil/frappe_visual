# Frappe Visual UX Framework — Reusable AI Prompt

> **Usage:** Copy this entire prompt and paste it at the beginning of any conversation with an AI assistant when you want to build visual graph-based UX for a Frappe application. This will make the AI apply the Frappe Visual design patterns consistently.

---

## PROMPT START

You are helping me build a Frappe Framework application that uses **Frappe Visual** (`frappe_visual`) — a graph-based UX framework. All visual/interactive UI components must follow these patterns:

### Stack
- **Graph Engine:** Cytoscape.js (with fcose, elk, cxtmenu, expand-collapse, navigator, node-html-label, popper extensions)
- **Layout:** ELK.js via cytoscape-elk (layered, mrtree, stress, radial)
- **Animation:** GSAP (ant-line, pulse, stagger, transitions) + Lottie-web
- **Tooltips:** Tippy.js
- **Styling:** SCSS with CSS custom properties (`--fv-*` prefix)
- **Integration:** Frappe hooks.py, esbuild .bundle.js convention, frappe.require() lazy loading

### Available API
```javascript
// Lazy load (always available via fv_bootstrap.js)
const { GraphEngine, AppMap, RelationshipExplorer, Storyboard, VisualDashboard, FloatingWindow, ColorSystem, AnimationEngine } = await frappe.visual.engine();

// Convenience methods
await frappe.visual.appMap('#container', 'app_name');
await frappe.visual.storyboard('#container', steps);
await frappe.visual.create('ComponentName', '#container', ...args);
```

### Rules
1. **Colors:** Always use `ColorSystem.getNodeColor(type)` or `--fv-*` CSS vars. Never hardcode.
2. **i18n:** All strings wrapped in `__()`. Support EN + AR (RTL).
3. **Dark mode:** Use `--fv-*` CSS variables. ThemeManager handles detection automatically.
4. **Animations:** Use GSAP for complex, CSS @keyframes for simple. Available: ant-march, pulse, fade-in-up, fade-in-scale, slide-in, stagger, breathe.
5. **Lazy loading:** Heavy components loaded via `frappe.require()` or `frappe.visual.engine()`. Never load Cytoscape eagerly.
6. **Cleanup:** Every component must have `destroy()` method.
7. **Node types:** module, doctype, master, transaction, settings, child-table, report, page, workspace, dashboard, action, log, link, webhook, scheduler, user, role, server, device, interface, vpn, firewall, wifi, whatsapp, telegram, call, meeting, status-active, status-warning, status-error, coming-soon, default, group.
8. **Edge types:** link (solid), child-table (dashed), dependency (dotted), reference (dash-dot), data-flow (solid + ant-line), contains (light).
9. **Layouts:** fcose (default), elk-layered, elk-mrtree, elk-stress, elk-radial, breadthfirst, circle, concentric, grid.
10. **Server API:** `frappe_visual.api.get_app_map`, `frappe_visual.api.get_doctype_relationships`, `frappe_visual.api.get_workspace_map`, `frappe_visual.api.get_quick_stats`.
11. **Data flow:** Components → DataAdapter → frappe.call → api.py → frappe.get_meta/get_all.
12. **Responsive:** Must work at 320px. Use CSS grid with `repeat(auto-fill, minmax(280px, 1fr))`.
13. **Compound nodes:** Use Cytoscape `parent` property for module→doctype grouping.
14. **Floating windows:** For detail panels. GSAP Draggable, minimize/close, backdrop-filter blur.

### File Patterns
- JS components → `frappe_visual/public/js/components/<name>.js`
- Core modules → `frappe_visual/public/js/core/<name>.js`
- Utils → `frappe_visual/public/js/utils/<name>.js`
- SCSS → `frappe_visual/public/scss/_<name>.scss` (import in bundle)
- Server API → `frappe_visual/api.py`
- App hooks → `frappe_visual/hooks.py`

When I ask you to build a visual feature, always:
1. Use the graph engine for data that has relationships
2. Use visual dashboard cards for KPIs/stats
3. Use storyboard wizard for multi-step flows
4. Use floating windows for detail panels
5. Apply dark mode + RTL support
6. Include animated transitions (GSAP)
7. Add context menu for graph nodes
8. Provide search + type filter for graphs

## PROMPT END
