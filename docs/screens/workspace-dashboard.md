# Workspace Dashboard — Screen Specification

# مواصفات شاشة لوحة تحكم مساحة العمل

## Overview

Enhanced workspace with SceneEngine header showing live KPIs, animated SVG room,
and glassmorphism shortcut cards.

## Route

`/desk/frappe-visual` (Frappe Visual workspace)

## Scenarios Served

DS-001 (Manager), DS-003 (End User), CR-002 (Cross-Role)

## frappe_visual Components Used

- `frappe.visual.scenePresetOffice()` — animated SVG office scene
- `frappe.visual.sceneDataBinder()` — live KPI binding
- `frappe.visual.icons.dashCard()` — stat cards
- `frappe.visual.sparkline()` — inline trend charts
- workspaceEnhancer (auto-active)

## CSS Effects (minimum 3)

- `.fv-fx-glass` — glassmorphism on shortcut cards
- `.fv-fx-gradient-animated` — animated gradient on scene header
- `.fv-fx-hover-lift` — card hover effect
- `.fv-fx-mouse-glow` — cursor glow on scene area

## Layout

| Breakpoint | Behavior                        |
| ---------- | ------------------------------- |
| Mobile     | Scene hidden, cards stacked     |
| Tablet     | Scene compressed, 2-col cards   |
| Desktop    | Full scene header + 3-col cards |
| Large      | Extended scene + 4-col cards    |

## Dark Mode

Scene adapts colors via CSS variables. Cards use `var(--card-bg)`.

## RTL Support

Scene mirrored via CSS `transform: scaleX(-1)` for directional elements.
Cards flow via `flex-direction` respecting `dir` attribute.

## GSAP Animation

Scene frames animate in with stagger. KPI numbers count up with `NumberTicker`.
Cards stagger-fade on workspace load.
