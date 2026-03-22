# Frappe Visual — Developer Guide

## Overview

**Frappe Visual** is a graph-based UX framework that transforms how Frappe applications display data. Instead of traditional tables and forms, it provides interactive node-graph visualizations with animations, floating windows, and a complete design system.

## Quick Start

### Installation

```bash
cd frappe-bench
bench get-app frappe_visual
bench --site dev.localhost install-app frappe_visual
yarn --cwd apps/frappe_visual install
bench build --app frappe_visual
```

### First Visualization

```javascript
// In any client script, page, or form
const map = await frappe.visual.appMap('#my-container', 'erpnext');
```

That's it! The app map will show all ERPNext modules and doctypes as an interactive graph.

---

## Core Concepts

### 1. The Bootstrap Layer (`fv_bootstrap.js`)

This lightweight script (~2KB) loads on every page via `app_include_js`. It:
- Creates the `frappe.visual` namespace
- Provides lazy-load helpers (`frappe.visual.engine()`)
- Detects dark mode and RTL
- Does NOT load any heavy libraries until needed

### 2. The Bundle (`frappe_visual.bundle.js`)

The main bundle (~400KB gzip) loads on-demand and contains:
- Cytoscape.js + all extensions
- ELK.js layout engine
- GSAP animation platform
- All core modules and components

### 3. Graph Engine

The `GraphEngine` class wraps Cytoscape.js with Frappe-specific features:

```javascript
const engine = new GraphEngine({
    container: document.getElementById('graph'),
    nodes: [
        { id: 'n1', label: 'Sales Invoice', type: 'transaction' },
        { id: 'n2', label: 'Customer', type: 'master' },
    ],
    edges: [
        { source: 'n1', target: 'n2', type: 'link', label: 'customer' },
    ],
    layout: 'fcose',           // Layout algorithm
    minimap: true,              // Show navigator minimap
    contextMenu: true,          // Enable right-click radial menu
    expandCollapse: true,       // Enable compound node expand/collapse
    animate: true,              // Enable all animations
    antLines: true,             // Animated ant-march on data-flow edges
    pulseNodes: true,           // Pulse glow on selected nodes
});
```

### 4. Color System

Every node type has a semantic color. Never hardcode:

```javascript
import { ColorSystem } from './utils/color_system';

const color = ColorSystem.getNodeColor('transaction');  // Returns amber
const edgeColor = ColorSystem.getEdgeColor('child-table');  // Returns teal

// Register custom types for your app
ColorSystem.registerNodeType('my-device', '#e74c3c');
```

### 5. Animation Engine

GSAP-powered animations managed centrally:

```javascript
const engine = new GraphEngine({ ... });

// Ant-line animation on edges
engine.animEngine.startAntLine();

// Pulse on specific nodes
engine.animEngine.startPulse(['node1', 'node2']);

// Animate new nodes entering
engine.animEngine.animateNodeEnter(['newNode1', 'newNode2']);

// Ambient breathing on idle
engine.animEngine.startAmbient();

// Build a GSAP timeline for storyboard
const timeline = engine.animEngine.createTimeline([
    { target: 'node1', action: 'highlight' },
    { target: 'node2', action: 'highlight' },
]);
timeline.play();
```

### 6. Theme Manager

Automatic dark/light + RTL support:

```javascript
import { ThemeManager } from './core/theme_manager';

const theme = new ThemeManager();
theme.onChange((isDark, isRTL) => {
    console.log('Theme changed:', { isDark, isRTL });
});

// Get Cytoscape-compatible style object for current theme
const cyStyle = theme.getCytoscapeTheme();
```

---

## Components

### AppMap

Full application structure as an interactive graph:

```javascript
const map = await AppMap.create('#container', 'erpnext', {
    layout: 'fcose',          // or 'elk-layered', 'elk-mrtree'
    onNodeClick: (data) => {
        frappe.set_route('Form', data.doctype, data.label);
    },
});
```

### RelationshipExplorer

Explore relationships radiating from a DocType:

```javascript
const explorer = await RelationshipExplorer.create('#container', 'Sales Invoice', {
    depth: 3,
    layout: 'elk-radial',
});
```

### Storyboard

Multi-step animated wizard:

```javascript
const wizard = Storyboard.create('#container', [
    {
        title: 'Welcome',
        content: '<p>Let\'s set up your system.</p>',
    },
    {
        title: 'Choose Module',
        choices: [
            { label: 'Accounting', value: 'accounting', icon: '📊', color: '#818cf8' },
            { label: 'HR', value: 'hr', icon: '👥', color: '#34d399' },
        ],
    },
    {
        title: 'Configure',
        content: (el, data) => {
            el.innerHTML = `<p>You chose: ${data.step_1_choice}</p>`;
        },
        validate: (el, data) => !!data.step_1_choice,
    },
], {
    onComplete: (data) => {
        frappe.msgprint('Setup complete!');
    },
});
```

### VisualDashboard

Card-based dashboard with visual widgets:

```javascript
VisualDashboard.create('#container', [
    {
        label: 'Total Invoices',
        value: '1,247',
        icon: '📄',
        color: '#818cf8',
        subtitle: '+12% from last month',
        badges: [
            { label: '89 paid', type: 'success' },
            { label: '23 overdue', type: 'danger' },
        ],
    },
    {
        label: 'Active Customers',
        value: '342',
        icon: '👥',
        color: '#34d399',
    },
]);
```

### Floating Windows

Desktop-style draggable panels:

```javascript
const win = new FloatingWindow({
    title: 'Sales Invoice Details',
    color: '#f59e0b',
    width: 400,
    height: 500,
});
win.setContent(detailElement);
win.show();
// win.minimize(), win.close(), win.destroy()
```

---

## Available Layouts

| ID | Algorithm | Best For |
|----|-----------|----------|
| `fcose` | Force-directed (compound-aware) | General purpose, app maps |
| `elk-layered` | Layered/Sugiyama | Hierarchies, data flow |
| `elk-mrtree` | Minimum spanning tree | Dependency trees |
| `elk-stress` | Stress minimization | Large networks |
| `elk-radial` | Radial tree | Relationships from center |
| `breadthfirst` | Breadth-first tree | Simple hierarchies |
| `circle` | Circular | Peer relationships |
| `concentric` | Concentric circles | Importance-based |
| `grid` | Grid arrangement | Uniform display |

Switch layouts at runtime:
```javascript
engine.runLayout('elk-radial');
```

---

## Integration Patterns

### In a DocType Form

```javascript
frappe.ui.form.on('Customer', {
    refresh(frm) {
        // Add a visual button
        frm.add_custom_button(__('View Relationships'), async () => {
            const d = new frappe.ui.Dialog({
                title: __('Customer Relationships'),
                size: 'extra-large',
            });
            d.show();

            await frappe.visual.create(
                'RelationshipExplorer',
                d.body,
                'Customer',
                { depth: 2, layout: 'elk-radial' }
            );
        });
    }
});
```

### In a Workspace

Use the Visual Hub page (`/app/visual-hub`) or embed in custom workspace blocks.

### In a Report

```javascript
frappe.query_reports["My Report"] = {
    onload(report) {
        report.page.add_inner_button(__('Visual View'), async () => {
            // Transform report data to graph format
            const nodes = report.data.map(row => ({
                id: row.name,
                label: row.title,
                type: row.status === 'Active' ? 'status-active' : 'status-warning',
            }));
            await frappe.visual.create('GraphEngine', '#graph-view', null, {
                nodes,
                edges: [],
                layout: 'grid',
            });
        });
    }
};
```

---

## Extending the Framework

### Adding a New Component

1. Create `frappe_visual/public/js/components/my_component.js`:
```javascript
import { GraphEngine } from '../core/graph_engine';

export class MyComponent {
    static async create(container, opts) { /* ... */ }
    destroy() { /* cleanup */ }
}
```

2. Register in `frappe_visual.bundle.js`:
```javascript
import { MyComponent } from './components/my_component';
frappe.visual.MyComponent = MyComponent;
```

3. Add styles in `_components.scss`.

### Adding a New Node Type

```javascript
// In your app's initialization
ColorSystem.registerNodeType('solar-panel', '#f59e0b');
ColorSystem.registerNodeType('battery', '#10b981');
```

### Custom Data Adapter

Override or extend `DataAdapter` methods:
```javascript
DataAdapter.fetchCustomData = async function(params) {
    const r = await frappe.call({
        method: 'my_app.api.get_custom_graph_data',
        args: params,
    });
    return DataAdapter.listToNodes(r.message, 'name', 'title', 'custom-type');
};
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≥ 1200px | Full layout: graph + sidebar + minimap |
| 768–1199px | Graph fills width, toolbar wraps, minimap hidden |
| < 768px | Single column, simplified toolbar, touch-optimized |

## Performance Tips

1. **Limit visible nodes** to ~500 for smooth interaction
2. **Use `DataAdapter.loadMore()`** for pagination on large datasets
3. **Disable ambient animations** on mobile (`animate: false`)
4. **ELK layouts run in Web Worker** — won't block the main thread
5. **Use `fcose` for < 200 nodes**, `elk-stress` for larger graphs

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Graph not showing | Check `frappe.visual` exists in console. Run `bench build --app frappe_visual` |
| Styles broken | Clear cache: `bench --site <site> clear-cache` |
| Animations janky | Reduce node count or disable: `{ animate: false }` |
| Dark mode not applying | Ensure ThemeManager detects `[data-theme="dark"]` or `body.dark` |
| RTL layout wrong | Check `dir="rtl"` on `<html>` element |
