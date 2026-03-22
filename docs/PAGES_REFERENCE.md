# Frappe Visual — Pages Reference

## Visual Hub

**Route**: `/app/visual-hub`

### Purpose
Main entry point for Frappe Visual. Provides an interactive interface for exploring any Frappe app's structure through graph visualizations.

### UI Components

1. **App Selector Dropdown** — Lists all installed Frappe apps
2. **Graph Container** — Full-screen Cytoscape.js canvas
3. **Layout Toolbar** — Buttons for 9 layout algorithms
4. **Search Bar** — Filter nodes by name/type
5. **Minimap** — Navigation overview (bottom-right corner)
6. **Export Buttons** — SVG and PNG download
7. **View Controls** — Zoom in/out, fit, reset

### Data Flow

```
User selects app
    → frappe.call("frappe_visual.api.get_app_map")
    → DataAdapter transforms response
    → GraphEngine renders Cytoscape graph
    → LayoutManager applies selected layout
    → ThemeManager applies CSS variables
    → AnimationEngine adds animations
```

### Interactions

| User Action | Result |
|-------------|--------|
| Click node | Highlight node and connected edges |
| Double-click node | Open Relationship Explorer |
| Right-click node | Show context menu (Premium) |
| Drag background | Pan the graph |
| Scroll | Zoom in/out |
| Click layout button | Re-layout with new algorithm |
| Click export | Download SVG or PNG |
| Type in search | Filter and highlight matching nodes |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Fit graph to viewport |
| `Escape` | Deselect all |
| `/` | Focus search bar |
