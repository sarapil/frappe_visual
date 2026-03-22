# Changelog

All notable changes to Frappe Visual will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-01

### Added
- **App Map** — Interactive visualization of any Frappe app's structure
- **Relationship Explorer** — DocType relationship graphs with depth 1-3
- **Visual Dashboard** — Card-based stat widgets
- **Storyboard Wizard** — Multi-step animated wizards
- **Floating Windows** — Desktop-style draggable detail panels
- **Graph Engine** — Cytoscape.js wrapper with 30+ node types and 12 edge types
- **Layout Manager** — 9 layout algorithms (fcose, breadthfirst, ELK variants, circle, grid, concentric)
- **Theme Manager** — Dark mode with auto-detection, 40+ CSS variables
- **Animation Engine** — GSAP-powered ant-lines, pulse, stagger effects
- **Color System** — Semantic color palette for all DocType categories
- **Minimap** — Navigation overview using cytoscape-navigator
- **Context Menu** — Radial right-click menu (via cytoscape-cxtmenu)
- **SVG & PNG Export** — High-resolution graph export
- **RTL Support** — Full Arabic/Hebrew right-to-left layout
- **Search & Filter** — Full-text node search with type filtering
- **Visual Hub Page** — Main page at `/app/visual-hub`
- **Frappe Visual Settings** — DocType for license, layout, and feature configuration
- **License System** — Open Core model with free/premium tiers
- **Feature Gating** — 9 free + 14 premium feature flags
- **Frappe Cloud Detection** — Auto-enable premium on Frappe Cloud
- **API Endpoints** — `get_app_map`, `get_doctype_relationships`, `get_workspace_map`, `get_quick_stats`
- **Arabic Translations** — Complete ar.csv translation file
- **Help Content** — Bilingual help (en/ar) with index, getting started, FAQ
- **CI/CD** — GitHub Actions for tests, linting, releases
- **Documentation** — 50+ docs covering architecture, API, business, training, security, i18n, ops

### Security
- All APIs use `@frappe.whitelist()` — no public endpoints
- QueryBuilder only — zero raw SQL
- License keys stored as Password field (encrypted at rest)
- No external network requests or telemetry
