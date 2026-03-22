# Frappe Visual — Audit Log Specification

## Overview

Frappe Visual leverages Frappe's built-in audit logging. This document specifies what events are logged and how to monitor them.

---

## Logged Events

### Settings Changes
All changes to `Frappe Visual Settings` doctype are tracked by Frappe's Version system:
- License key updates
- Default layout changes
- Feature toggles (animations, minimap, dark auto, RTL auto)

**Query**:
```python
frappe.get_all("Version",
    filters={"ref_doctype": "Frappe Visual Settings"},
    fields=["owner", "creation", "data"],
    order_by="creation desc"
)
```

### API Access
All whitelisted API calls are logged in Frappe's request log when enabled:
- `frappe_visual.api.get_app_map`
- `frappe_visual.api.get_doctype_relationships`
- `frappe_visual.api.get_workspace_map`
- `frappe_visual.api.get_quick_stats`

**Enable**:
```python
# In site_config.json
{ "enable_frappe_logger": 1 }
```

### License Validation
License validation events are logged:
- Key validation attempts (success/failure)
- Frappe Cloud detection results
- Cache hits/misses

**Log location**: `frappe.logger("frappe_visual")`

---

## Log Format

```json
{
    "timestamp": "2024-01-15T10:30:00Z",
    "event": "license_validation",
    "user": "administrator@example.com",
    "result": "valid",
    "tier": "professional",
    "source": "cache",
    "details": {
        "key_prefix": "XXXX",
        "validation_time_ms": 2
    }
}
```

---

## Monitoring Recommendations

### Key Metrics to Track
1. **API call frequency** — per endpoint, per user
2. **License validation failures** — potential piracy attempts
3. **Settings changes** — audit trail for compliance
4. **Error rates** — API failures, rendering errors

### Alert Thresholds
- License validation failures > 10/hour → alert
- API errors > 5% of total calls → alert
- Settings changed by non-admin → alert

### Integration
- Frappe's built-in Error Log
- Sentry (if configured in Frappe)
- Custom webhook via `frappe.publish_realtime`
