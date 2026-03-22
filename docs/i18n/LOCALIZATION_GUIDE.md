# Frappe Visual — Localization Guide

## Overview

Frappe Visual supports full internationalization (i18n) through Frappe's built-in translation system. This guide covers how to translate UI strings, add new languages, and ensure proper locale handling.

---

## Translation Architecture

### How It Works
1. **Python strings**: Wrapped in `_("string")` — auto-extracted by `bench get-untranslated`
2. **JavaScript strings**: Wrapped in `__("string")` — extracted at build time
3. **DocType labels**: Translated via DocType JSON label fields
4. **CSV files**: Translations stored in `frappe_visual/translations/<lang>.csv`

### Supported Languages
- English (en) — default
- Arabic (ar) — primary RTL language

---

## Adding a New Translation

### Step 1: Extract Untranslated Strings
```bash
bench --site mysite get-untranslated ar \
    --app frappe_visual \
    > apps/frappe_visual/frappe_visual/translations/untranslated_ar.csv
```

### Step 2: Translate
Edit the CSV file:
```csv
source,translated
"App Map","خريطة التطبيق"
"Relationship Explorer","مستكشف العلاقات"
"Visual Hub","المركز المرئي"
```

### Step 3: Import Translations
```bash
bench --site mysite import-translations \
    apps/frappe_visual/frappe_visual/translations/ar.csv
```

### Step 4: Verify
```bash
bench --site mysite clear-cache
# Navigate to /app/visual-hub in Arabic locale
```

---

## JavaScript Translation Patterns

### Basic
```javascript
__("App Map")           // → "خريطة التطبيق"
__("Loading...")         // → "جاري التحميل..."
```

### With Variables
```javascript
__("Found {0} nodes", [count])    // → "تم العثور على 15 عقدة"
__("{0} of {1}", [current, total]) // → "3 من 10"
```

### Pluralization
```javascript
// Frappe doesn't have built-in pluralization
// Use conditional patterns:
count === 1 ? __("1 node") : __("{0} nodes", [count])
```

---

## Python Translation Patterns

```python
from frappe import _

# Basic
_("Visual Hub")

# With context
_("Map", context="navigation")

# In API responses
return {"message": _("Graph generated successfully")}
```

---

## RTL Considerations

See [RTL_STYLE_GUIDE.md](RTL_STYLE_GUIDE.md) for CSS-specific RTL patterns.

### Key Points
- Frappe Visual auto-detects RTL from Frappe's locale settings
- All CSS uses logical properties where possible
- Graph layouts are mirrored for RTL (ELK direction: RIGHT → LEFT)
- Minimap position flips for RTL
