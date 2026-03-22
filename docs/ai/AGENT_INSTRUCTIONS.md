# Frappe Visual — AI Agent Building Guide

> How to build AI agents that interact with Frappe Visual

## Overview

Frappe Visual exposes structured graph data about Frappe application architecture. AI agents can use this data to:

1. **Analyze** — Understand app structure, relationships, dependencies
2. **Visualize** — Generate visual representations programmatically
3. **Advise** — Suggest schema improvements, find circular dependencies
4. **Document** — Auto-generate documentation from structure data

## Agent Architecture

```
User Query → AI Agent → Frappe Visual API → Graph Data → AI Processing → Response
```

## Step 1: Authentication

```python
import requests

BASE_URL = "https://your-site.frappe.cloud"
HEADERS = {
    "Authorization": "token api_key:api_secret",
    "Content-Type": "application/json"
}
```

## Step 2: Fetch App Structure

```python
def get_app_structure(app_name):
    response = requests.get(
        f"{BASE_URL}/api/method/frappe_visual.api.get_app_map",
        params={"app_name": app_name},
        headers=HEADERS
    )
    return response.json()["message"]

# Returns: { nodes: [...], edges: [...] }
```

## Step 3: Process Graph Data

```python
def analyze_relationships(data):
    nodes = {n["id"]: n for n in data["nodes"]}
    edges = data["edges"]

    # Find most-connected doctypes
    connections = {}
    for edge in edges:
        src = edge["source"]
        connections[src] = connections.get(src, 0) + 1

    # Sort by connection count
    sorted_nodes = sorted(connections.items(), key=lambda x: -x[1])
    return sorted_nodes[:10]  # Top 10 most connected
```

## Step 4: Generate Insights

```python
def generate_report(app_name):
    data = get_app_structure(app_name)
    top_connected = analyze_relationships(data)

    report = f"## {app_name} Structure Analysis\n\n"
    report += f"- **Modules**: {sum(1 for n in data['nodes'] if n['type'] == 'module')}\n"
    report += f"- **DocTypes**: {sum(1 for n in data['nodes'] if n['type'] != 'module')}\n"
    report += f"- **Relationships**: {len(data['edges'])}\n\n"
    report += "### Most Connected DocTypes\n"
    for node_id, count in top_connected:
        report += f"- {node_id}: {count} connections\n"

    return report
```

## Available Endpoints for Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `frappe_visual.api.get_app_map` | GET | Full app structure |
| `frappe_visual.api.get_doctype_relationships` | GET | DocType relationships |
| `frappe_visual.api.get_workspace_map` | GET | Workspace structure |
| `frappe_visual.api.get_quick_stats` | GET | Quick statistics |
| `frappe_visual.utils.feature_flags.check_feature` | GET | Feature availability |

## Response Schema

### Node
```json
{
  "id": "doctype:Sales Invoice",
  "label": "Sales Invoice",
  "type": "transaction",
  "module": "Accounts",
  "parent": "module:Accounts",
  "doctype": "Sales Invoice"
}
```

### Edge
```json
{
  "id": "e:doctype:Sales Invoice-doctype:Customer",
  "source": "doctype:Sales Invoice",
  "target": "doctype:Customer",
  "type": "link",
  "label": "customer"
}
```

## Best Practices

1. **Cache responses** — App structure doesn't change frequently
2. **Use depth limits** — Set `depth=2` to avoid overwhelming data
3. **Filter by type** — Use node type to focus on relevant data
4. **Handle errors** — Always check for error responses
5. **Respect rate limits** — Free tier: 100 req/hour
