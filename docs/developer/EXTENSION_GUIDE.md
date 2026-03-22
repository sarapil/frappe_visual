# Frappe Visual — Extension Guide

> How to extend Frappe Visual with custom components, node types, and integrations

---

## Extension Architecture

Frappe Visual is designed for extensibility at three levels:

1. **Visual Layer** — Custom node types, edge types, themes
2. **Component Layer** — New graph components and widgets
3. **Data Layer** — Custom data adapters and API endpoints

---

## 1. Custom Node Types

### Register via JavaScript

```javascript
// In your app's bundle or page script
frappe.require("frappe_visual.bundle.js", () => {
    frappe.visual.colorSystem.registerNodeType("iot_device", {
        color: "#00BCD4",
        borderColor: "#0097A7",
        shape: "diamond",
        icon: "📡",
        label: "IoT Device"
    });
});
```

### Register via hooks.py

```python
# In your app's hooks.py
frappe_visual_node_types = {
    "iot_device": {
        "color": "#00BCD4",
        "shape": "diamond",
        "icon": "📡"
    },
    "sensor": {
        "color": "#4CAF50",
        "shape": "ellipse",
        "icon": "🌡️"
    }
}
```

---

## 2. Custom Edge Types

```javascript
frappe.visual.colorSystem.registerEdgeType("data_flow", {
    color: "#FF9800",
    style: "dashed",
    width: 3,
    arrow: "triangle",
    animated: true  // ant-line animation
});
```

---

## 3. Custom Layout Algorithms

```javascript
frappe.visual.layoutManager.registerLayout("my_layout", {
    label: "My Custom Layout",
    icon: "grid",
    run: (cy, options) => {
        // cy = Cytoscape instance
        // Return a layout promise
        return cy.layout({
            name: "grid",
            rows: options.rows || 3,
            cols: options.cols || 4,
            animate: true
        }).run();
    }
});
```

---

## 4. Custom Graph Components

### Create a new component class:

```javascript
class MyCustomGraph {
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this.engine = null;
    }
    
    async init() {
        const { GraphEngine } = await frappe.visual.getModules();
        
        const data = await this.fetchData();
        this.engine = new GraphEngine(this.container, {
            elements: data.elements,
            layout: this.options.layout || "fcose",
            ...this.options
        });
    }
    
    async fetchData() {
        return frappe.call({
            method: "my_app.api.get_custom_graph_data",
            args: this.options.args
        });
    }
    
    destroy() {
        if (this.engine) this.engine.destroy();
    }
}

// Register
frappe.visual.registerComponent("myCustomGraph", MyCustomGraph);
```

---

## 5. Custom Data Adapters

```javascript
class ERPNextAdapter extends frappe.visual.DataAdapter {
    async fetchNodes(options) {
        const result = await frappe.call({
            method: "erpnext.api.get_chart_of_accounts",
            args: { company: options.company }
        });
        
        return result.message.map(account => ({
            id: account.name,
            label: account.account_name,
            type: account.is_group ? "group" : "leaf",
            parent: account.parent_account
        }));
    }
    
    async fetchEdges(nodes) {
        // Build parent-child edges
        return nodes
            .filter(n => n.parent)
            .map(n => ({
                source: n.parent,
                target: n.id,
                type: "hierarchy"
            }));
    }
}

frappe.visual.registerAdapter("erpnext_coa", ERPNextAdapter);
```

---

## 6. Theme Extensions

```scss
// In your app's SCSS
[data-theme="my-brand"] {
    --fv-bg-primary: #1a1a2e;
    --fv-bg-secondary: #16213e;
    --fv-text-primary: #e8e8e8;
    --fv-primary: #e94560;
    --fv-primary-hover: #ff6b6b;
    --fv-border-color: #2a2a4a;
    --fv-node-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
}
```

```javascript
// Register theme
frappe.visual.themeManager.registerTheme("my-brand", {
    label: "My Brand",
    cssAttribute: "my-brand",
    icon: "🎨"
});
```

---

## 7. Plugin Hooks

```javascript
// Before graph render
frappe.visual.hooks.on("beforeRender", (engine, elements) => {
    // Modify elements before rendering
    elements.nodes.forEach(node => {
        if (node.data.custom_flag) {
            node.data.badge = "⚠️";
        }
    });
});

// After node click
frappe.visual.hooks.on("nodeClick", (node, engine) => {
    // Custom click handler
    myAnalytics.track("node_clicked", { id: node.id() });
});

// On layout change
frappe.visual.hooks.on("layoutChange", (layoutName, engine) => {
    localStorage.setItem("preferred_layout", layoutName);
});
```

---

## Best Practices

1. **Namespace your extensions** — Use your app name as prefix
2. **Lazy load** — Don't load heavy extensions at boot time
3. **Clean up** — Always implement `destroy()` methods
4. **Test with RTL** — Ensure extensions work in both LTR and RTL
5. **Theme-aware** — Use CSS variables, not hardcoded colors
6. **Document** — Add JSDoc comments and README
