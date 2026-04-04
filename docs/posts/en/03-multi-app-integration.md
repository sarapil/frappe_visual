<!-- Post Type: Multi-App Integration | Platform: discuss.frappe.io, Dev.to, Medium -->
<!-- Target: ERPNext ecosystem users looking for integrated solutions -->
<!-- Last Updated: 2026-04-04 -->

# 🔗 Frappe Visual + ERPNext Ecosystem: Better Together

> **How Frappe Visual integrates with ERPNext and other Arkan Lab apps to create a complete business solution**

---

## The Power of Integration

Frappe Visual doesn't work in isolation. It's designed to be part of a **connected ecosystem**:

- **ALL Frappe Apps** — seamless data flow and shared workflows
- **ERPNext** — seamless data flow and shared workflows
- **HRMS** — seamless data flow and shared workflows

## Real-World Scenario

Imagine this workflow:

1. **Customer contacts you** via WhatsApp (Arrowz handles this)
2. **Lead is created** automatically in ERPNext CRM (AuraCRM enriches it)
3. **Meeting scheduled** with video link (Arrowz + OpenMeetings)
4. **Project started** with full tracking (Frappe Visual manages the details)
5. **Invoicing** flows through ERPNext accounting
6. **Support** handled via omni-channel (Arrowz again)

**All in one system. Zero data silos. Complete audit trail.**

## The Arkan Lab Ecosystem

```
┌─────────────────────────────────────────────────┐
│              ERPNext Core                        │
│  (Accounting, Stock, HR, Manufacturing)          │
├─────────────────────────────────────────────────┤
│  📞 Arrowz — Communication Layer                │
│  💼 AuraCRM — Customer Intelligence             │
│  🏗️ Vertex — Construction Management            │
│  🏨 Velara — Hotel Management                   │
│  🕯️ Candela — Restaurant Management             │
│  🏢 ARKSpace — Coworking Management             │
├─────────────────────────────────────────────────┤
│  🛡️ CAPS — Unified Permissions                  │
│  🎨 Frappe Visual — UI Components               │
│  ❓ Arkan Help — Contextual Help                │
│  📦 Base Base — Shared Utilities                │
└─────────────────────────────────────────────────┘
```

## Install the Ecosystem

```bash
# Core utilities (recommended for all)
bench get-app caps && bench get-app frappe_visual && bench get-app arkan_help

# Your industry app
bench get-app frappe_visual

# Communication layer
bench get-app arrowz

# Install all
bench --site your-site install-app caps frappe_visual arkan_help frappe_visual arrowz
```

## Community

Join the discussion at discuss.frappe.io and share how you're using these apps together!

---

*All apps by Arkan Lab — https://arkan.it.com | Open Source*
