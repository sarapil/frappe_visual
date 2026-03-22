# User Guide — Frappe Visual

## Introduction

Frappe Visual is an interactive visual exploration tool for the Frappe platform. It helps you understand application structures and data relationships through interactive graph visualizations.

---

## Quick Start

### Accessing Visual Hub

1. Open your browser
2. Navigate to `/app/visual-hub`
3. Select an app from the dropdown
4. The app map will load automatically

---

## App Map

### Navigation
- **Zoom**: Use mouse wheel or +/- buttons
- **Pan**: Drag the background
- **Select node**: Click any node
- **View details**: Double-click a node

### Node Types
Nodes represent DocTypes with different colors by type:
- 🔵 **Blue**: Master document
- 🟢 **Green**: Transaction
- 🟡 **Yellow**: Setup/Configuration
- 🔴 **Red**: Report
- ⚪ **Gray**: Other

### Changing Layouts
Use the top toolbar to switch layouts:
- **Force-directed** (fcose) — Default layout
- **Hierarchical** (breadthfirst) — Tree view
- **ELK Layered** — Enterprise-grade layout (Premium)

---

## Relationship Explorer

1. Double-click any node in the App Map
2. The Relationship Explorer opens automatically
3. Adjust depth (1-3) to show more relationship levels
4. Click "Load more" for deeper exploration

---

## Dark Mode

Frappe Visual automatically follows Frappe's dark mode settings:
- **Automatic**: Changes with browser/Frappe settings
- **Manual**: Settings → Frappe Visual Settings

---

## RTL Support

The interface fully supports RTL languages:
- All elements flip from right to left
- Toolbar reverses
- Minimap moves to the correct side
- Hierarchical layouts flow from right

---

## Export

### Export as SVG
1. Click the export button in the toolbar
2. Choose "SVG"
3. File downloads automatically

### Export as PNG
1. Click the export button
2. Choose "PNG"
3. Select resolution (1x, 2x, 3x)
4. File downloads automatically

---

## FAQ

### Map not showing?
```bash
bench build --app frappe_visual
bench --site mysite clear-cache
```

### Nodes overlapping?
Try switching layouts — click the layout icon and choose "ELK Layered"

### How to open a DocType from the map?
Right-click the node → "Open"
