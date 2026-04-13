# Gallery — Screen Specification
# مواصفات شاشة معرض المكونات

## Overview

Interactive showcase of all 307+ frappe_visual components organized by tier/wave
with live previews and copy-paste code snippets.

## Route

`/frappe-visual-gallery`

## Scenarios Served

WS-001 (Developer)

## frappe_visual Components Used

- Live instances of all 307+ components in preview cards
- `frappe.visual.commandBar()` — search/filter (⌘K)
- `frappe.visual.icons.render()` — tier icons
- `frappe.visual.masonry()` — card layout

## CSS Effects (minimum 3)

- `.fv-fx-glass` — glassmorphism on component cards
- `.fv-fx-hover-lift` — lift on hover for cards
- `.fv-fx-page-enter` — staggered entrance animation

## Layout

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Single column, collapsed previews |
| Tablet | Two-column masonry |
| Desktop | Three-column masonry with sidebar filter |
| Large | Four-column masonry |

## Dark Mode

Component previews adapt to current theme. Background via CSS variables.

## RTL Support

Masonry grid flows naturally in RTL. Labels use CSS Logical Properties.

## GSAP Animation

Cards stagger-fade on initial load and on filter change.
