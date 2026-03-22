# Frappe Visual — RTL Style Guide

## Overview

Frappe Visual provides full RTL (Right-to-Left) support for Arabic, Hebrew, and other RTL languages. RTL mode is auto-detected from the Frappe locale.

---

## Auto-Detection

The ThemeManager module detects RTL automatically:

```javascript
// From theme_manager.js
_detectRTL() {
    const html = document.documentElement;
    const dir = html.getAttribute("dir") || 
                getComputedStyle(html).direction;
    return dir === "rtl";
}
```

---

## CSS Patterns

### Use Logical Properties

```scss
// ✅ Good — works in both LTR and RTL
.fv-panel {
    padding-inline-start: 1rem;
    padding-inline-end: 0.5rem;
    margin-inline-start: auto;
    border-inline-start: 2px solid var(--fv-primary);
}

// ❌ Bad — breaks in RTL
.fv-panel {
    padding-left: 1rem;
    padding-right: 0.5rem;
    margin-left: auto;
    border-left: 2px solid var(--fv-primary);
}
```

### Logical Property Mapping

| Physical (avoid) | Logical (use) |
|---|---|
| `left` | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |
| `float: left` | `float: inline-start` |

### RTL-Specific Overrides

```scss
// In _rtl.scss
[dir="rtl"] {
    .fv-toolbar {
        flex-direction: row-reverse;
    }
    
    .fv-minimap {
        // Flip minimap to left side
        inset-inline-start: 1rem;
        inset-inline-end: auto;
    }
    
    .fv-context-menu {
        // Mirror context menu
        transform-origin: top right;
    }
}
```

---

## Graph Layout RTL

### ELK Layout Direction

```javascript
// For RTL, reverse the ELK layout direction
const elkOptions = {
    "elk.direction": isRTL ? "LEFT" : "RIGHT",
    "elk.alignment": isRTL ? "RIGHT" : "LEFT"
};
```

### Force Layout
Force-directed layouts (fcose) are direction-agnostic — no changes needed.

### Breadthfirst Layout
```javascript
// Reverse for RTL
const layoutOptions = {
    name: "breadthfirst",
    directed: true,
    // Cytoscape doesn't have native RTL, so we transform after layout
};

// Post-layout RTL transform
if (isRTL) {
    cy.nodes().forEach(node => {
        const pos = node.position();
        const maxX = cy.width();
        node.position({ x: maxX - pos.x, y: pos.y });
    });
}
```

---

## Icon Mirroring

Some icons need to be mirrored in RTL:

```scss
[dir="rtl"] {
    // Mirror directional icons
    .fv-icon-arrow,
    .fv-icon-expand,
    .fv-icon-chevron {
        transform: scaleX(-1);
    }
    
    // DON'T mirror non-directional icons
    // .fv-icon-search — symmetrical
    // .fv-icon-settings — symmetrical
}
```

---

## Testing Checklist

- [ ] Toolbar buttons are reversed
- [ ] Minimap is on the correct side
- [ ] Context menu appears correctly
- [ ] Floating windows drag correctly
- [ ] Search input aligns to the right
- [ ] Layout labels are readable
- [ ] Hierarchical layouts flow right-to-left
- [ ] Export renders correctly
- [ ] Storyboard wizard steps flow RTL
- [ ] Animations play in correct direction
