# Frappe Visual — Integrations

## Frappe Core Integration

Frappe Visual integrates deeply with Frappe v16:

| Integration Point | How |
|-------------------|-----|
| DocType Metadata | `frappe.get_meta()` for schema info |
| Permissions | Frappe's role-based access control |
| Authentication | Frappe session management |
| Caching | Frappe Redis cache |
| Translation | Frappe i18n (`_()` / `__()`) |
| Theme | Follows Frappe's dark mode setting |
| Routing | Frappe's page routing system |
| Assets | Frappe's build pipeline (esbuild) |

## ERPNext Integration

When ERPNext is installed, Frappe Visual can visualize:
- All ERPNext modules (Accounts, Stock, Selling, Buying, etc.)
- 150+ DocTypes with color-coded classifications
- Complex relationship chains (Sales Invoice → Customer → Address)
- Submittable document workflows

## HRMS Integration

When HRMS is installed:
- Employee hierarchy visualization
- Leave type relationships
- Payroll structure graph

## Other Frappe Apps

Frappe Visual works with **any** Frappe app:
- LMS — Course/lesson structure
- Gameplan — Project/task relationships
- Builder — Page/component hierarchy
- Wiki — Article link graph
- Custom apps — Auto-detected

## AI Integration (MCP)

### Claude Desktop
```json
{
    "mcpServers": {
        "frappe-visual": {
            "command": "node",
            "args": ["mcp-server.js"],
            "env": {
                "FRAPPE_URL": "https://mysite.com",
                "FRAPPE_API_KEY": "key",
                "FRAPPE_API_SECRET": "secret"
            }
        }
    }
}
```

### OpenAI Function Calling
See [docs/ai/FUNCTION_CALLING.json](ai/FUNCTION_CALLING.json) for complete function schemas.

## Export Integration

### SVG → Figma/Illustrator
Export as SVG and import into design tools for presentation polish.

### PNG → Documentation
Export as PNG at 2x/3x resolution for high-quality documentation images.
