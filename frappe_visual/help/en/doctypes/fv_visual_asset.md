---
title: FV Visual Asset
icon: photo
context_type: doctype
context_reference: FV Visual Asset
priority: 20
roles: [FV Admin, FV Manager]
---

# FV Visual Asset

**FV Visual Asset** stores persistent visual configurations — saved whiteboard states, data storytelling chapters, custom graph layouts, and reusable dashboard templates.

## Asset Types

| Type                   | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| **Story**              | Data Storytelling chapters with scroll-triggered chart reveals  |
| **Whiteboard**         | Freeform drawing/diagram saved state (SVG + metadata)           |
| **Graph Layout**       | Custom graph engine layouts for specific DocType visualizations |
| **Dashboard Template** | Reusable dashboard widget configurations                        |

## # title

Human-readable name for this visual asset.

## # asset_type

The type of visual content: Story, Whiteboard, Graph Layout, or Dashboard Template.

## # asset_data

JSON blob containing the full asset configuration. Validated on save.

## # is_public

When enabled, this asset is visible to all users with the `FV_view_visual_hub` capability. When disabled, only the owner can see it.

## # reference_doctype

Optional link to a specific DocType — makes this asset context-aware (e.g., a whiteboard diagram for "Sales Order" appears when viewing Sales Orders).

## # reference_name

Optional link to a specific record — makes this asset record-specific.

## # thumbnail

Auto-generated thumbnail image for gallery/card views.
