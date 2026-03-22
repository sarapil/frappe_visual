# Frappe Visual — Security Whitepaper

## Overview

Frappe Visual is a client-side visualization framework that runs entirely within the Frappe security model. This document outlines the security architecture, threat model, and mitigations.

---

## Architecture Security

### No External Dependencies at Runtime
- All JavaScript libraries (Cytoscape.js, ELK.js, GSAP) are bundled locally
- No CDN loading — no third-party network requests
- No analytics or telemetry
- No phone-home for license validation

### Frappe Security Model
- All API endpoints use `@frappe.whitelist()` — requires authentication
- DocType permissions enforced server-side
- Role-based access control (RBAC) via Frappe's permission system
- Session management handled by Frappe core

### Data Access
- Frappe Visual reads DocType metadata only (structure, not user data)
- Uses `frappe.get_meta()` for schema information
- Uses QueryBuilder (no raw SQL) — parameterized queries
- No direct database access — all through Frappe ORM

---

## Threat Model

### T1: Unauthorized API Access
**Risk**: Unauthenticated users accessing graph data
**Mitigation**: All endpoints use `@frappe.whitelist()`, requiring valid session

### T2: Data Leakage via Visualization
**Risk**: Users seeing doctype structures they shouldn't access
**Mitigation**: Server-side permission checks before returning metadata

### T3: XSS via Node Labels
**Risk**: Malicious doctype names executing JavaScript
**Mitigation**: Cytoscape.js renders on canvas (not DOM), immune to HTML injection. HTML label extension sanitizes input.

### T4: License Key Exposure
**Risk**: License keys visible in browser
**Mitigation**: Keys stored as Password field type (encrypted at rest), never sent to client

### T5: Denial of Service
**Risk**: Requesting graphs for apps with thousands of doctypes
**Mitigation**: Server-side pagination, client-side node limits, lazy loading

---

## Compliance

### Data Privacy
- No personal data processed
- No user tracking
- No cookies beyond Frappe session
- GDPR-compatible (no additional data collection)

### Code Security
- Open source (GPL-3.0) — auditable
- GitHub Actions CI/CD with linting
- No eval() or dynamic code execution
- Content Security Policy compatible
