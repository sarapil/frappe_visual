# End User — Usage Scenarios
# سيناريوهات المستخدم النهائي

## Role Overview

- **Title**: End User (FV User) / المستخدم النهائي
- **CAPS Capabilities**: FV_view_visual_hub, FV_use_app_map, FV_use_erd, FV_use_storyboard, FV_use_kanban, FV_use_calendar, FV_use_gantt, FV_use_map, FV_use_gallery, FV_use_tree, FV_view_statistics
- **Primary DocTypes**: Read-only access to visual components
- **Device**: Desktop / Tablet / Mobile

## Daily Scenarios (يومي)

### DS-001: View Enhanced List

- **Goal**: Browse records using visual list modes
- **Pre-conditions**: Records exist in the DocType
- **Steps**:
  1. Navigate to any list view
  2. Use listEnhancer toggle (Table / Cards / Kanban / Timeline)
  3. Switch to Card view for visual browsing
  4. Use search/filter controls
  5. Verify: results match filter criteria
- **Screen**: list-view
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

### DS-002: View Enhanced Form

- **Goal**: See visual enhancements on document forms
- **Pre-conditions**: Document exists
- **Steps**:
  1. Open any document form
  2. View formEnhancer stats ribbon at top
  3. See relationship graph showing linked documents
  4. Click quick-link buttons to navigate related records
  5. Verify: all links navigate correctly
- **Screen**: form-view
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

### DS-003: Navigate via Workspace

- **Goal**: Use visually enhanced workspace for navigation
- **Pre-conditions**: Workspace configured
- **Steps**:
  1. Navigate to `/desk`
  2. Click app icon to enter workspace
  3. See workspaceEnhancer live counts and sparklines
  4. Use shortcut cards to navigate
  5. Verify: all links work, counts are accurate
- **Screen**: workspace
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

## Weekly Scenarios (أسبوعي)

### WS-001: Use Gantt View for Timeline

- **Goal**: View project/task timeline as Gantt chart
- **Pre-conditions**: Tasks with start/end dates exist
- **Steps**:
  1. Navigate to task list
  2. Switch to Gantt view via listEnhancer
  3. Drag to adjust dates (if permitted)
  4. Click task bar for details
  5. Verify: date ranges displayed correctly
- **Screen**: gantt-view
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ❌

### WS-002: Browse Image Gallery

- **Goal**: View document attachments in gallery mode
- **Pre-conditions**: Documents with image attachments exist
- **Steps**:
  1. Open gallery component on workspace or form
  2. Browse images in grid layout
  3. Click image to open in lightbox
  4. Use navigation arrows in lightbox
  5. Verify: all images load and display correctly
- **Screen**: gallery
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

## Exception Scenarios (استثنائي)

### ES-001: Visual Component Not Visible

- **Goal**: Troubleshoot missing visual features
- **Steps**:
  1. Check if frappe_visual is installed: `bench --site <site> list-apps`
  2. Verify CAPS capabilities assigned to your role
  3. Clear browser cache and hard refresh
  4. Contact admin if capability is missing
