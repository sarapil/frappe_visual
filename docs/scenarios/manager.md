# FV Manager — Usage Scenarios

# سيناريوهات المدير المرئي

## Role Overview

- **Title**: Visual Manager / المدير المرئي
- **CAPS Capabilities**: FV_view_visual_hub, FV_use_app_map, FV_use_erd, FV_use_storyboard, FV_use_kanban, FV_use_calendar, FV_use_gantt, FV_use_map, FV_use_gallery, FV_use_tree, FV_export_svg, FV_export_png, FV_change_layout, FV_view_statistics
- **Primary DocTypes**: FV Component, FV Theme Preset, FV Layout Preset
- **Device**: Desktop / Tablet

## Daily Scenarios (يومي)

### DS-001: Review Visual Dashboards

- **Goal**: Monitor KPIs and business metrics through visual dashboards
- **Pre-conditions**: Dashboard data sources configured
- **Steps**:
  1. Navigate to Frappe Visual workspace
  2. Review SceneEngine workspace header with live KPIs
  3. Click through data cards for drill-down
  4. Check heatmap for activity patterns
  5. Verify: all KPIs current and accurate
- **Screen**: workspace-dashboard
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ⚠️

### DS-002: Create Kanban Board for Team

- **Goal**: Set up a Kanban board for team task tracking
- **Pre-conditions**: DocType with status field exists
- **Steps**:
  1. Navigate to list view of target DocType
  2. Switch to Kanban view via listEnhancer toggle
  3. Configure columns based on status values
  4. Drag-and-drop cards between columns
  5. Verify: status updates reflected in backend
- **Screen**: kanban-view
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ⚠️

### DS-003: View Calendar Schedule

- **Goal**: Visualize scheduled events on calendar
- **Pre-conditions**: DocType with date fields exists
- **Steps**:
  1. Navigate to VisualCalendar page or list view calendar toggle
  2. Switch between day/week/month views
  3. Click event to view details
  4. Drag event to reschedule
  5. Verify: date changes saved to backend
- **Screen**: calendar-view
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

## Weekly Scenarios (أسبوعي)

### WS-001: Review App Map

- **Goal**: Understand application structure and module relationships
- **Pre-conditions**: App installed with DocTypes
- **Steps**:
  1. Open Visual Hub
  2. Select App Map component
  3. Choose target app from dropdown
  4. Explore nodes (modules) and edges (dependencies)
  5. Export as SVG for documentation
- **Screen**: visual-hub
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ❌

### WS-002: Build Storyboard Presentation

- **Goal**: Create a guided walkthrough for stakeholders
- **Pre-conditions**: Content/screenshots available
- **Steps**:
  1. Use `frappe.visual.storyboard()` or Storyboard page
  2. Add slides with titles, descriptions, screenshots
  3. Configure navigation (previous/next buttons)
  4. Add GSAP animations between slides
  5. Share URL with stakeholders
- **Screen**: storyboard
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

## Monthly Scenarios (شهري)

### MS-001: Generate Reports with Charts

- **Goal**: Create visual reports combining data visualization
- **Pre-conditions**: Report data available
- **Steps**:
  1. Open report view
  2. Add visual charts (donut, area, funnel, radar)
  3. Configure data sources and filters
  4. Export report with embedded charts
  5. Verify: chart data matches report totals
- **Screen**: report-dashboard
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ⚠️

## Exception Scenarios (استثنائي)

### ES-001: Dashboard Data Not Loading

- **Goal**: Resolve empty dashboard state
- **Steps**:
  1. Check browser console for API errors
  2. Verify user has FV_view_statistics capability
  3. Clear cache: `bench --site <site> clear-cache`
  4. Rebuild: `bench build --app frappe_visual`
  5. Refresh browser (Ctrl+Shift+R)
