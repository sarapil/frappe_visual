# Frappe Visual — DocTypes Reference

## Frappe Visual Settings

**Type**: Single (one instance per site)
**Module**: Frappe Visual
**Path**: `frappe_visual/frappe_visual/doctype/frappe_visual_settings/`

### Fields

| Fieldname | Type | Label | Options | Default | Description |
|-----------|------|-------|---------|---------|-------------|
| `license_section` | Section Break | License | | | License management section |
| `license_key` | Password | License Key | | | Premium license key (XXXX-XXXX-XXXX-HASH) |
| `license_status` | Data | License Status | | | Read-only, computed status |
| `license_info` | HTML | License Info | | | Rendered HTML with tier badge |
| `display_section` | Section Break | Display Settings | | | Visual preferences |
| `default_layout` | Select | Default Layout | fcose\|breadthfirst\|elk-layered\|elk-tree\|elk-stress\|elk-radial\|circle\|grid\|concentric | fcose | Default graph layout |
| `enable_animations` | Check | Enable Animations | | 1 | Toggle GSAP animations |
| `enable_minimap` | Check | Enable Minimap | | 1 | Toggle minimap navigation |
| `auto_section` | Section Break | Auto Detection | | | Automatic feature detection |
| `enable_dark_auto` | Check | Auto Dark Mode | | 1 | Follow browser dark mode |
| `enable_rtl_auto` | Check | Auto RTL | | 1 | Follow site language direction |

### Permissions

| Role | Read | Write | Create | Submit |
|------|------|-------|--------|--------|
| System Manager | ✅ | ✅ | ✅ | ✅ |

### Controller Methods

- `validate()` — Calls `update_license_status()` to validate key and render HTML info panel

---

## Visual Hub (Page)

**Type**: Page (not a DocType)
**Route**: `/app/visual-hub`
**Path**: `frappe_visual/frappe_visual/page/visual_hub/`

### Files
- `visual_hub.json` — Page metadata
- `visual_hub.js` — Client-side logic (app selector, graph rendering)
- `visual_hub.py` — Server-side context (no custom logic)
