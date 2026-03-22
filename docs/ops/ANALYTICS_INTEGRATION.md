# Frappe Visual — Analytics Integration

## Overview

Frappe Visual supports optional analytics to track usage patterns and improve the product. All analytics are opt-in, privacy-respecting, and can be fully disabled.

---

## Built-in Analytics Events

### Event Taxonomy

```javascript
// Event format: {category}.{action}
const ANALYTICS_EVENTS = {
    // Page events
    "visual_hub.open": {},
    "visual_hub.app_selected": { app_name: String },
    
    // Graph events
    "graph.rendered": { node_count: Number, edge_count: Number, layout: String },
    "graph.layout_changed": { from: String, to: String },
    "graph.node_clicked": { node_type: String },
    "graph.exported": { format: String }, // "svg" or "png"
    
    // Feature events
    "feature.minimap_toggled": { enabled: Boolean },
    "feature.dark_mode_toggled": { enabled: Boolean },
    "feature.search_used": {},
    "feature.relationship_explorer_opened": { doctype: String },
    "feature.storyboard_started": {},
    "feature.floating_window_opened": {},
    
    // License events
    "license.validated": { tier: String },
    "license.premium_feature_blocked": { feature: String }
};
```

---

## Integration Points

### Frappe Analytics (Built-in)

```python
# Server-side tracking (uses Frappe's Activity Log)
import frappe

def track_event(event, properties=None):
    """Track an analytics event using Frappe's Activity Log."""
    if not frappe.db.get_single_value("Frappe Visual Settings", "enable_analytics"):
        return
    
    frappe.get_doc({
        "doctype": "Activity Log",
        "subject": f"FV: {event}",
        "content": frappe.as_json(properties or {}),
        "reference_doctype": "Frappe Visual Settings"
    }).insert(ignore_permissions=True)
```

### Posthog Integration (Optional)

```javascript
// If Posthog is configured on the Frappe site
if (window.posthog) {
    frappe.visual.hooks.on("graphRendered", (data) => {
        posthog.capture("frappe_visual_graph_rendered", {
            node_count: data.nodeCount,
            layout: data.layout
        });
    });
}
```

### Plausible Integration (Optional)

```javascript
// Privacy-friendly analytics
if (window.plausible) {
    frappe.visual.hooks.on("graphRendered", (data) => {
        plausible("FV Graph Rendered", {
            props: { layout: data.layout }
        });
    });
}
```

---

## Privacy Policy

1. **No tracking by default** — Analytics must be explicitly enabled
2. **No personal data** — Only aggregate usage patterns
3. **No external services** — Unless site admin configures them
4. **Local storage only** — Events stored in Frappe's database
5. **User can opt out** — Via Frappe Visual Settings
6. **Data retention** — 90 days default, configurable
