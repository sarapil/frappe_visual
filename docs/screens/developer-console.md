# Developer Console — Screen Specification

# مواصفات شاشة وحدة التطوير

## Overview

Interactive REPL playground for testing frappe_visual components with live
preview, code snippets, and bundle loader.

## Route

`/app/fv-developer-console`

## Scenarios Served

DS-001 (Developer), DS-003 (Developer), WS-002 (Developer)

## frappe_visual Components Used

- `frappe.visual.engine()` — GraphEngine for live graph rendering
- `frappe.visual.icons.render()` — icon previews
- Code editor (Monaco-style textarea with syntax highlighting)
- Output panel with JSON pretty-print

## CSS Effects (minimum 3)

- `.fv-fx-glass` — glassmorphism on code editor panel
- `.fv-fx-hover-shine` — shine sweep on action buttons
- `.fv-fx-page-enter` — entrance animation for panels

## Layout

| Breakpoint | Behavior                                |
| ---------- | --------------------------------------- |
| Mobile     | Not supported (requires keyboard input) |
| Tablet     | Single column, tabs for code/output     |
| Desktop    | Split pane: code left, preview right    |
| Large      | Split pane with wider preview area      |

## Dark Mode

Dark theme default with light toggle. Monaco editor theme adapts.

## RTL Support

Code always LTR. UI labels use CSS Logical Properties.

## GSAP Animation

Panel slide-in from sides. Output fade-in on execution.
