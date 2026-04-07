# Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
# Developer Website: https://arkan.it.com
# License: GPL-3.0
# For license information, please see license.txt

"""
Frappe Visual — Component Browser API
Serves the complete 287-component catalog with metadata, demo configs,
code examples, and API references for the Component Browser page.
"""

import frappe
from frappe import _


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Component Catalog — Full Registry
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPONENT_CATALOG = [
    # ── Tier 1: Core Engine ────────────────────────────────────────
    {
        "tier": 1, "category": "Core Engine",
        "components": [
            {
                "id": "engine", "name": "Graph Engine", "icon": "ti ti-vector-triangle",
                "ai_name": "frappe.visual.engine()",
                "description": "Core graph rendering engine powered by Cytoscape.js + ELK.js. Foundation for all relationship visualizations.",
                "description_ar": "محرك الرسم البياني الأساسي المدعوم بـ Cytoscape.js و ELK.js. الأساس لجميع عروض العلاقات.",
                "scenarios": [
                    "Render DocType relationship diagrams",
                    "Build interactive node-edge graphs",
                    "Entity Relationship Diagrams (ERD)",
                ],
                "code": "const engine = await frappe.visual.engine();\n// Returns the GraphEngine class for advanced usage",
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target DOM element or CSS selector"},
                        {"name": "opts.layout", "type": "string", "desc": "ELK layout algorithm: layered|force|stress|mrtree|box|fixed|random|disco|spore", "default": "'layered'"},
                        {"name": "opts.theme", "type": "string", "desc": "Color theme: light|dark|auto", "default": "'auto'"},
                        {"name": "opts.directed", "type": "boolean", "desc": "Whether edges have direction arrows", "default": "true"},
                    ],
                    "methods": [
                        {"name": "addNode(data)", "desc": "Add a node to the graph"},
                        {"name": "addEdge(source, target, data)", "desc": "Add an edge between two nodes"},
                        {"name": "fit()", "desc": "Fit the viewport to show all elements"},
                        {"name": "destroy()", "desc": "Clean up and remove the graph"},
                    ],
                    "events": [
                        {"name": "node:click", "desc": "Fired when a node is clicked"},
                        {"name": "edge:click", "desc": "Fired when an edge is clicked"},
                        {"name": "layout:done", "desc": "Fired when layout computation completes"},
                    ],
                },
            },
            {
                "id": "appMap", "name": "App Map", "icon": "ti ti-sitemap",
                "ai_name": "frappe.visual.appMap(container, opts)",
                "description": "Complete application map showing all modules, DocTypes, and their relationships for any installed Frappe app.",
                "description_ar": "خريطة تطبيق كاملة تعرض جميع الوحدات وأنواع المستندات وعلاقاتها لأي تطبيق Frappe مثبت.",
                "scenarios": [
                    "Explore app architecture visually",
                    "Understand DocType connections",
                    "New developer onboarding",
                ],
                "code": 'await frappe.visual.appMap("#container", {\n  app: "erpnext",\n  depth: 2,\n  layout: "layered"\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.app", "type": "string", "desc": "App name to visualize", "default": "null"},
                        {"name": "opts.depth", "type": "number", "desc": "Relationship traversal depth", "default": "2"},
                        {"name": "opts.layout", "type": "string", "desc": "Layout algorithm", "default": "'layered'"},
                    ],
                    "methods": [
                        {"name": "setApp(appName)", "desc": "Switch to a different app"},
                        {"name": "focusDocType(name)", "desc": "Zoom to a specific DocType"},
                    ],
                    "events": [
                        {"name": "doctype:click", "desc": "Fired when a DocType node is clicked"},
                    ],
                },
            },
            {
                "id": "create", "name": "Create Component", "icon": "ti ti-plus",
                "ai_name": "frappe.visual.create(type, container, opts)",
                "description": "Factory function to create any component by type name. Universal entry point.",
                "description_ar": "دالة مصنع لإنشاء أي مكون حسب اسم النوع. نقطة دخول عالمية.",
                "scenarios": [
                    "Dynamic component creation from config",
                    "Plugin systems that load components at runtime",
                ],
                "code": "await frappe.visual.create('kanban', '#container', {\n  columns: [...],\n  cards: [...]\n});",
                "api": {
                    "params": [
                        {"name": "type", "type": "string", "desc": "Component type name (e.g. 'kanban', 'heatmap')"},
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts", "type": "object", "desc": "Component-specific options"},
                    ],
                    "methods": [],
                    "events": [],
                },
            },
        ],
    },
    # ── Tier 2: Business Views ─────────────────────────────────────
    {
        "tier": 2, "category": "Business Views",
        "components": [
            {
                "id": "kanban", "name": "Kanban Board", "icon": "ti ti-layout-kanban",
                "ai_name": "frappe.visual.kanban(container, opts)",
                "description": "Drag-and-drop Kanban board with customizable columns, cards, swimlanes, and real-time sync.",
                "description_ar": "لوحة كانبان بالسحب والإفلات مع أعمدة وبطاقات ومسارات قابلة للتخصيص ومزامنة فورية.",
                "scenarios": [
                    "Task management boards",
                    "Sales pipeline visualization",
                    "Project status tracking",
                    "Workflow state management",
                ],
                "code": 'await frappe.visual.kanban("#board", {\n  columns: [\n    { title: "To Do", status: "Open" },\n    { title: "In Progress", status: "Working" },\n    { title: "Done", status: "Completed" }\n  ],\n  cards: [\n    { title: "Task 1", status: "Open", assignee: "admin@example.com" }\n  ],\n  onMove: (card, from, to) => console.log("Moved:", card)\n});',
                "demo_config": {
                    "columns": [
                        {"title": "Backlog", "status": "backlog", "color": "#94a3b8"},
                        {"title": "To Do", "status": "todo", "color": "#6366f1"},
                        {"title": "In Progress", "status": "wip", "color": "#f59e0b"},
                        {"title": "Done", "status": "done", "color": "#10b981"},
                    ],
                    "cards": [
                        {"title": "Design system audit", "status": "backlog"},
                        {"title": "API documentation", "status": "todo"},
                        {"title": "Component testing", "status": "wip"},
                        {"title": "Build pipeline", "status": "done"},
                    ],
                },
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.columns", "type": "Array<{title, status, color?}>", "desc": "Column definitions"},
                        {"name": "opts.cards", "type": "Array<{title, status, ...}>", "desc": "Card data"},
                        {"name": "opts.onMove", "type": "Function(card, fromCol, toCol)", "desc": "Callback when card is moved"},
                        {"name": "opts.swimlanes", "type": "Array<string>", "desc": "Optional horizontal swimlanes"},
                    ],
                    "methods": [
                        {"name": "addCard(card)", "desc": "Add a card to the board"},
                        {"name": "removeCard(id)", "desc": "Remove a card by ID"},
                        {"name": "moveCard(id, toColumn)", "desc": "Programmatically move a card"},
                        {"name": "refresh()", "desc": "Re-render the board"},
                    ],
                    "events": [
                        {"name": "card:move", "desc": "Card was dragged to a new column"},
                        {"name": "card:click", "desc": "Card was clicked"},
                        {"name": "column:add", "desc": "New column was added"},
                    ],
                },
            },
            {
                "id": "calendar", "name": "Visual Calendar", "icon": "ti ti-calendar",
                "ai_name": "frappe.visual.calendar(container, opts)",
                "description": "Full-featured calendar with month/week/day views, event creation, drag-resize, and bilingual support.",
                "description_ar": "تقويم كامل بعروض الشهر/الأسبوع/اليوم، إنشاء الأحداث، السحب وتغيير الحجم، ودعم ثنائي اللغة.",
                "scenarios": [
                    "Employee scheduling",
                    "Room/resource booking",
                    "Project timeline",
                    "Event management",
                ],
                "code": 'await frappe.visual.calendar("#cal", {\n  events: [\n    { title: "Meeting", start: "2024-01-15T10:00", end: "2024-01-15T11:00" },\n    { title: "Deadline", start: "2024-01-20", allDay: true }\n  ],\n  view: "month"\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.events", "type": "Array<{title, start, end?, allDay?}>", "desc": "Event data"},
                        {"name": "opts.view", "type": "string", "desc": "Initial view: month|week|day", "default": "'month'"},
                    ],
                    "methods": [
                        {"name": "addEvent(event)", "desc": "Add an event"},
                        {"name": "removeEvent(id)", "desc": "Remove an event"},
                        {"name": "setView(view)", "desc": "Switch view mode"},
                        {"name": "goToDate(date)", "desc": "Navigate to a specific date"},
                    ],
                    "events": [
                        {"name": "event:click", "desc": "Event was clicked"},
                        {"name": "date:click", "desc": "A date cell was clicked"},
                        {"name": "event:drop", "desc": "Event was dragged to a new date/time"},
                    ],
                },
            },
            {
                "id": "gantt", "name": "Visual Gantt", "icon": "ti ti-chart-gantt",
                "ai_name": "frappe.visual.gantt(container, opts)",
                "description": "Interactive Gantt chart with task dependencies, progress tracking, milestones, and zoom levels.",
                "description_ar": "مخطط جانت تفاعلي مع تبعيات المهام وتتبع التقدم والمعالم ومستويات التكبير.",
                "scenarios": ["Project planning", "Construction scheduling", "Product roadmaps"],
                "code": 'await frappe.visual.gantt("#gantt", {\n  tasks: [\n    { name: "Phase 1", start: "2024-01-01", end: "2024-03-31", progress: 75 },\n    { name: "Phase 2", start: "2024-04-01", end: "2024-06-30", progress: 20 }\n  ]\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.tasks", "type": "Array<{name, start, end, progress?}>", "desc": "Task data"},
                        {"name": "opts.viewMode", "type": "string", "desc": "Day|Week|Month|Year", "default": "'Month'"},
                    ],
                    "methods": [
                        {"name": "addTask(task)", "desc": "Add a task"},
                        {"name": "updateTask(id, data)", "desc": "Update task data"},
                        {"name": "setViewMode(mode)", "desc": "Change zoom level"},
                    ],
                    "events": [
                        {"name": "task:click", "desc": "Task bar was clicked"},
                        {"name": "task:resize", "desc": "Task duration was changed by drag"},
                        {"name": "task:progress", "desc": "Task progress was changed"},
                    ],
                },
            },
            {
                "id": "tree", "name": "Visual Tree View", "icon": "ti ti-binary-tree",
                "ai_name": "frappe.visual.tree(container, opts)",
                "description": "Hierarchical tree with expand/collapse, search, drag-drop reordering, badges, and horizontal/vertical modes.",
                "description_ar": "شجرة هرمية مع التوسيع/الطي والبحث وإعادة الترتيب بالسحب والشارات والأوضاع الأفقية/العمودية.",
                "scenarios": ["Organization chart", "File browser", "Category hierarchy", "Menu builder"],
                "code": 'await frappe.visual.tree("#tree", {\n  data: {\n    label: "Root",\n    children: [\n      { label: "Branch A", children: [{ label: "Leaf 1" }] },\n      { label: "Branch B" }\n    ]\n  },\n  searchable: true\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.data", "type": "TreeNode", "desc": "Root node with children"},
                        {"name": "opts.searchable", "type": "boolean", "desc": "Enable search filter", "default": "false"},
                        {"name": "opts.draggable", "type": "boolean", "desc": "Enable drag-drop reorder", "default": "false"},
                    ],
                    "methods": [
                        {"name": "expandAll()", "desc": "Expand all nodes"},
                        {"name": "collapseAll()", "desc": "Collapse all nodes"},
                        {"name": "filter(query)", "desc": "Filter visible nodes"},
                    ],
                    "events": [
                        {"name": "node:click", "desc": "Node was clicked"},
                        {"name": "node:toggle", "desc": "Node expand/collapse toggled"},
                        {"name": "node:drop", "desc": "Node was dropped to a new parent"},
                    ],
                },
            },
            {
                "id": "gallery", "name": "Visual Gallery", "icon": "ti ti-photo",
                "ai_name": "frappe.visual.gallery(container, opts)",
                "description": "Image gallery with lightbox, grid/masonry layouts, lazy loading, and touch gestures.",
                "description_ar": "معرض صور مع عرض مكبر وتخطيطات شبكة/ماسونري وتحميل كسول وإيماءات اللمس.",
                "scenarios": ["Product images", "Project photos", "Document attachments"],
                "code": 'await frappe.visual.gallery("#gallery", {\n  images: [\n    { src: "/files/photo1.jpg", title: "Photo 1" },\n    { src: "/files/photo2.jpg", title: "Photo 2" }\n  ],\n  layout: "masonry"\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.images", "type": "Array<{src, title?, thumb?}>", "desc": "Image data"},
                        {"name": "opts.layout", "type": "string", "desc": "grid|masonry|carousel", "default": "'grid'"},
                    ],
                    "methods": [
                        {"name": "openLightbox(index)", "desc": "Open lightbox at image index"},
                        {"name": "addImages(images)", "desc": "Add more images"},
                    ],
                    "events": [
                        {"name": "image:click", "desc": "Image was clicked"},
                    ],
                },
            },
            {
                "id": "map", "name": "Visual Map", "icon": "ti ti-map",
                "ai_name": "frappe.visual.map(container, opts)",
                "description": "Leaflet-powered interactive map with markers, clusters, popups, and custom tile layers.",
                "description_ar": "خريطة تفاعلية مدعومة بـ Leaflet مع علامات ومجموعات ونوافذ منبثقة وطبقات بلاط مخصصة.",
                "scenarios": ["Asset location tracking", "Customer distribution", "Delivery routes"],
                "code": 'await frappe.visual.map("#map", {\n  center: [24.7136, 46.6753],\n  zoom: 12,\n  markers: [\n    { lat: 24.7136, lng: 46.6753, title: "Riyadh Office" }\n  ]\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.center", "type": "[lat, lng]", "desc": "Initial center coordinates"},
                        {"name": "opts.zoom", "type": "number", "desc": "Initial zoom level", "default": "13"},
                        {"name": "opts.markers", "type": "Array<{lat, lng, title?, popup?}>", "desc": "Map markers"},
                    ],
                    "methods": [
                        {"name": "addMarker(marker)", "desc": "Add a marker"},
                        {"name": "setCenter(lat, lng)", "desc": "Pan to coordinates"},
                        {"name": "fitBounds()", "desc": "Fit all markers in view"},
                    ],
                    "events": [
                        {"name": "marker:click", "desc": "Marker was clicked"},
                        {"name": "map:click", "desc": "Map background was clicked"},
                    ],
                },
            },
            {
                "id": "formDashboard", "name": "Form Dashboard", "icon": "ti ti-dashboard",
                "ai_name": "frappe.visual.formDashboard(container, opts)",
                "description": "Auto-enhances any DocType form with stats ribbon, relationship graph, and quick-action links.",
                "description_ar": "يعزز تلقائيًا أي نموذج DocType بشريط إحصائيات ورسم بياني للعلاقات وروابط إجراءات سريعة.",
                "scenarios": ["Auto-enhanced document forms", "Related records visualization"],
                "code": 'await frappe.visual.formDashboard("#container", {\n  doctype: "Sales Order",\n  docname: "SO-00001"\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.doctype", "type": "string", "desc": "DocType name"},
                        {"name": "opts.docname", "type": "string", "desc": "Document name"},
                    ],
                    "methods": [],
                    "events": [
                        {"name": "link:click", "desc": "Quick link was clicked"},
                    ],
                },
            },
            {
                "id": "storyboard", "name": "Storyboard", "icon": "ti ti-presentation",
                "ai_name": "frappe.visual.storyboard(container, opts)",
                "description": "Multi-slide presentation viewer for onboarding, about pages, and guided tours with navigation and progress.",
                "description_ar": "عارض عرض تقديمي متعدد الشرائح للتهيئة وصفحات حول وجولات إرشادية مع التنقل والتقدم.",
                "scenarios": ["App onboarding", "About pages", "Feature tours", "Training materials"],
                "code": 'await frappe.visual.storyboard("#viewer", {\n  slides: [\n    { title: "Welcome", content: "<p>Get started...</p>", image: "/files/welcome.svg" },\n    { title: "Features", content: "<p>Key features...</p>" }\n  ]\n});',
                "api": {
                    "params": [
                        {"name": "container", "type": "HTMLElement | string", "desc": "Target container"},
                        {"name": "opts.slides", "type": "Array<{title, content, image?}>", "desc": "Slide data"},
                        {"name": "opts.autoPlay", "type": "boolean", "desc": "Auto-advance slides", "default": "false"},
                    ],
                    "methods": [
                        {"name": "next()", "desc": "Go to next slide"},
                        {"name": "prev()", "desc": "Go to previous slide"},
                        {"name": "goTo(index)", "desc": "Jump to specific slide"},
                    ],
                    "events": [
                        {"name": "slide:change", "desc": "Current slide changed"},
                        {"name": "complete", "desc": "Reached the last slide"},
                    ],
                },
            },
        ],
    },
    # ── Tier 3: Data Visualization ─────────────────────────────────
    {
        "tier": 3, "category": "Data Visualization",
        "components": [
            {"id": "heatmap", "name": "Heatmap", "icon": "ti ti-grid-dots",
             "ai_name": "frappe.visual.heatmap(container, opts)", "description": "Color-coded matrix for density/activity data. GitHub-style contribution heatmaps.", "description_ar": "مصفوفة ملونة لبيانات الكثافة/النشاط. خرائط حرارية على نمط GitHub.",
             "scenarios": ["Activity tracking", "Attendance patterns", "Server load visualization"],
             "code": 'await frappe.visual.heatmap("#hm", {\n  data: [{date: "2024-01-01", value: 5}, ...],\n  colorScale: ["#ebedf0","#9be9a8","#40c463","#30a14e","#216e39"]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.data", "type": "Array<{date,value}>", "desc": "Date-value pairs"},{"name": "opts.colorScale", "type": "string[]", "desc": "Color gradient array"}], "methods": [{"name": "update(data)", "desc": "Update with new data"}], "events": [{"name": "cell:click", "desc": "Cell clicked"}]}},
            {"id": "sparkline", "name": "Sparkline", "icon": "ti ti-chart-line",
             "ai_name": "frappe.visual.sparkline(container, opts)", "description": "Compact inline trend chart. Perfect for dashboard KPI cards.", "description_ar": "رسم بياني مصغر للاتجاه. مثالي لبطاقات مؤشرات الأداء.",
             "scenarios": ["KPI trends in cards", "Inline data trends", "Mini charts in tables"],
             "code": 'await frappe.visual.sparkline("#sp", {\n  data: [12, 18, 25, 22, 30, 28, 35],\n  color: "#6366f1",\n  height: 60\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.data", "type": "number[]", "desc": "Data points"},{"name": "opts.color", "type": "string", "desc": "Line color"},{"name": "opts.height", "type": "number", "desc": "Chart height in px", "default": "40"}], "methods": [{"name": "update(data)", "desc": "Update data"}], "events": []}},
            {"id": "donutChart", "name": "Donut Chart", "icon": "ti ti-chart-donut-3",
             "ai_name": "frappe.visual.donutChart(container, opts)", "description": "Donut/pie chart for proportional data with legend and tooltips.", "description_ar": "رسم بياني دائري للبيانات النسبية مع وسيلة إيضاح وتلميحات.",
             "scenarios": ["Revenue breakdown", "Status distribution", "Category proportions"],
             "code": 'await frappe.visual.donutChart("#d", {\n  data: [\n    { label: "Sales", value: 42 },\n    { label: "Service", value: 28 },\n    { label: "Product", value: 30 }\n  ]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.data", "type": "Array<{label,value}>", "desc": "Segment data"}], "methods": [{"name": "update(data)", "desc": "Update chart data"}], "events": [{"name": "segment:click", "desc": "Segment clicked"}]}},
            {"id": "areaChart", "name": "Area Chart", "icon": "ti ti-chart-area-line",
             "ai_name": "frappe.visual.areaChart(container, opts)", "description": "Filled line chart for time-series and trend visualization.", "description_ar": "رسم بياني خطي ممتلئ للسلاسل الزمنية وعرض الاتجاهات.",
             "scenarios": ["Revenue over time", "Traffic trends", "Growth metrics"],
             "code": 'await frappe.visual.areaChart("#area", {\n  labels: ["Jan","Feb","Mar","Apr","May","Jun"],\n  datasets: [{ label: "Revenue", data: [40,55,45,70,65,80] }]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.labels", "type": "string[]", "desc": "X-axis labels"},{"name": "opts.datasets", "type": "Array<{label,data}>", "desc": "Chart datasets"}], "methods": [{"name": "update(data)", "desc": "Update chart"}], "events": []}},
            {"id": "radarChart", "name": "Radar Chart", "icon": "ti ti-chart-radar",
             "ai_name": "frappe.visual.radarChart(container, opts)", "description": "Multi-axis comparison chart for rating/scoring data.", "description_ar": "رسم بياني رادار متعدد المحاور لبيانات التقييم/التسجيل.",
             "scenarios": ["Employee skills assessment", "Product comparison", "Performance reviews"],
             "code": 'await frappe.visual.radarChart("#r", {\n  labels: ["Speed","Quality","Cost","Support"],\n  datasets: [{label: "Product A", data: [80,90,60,70]}]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.labels", "type": "string[]", "desc": "Axis labels"},{"name": "opts.datasets", "type": "Array<{label,data}>", "desc": "Datasets"}], "methods": [{"name": "update(data)", "desc": "Update chart"}], "events": []}},
            {"id": "funnelChart", "name": "Funnel Chart", "icon": "ti ti-filter",
             "ai_name": "frappe.visual.funnelChart(container, opts)", "description": "Sales/conversion funnel visualization with progressive narrowing stages.", "description_ar": "عرض قمع المبيعات/التحويل مع مراحل تضيق تدريجياً.",
             "scenarios": ["Sales pipeline", "Conversion funnel", "Recruitment stages"],
             "code": 'await frappe.visual.funnelChart("#f", {\n  data: [\n    { label: "Visits", value: 5000 },\n    { label: "Leads", value: 2500 },\n    { label: "Closed", value: 200 }\n  ]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.data", "type": "Array<{label,value}>", "desc": "Funnel stages"}], "methods": [], "events": [{"name": "stage:click", "desc": "Stage clicked"}]}},
            {"id": "treemapChart", "name": "Treemap", "icon": "ti ti-layout-grid",
             "ai_name": "frappe.visual.treemapChart(container, opts)", "description": "Hierarchical data visualization as nested rectangles sized by value.", "description_ar": "عرض بيانات هرمية كمستطيلات متداخلة بحجم القيمة.",
             "scenarios": ["Budget allocation", "Disk usage", "Market share"],
             "code": 'await frappe.visual.treemapChart("#tm", {\n  data: [\n    { name: "Sales", value: 120, children: [{name: "Online", value: 80}] },\n    { name: "Marketing", value: 80 }\n  ]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.data", "type": "Array<TreeNode>", "desc": "Hierarchical data"}], "methods": [{"name": "drillDown(node)", "desc": "Zoom into a node"}], "events": [{"name": "node:click", "desc": "Node clicked"}]}},
            {"id": "sankeyChart", "name": "Sankey Diagram", "icon": "ti ti-arrows-split",
             "ai_name": "frappe.visual.sankeyChart(container, opts)", "description": "Flow diagram showing the transfer of quantities between stages.", "description_ar": "مخطط تدفق يظهر نقل الكميات بين المراحل.",
             "scenarios": ["Budget flow", "Energy transfer", "User flow analytics"],
             "code": 'await frappe.visual.sankeyChart("#sk", {\n  nodes: [{name: "Source A"}, {name: "Process 1"}, {name: "Output"}],\n  links: [{source: 0, target: 1, value: 40}, {source: 1, target: 2, value: 40}]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.nodes", "type": "Array<{name}>", "desc": "Node definitions"},{"name": "opts.links", "type": "Array<{source,target,value}>", "desc": "Flow links"}], "methods": [], "events": [{"name": "link:hover", "desc": "Link hovered"}]}},
            {"id": "gaugeChart", "name": "Gauge Chart", "icon": "ti ti-gauge",
             "ai_name": "frappe.visual.gaugeChart(container, opts)", "description": "Circular gauge/speedometer for KPI progress indicators.", "description_ar": "مقياس دائري لمؤشرات تقدم مؤشرات الأداء.",
             "scenarios": ["Server load", "Budget utilization", "Goal progress"],
             "code": 'await frappe.visual.gaugeChart("#g", {\n  value: 73,\n  min: 0, max: 100,\n  thresholds: [{value: 30, color: "green"}, {value: 70, color: "orange"}, {value: 100, color: "red"}]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.value", "type": "number", "desc": "Current value"},{"name": "opts.min", "type": "number", "desc": "Minimum", "default": "0"},{"name": "opts.max", "type": "number", "desc": "Maximum", "default": "100"}], "methods": [{"name": "setValue(v)", "desc": "Update value"}], "events": []}},
            {"id": "bulletChart", "name": "Bullet Chart", "icon": "ti ti-chart-bar",
             "ai_name": "frappe.visual.bulletChart(container, opts)", "description": "Compact comparison chart showing actual vs target with qualitative ranges.", "description_ar": "رسم بياني مضغوط يظهر الفعلي مقابل المستهدف مع نطاقات نوعية.",
             "scenarios": ["Sales vs quota", "KPI vs target", "Performance benchmarks"],
             "code": 'await frappe.visual.bulletChart("#b", {\n  data: [{ label: "Revenue", actual: 270, target: 250, ranges: [150, 225, 300] }]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.data", "type": "Array<{label,actual,target,ranges}>", "desc": "Bullet data"}], "methods": [], "events": []}},
            {"id": "metricCard", "name": "Metric Card", "icon": "ti ti-number",
             "ai_name": "frappe.visual.metricCard(container, opts)", "description": "KPI dashboard card with value, trend indicator, sparkline, and comparison.", "description_ar": "بطاقة مؤشر أداء مع قيمة ومؤشر اتجاه ورسم بياني مصغر ومقارنة.",
             "scenarios": ["Dashboard KPI cards", "Executive summaries", "Real-time metrics"],
             "code": 'await frappe.visual.metricCard("#mc", {\n  label: "Revenue",\n  value: "$125,000",\n  trend: "+12%",\n  trendDirection: "up",\n  sparklineData: [40, 55, 45, 70, 65, 80]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.label", "type": "string", "desc": "Metric label"},{"name": "opts.value", "type": "string|number", "desc": "Display value"},{"name": "opts.trend", "type": "string", "desc": "Trend text"},{"name": "opts.trendDirection", "type": "string", "desc": "up|down|flat"}], "methods": [{"name": "update(opts)", "desc": "Update metric"}], "events": []}},
            {"id": "wordCloud", "name": "Word Cloud", "icon": "ti ti-cloud",
             "ai_name": "frappe.visual.wordCloud(container, opts)", "description": "Tag/word cloud visualization with size based on frequency/weight.", "description_ar": "عرض سحابة كلمات بحجم حسب التكرار/الوزن.",
             "scenarios": ["Keyword analysis", "Topic distribution", "Tag visualization"],
             "code": 'await frappe.visual.wordCloud("#wc", {\n  words: [\n    { text: "Frappe", weight: 100 },\n    { text: "Visual", weight: 80 },\n    { text: "Components", weight: 60 }\n  ]\n});',
             "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.words", "type": "Array<{text,weight}>", "desc": "Word data"}], "methods": [], "events": [{"name": "word:click", "desc": "Word clicked"}]}},
        ],
    },
    # ── Tier 4: Layout Containers ──────────────────────────────────
    {
        "tier": 4, "category": "Layout Containers",
        "components": [
            {"id": "masonry", "name": "Masonry", "icon": "ti ti-layout-dashboard", "ai_name": "frappe.visual.masonry(container, opts)", "description": "Pinterest-style waterfall layout that fills vertical gaps efficiently.", "description_ar": "تخطيط شلال على نمط Pinterest يملأ الفجوات العمودية بكفاءة.", "scenarios": ["Card galleries", "Blog posts", "Mixed-height content"], "code": 'await frappe.visual.masonry("#m", {\n  columns: 3,\n  items: [{html: "<div>Card 1</div>"}, {html: "<div>Card 2</div>"}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.columns", "type": "number", "desc": "Column count", "default": "3"},{"name": "opts.items", "type": "Array<{html}>", "desc": "Content items"}], "methods": [{"name": "addItem(item)", "desc": "Add an item"},{"name": "reflow()", "desc": "Recalculate layout"}], "events": []}},
            {"id": "bento", "name": "Bento Grid", "icon": "ti ti-grid-4x4", "ai_name": "frappe.visual.bento(container, opts)", "description": "Apple-inspired asymmetric grid layout with variable cell spans.", "description_ar": "تخطيط شبكة غير متماثل مستوحى من Apple مع امتدادات خلايا متغيرة.", "scenarios": ["Feature showcases", "Dashboard layouts", "Marketing pages"], "code": 'await frappe.visual.bento("#b", {\n  columns: 4,\n  items: [{colSpan: 2, rowSpan: 2, html: "<div>Featured</div>"}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.columns", "type": "number", "desc": "Grid columns"},{"name": "opts.items", "type": "Array<{colSpan?,rowSpan?,html}>", "desc": "Grid items"}], "methods": [], "events": []}},
            {"id": "sortable", "name": "Sortable List", "icon": "ti ti-arrows-sort", "ai_name": "frappe.visual.sortable(container, opts)", "description": "Drag-and-drop sortable list powered by GSAP Draggable.", "description_ar": "قائمة قابلة للفرز بالسحب والإفلات مدعومة بـ GSAP.", "scenarios": ["Priority ordering", "Menu arrangement", "Step sequencing"], "code": 'await frappe.visual.sortable("#s", {\n  items: ["Task 1", "Task 2", "Task 3"]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.items", "type": "string[] | HTMLElement[]", "desc": "Sortable items"}], "methods": [{"name": "getOrder()", "desc": "Get current item order"}], "events": [{"name": "sort:change", "desc": "Order changed"}]}},
            {"id": "dock", "name": "Dock Panel", "icon": "ti ti-layout-bottombar", "ai_name": "frappe.visual.dock(container, opts)", "description": "macOS-style dock with magnification effect on hover.", "description_ar": "شريط أدوات على نمط macOS مع تأثير تكبير عند التمرير.", "scenarios": ["App launcher", "Quick actions bar", "Favorite tools"], "code": 'await frappe.visual.dock("#dock", {\n  items: [{icon: "home", label: "Home"}, {icon: "settings", label: "Settings"}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.items", "type": "Array<{icon,label,onClick?}>", "desc": "Dock items"}], "methods": [], "events": [{"name": "item:click", "desc": "Item clicked"}]}},
            {"id": "infiniteScroll", "name": "Infinite Scroll", "icon": "ti ti-arrow-down", "ai_name": "frappe.visual.infiniteScroll(container, opts)", "description": "Automatically loads more content when scrolling near the bottom.", "description_ar": "يحمل تلقائيًا المزيد من المحتوى عند التمرير بالقرب من الأسفل.", "scenarios": ["Social feeds", "Long lists", "Search results"], "code": 'await frappe.visual.infiniteScroll("#feed", {\n  loadMore: async (page) => fetchData(page),\n  renderItem: (item) => `<div>${item.title}</div>`\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.loadMore", "type": "async Function(page)", "desc": "Data fetcher"},{"name": "opts.renderItem", "type": "Function(item) → string", "desc": "Item renderer"}], "methods": [{"name": "reset()", "desc": "Reset to page 1"}], "events": []}},
            {"id": "gridStack", "name": "Grid Stack", "icon": "ti ti-layout-grid-add", "ai_name": "frappe.visual.gridStack(container, opts)", "description": "Draggable/resizable dashboard grid for user-customizable layouts.", "description_ar": "شبكة لوحة معلومات قابلة للسحب/تغيير الحجم لتخطيطات قابلة للتخصيص.", "scenarios": ["Custom dashboards", "Widget layouts", "User-configurable pages"], "code": 'await frappe.visual.gridStack("#gs", {\n  widgets: [{x:0,y:0,w:4,h:2,content:"<div>Widget 1</div>"}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.widgets", "type": "Array<{x,y,w,h,content}>", "desc": "Widget definitions"}], "methods": [{"name": "addWidget(w)", "desc": "Add widget"},{"name": "save()", "desc": "Get current layout config"}], "events": [{"name": "change", "desc": "Layout changed"}]}},
        ],
    },
    # ── Tier 5: Navigation ─────────────────────────────────────────
    {
        "tier": 5, "category": "Navigation",
        "components": [
            {"id": "commandBar", "name": "Command Bar (⌘K)", "icon": "ti ti-command", "ai_name": "frappe.visual.commandBar(opts)", "description": "Spotlight-style command palette for searching anything from anywhere. Triggered by ⌘K.", "description_ar": "لوحة أوامر على نمط Spotlight للبحث في أي شيء من أي مكان. يتم تشغيلها بـ ⌘K.", "scenarios": ["Quick navigation", "Command execution", "Universal search"], "code": 'frappe.visual.commandBar({\n  commands: [\n    { label: "Create Invoice", action: () => frappe.new_doc("Sales Invoice") }\n  ]\n});', "api": {"params": [{"name": "opts.commands", "type": "Array<{label,action,icon?}>", "desc": "Command list"}], "methods": [{"name": "open()", "desc": "Open command bar"},{"name": "close()", "desc": "Close command bar"}], "events": [{"name": "select", "desc": "Command selected"}]}},
            {"id": "floatingNav", "name": "Floating Nav", "icon": "ti ti-menu-2", "ai_name": "frappe.visual.floatingNav(container, opts)", "description": "Floating navigation bubble with expandable quick-access action menu.", "description_ar": "فقاعة تنقل عائمة مع قائمة إجراءات قابلة للتوسيع.", "scenarios": ["Mobile navigation", "Quick actions", "Context menus"], "code": 'await frappe.visual.floatingNav("#nav", {\n  actions: [{icon: "plus", label: "New", onClick: () => {}}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.actions", "type": "Array<{icon,label,onClick}>", "desc": "Navigation actions"}], "methods": [], "events": []}},
            {"id": "bottomSheet", "name": "Bottom Sheet", "icon": "ti ti-chevrons-up", "ai_name": "frappe.visual.bottomSheet(opts)", "description": "Mobile-first bottom sheet overlay with drag-to-dismiss gesture.", "description_ar": "طبقة سفلية للأجهزة المحمولة مع إيماءة السحب للإغلاق.", "scenarios": ["Mobile forms", "Detail panels", "Action sheets"], "code": 'frappe.visual.bottomSheet({\n  title: "Options",\n  content: "<div>Sheet content</div>"\n});', "api": {"params": [{"name": "opts.title", "type": "string", "desc": "Sheet title"},{"name": "opts.content", "type": "string | HTMLElement", "desc": "Sheet content"}], "methods": [{"name": "close()", "desc": "Close sheet"}], "events": [{"name": "close", "desc": "Sheet was closed"}]}},
            {"id": "speedDial", "name": "Speed Dial (FAB)", "icon": "ti ti-plus", "ai_name": "frappe.visual.speedDial(container, opts)", "description": "Material Design-style floating action button with expanding sub-actions.", "description_ar": "زر إجراء عائم على نمط Material Design مع إجراءات فرعية قابلة للتوسيع.", "scenarios": ["Quick create actions", "Mobile primary actions", "Contextual tools"], "code": 'await frappe.visual.speedDial("#fab", {\n  actions: [\n    { icon: "plus", label: "New Task", onClick: () => {} },\n    { icon: "message", label: "Message", onClick: () => {} }\n  ]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.actions", "type": "Array<{icon,label,onClick}>", "desc": "Sub-actions"}], "methods": [{"name": "toggle()", "desc": "Open/close menu"}], "events": []}},
            {"id": "breadcrumb", "name": "Breadcrumb", "icon": "ti ti-arrows-right", "ai_name": "frappe.visual.breadcrumb(container, opts)", "description": "Navigation breadcrumb trail showing current page hierarchy.", "description_ar": "مسار تنقل يعرض التسلسل الهرمي للصفحة الحالية.", "scenarios": ["Page navigation", "Folder paths", "Multi-step process location"], "code": 'await frappe.visual.breadcrumb("#bc", {\n  items: [{label: "Home", href: "/"}, {label: "Projects"}, {label: "Current"}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.items", "type": "Array<{label,href?}>", "desc": "Breadcrumb items"}], "methods": [], "events": [{"name": "item:click", "desc": "Item clicked"}]}},
            {"id": "tabBar", "name": "Tab Bar", "icon": "ti ti-layout-navbar", "ai_name": "frappe.visual.tabBar(container, opts)", "description": "iOS-style tab bar for section switching.", "description_ar": "شريط علامات تبويب على نمط iOS للتبديل بين الأقسام.", "scenarios": ["Section navigation", "Category switching", "View modes"], "code": 'await frappe.visual.tabBar("#tabs", {\n  tabs: [{label: "Overview", icon: "home"}, {label: "Details", icon: "list"}]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.tabs", "type": "Array<{label,icon?,content?}>", "desc": "Tab definitions"}], "methods": [{"name": "setActive(index)", "desc": "Switch tab"}], "events": [{"name": "tab:change", "desc": "Active tab changed"}]}},
        ],
    },
    # ── Tier 6: Feedback & Overlay ─────────────────────────────────
    {
        "tier": 6, "category": "Feedback & Overlay",
        "components": [
            {"id": "toast", "name": "Toast", "icon": "ti ti-message-circle", "ai_name": "frappe.visual.toast(opts)", "description": "Non-blocking notification toast with auto-dismiss and actions.", "description_ar": "إشعار منبثق غير معطل مع إخفاء تلقائي وإجراءات.", "scenarios": ["Success messages", "Error alerts", "Action confirmations"], "code": 'frappe.visual.toast({\n  message: "Saved successfully",\n  type: "success",\n  duration: 3000\n});', "api": {"params": [{"name": "opts.message", "type": "string", "desc": "Toast message"},{"name": "opts.type", "type": "string", "desc": "success|error|warning|info"},{"name": "opts.duration", "type": "number", "desc": "Auto-dismiss ms", "default": "3000"}], "methods": [{"name": "dismiss()", "desc": "Dismiss toast"}], "events": []}},
            {"id": "confirmDialog", "name": "Confirm Dialog", "icon": "ti ti-alert-triangle", "ai_name": "frappe.visual.confirmDialog(opts)", "description": "Visual confirmation dialog with customizable actions.", "description_ar": "حوار تأكيد مرئي مع إجراءات قابلة للتخصيص.", "scenarios": ["Delete confirmations", "Destructive actions", "Important decisions"], "code": 'const ok = await frappe.visual.confirmDialog({\n  title: "Delete Record?",\n  message: "This cannot be undone.",\n  confirmLabel: "Delete",\n  destructive: true\n});', "api": {"params": [{"name": "opts.title", "type": "string", "desc": "Dialog title"},{"name": "opts.message", "type": "string", "desc": "Dialog body"},{"name": "opts.destructive", "type": "boolean", "desc": "Red destructive style"}], "methods": [], "events": []}},
            {"id": "drawer", "name": "Drawer", "icon": "ti ti-layout-sidebar-right", "ai_name": "frappe.visual.drawer(opts)", "description": "Slide-out panel from any edge for detail views and forms.", "description_ar": "لوحة منزلقة من أي حافة لعروض التفاصيل والنماذج.", "scenarios": ["Detail panels", "Quick edit forms", "Settings panels"], "code": 'frappe.visual.drawer({\n  title: "Details",\n  content: "<div>Panel content</div>",\n  side: "right",\n  width: "400px"\n});', "api": {"params": [{"name": "opts.title", "type": "string", "desc": "Drawer title"},{"name": "opts.content", "type": "string | HTMLElement", "desc": "Drawer content"},{"name": "opts.side", "type": "string", "desc": "left|right|top|bottom", "default": "'right'"}], "methods": [{"name": "close()", "desc": "Close drawer"}], "events": [{"name": "close", "desc": "Drawer closed"}]}},
            {"id": "lightbox", "name": "Lightbox", "icon": "ti ti-maximize", "ai_name": "frappe.visual.lightbox(opts)", "description": "Full-screen image/content viewer with zoom, pan, and gallery navigation.", "description_ar": "عارض صور/محتوى بملء الشاشة مع تكبير وتمرير وتنقل في المعرض.", "scenarios": ["Image preview", "Document viewer", "Media gallery"], "code": 'frappe.visual.lightbox({\n  images: [{src: "/files/photo.jpg", title: "Photo 1"}],\n  startIndex: 0\n});', "api": {"params": [{"name": "opts.images", "type": "Array<{src,title?}>", "desc": "Image list"},{"name": "opts.startIndex", "type": "number", "desc": "Initial image", "default": "0"}], "methods": [{"name": "close()", "desc": "Close lightbox"},{"name": "next()", "desc": "Next image"}], "events": []}},
            {"id": "popover", "name": "Popover", "icon": "ti ti-message-dots", "ai_name": "frappe.visual.popover(trigger, opts)", "description": "Rich popover with custom content, triggered by hover or click.", "description_ar": "نافذة منبثقة غنية بمحتوى مخصص، يتم تشغيلها بالتمرير أو النقر.", "scenarios": ["User profile cards", "Help tooltips", "Mini previews"], "code": 'frappe.visual.popover("#trigger-btn", {\n  content: "<div>Popover content</div>",\n  trigger: "hover"\n});', "api": {"params": [{"name": "trigger", "type": "HTMLElement | string", "desc": "Trigger element"},{"name": "opts.content", "type": "string | HTMLElement", "desc": "Popover content"},{"name": "opts.trigger", "type": "string", "desc": "hover|click", "default": "'click'"}], "methods": [{"name": "show()", "desc": "Show popover"},{"name": "hide()", "desc": "Hide popover"}], "events": []}},
            {"id": "onboardingTour", "name": "Onboarding Tour", "icon": "ti ti-route", "ai_name": "frappe.visual.onboardingTour(opts)", "description": "Step-by-step guided tour highlighting UI elements with tooltips.", "description_ar": "جولة إرشادية خطوة بخطوة تبرز عناصر واجهة المستخدم مع تلميحات.", "scenarios": ["New user onboarding", "Feature discovery", "Training walkthroughs"], "code": 'frappe.visual.onboardingTour({\n  steps: [\n    { target: "#navbar", title: "Navigation", content: "Use the navbar to..." },\n    { target: ".sidebar", title: "Sidebar", content: "Quick access to..." }\n  ]\n});', "api": {"params": [{"name": "opts.steps", "type": "Array<{target,title,content}>", "desc": "Tour steps"}], "methods": [{"name": "start()", "desc": "Start tour"},{"name": "stop()", "desc": "End tour"}], "events": [{"name": "step:change", "desc": "Step changed"},{"name": "complete", "desc": "Tour completed"}]}},
        ],
    },
    # ── Tier 7: Productivity ───────────────────────────────────────
    {
        "tier": 7, "category": "Productivity Tools",
        "components": [
            {"id": "undoRedo", "name": "Undo/Redo (⌘Z)", "icon": "ti ti-arrow-back-up", "ai_name": "frappe.visual.undoRedo(opts)", "description": "History management system with undo/redo stack for any state changes.", "description_ar": "نظام إدارة السجل مع مكدس التراجع/الإعادة لأي تغييرات حالة.", "scenarios": ["Form editing", "Canvas tools", "Configuration changes"], "code": 'const history = frappe.visual.undoRedo({\n  maxHistory: 50,\n  onChange: (state) => render(state)\n});\nhistory.push(newState);\nhistory.undo();\nhistory.redo();', "api": {"params": [{"name": "opts.maxHistory", "type": "number", "desc": "Max undo steps", "default": "50"},{"name": "opts.onChange", "type": "Function(state)", "desc": "State change callback"}], "methods": [{"name": "push(state)", "desc": "Push new state"},{"name": "undo()", "desc": "Undo last action"},{"name": "redo()", "desc": "Redo last undone action"},{"name": "canUndo()", "desc": "Check if undo is available"}], "events": []}},
            {"id": "clipboardManager", "name": "Clipboard Manager", "icon": "ti ti-clipboard", "ai_name": "frappe.visual.clipboardManager()", "description": "Cross-browser clipboard read/write with format detection.", "description_ar": "قراءة/كتابة الحافظة عبر المتصفحات مع اكتشاف التنسيق.", "scenarios": ["Copy to clipboard buttons", "Paste handlers", "Data transfer"], "code": 'const cb = frappe.visual.clipboardManager();\nawait cb.copy("Hello World");\nconst text = await cb.paste();', "api": {"params": [], "methods": [{"name": "copy(text)", "desc": "Copy text to clipboard"},{"name": "paste()", "desc": "Read from clipboard"},{"name": "copyRich(html)", "desc": "Copy rich HTML"}], "events": []}},
            {"id": "shortcutManager", "name": "Shortcut Manager", "icon": "ti ti-keyboard", "ai_name": "frappe.visual.shortcutManager(opts)", "description": "Global keyboard shortcut registration with conflict detection and cheat sheet.", "description_ar": "تسجيل اختصارات لوحة المفاتيح مع اكتشاف التعارض وورقة الغش.", "scenarios": ["App keyboard shortcuts", "Power user tools", "Accessibility"], "code": 'const keys = frappe.visual.shortcutManager();\nkeys.register("ctrl+s", () => save());\nkeys.register("ctrl+k", () => openSearch());', "api": {"params": [], "methods": [{"name": "register(combo, fn)", "desc": "Register a shortcut"},{"name": "unregister(combo)", "desc": "Remove a shortcut"},{"name": "showCheatSheet()", "desc": "Display all shortcuts"}], "events": []}},
        ],
    },
    # ── Tier 8: Scene Engine ───────────────────────────────────────
    {
        "tier": 8, "category": "Scene Engine (Immersive SVG)",
        "components": [
            {"id": "sceneEngine", "name": "Scene Engine", "icon": "ti ti-3d-cube-sphere", "ai_name": "frappe.visual.sceneEngine(container, opts)", "description": "Core SVG scene rendering engine for immersive workspace dashboards.", "description_ar": "محرك عرض مشاهد SVG الأساسي للوحات معلومات مساحات العمل الغامرة.", "scenarios": ["Workspace headers", "Immersive dashboards", "Interactive infographics"], "code": 'const scene = await frappe.visual.sceneEngine("#header", {\n  theme: "warm",\n  width: "100%",\n  height: 400\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.theme", "type": "string", "desc": "warm|cool|dark|blueprint"},{"name": "opts.width", "type": "string|number", "desc": "Scene width"},{"name": "opts.height", "type": "number", "desc": "Scene height"}], "methods": [{"name": "addFrame(data)", "desc": "Add a KPI frame"},{"name": "addDocument(data)", "desc": "Add a document scatter item"},{"name": "refresh()", "desc": "Re-render scene"}], "events": [{"name": "frame:click", "desc": "KPI frame clicked"},{"name": "document:click", "desc": "Document clicked"}]}},
            {"id": "scenePresetOffice", "name": "Scene: Office", "icon": "ti ti-building", "ai_name": "frappe.visual.scenePresetOffice(opts)", "description": "Office-themed scene preset with desk, frames, shelves, and documents.", "description_ar": "مشهد مكتب مع مكتب وإطارات ورفوف ووثائق.", "scenarios": ["Business dashboards", "CRM workspaces", "General management"], "code": 'const scene = await frappe.visual.scenePresetOffice({\n  container: "#workspace-header",\n  frames: [{label: "Revenue", value: "$125K", status: "success"}],\n  documents: [{label: "Pending", count: 8}]\n});', "api": {"params": [{"name": "opts.container", "type": "string", "desc": "Target selector"},{"name": "opts.frames", "type": "Array<{label,value,status}>", "desc": "KPI frames"},{"name": "opts.documents", "type": "Array<{label,count,href?}>", "desc": "Document items"},{"name": "opts.books", "type": "Array<{label,href?,color?}>", "desc": "Shelf books"}], "methods": [], "events": []}},
            {"id": "scenePresetWorkshop", "name": "Scene: Workshop", "icon": "ti ti-tool", "ai_name": "frappe.visual.scenePresetWorkshop(opts)", "description": "Construction/manufacturing themed scene with blueprint aesthetic.", "description_ar": "مشهد بناء/تصنيع بجمالية المخططات الهندسية.", "scenarios": ["Construction dashboards", "Manufacturing KPIs"], "code": 'await frappe.visual.scenePresetWorkshop({\n  container: "#header",\n  theme: "blueprint",\n  frames: [{label: "Budget", value: "$2.5M"}]\n});', "api": {"params": [{"name": "opts.container", "type": "string", "desc": "Target"},{"name": "opts.theme", "type": "string", "desc": "warm|blueprint"},{"name": "opts.frames", "type": "Array", "desc": "KPI frames"}], "methods": [], "events": []}},
            {"id": "scenePresetCafe", "name": "Scene: Cafe", "icon": "ti ti-coffee", "ai_name": "frappe.visual.scenePresetCafe(opts)", "description": "Warm cafe/restaurant themed scene for hospitality and F&B dashboards.", "description_ar": "مشهد مقهى/مطعم دافئ للوحات معلومات الضيافة والأغذية.", "scenarios": ["Restaurant dashboards", "Hotel reception", "Cafe management"], "code": 'await frappe.visual.scenePresetCafe({\n  container: "#header",\n  frames: [{label: "Orders Today", value: "142"}]\n});', "api": {"params": [{"name": "opts.container", "type": "string", "desc": "Target"},{"name": "opts.frames", "type": "Array", "desc": "KPI frames"}], "methods": [], "events": []}},
            {"id": "sceneDataBinder", "name": "Scene Data Binder", "icon": "ti ti-link", "ai_name": "frappe.visual.sceneDataBinder(opts)", "description": "Binds live Frappe data to scene frames with auto-refresh. Aggregates DocType fields in real-time.", "description_ar": "يربط بيانات Frappe الحية بإطارات المشهد مع التحديث التلقائي.", "scenarios": ["Live KPI dashboards", "Auto-refreshing metrics", "Real-time monitoring"], "code": 'await frappe.visual.sceneDataBinder({\n  engine: scene,\n  frames: [{\n    label: "Revenue",\n    doctype: "Sales Invoice",\n    aggregate: "sum",\n    field: "grand_total",\n    filters: { status: "Paid" }\n  }],\n  refreshInterval: 30000\n});', "api": {"params": [{"name": "opts.engine", "type": "SceneEngine", "desc": "Scene engine instance"},{"name": "opts.frames", "type": "Array<{label,doctype,aggregate,field,filters?}>", "desc": "Data bindings"},{"name": "opts.refreshInterval", "type": "number", "desc": "Refresh interval in ms", "default": "30000"}], "methods": [{"name": "refresh()", "desc": "Force refresh"},{"name": "destroy()", "desc": "Stop auto-refresh"}], "events": []}},
        ],
    },
    # ── Tier 9: Micro-Animations ───────────────────────────────────
    {
        "tier": 9, "category": "Micro-Animations (GSAP)",
        "components": [
            {"id": "typewriter", "name": "Typewriter", "icon": "ti ti-cursor-text", "ai_name": "frappe.visual.typewriter(container, opts)", "description": "Character-by-character typing animation with cursor blinking.", "description_ar": "رسوم متحركة للكتابة حرفًا بحرف مع وميض المؤشر.", "scenarios": ["Hero sections", "Loading messages", "Chatbot-style text"], "code": 'await frappe.visual.typewriter("#text", {\n  strings: ["Building the future...", "One component at a time..."],\n  speed: 80,\n  loop: true\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.strings", "type": "string[]", "desc": "Strings to type"},{"name": "opts.speed", "type": "number", "desc": "Typing speed ms/char", "default": "80"},{"name": "opts.loop", "type": "boolean", "desc": "Loop animation", "default": "false"}], "methods": [{"name": "start()", "desc": "Start typing"},{"name": "stop()", "desc": "Stop typing"}], "events": []}},
            {"id": "confetti", "name": "Confetti", "icon": "ti ti-confetti", "ai_name": "frappe.visual.confetti(opts)", "description": "Celebratory confetti particle burst animation.", "description_ar": "رسوم متحركة لانفجار جسيمات الكونفيتي الاحتفالية.", "scenarios": ["Success celebrations", "Achievements", "Milestones"], "code": 'frappe.visual.confetti({\n  particleCount: 150,\n  spread: 70\n});', "api": {"params": [{"name": "opts.particleCount", "type": "number", "desc": "Number of particles", "default": "150"},{"name": "opts.spread", "type": "number", "desc": "Spread angle", "default": "70"}], "methods": [], "events": []}},
            {"id": "numberTicker", "name": "Number Ticker", "icon": "ti ti-trending-up", "ai_name": "frappe.visual.numberTicker(container, opts)", "description": "Animated number counter with easing and formatting.", "description_ar": "عداد أرقام متحرك مع تخفيف وتنسيق.", "scenarios": ["Statistics display", "KPI counters", "Dashboard numbers"], "code": 'await frappe.visual.numberTicker("#counter", {\n  from: 0,\n  to: 12847,\n  duration: 2000,\n  prefix: "$"\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.from", "type": "number", "desc": "Start value"},{"name": "opts.to", "type": "number", "desc": "End value"},{"name": "opts.duration", "type": "number", "desc": "Animation duration ms"},{"name": "opts.prefix", "type": "string", "desc": "Value prefix"}], "methods": [{"name": "update(newValue)", "desc": "Animate to new value"}], "events": []}},
            {"id": "morphingText", "name": "Morphing Text", "icon": "ti ti-text-wrap-disabled", "ai_name": "frappe.visual.morphingText(container, opts)", "description": "Smooth text morphing animation between multiple strings.", "description_ar": "رسوم متحركة لتحويل النص بسلاسة بين سلاسل متعددة.", "scenarios": ["Multi-language greetings", "Rotating headlines", "Feature highlights"], "code": 'await frappe.visual.morphingText("#morph", {\n  texts: ["Hello", "مرحبا", "Bonjour"],\n  interval: 2000\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.texts", "type": "string[]", "desc": "Text variations"},{"name": "opts.interval", "type": "number", "desc": "Switch interval ms", "default": "2000"}], "methods": [{"name": "stop()", "desc": "Stop animation"}], "events": []}},
            {"id": "glowCard", "name": "Glow Card", "icon": "ti ti-sun", "ai_name": "frappe.visual.glowCard(container, opts)", "description": "Card with dynamic glow effect following cursor movement.", "description_ar": "بطاقة مع تأثير توهج ديناميكي يتبع حركة المؤشر.", "scenarios": ["Featured content", "Pricing cards", "Hero elements"], "code": 'await frappe.visual.glowCard("#card", {\n  color: "#6366f1",\n  intensity: 0.5,\n  content: "<h3>Premium</h3>"\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.color", "type": "string", "desc": "Glow color"},{"name": "opts.intensity", "type": "number", "desc": "Glow intensity 0-1"}], "methods": [], "events": []}},
            {"id": "ripple", "name": "Ripple Effect", "icon": "ti ti-ripple", "ai_name": "frappe.visual.ripple(container)", "description": "Material Design-style ripple click effect on any element.", "description_ar": "تأثير موجة نقر على نمط Material Design على أي عنصر.", "scenarios": ["Button click feedback", "Interactive elements", "Touch feedback"], "code": 'frappe.visual.ripple("#my-button");', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target element"}], "methods": [], "events": []}},
        ],
    },
    # ── Tier 10: Form Enhancement ──────────────────────────────────
    {
        "tier": 10, "category": "Form Enhancement",
        "components": [
            {"id": "tagInput", "name": "Tag Input", "icon": "ti ti-tags", "ai_name": "frappe.visual.tagInput(container, opts)", "description": "Multi-tag input field with autocomplete and validation.", "description_ar": "حقل إدخال وسوم متعدد مع إكمال تلقائي وتحقق.", "scenarios": ["Tagging systems", "Multi-select inputs", "Skill entry"], "code": 'await frappe.visual.tagInput("#tags", {\n  placeholder: "Add tags...",\n  suggestions: ["JavaScript", "Python", "CSS"]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.placeholder", "type": "string", "desc": "Input placeholder"},{"name": "opts.suggestions", "type": "string[]", "desc": "Autocomplete suggestions"}], "methods": [{"name": "getTags()", "desc": "Get current tags"},{"name": "addTag(tag)", "desc": "Add a tag"},{"name": "clear()", "desc": "Remove all tags"}], "events": [{"name": "tag:add", "desc": "Tag added"},{"name": "tag:remove", "desc": "Tag removed"}]}},
            {"id": "signaturePad", "name": "Signature Pad", "icon": "ti ti-writing-sign", "ai_name": "frappe.visual.signaturePad(container, opts)", "description": "Canvas-based signature capture with undo, clear, and export.", "description_ar": "التقاط توقيع قائم على Canvas مع التراجع والمسح والتصدير.", "scenarios": ["Document signing", "Approval workflows", "Contract signing"], "code": 'const sig = await frappe.visual.signaturePad("#sig", {\n  width: 400,\n  height: 200\n});\nconst dataUrl = sig.toDataURL();', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.width", "type": "number", "desc": "Canvas width"},{"name": "opts.height", "type": "number", "desc": "Canvas height"}], "methods": [{"name": "toDataURL()", "desc": "Export as image data URL"},{"name": "clear()", "desc": "Clear signature"},{"name": "undo()", "desc": "Undo last stroke"}], "events": [{"name": "change", "desc": "Signature changed"}]}},
            {"id": "wizard", "name": "Multi-Step Wizard", "icon": "ti ti-stairs-up", "ai_name": "frappe.visual.wizard(container, opts)", "description": "Multi-step form wizard with validation, progress, and navigation.", "description_ar": "معالج نموذج متعدد الخطوات مع التحقق والتقدم والتنقل.", "scenarios": ["Complex form entry", "Onboarding flows", "Configuration wizards"], "code": 'await frappe.visual.wizard("#wiz", {\n  steps: [\n    { title: "Details", fields: [{fieldname: "name", fieldtype: "Data"}] },\n    { title: "Review", content: "<div>Summary</div>" }\n  ]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.steps", "type": "Array<{title,fields?,content?}>", "desc": "Wizard steps"}], "methods": [{"name": "next()", "desc": "Go to next step"},{"name": "prev()", "desc": "Go to previous step"},{"name": "getValues()", "desc": "Get all form values"}], "events": [{"name": "step:change", "desc": "Step changed"},{"name": "complete", "desc": "Wizard completed"}]}},
            {"id": "codeEditor", "name": "Code Editor", "icon": "ti ti-code", "ai_name": "frappe.visual.codeEditor(container, opts)", "description": "Syntax-highlighted code editor with line numbers and language support.", "description_ar": "محرر أكواد مع تمييز البنية وأرقام الأسطر ودعم اللغات.", "scenarios": ["Custom script editing", "JSON config editors", "Template editing"], "code": 'const editor = await frappe.visual.codeEditor("#editor", {\n  language: "javascript",\n  value: "console.log(\'hello\')",\n  lineNumbers: true\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.language", "type": "string", "desc": "Syntax language"},{"name": "opts.value", "type": "string", "desc": "Initial content"},{"name": "opts.lineNumbers", "type": "boolean", "desc": "Show line numbers", "default": "true"}], "methods": [{"name": "getValue()", "desc": "Get editor content"},{"name": "setValue(code)", "desc": "Set editor content"}], "events": [{"name": "change", "desc": "Content changed"}]}},
            {"id": "richEditor", "name": "Rich Text Editor", "icon": "ti ti-bold", "ai_name": "frappe.visual.richEditor(container, opts)", "description": "WYSIWYG rich text editor with toolbar, formatting, and media embedding.", "description_ar": "محرر نصوص غنية WYSIWYG مع شريط أدوات وتنسيق وتضمين وسائط.", "scenarios": ["Blog editing", "Email composition", "Document content"], "code": 'const editor = await frappe.visual.richEditor("#editor", {\n  placeholder: "Start writing...",\n  toolbar: ["bold", "italic", "link", "image"]\n});', "api": {"params": [{"name": "container", "type": "HTMLElement | string", "desc": "Target"},{"name": "opts.placeholder", "type": "string", "desc": "Empty state text"},{"name": "opts.toolbar", "type": "string[]", "desc": "Toolbar buttons"}], "methods": [{"name": "getHTML()", "desc": "Get HTML content"},{"name": "setHTML(html)", "desc": "Set HTML content"}], "events": [{"name": "change", "desc": "Content changed"}]}},
        ],
    },
]


@frappe.whitelist()
def get_component_catalog():
    """Return the full component catalog for the Component Browser page."""
    frappe.has_permission("DocType", "read", throw=True)

    return {
        "catalog": COMPONENT_CATALOG,
        "stats": {
            "total_components": sum(
                len(tier["components"]) for tier in COMPONENT_CATALOG
            ),
            "total_tiers": len(COMPONENT_CATALOG),
            "total_shorthands": 287,
        },
    }
