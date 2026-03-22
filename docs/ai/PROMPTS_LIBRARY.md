# Frappe Visual — AI Prompts Library

> Ready-to-use prompts for users working with AI assistants and Frappe Visual

---

## For Developers

### Create a Visual Component
```
I'm building a Frappe Visual component that displays [DESCRIPTION].
Using the frappe_visual framework (Cytoscape.js + GSAP), create:

1. A component class that extends the framework patterns
2. Uses DataAdapter for API calls
3. Uses ColorSystem for semantic colors
4. Supports dark mode + RTL
5. Includes destroy() cleanup

Reference: frappe_visual/public/js/components/app_map.js
```

### Add Custom Node Types
```
Register custom node types for my Frappe app [APP_NAME]:

Node types needed:
- [TYPE_1]: [DESCRIPTION] (color: [COLOR])
- [TYPE_2]: [DESCRIPTION] (color: [COLOR])

Use ColorSystem.registerNodeType() and follow the palette system.
Include edge types for relationships between these nodes.
```

### Create a Visual Dashboard
```
Create a Frappe Visual dashboard for [DOCTYPE_NAME] that shows:
- Summary cards with counts
- A relationship graph
- Status distribution
- Recent activity timeline

Use VisualDashboard component with SummaryBadge widgets.
Follow dark mode + RTL patterns.
```

### Build a Storyboard Wizard
```
Create a multi-step Storyboard wizard for [PROCESS]:

Steps:
1. [STEP_1_DESCRIPTION]
2. [STEP_2_DESCRIPTION] — with branching choices
3. [STEP_3_DESCRIPTION]
4. Summary + confirmation

Use frappe.visual.storyboard() API with GSAP transitions.
Include validation at each step.
```

---

## For System Integrators

### App Structure Analysis
```
Using Frappe Visual's AppMap, analyze the structure of [APP_NAME]:

1. Generate the app map visualization
2. Identify all modules and their doctypes
3. Map relationships between doctypes
4. Highlight potential circular dependencies
5. Suggest optimization opportunities

API: frappe_visual.api.get_app_map
```

### DocType Relationship Audit
```
Using Frappe Visual's RelationshipExplorer, audit [DOCTYPE]:

1. Map all link fields (depth: 3)
2. Identify child tables
3. Find orphaned references
4. Suggest data model improvements

API: frappe_visual.api.get_doctype_relationships
```

---

## For End Users

### Understanding App Structure
```
I'm using [APP_NAME] on Frappe. Explain:
- What modules does it have?
- How do the doctypes relate to each other?
- What's the data flow for [PROCESS]?

Use simple language and suggest I view it in Visual Hub
(navigate to /app/visual-hub).
```

### Troubleshooting Visualizations
```
My Frappe Visual graph is [ISSUE_DESCRIPTION].

Environment:
- Browser: [BROWSER]
- Dark mode: [YES/NO]
- RTL: [YES/NO]
- Screen size: [SIZE]

Help me diagnose and fix the issue.
```

---

## For AI Agent Builders

### MCP Server Integration
```
Build an AI agent that uses Frappe Visual's MCP server to:
1. Query app structure
2. Visualize doctype relationships
3. Generate architecture diagrams
4. Suggest schema optimizations

Use the MCP endpoints defined in MCP_SERVER_SPEC.md.
Authentication: token {api_key}:{api_secret}
```

### Function Calling Setup
```
Configure [AI_PLATFORM] function calling with Frappe Visual:
1. Load schemas from FUNCTION_CALLING.json
2. Map to Frappe Visual API endpoints
3. Handle authentication
4. Process graph data responses

Base URL: /api/method/frappe_visual.api
```
