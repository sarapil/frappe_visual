# Frappe Visual — Sales Pitch

## One-Liner
> **See your Frappe app, don't just read about it.** Interactive graph visualizations for any Frappe application.

---

## The Elevator Pitch (30 seconds)

"Every Frappe developer spends hours trying to understand complex data models. With Frappe Visual, you can visualize any app's entire architecture in seconds — modules, doctypes, relationships, all as an interactive graph. Click to explore, switch layouts, export to SVG. It's free on the Frappe Cloud Marketplace."

---

## The Problem Statement

Frappe/ERPNext applications contain hundreds of DocTypes with thousands of relationships. Understanding the data model requires:
- Reading through endless doctype lists
- Manually tracing Link fields
- Drawing static diagrams that become outdated immediately
- Onboarding new developers takes weeks

---

## The Solution

Frappe Visual automatically generates interactive graph visualizations of any Frappe app:
- **App Map**: Full application structure as a node graph
- **Relationship Explorer**: Click any DocType to see all its connections
- **9 Layout Algorithms**: From force-directed to enterprise ELK
- **Dark Mode + RTL**: Works everywhere, for everyone
- **One-Line Integration**: `frappe.visual.appMap("#container", "erpnext")`

---

## Key Differentiators

| Feature | Static Diagrams | Frappe Visual |
|---------|----------------|---------------|
| Always current | ❌ Manual updates | ✅ Auto-generated |
| Interactive | ❌ Image file | ✅ Click, zoom, filter |
| Multi-layout | ❌ One layout | ✅ 9 algorithms |
| Dark mode | ❌ | ✅ Auto-detect |
| RTL | ❌ | ✅ Arabic/Hebrew |
| Export | ❌ Screenshot | ✅ SVG + PNG |
| Embeddable | ❌ | ✅ Any page/dialog |

---

## Target Audiences

1. **Developers**: Understand and navigate complex codebases
2. **Consultants**: Communicate data architecture to clients
3. **Admins**: Audit system structure and relationships
4. **Trainers**: Interactive teaching materials
5. **CTOs**: Evaluate technical architecture visually

---

## Proof Points

- Built on proven open-source libraries (Cytoscape.js, ELK.js, GSAP)
- Zero external dependencies at runtime
- Works with ANY Frappe app (ERPNext, HRMS, LMS, custom apps)
- Full Frappe Cloud integration (auto license detection)
