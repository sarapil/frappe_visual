# Frappe Visual — Developer Cookbook

> Practical recipes for common integration patterns

---

## Recipe 1: Embed AppMap in a Custom Page

```python
# my_app/my_app/page/my_page/my_page.py
import frappe

def get_context(context):
    context.no_cache = 1
```

```javascript
// my_app/my_app/page/my_page/my_page.js
frappe.pages["my_page"].on_page_load = function (wrapper) {
    const container = $('<div id="visual-map" style="height:600px"></div>')
        .appendTo(wrapper);
    
    frappe.require("frappe_visual.bundle.js", () => {
        frappe.visual.appMap("#visual-map", "erpnext", {
            layout: "elk-layered",
            enableMinimap: true,
            onNodeClick: (node) => {
                frappe.set_route("Form", node.data("doctype"), node.data("id"));
            }
        });
    });
};
```

---

## Recipe 2: Relationship Explorer in a Dialog

```javascript
frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        frm.add_custom_button(__("View Relationships"), () => {
            const d = new frappe.ui.Dialog({
                title: __("Sales Invoice Relationships"),
                size: "extra-large"
            });
            
            frappe.require("frappe_visual.bundle.js", () => {
                frappe.visual.relationshipExplorer(
                    d.body,
                    "Sales Invoice",
                    { depth: 2, layout: "breadthfirst" }
                );
            });
            
            d.show();
        });
    }
});
```

---

## Recipe 3: Custom Node Types

```javascript
frappe.require("frappe_visual.bundle.js", () => {
    // Register a custom node type
    frappe.visual.colorSystem.registerNodeType("custom_module", {
        color: "#FF6B35",
        shape: "hexagon",
        icon: "🔧"
    });
    
    // Use in AppMap
    frappe.visual.appMap("#container", "my_app", {
        nodeTypeOverrides: {
            "My Custom DocType": "custom_module"
        }
    });
});
```

---

## Recipe 4: Storyboard Wizard for Onboarding

```javascript
frappe.require("frappe_visual.bundle.js", () => {
    const wizard = new frappe.visual.StoryboardWizard("#wizard-container", {
        steps: [
            {
                title: __("Welcome"),
                content: __("Let's set up your workspace"),
                highlight: ["Settings"]
            },
            {
                title: __("Configure"),
                content: __("Set your preferences"),
                action: () => frappe.set_route("Form", "My Settings")
            },
            {
                title: __("Done!"),
                content: __("You're all set"),
                type: "success"
            }
        ],
        onComplete: () => frappe.msgprint(__("Setup Complete!"))
    });
    
    wizard.start();
});
```

---

## Recipe 5: Export Graph as SVG

```javascript
// After graph is rendered
const graphEngine = frappe.visual.getActiveGraph();

// Export as SVG
const svgData = graphEngine.exportSVG();
const blob = new Blob([svgData], { type: "image/svg+xml" });
frappe.utils.download_file(blob, "app-map.svg");

// Export as PNG
graphEngine.exportPNG({ scale: 2 }).then(pngBlob => {
    frappe.utils.download_file(pngBlob, "app-map.png");
});
```

---

## Recipe 6: Server-Side API Usage

```python
import frappe
from frappe_visual.api import get_app_map, get_doctype_relationships

@frappe.whitelist()
def get_custom_visualization(app_name):
    """Build a custom visualization combining app map and relationships."""
    
    # Get the app structure
    app_data = get_app_map(app_name)
    
    # Enrich with relationship data for key doctypes
    for node in app_data.get("nodes", []):
        if node.get("type") in ["transaction", "master"]:
            rels = get_doctype_relationships(node["id"], depth=1)
            node["relationships"] = rels
    
    return app_data
```

---

## Recipe 7: Dark Mode Integration

```javascript
// Listen for theme changes
frappe.visual.themeManager.on("themeChange", (theme) => {
    console.log("Theme changed to:", theme); // "light" or "dark"
});

// Force a specific theme
frappe.visual.themeManager.setTheme("dark");

// Get current CSS variables
const vars = frappe.visual.themeManager.getCSSVars();
console.log(vars["--fv-bg-primary"]); // "#1a1a2e"
```

---

## Recipe 8: Minimap Configuration

```javascript
frappe.visual.appMap("#container", "erpnext", {
    enableMinimap: true,
    minimapOptions: {
        container: "#minimap-panel",  // custom container
        viewLiveFrameColor: "var(--fv-primary)",
        width: 200,
        height: 150
    }
});
```
