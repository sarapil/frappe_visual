# BRAND.md — Frappe Visual Identity Guide

## Brand Overview

| Attribute         | Value                                       |
|-------------------|---------------------------------------------|
| **App Name**      | Frappe Visual                               |
| **Tagline (EN)**  | Graph-based Visual UX Framework for Frappe  |
| **Tagline (AR)**  | إطار عمل مرئي قائم على الرسوم البيانية لـ Frappe |
| **Organization**  | Arkan Lab                                   |
| **Prefix**        | FV                                          |
| **License**       | GPL-3.0                                     |
| **Domain**        | Visual UI Framework                         |
| **Version**       | 0.1.0                                       |

---

## Color Palette

### Primary Colors

| Token                  | Value     | Usage                               |
|------------------------|-----------|-------------------------------------|
| `--fv-primary`         | `#6366F1` | Main brand indigo, buttons, links   |
| `--fv-primary-light`   | `#818CF8` | Hover states, secondary accents     |
| `--fv-primary-lighter` | `#A78BFA` | Backgrounds, highlights             |
| `--fv-primary-dark`    | `#4F46E5` | Active states, pressed buttons      |
| `--fv-primary-darker`  | `#4338CA` | Deep accents, dark mode primary     |
| `--fv-accent`          | `#C084FC` | Special highlights, notifications   |

### Semantic Colors

| Token                | Value     | Usage                    |
|----------------------|-----------|--------------------------|
| `--fv-success`       | `#10B981` | Success indicators       |
| `--fv-warning`       | `#F59E0B` | Warning badges           |
| `--fv-danger`        | `#EF4444` | Error states, deletions  |
| `--fv-info`          | `#3B82F6` | Informational elements   |
| `--fv-text-primary`  | `#1E1B4B` | Headings, body text      |
| `--fv-text-muted`    | `#94A3B8` | Captions, help text      |
| `--fv-bg-surface`    | `#FFFFFF` | Card backgrounds         |
| `--fv-bg-subtle`     | `#EEF2FF` | Section backgrounds      |

### Gradient Definitions

```css
/* Primary gradient (diagonal) */
--fv-gradient-main: linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A78BFA 100%);

/* Accent gradient (reverse diagonal) */
--fv-gradient-accent: linear-gradient(315deg, #818CF8 0%, #C084FC 100%);

/* Glass effect */
--fv-glass: rgba(99, 102, 241, 0.08);
--fv-glass-border: rgba(99, 102, 241, 0.15);
```

---

## Logo Variants

All logos located in `frappe_visual/public/images/`:

| Variant        | File                              | Size     | Animation | Usage                     |
|----------------|-----------------------------------|----------|-----------|---------------------------|
| **Main Logo**  | `frappe_visual-logo.svg`          | 512×512  | ✅ SMIL   | Documentation, hero areas |
| **Topbar**     | `frappe_visual-topbar.svg`        | 28×28    | ❌        | Navbar brand icon         |
| **Favicon**    | `favicon.svg`                     | 32×32    | ❌        | Browser tab icon          |
| **Splash**     | `frappe_visual-splash.svg`        | 256×256  | ✅ SMIL   | Loading/splash screen     |
| **Login**      | `frappe_visual-login.svg`         | 320×120  | ✅ Subtle | Login page header         |
| **Email**      | `frappe_visual-email.svg`         | 200×60   | ❌        | Email signatures          |
| **Print**      | `frappe_visual-print.svg`         | 150×50   | ❌        | Print headers/footers     |
| **Icon Solid** | `desktop_icons/frappe_visual-solid.svg`  | 54×54  | ❌  | Workspace card (active)   |
| **Icon Subtle**| `desktop_icons/frappe_visual-subtle.svg` | 54×54  | ❌  | Workspace card (default)  |

### Logo Design Concept

The logo represents **visual graph intelligence**:
- **Central hexagon** = The graph engine (core of frappe_visual)
- **Eye symbol** = Visual perception / data visualization
- **4 satellite nodes** = DocType categories: Module, Transaction, Master, Settings
- **Animated edges** = Data flow, relationships, dependencies
- **Dashed orbit** = The ecosystem of connected visual components
- **Breathing glow** = Living, real-time system

---

## Typography

| Context     | Font Stack                                    | Weight | Size Range |
|-------------|-----------------------------------------------|--------|------------|
| Headings    | `system-ui, -apple-system, Segoe UI, sans-serif` | 700  | 20–36px    |
| Body        | `system-ui, -apple-system, Segoe UI, sans-serif` | 400  | 13–16px    |
| Code        | `JetBrains Mono, Fira Code, monospace`        | 400    | 12–14px    |
| Arabic      | `Noto Sans Arabic, Almarai, system-ui`        | 400–700| 14–36px    |

---

## Icon System

Frappe Visual uses **Tabler Icons v3.30.0** via CDN webfont:
- `frappe.visual.icons.render("icon-name", options)` — Render an icon
- `frappe.visual.icons.forDocType("Sales Order")` — Smart DocType icon mapping
- `frappe.visual.icons.statusBadge("Active")` — Status badge with icon
- `frappe.visual.icons.pick(callback)` — Interactive icon picker dialog
- **3000+ icons** available, outline style default

---

## Premium Visual Effects

Every frappe_visual screen MUST include at minimum 3 of:
1. GSAP stagger entrance animations
2. Glassmorphism cards with blur + transparency
3. Gradient text or headings
4. Animated SVG backgrounds / decorations
5. Micro-interactions on hover / click
6. Parallax or depth effects
7. Smooth page transitions

---

## RTL & i18n Guidelines

- All visual components support `dir="rtl"` and `dir="ltr"` automatically
- Sidebar positioning flips in RTL mode
- FloatingWindow opens opposite to sidebar (right in LTR, left in RTL)
- Arabic text uses `Noto Sans Arabic` with appropriate line-height (1.8)
- Numbers in Arabic UI remain LTR (phone numbers, dates, amounts)

---

## File Naming Convention

```
frappe_visual/public/images/
├── frappe_visual-logo.svg          # Main animated logo
├── frappe_visual-topbar.svg        # Navbar logo
├── frappe_visual-splash.svg        # Splash/loading screen
├── frappe_visual-login.svg         # Login page logo
├── frappe_visual-email.svg         # Email signature
├── frappe_visual-print.svg         # Print format logo
├── favicon.svg                     # Browser favicon
└── desktop_icons/
    ├── frappe_visual-solid.svg     # Workspace icon (active/filled)
    └── frappe_visual-subtle.svg    # Workspace icon (default/outline)
```
