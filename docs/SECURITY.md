# Frappe Visual — Security

## Security Model

Frappe Visual operates entirely within Frappe's security framework:

1. **Authentication**: All API endpoints require valid Frappe session
2. **Authorization**: DocType permissions enforced server-side
3. **Data Access**: Reads metadata only (DocType schema, not user data)
4. **No External Calls**: Zero network requests to third-party services
5. **No Telemetry**: No usage tracking unless explicitly enabled

## API Security

All server-side endpoints use `@frappe.whitelist()`:

```python
@frappe.whitelist()
def get_app_map(app_name):
    # Requires authenticated session
    # Returns DocType metadata only
```

## Data Handling

- **QueryBuilder only** — No raw SQL (v16 compliance)
- **Parameterized queries** — No SQL injection risk
- **Metadata access** — `frappe.get_meta()` respects permissions
- **License keys** — Stored as Password field (encrypted at rest)
- **Redis cache** — License status cached for 1 hour

## Client-Side Security

- **Canvas rendering** — Immune to XSS (Cytoscape uses HTML5 Canvas)
- **HTML labels** — Sanitized before rendering
- **No eval()** — No dynamic code execution
- **CSP compatible** — No inline scripts or styles
- **Bundle integrity** — All assets built at deploy time

## Vulnerability Reporting

Report security issues to: moatazsarapil@gmail.com

Please include:
1. Description of the vulnerability
2. Steps to reproduce
3. Impact assessment
4. Suggested fix (if available)

We will acknowledge within 48 hours and provide a fix within 7 days.
