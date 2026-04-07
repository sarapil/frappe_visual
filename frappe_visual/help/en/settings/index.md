---
title: Settings & Configuration
icon: settings
context_type: index
priority: 3
---

# Settings & Configuration — Frappe Visual

All Frappe Visual configuration is managed through the **Frappe Visual Settings** DocType.

## Accessing Settings

1. Navigate to **Frappe Visual Settings** from the search bar, or
2. Go to `/desk#Form/Frappe Visual Settings`

## Configuration Options

### License

- **License Key**: Your Frappe Visual license key (for premium features)
- **License Status**: Auto-validated (Active / Expired / Trial)

### Default Theme

- **Default Theme**: Select from available FV Theme records
- **Dark Mode**: Enable/disable dark mode globally

### Performance

- **Lazy Load Components**: Load components on demand (recommended: ON)
- **Enable Auto-Enhancers**: Toggle form/list/workspace auto-enhancement
- **Cache TTL**: How long to cache visual data (default: 300 seconds)

### Notifications

- **Enable Snoozing**: Allow users to snooze notifications
- **Default Snooze Duration**: Minutes for default snooze (default: 30)

### Advanced

- **Debug Mode**: Show component boundaries and performance metrics
- **Icon Sprite**: Regenerate the icon sprite sheet

## CAPS Requirement

Managing settings requires the **FV_manage_settings** capability.

## Related

- [Frappe Visual Settings DocType](../doctypes/frappe_visual_settings.md)
- [FV Theme DocType](../doctypes/fv_theme.md)
