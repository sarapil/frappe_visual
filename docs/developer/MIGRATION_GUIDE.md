# Frappe Visual — Migration Guide

> Upgrading between versions and migrating from alternative solutions

---

## Version Migration

### v0.x → v1.0 (Current)

This is the initial release. No migration needed.

### Future: v1.x → v2.0

When v2.0 is released, this section will contain:
- Breaking API changes
- Deprecated features
- Data migration patches
- Configuration changes

---

## Migrating from Static Diagrams

If you currently use static diagrams (draw.io, Lucidchart, Mermaid) to document your Frappe app architecture:

### Step 1: Install Frappe Visual
```bash
bench get-app frappe_visual
bench --site mysite install-app frappe_visual
bench build --app frappe_visual
```

### Step 2: Replace Static Diagrams
Instead of maintaining static SVG/PNG diagrams, use the AppMap component which auto-generates from your live data model.

### Step 3: Embed in Documentation
```html
<!-- In your wiki or docs page -->
<div id="app-map" style="height: 600px;"></div>
<script>
frappe.require("frappe_visual.bundle.js", () => {
    frappe.visual.appMap("#app-map", "my_app");
});
</script>
```

---

## Frappe Version Compatibility

| Frappe Visual | Frappe | ERPNext | Python | Node.js |
|--------------|--------|---------|--------|---------|
| 0.1.x        | 16.x   | 16.x    | 3.11+  | 18+     |

### Frappe v15 → v16 Notes

Frappe Visual requires v16+ because:
- Uses `frappe.qb` (QueryBuilder) exclusively — no raw SQL
- Relies on v16 page routing
- Uses v16 SCSS build pipeline
- Leverages v16 `frappe.require()` async loading

---

## Configuration Migration

### Settings DocType
After installation, configure at:
**Setup → Settings → Frappe Visual Settings**

Key settings:
- `license_key` — Enter your license key (not needed on Frappe Cloud)
- `default_layout` — Choose preferred graph layout
- `enable_animations` — Toggle GSAP animations
- `enable_minimap` — Toggle navigation minimap

---

## Troubleshooting Migration Issues

### Assets not loading after install
```bash
bench build --app frappe_visual --force
bench --site mysite clear-cache
```

### Doctype not found errors
```bash
bench --site mysite migrate
```

### JavaScript errors in console
```bash
# Check if bootstrap is loaded
# In browser console:
console.log(typeof frappe.visual); // should be "object"
```
