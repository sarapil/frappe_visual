# Frappe Visual — Training Curriculum

> Structured learning path for developers and administrators

---

## Module 1: Foundations (2 hours)

### Lesson 1.1: Introduction to Graph Visualization
- What are node-graph visualizations?
- Use cases in enterprise applications
- Cytoscape.js fundamentals
- Hands-on: Create a simple graph in CodePen

### Lesson 1.2: Frappe Visual Architecture
- Bootstrap loader vs main bundle
- Core modules overview (GraphEngine, ThemeManager, etc.)
- Data flow: API → DataAdapter → GraphEngine → Cytoscape
- Hands-on: Read the source code structure

### Lesson 1.3: Installation & Setup
- Prerequisites (Frappe v16, Node 18+)
- Install from Git
- Build assets
- Verify installation
- Hands-on: Install on a test site

---

## Module 2: Using Visual Hub (2 hours)

### Lesson 2.1: AppMap Navigation
- Selecting an app
- Understanding node types (30+ types explained)
- Understanding edge types (12 types)
- Zooming, panning, selecting
- Hands-on: Explore ERPNext structure

### Lesson 2.2: Layout Algorithms
- Force-directed (fcose) — when to use
- Breadthfirst — hierarchical data
- ELK layouts — enterprise-grade
- Hands-on: Switch layouts and compare

### Lesson 2.3: Features Tour
- Minimap navigation
- Search & filter
- Dark mode
- RTL support
- Export (SVG, PNG)
- Hands-on: Export an app map

---

## Module 3: Developer Integration (3 hours)

### Lesson 3.1: Embedding Components
- Loading the bundle with `frappe.require()`
- AppMap in custom pages
- RelationshipExplorer in dialogs
- Hands-on: Create a custom page with AppMap

### Lesson 3.2: Customization
- Custom node types
- Custom edge types
- Custom themes
- Custom layouts
- Hands-on: Create a domain-specific visualization

### Lesson 3.3: API Integration
- Server-side API endpoints
- Building custom data adapters
- Real-time updates with publish_realtime
- Hands-on: Build a custom API + visualization

---

## Module 4: Advanced Topics (2 hours)

### Lesson 4.1: Animation Engine
- GSAP integration
- Ant-line animations
- Pulse glow effects
- Layout transitions
- Hands-on: Add animations to a custom graph

### Lesson 4.2: Floating Windows & Storyboards
- Desktop-style floating panels
- Multi-step wizards
- Branching logic
- Hands-on: Build an onboarding wizard

### Lesson 4.3: MCP & AI Integration
- Model Context Protocol server
- Connecting to Claude Desktop
- AI-assisted data exploration
- Hands-on: Set up MCP server

---

## Assessment

### Practical Project
Build a custom Frappe page that:
1. Visualizes a specific business process using AppMap
2. Allows drill-down with RelationshipExplorer
3. Includes at least 2 custom node types
4. Supports dark mode
5. Includes a Storyboard wizard for user onboarding

### Grading Criteria
- Functionality: 40%
- Code quality: 25%
- UX/design: 20%
- Documentation: 15%
