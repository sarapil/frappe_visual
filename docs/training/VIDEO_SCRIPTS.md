# Frappe Visual — Video Scripts

> Scripts for tutorial videos and screen recordings

---

## Video 1: Getting Started (5 min)

### Title: "Frappe Visual in 5 Minutes"

**Intro (30s)**
> "Hi! Today I'll show you how Frappe Visual transforms the way you understand Frappe applications. Let's dive in."

**Installation (60s)**
- Terminal: `bench get-app frappe_visual && bench --site mysite install-app frappe_visual`
- Build: `bench build --app frappe_visual`
- Navigate to `/app/visual-hub`

**First Map (90s)**
- Select "erpnext" from dropdown
- Map loads with animated nodes
- Zoom into Accounts module
- Click Sales Invoice → highlight connections
- Switch to dark mode

**Key Features (60s)**
- Layout switching (Force → Hierarchical → Radial)
- Minimap navigation
- Search & filter
- Node clicking → opens relationship view

**Outro (30s)**
> "That's Frappe Visual! Install it free from the Frappe Cloud Marketplace. Link in the description."

---

## Video 2: For Developers (8 min)

### Title: "Embed Interactive Graphs in Your Frappe App"

**Scenes:**
1. Open VS Code with a Frappe app
2. Add `frappe.require("frappe_visual.bundle.js")`
3. Create AppMap in a custom page
4. Add RelationshipExplorer in a dialog
5. Customize node types and colors
6. Export as SVG
7. Show the API (`get_app_map`, `get_doctype_relationships`)

---

## Video 3: Dark Mode & RTL (3 min)

### Title: "Frappe Visual: Dark Mode & RTL Support"

**Scenes:**
1. Show light mode AppMap
2. Toggle Frappe dark mode → auto-transition
3. Switch to Arabic locale → RTL layout
4. Show CSS variables in DevTools
5. Show ThemeManager API

---

## Video 4: Storyboard Wizard (4 min)

### Title: "Build Guided Workflows with Storyboard"

**Scenes:**
1. Create a multi-step wizard
2. Add steps with highlights
3. Show branching logic
4. Animated transitions between steps
5. Completion callback

---

## Screen Recording Guidelines

- **Resolution**: 1920×1080
- **Browser**: Chrome (latest)
- **Theme**: Start with light, switch to dark mid-video
- **Font Size**: 16px minimum (zoom browser to 110%)
- **Terminal Font**: 14px, dark background
- **Cursor**: Highlight cursor for visibility
- **Audio**: Clear narration, no background music during code segments
