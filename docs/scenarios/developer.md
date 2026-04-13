# Developer — Usage Scenarios
# سيناريوهات المطور

## Role Overview

- **Title**: App Developer / مطور التطبيقات
- **CAPS Capabilities**: FV_view_visual_hub, FV_use_app_map, FV_use_erd, FV_export_svg, FV_export_png, FV_change_layout
- **Primary DocTypes**: FV Component, FV Theme Preset, FV Layout Preset
- **Device**: Desktop

## Daily Scenarios (يومي)

### DS-001: Integrate Visual Component in Custom App

- **Goal**: Add a frappe_visual component to a Frappe app page
- **Pre-conditions**: frappe_visual installed, app page exists
- **Steps**:
  1. Navigate to `/app/fv-developer-console`
  2. Load the desired component via `frappe.visual.<component>()`
  3. Test with sample data in the REPL
  4. Copy the working code to the app's JS bundle
  5. Verify: component renders correctly with live data
- **Screen**: developer-console
- **Breakpoints**: Desktop ✅ / Tablet ⚠️ / Mobile ❌
- **Error scenarios**: Bundle not loaded (missing `frappe.require`), incorrect container selector

### DS-002: Generate ERD for Custom DocTypes

- **Goal**: Visualize relationships between app DocTypes
- **Pre-conditions**: DocTypes exist with Link fields
- **Steps**:
  1. Navigate to the Visual Hub or use `frappe.visual.erd()`
  2. Select DocTypes or module to include
  3. Review the generated ERD diagram
  4. Export as SVG/PNG for documentation
  5. Verify: all Link/Table fields shown as edges
- **Screen**: visual-hub
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ❌

### DS-003: Test API Endpoints

- **Goal**: Verify API responses for visual dashboard data
- **Pre-conditions**: Server running, authenticated session
- **Steps**:
  1. Navigate to `/app/fv-erp-api-tester`
  2. Select endpoint from dropdown
  3. Fill parameters
  4. Execute and inspect JSON response
  5. Verify: correct data structure and values
- **Screen**: api-tester
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ❌

## Weekly Scenarios (أسبوعي)

### WS-001: Review Component Gallery

- **Goal**: Explore available components for upcoming feature work
- **Pre-conditions**: frappe_visual installed
- **Steps**:
  1. Navigate to `/frappe-visual-gallery`
  2. Browse components by tier (Core, Business, Data Viz, etc.)
  3. Click component cards to see live demos
  4. Note component API and configuration options
  5. Verify: all components render correctly
- **Screen**: gallery
- **Breakpoints**: Desktop ✅ / Tablet ✅ / Mobile ✅

### WS-002: Build Custom Graph Layout

- **Goal**: Create a specialized graph visualization
- **Pre-conditions**: Data source available
- **Steps**:
  1. Open Developer Console
  2. Initialize `frappe.visual.engine()` with nodes/edges
  3. Test different layout algorithms (force, hierarchical, ELK)
  4. Customize node/edge styles
  5. Save configuration as a reusable preset
- **Screen**: developer-console
- **Breakpoints**: Desktop ✅ / Tablet ❌ / Mobile ❌

## Exception Scenarios (استثنائي)

### ES-001: Component Fails to Render

- **Goal**: Debug rendering issues
- **Steps**:
  1. Open browser DevTools console
  2. Check for JS errors in fv_core bundle
  3. Verify container element exists in DOM
  4. Check data format matches component expectations
  5. Report issue with reproduction steps
