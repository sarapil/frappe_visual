---
title: Getting Started with Frappe Visual
icon: rocket
context_type: app
context_reference: frappe_visual
priority: 2
---

# Getting Started with Frappe Visual

Welcome! This guide walks you through setting up and using Frappe Visual — a 307+ component interactive visual engine for Frappe.

## Step 1: Initial Configuration

1. Navigate to **Desk → Settings → Frappe Visual Settings**
2. Enable **Auto-Enhancers** — these automatically add visual upgrades to every form, list, and workspace:
   - **Form Enhancer** — stats ribbon, relationship graph, quick links on every form
   - **List Enhancer** — Table / Cards / Kanban / Timeline view toggle on every list
   - **Workspace Enhancer** — live counts, sparklines, glassmorphism on workspace cards
3. Enable **Bilingual Tooltips** for Arabic ↔ English hover help
4. Set your preferred **Default Theme** and **Chart Palette**

## Step 2: Set Up Users and Roles

Frappe Visual uses **CAPS** (Capability-Based Access Control) with 15 fine-grained capabilities organized in 3 role bundles:

| Role              | Capabilities                             | Best For                         |
| ----------------- | ---------------------------------------- | -------------------------------- |
| **FV Viewer**     | 11 (all visual components + statistics)  | Team members who browse data     |
| **FV Power User** | 14 (+ export SVG/PNG + layout switching) | Analysts, developers, team leads |
| **FV Admin**      | 15 (+ settings management)               | System administrators            |

Assign roles via: **Desk → CAPS → Role Bundles → FV Viewer / Power User / Admin**

## Step 3: Explore the Visual Hub

Navigate to **Desk → Frappe Visual** on the app icon grid. The Visual Hub is your central dashboard with quick access to all 38 major components:

### Core Components

- **App Map** — Interactive graph of your entire Frappe application structure
- **ERD Explorer** — Entity Relationship Diagrams showing DocType links
- **Relationship Explorer** — Deep-dive into how documents connect
- **Storyboard** — Guided walkthroughs and presentations

### Data Visualization

- **Visual Dashboard** — Bento-grid dashboards with live widgets
- **Kanban Board** — Drag-and-drop card boards grouped by any Select field
- **Visual Calendar** — Calendar views for date-based records
- **Gantt Chart** — Project timeline visualization
- **Visual Map** — Geographic map with markers
- **Gallery** — Image galleries for visual records
- **Tree View** — Hierarchical tree for parent-child structures

### Tools

- **Whiteboard** — Freeform drawing canvas with document linking
- **Data Storytelling** — Scroll-triggered chart reveals for reports
- **Component Playground** — Interactive sandbox to test all components

## Step 4: Use Auto-Enhancers (Zero Config)

Once enabled, auto-enhancers work automatically on every page:

- On any **form view**: Notice the stats ribbon at top and relationship graph
- On any **list view**: See the view-mode toggle (Table → Cards → Kanban → Timeline)
- On any **workspace**: Shortcut cards show live counts and sparklines

## Step 5: Export and Share

With **FV Power User** or higher:

- Click the **Export** button on any visual component
- Choose format: **SVG** (scalable), **PNG** (image), or **PDF** (document)
- Copy to clipboard with one click for presentations
- Switch layout engines: Force, Hierarchical, ELK, Dagre, Circular

## Step 6: Customize with Theme Builder

Open the **Theme Builder** to create custom visual themes:

- Adjust colors, fonts, and spacing
- Preview in real-time with both LTR and RTL layouts
- Save and distribute themes to your team

## Getting Help

- Click the **❓** icon on any page for contextual help
- Each form has **ⓘ** icons on fields with detailed descriptions
- Visit the **About** page for a full app showcase: `/frappe-visual-about`
