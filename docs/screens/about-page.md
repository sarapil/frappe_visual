# About Page — Screen Specification

# مواصفات شاشة صفحة عن التطبيق

## Overview

14-slide showcase of frappe_visual rendered inside a `frappe.visual.storyboard()`
with GSAP transitions, glassmorphism cards, and animated SVG illustrations.

## Route

`/frappe-visual-about`

## Scenarios Served

CR-003 (Cross-Role), WS-001 (Manager)

## frappe_visual Components Used

- `frappe.visual.storyboard()` — slide engine
- `frappe.visual.appMap()` — module map slide
- `frappe.visual.erd()` — ERD slide
- `frappe.visual.icons.render()` — all icon displays
- `frappe.visual.numberTicker()` — animated statistics

## CSS Effects (minimum 3)

- `.fv-fx-glass` — glassmorphism on slide content cards
- `.fv-fx-gradient-animated` — animated gradient hero section
- `.fv-fx-parallax-container` — parallax depth on hero
- `.fv-fx-gradient-text` — gradient text on headings
- `.fv-fx-hover-shine` — shine on CTA buttons

## Slides (14)

1. App overview — what frappe_visual does
2. Module map — `appMap()` of all 10 tiers
3. Entity relationships — `erd()` of DocTypes
4. Component showcase — Wave 1-10 highlights
5. Auto-enhancers — formEnhancer / listEnhancer / workspaceEnhancer
6. Scene Engine — immersive SVG dashboards
7. Icon system — 5000+ Tabler icons
8. Developer tools — Console + API Tester
9. 3D/CAD/XR expansion — Tier 11-15
10. Integration map — connections to ERPNext, HRMS, CAPS
11. Security & permissions — CAPS capabilities
12. i18n — 12 languages, full RTL
13. Reports & analytics — ERP dashboard API
14. Getting started — installation + first steps

## Layout

| Breakpoint | Behavior                       |
| ---------- | ------------------------------ |
| Mobile     | Full width slides, bottom nav  |
| Tablet     | Centered slides, side nav dots |
| Desktop    | Wide slides with fixed nav     |
| Large      | Max-width 1200px centered      |

## Navigation

Previous/Next buttons at BOTH top AND bottom of every slide.
Dot indicators for slide position. Keyboard arrows supported.

## Dark Mode

All slide backgrounds via CSS variables. SVG illustrations adapt.

## RTL Support

Text alignment via `text-align: start`. Navigation buttons respect direction.
