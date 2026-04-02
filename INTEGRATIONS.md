# 🔗 Frappe Visual — Integrations Guide

> **Domain:** Visual Graph & UI Component Library
> **Prefix:** FV

---

## Integration Map

```
Frappe Visual
  ├── Cytoscape.js
  ├── ELK.js
  ├── GSAP
  ├── Lottie-web
  ├── Tabler Icons
```

---

## Cytoscape.js

### Connection Type
- **Direction:** Bidirectional
- **Protocol:** Python API / REST
- **Authentication:** Frappe session / API key

### Data Flow
| Source | Target | Trigger | Data |
|--------|--------|---------|------|
| Frappe Visual | Cytoscape.js | On submit | Document data |
| Cytoscape.js | Frappe Visual | On change | Updated data |

### Configuration
```python
# In FV Settings or site_config.json
# cytoscape.js_enabled = 1
```

---

## ELK.js

### Connection Type
- **Direction:** Bidirectional
- **Protocol:** Python API / REST
- **Authentication:** Frappe session / API key

### Data Flow
| Source | Target | Trigger | Data |
|--------|--------|---------|------|
| Frappe Visual | ELK.js | On submit | Document data |
| ELK.js | Frappe Visual | On change | Updated data |

### Configuration
```python
# In FV Settings or site_config.json
# elk.js_enabled = 1
```

---

## GSAP

### Connection Type
- **Direction:** Bidirectional
- **Protocol:** Python API / REST
- **Authentication:** Frappe session / API key

### Data Flow
| Source | Target | Trigger | Data |
|--------|--------|---------|------|
| Frappe Visual | GSAP | On submit | Document data |
| GSAP | Frappe Visual | On change | Updated data |

### Configuration
```python
# In FV Settings or site_config.json
# gsap_enabled = 1
```

---

## Lottie-web

### Connection Type
- **Direction:** Bidirectional
- **Protocol:** Python API / REST
- **Authentication:** Frappe session / API key

### Data Flow
| Source | Target | Trigger | Data |
|--------|--------|---------|------|
| Frappe Visual | Lottie-web | On submit | Document data |
| Lottie-web | Frappe Visual | On change | Updated data |

### Configuration
```python
# In FV Settings or site_config.json
# lottie-web_enabled = 1
```

---

## Tabler Icons

### Connection Type
- **Direction:** Bidirectional
- **Protocol:** Python API / REST
- **Authentication:** Frappe session / API key

### Data Flow
| Source | Target | Trigger | Data |
|--------|--------|---------|------|
| Frappe Visual | Tabler Icons | On submit | Document data |
| Tabler Icons | Frappe Visual | On change | Updated data |

### Configuration
```python
# In FV Settings or site_config.json
# tabler_icons_enabled = 1
```

---

## API Endpoints

All integration APIs use the standard response format from `frappe_visual.api.response`:

```python
from frappe_visual.api.response import success, error

@frappe.whitelist()
def sync_data():
    return success(data={}, message="Sync completed")
```

---

*Part of Frappe Visual by Arkan Lab*
