# Frappe Visual — Context File

> Complete context for AI assistants and new developers

## App Identity

| Field | Value |
|-------|-------|
| Name | frappe_visual |
| Title | Frappe Visual |
| Version | 0.1.0 |
| Publisher | Arkan Lab |
| License | GPL-3.0 |
| Email | moatazsarapil@gmail.com |
| Website | arkan.it.com |
| Required Apps | frappe |
| Frappe Version | v16+ |

## What It Does

Frappe Visual is a graph-based UX framework that renders interactive node-graph visualizations of Frappe application structures and doctype relationships. It transforms data comprehension by replacing static tables with dynamic, explorable graphs.

## Tech Stack

- **Rendering**: Cytoscape.js (canvas-based graph)
- **Layouts**: ELK.js (enterprise algorithms) + fcose (force-directed)
- **Animations**: GSAP (ant-lines, pulse, transitions)
- **Animations (Lottie)**: lottie-web (JSON-based vector animations)
- **Tooltips**: Tippy.js
- **Styling**: SCSS with CSS custom properties, dark mode, RTL

## File Structure (Key Files)

```
frappe_visual/
├── __init__.py                          # __version__ = "0.1.0"
├── api.py                               # 4 whitelisted endpoints
├── hooks.py                             # App configuration
├── modules.txt                          # "Frappe Visual"
├── utils/
│   ├── license.py                       # LicenseValidator
│   └── feature_flags.py                 # Feature gating
├── frappe_visual/
│   ├── doctype/
│   │   └── frappe_visual_settings/      # Settings DocType
│   └── page/
│       └── visual_hub/                  # Main page
└── public/
    ├── js/
    │   ├── fv_bootstrap.js              # 2KB global loader
    │   └── frappe_visual/
    │       ├── core/                    # 7 modules
    │       ├── components/              # 6 components
    │       └── utils/                   # 3 utilities
    └── scss/                            # 6 SCSS partials
```

## API Endpoints

1. `frappe_visual.api.get_app_map` — Full app structure graph
2. `frappe_visual.api.get_doctype_relationships` — DocType link graph
3. `frappe_visual.api.get_workspace_map` — Workspace page graph
4. `frappe_visual.api.get_quick_stats` — App statistics

## Business Model

Open Core: Free community tier (9 features) + Premium paid tier (14 features).
Auto-detects Frappe Cloud for seamless premium activation.

## Key Design Decisions

1. **Two-tier loading**: Bootstrap (2KB global) + bundle (~400KB lazy) for performance
2. **Canvas rendering**: Cytoscape.js uses HTML5 Canvas, not SVG DOM — scales to thousands of nodes
3. **ELK in Web Worker**: Heavy layout computation runs client-side in a web worker
4. **CSS Custom Properties**: 40+ CSS variables for theming, zero JavaScript theme repaints
5. **No external runtime deps**: All JS bundled, no CDN calls, no telemetry
