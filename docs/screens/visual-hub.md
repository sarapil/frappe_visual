# Visual Hub — Screen Specification
# مواصفات شاشة المركز المرئي

## Overview

The Visual Hub is the primary entry point for exploring all frappe_visual
components. It provides an interactive catalog organized by tier.

## Route

`/app/fv-visual-hub`

## Scenarios Served

DS-002 (Developer), WS-001 (Manager)

## frappe_visual Components Used

- `frappe.visual.appMap()` — module relationship visualization
- `frappe.visual.erd()` — DocType relationship diagram
- `frappe.visual.icons.dashCard()` — KPI stat cards
- `frappe.visual.commandBar()` — quick search (⌘K)

## CSS Effects (minimum 3)

- `.fv-fx-glass` — glassmorphism on component cards
- `.fv-fx-hover-lift` — lift on hover for each component tile
- `.fv-fx-page-enter` — fade+slide-up entrance animation

## Layout

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (320-767px) | Single column, stacked cards |
| Tablet (768-1023px) | Two-column grid |
| Desktop (1024-1439px) | Three-column grid with sidebar |
| Large (1440px+) | Four-column grid with expanded sidebar |

## Dark Mode

All colors via CSS variables. No hardcoded color values.

## RTL Support

CSS Logical Properties throughout. Icons mirrored where directional.

## GSAP Animation

Cards stagger in with `gsap.from()` — opacity 0 → 1, y 20 → 0, stagger 0.05s.

## Accessibility

- All cards keyboard-navigable (Tab + Enter)
- `aria-label` on interactive elements
- Focus ring visible on all clickable items
