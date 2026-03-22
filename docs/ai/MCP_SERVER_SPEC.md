# Frappe Visual — MCP Server Specification

> Model Context Protocol server for AI assistant integration

## Overview

This document defines the MCP (Model Context Protocol) server interface for Frappe Visual, enabling AI assistants like Claude Desktop to interact with application structure data.

## Server Configuration

```json
{
  "name": "frappe-visual-mcp",
  "version": "1.0.0",
  "description": "Graph-based UX framework for Frappe — explore app structures via AI",
  "transport": "sse",
  "endpoint": "/api/method/frappe_visual.mcp.server"
}
```

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "frappe_visual": {
      "command": "curl",
      "args": [
        "-N",
        "-H", "Authorization: token YOUR_API_KEY:YOUR_API_SECRET",
        "https://YOUR_SITE/api/method/frappe_visual.mcp.sse"
      ]
    }
  }
}
```

## Available Tools

### Tool: get_app_structure
Get the full module/doctype/relationship structure of a Frappe application.

```typescript
interface GetAppStructureInput {
  app_name: string;        // e.g., "erpnext"
}
// Returns: { nodes: Node[], edges: Edge[] }
```

### Tool: get_doctype_graph
Get all relationships from a DocType with configurable depth.

```typescript
interface GetDoctypeGraphInput {
  doctype: string;         // e.g., "Sales Invoice"
  depth?: number;          // 1-5, default: 2
}
// Returns: { nodes: Node[], edges: Edge[] }
```

### Tool: search_doctypes
Search for DocTypes across all installed apps.

```typescript
interface SearchDoctypesInput {
  query: string;           // Search term
  app_name?: string;       // Filter by app
  type?: string;           // "master" | "transaction" | "settings" | "child-table"
}
```

### Tool: get_app_stats
Get quick statistics for an application or the entire site.

```typescript
interface GetAppStatsInput {
  app_name?: string;
}
// Returns: { modules: number, doctypes: number, reports: number, ... }
```

## Resources

### Resource: installed_apps
List all installed Frappe applications.

### Resource: node_types
All 30+ semantic node types with their colors and icons.

### Resource: layout_algorithms
Available layout algorithms and their best use cases.

## Authentication

All requests require API authentication:
```
Authorization: token {api_key}:{api_secret}
```

Generate keys in: **Settings → My Settings → API Access**

## Rate Limits

- Free Tier: 100 requests/hour
- Premium: 10,000 requests/hour

## Error Handling

```json
{
  "error": true,
  "message": "Error description",
  "exc_type": "ValidationError"
}
```
