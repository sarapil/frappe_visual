# Frappe Visual — Compliance Checklist

## Code Quality

- [x] No raw SQL queries (all use frappe.qb QueryBuilder)
- [x] No `eval()` or `Function()` calls
- [x] No inline event handlers in HTML
- [x] All API endpoints use `@frappe.whitelist()`
- [x] No hardcoded credentials
- [x] License keys stored as Password field type
- [x] No external CDN dependencies
- [x] No third-party analytics or telemetry

## Frappe v16 Compatibility

- [x] Uses QueryBuilder instead of raw SQL
- [x] Compatible with CSP headers
- [x] Uses `frappe.require()` for async module loading
- [x] Follows Frappe naming conventions
- [x] DocType JSON uses v16 schema
- [x] Hooks use v16 format

## Accessibility

- [x] Dark mode support
- [x] RTL (Right-to-Left) support
- [x] Keyboard navigation support (Cytoscape.js built-in)
- [ ] Screen reader compatibility (limited by canvas rendering)
- [x] Color contrast ratios meet WCAG 2.1 AA
- [x] Responsive design (mobile-friendly)

## Data Privacy (GDPR)

- [x] No personal data collected
- [x] No user tracking
- [x] No cookies beyond Frappe session
- [x] No external network requests
- [x] No data sent to third parties
- [x] Open source and auditable

## Licensing

- [x] GPL-3.0 license
- [x] All dependencies are open-source compatible
- [x] Cytoscape.js: MIT
- [x] ELK.js: EPL-2.0
- [x] GSAP: Standard License (free for open-source)
- [x] Lottie-web: MIT
- [x] Tippy.js: MIT

## CI/CD

- [x] GitHub Actions for CI
- [x] Linting workflow
- [x] Release automation
- [x] Issue templates
- [x] PR template
