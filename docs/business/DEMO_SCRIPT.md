# Frappe Visual — Demo Script

> 10-minute live demo walkthrough for prospects and investors

---

## Pre-Demo Setup
1. Open browser to `https://demo.site/app/visual-hub`
2. Ensure ERPNext is installed for rich demo data
3. Set browser to fullscreen mode
4. Enable dark mode for dramatic effect

---

## Act 1: The Problem (2 min)

> "Every Frappe/ERPNext system has dozens of modules, hundreds of doctypes, thousands of relationships. Understanding the data model is the #1 challenge for developers, consultants, and admins."

**Show**: Traditional ERPNext doctype list (boring table)
**Say**: "This is what developers see today. Tables. Endless scrolling. No context."

---

## Act 2: The Reveal (3 min)

**Navigate to**: /app/visual-hub
**Select**: "erpnext" from the app dropdown

> "Now watch this..."

**The app map loads**: Modules appear as groups, doctypes as colored nodes, relationships as animated edges.

**Demo points**:
1. **Zoom in** to Accounts module — show doctypes grouped together
2. **Click** Sales Invoice — highlight all connections
3. **Right-click** — show context menu (Open, Details, Relationships)
4. **Switch layout** — from Force to Hierarchical to Radial
5. **Toggle dark mode** — seamless transition

> "30 seconds to understand what takes 30 minutes of reading documentation."

---

## Act 3: Deep Dive (3 min)

**Double-click** Sales Invoice → opens Relationship Explorer
- Show depth-2 expansion
- Click "Load more" on Customer
- Open a Floating Window with doctype details

**Create a Storyboard** → show multi-step wizard
- Demonstrate branching logic
- Show animated transitions

---

## Act 4: For Developers (2 min)

**Open browser console**:
```javascript
// One line to visualize any app
await frappe.visual.appMap('#container', 'hrms');
```

> "3 lines of code to add interactive visualizations to any Frappe app."

**Show**: Custom node types, ColorSystem API, GSAP animations

---

## Closing

> "Frappe Visual transforms data comprehension. Available free on Frappe Cloud Marketplace with premium features for power users."

**CTA**: "Install it today — it's free to start."
