# Frappe Visual — API Documentation

## REST API Endpoints

All endpoints require authentication. Use `frappe.call()` client-side or standard REST with API keys.

---

### `get_app_map`

**Endpoint**: `POST /api/method/frappe_visual.api.get_app_map`

**Description**: Returns the complete structure of a Frappe app as graph-ready nodes and edges.

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app_name` | string | Yes | The Frappe app name (e.g., "erpnext") |

**Response**:
```json
{
    "message": {
        "nodes": [
            {
                "data": {
                    "id": "Sales Invoice",
                    "label": "Sales Invoice",
                    "module": "Accounts",
                    "type": "transaction",
                    "parent": "module_Accounts",
                    "is_submittable": 1,
                    "is_tree": 0,
                    "is_single": 0,
                    "is_virtual": 0,
                    "is_child": 0,
                    "track_changes": 1,
                    "custom": 0
                }
            }
        ],
        "edges": [
            {
                "data": {
                    "source": "Sales Invoice",
                    "target": "Customer",
                    "type": "Link",
                    "fieldname": "customer",
                    "label": "customer"
                }
            }
        ],
        "modules": ["Accounts", "Stock", "Selling"]
    }
}
```

**Node Types**: `transaction`, `master`, `setup`, `report`, `child_table`, `controller`, `tool`, `log`, `queue`, `singleton`, `tree`, `amendment`, `custom`

---

### `get_doctype_relationships`

**Endpoint**: `POST /api/method/frappe_visual.api.get_doctype_relationships`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doctype` | string | Yes | DocType name |
| `depth` | int | No | Relationship depth (default: 1, max: 3) |

**Response**:
```json
{
    "message": {
        "nodes": [...],
        "edges": [...],
        "center": "Sales Invoice"
    }
}
```

---

### `get_workspace_map`

**Endpoint**: `POST /api/method/frappe_visual.api.get_workspace_map`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace` | string | Yes | Workspace name |

**Response**: Graph data for all doctypes referenced in the workspace.

---

### `get_quick_stats`

**Endpoint**: `POST /api/method/frappe_visual.api.get_quick_stats`

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app_name` | string | Yes | App name |

**Response**:
```json
{
    "message": {
        "total_doctypes": 150,
        "total_modules": 12,
        "submittable": 25,
        "single": 10,
        "child_tables": 80,
        "tree": 5,
        "virtual": 3
    }
}
```

---

## License API

### `get_license_status`

**Endpoint**: `POST /api/method/frappe_visual.utils.license.get_license_status`

**Response**:
```json
{
    "message": {
        "is_premium": true,
        "tier": "professional",
        "source": "frappe_cloud"
    }
}
```

### `get_enabled_features`

**Endpoint**: `POST /api/method/frappe_visual.utils.feature_flags.get_enabled_features`

**Response**:
```json
{
    "message": {
        "app_map_basic": {"enabled": true, "tier": "free"},
        "advanced_layouts": {"enabled": true, "tier": "premium"},
        ...
    }
}
```

---

## JavaScript Client API

### `frappe.visual.appMap(container, appName, options)`
Renders an app map in the given container.

### `frappe.visual.relationshipExplorer(container, doctype, options)`
Renders a relationship explorer for the given doctype.

### `frappe.visual.themeManager`
Access theme management (setTheme, getCSSVars, on events).

### `frappe.visual.colorSystem`
Access the color system (getNodeColor, getEdgeColor, registerNodeType).
