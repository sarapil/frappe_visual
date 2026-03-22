# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Current release |

## Reporting a Vulnerability

If you discover a security vulnerability in Frappe Visual, please report it responsibly:

### Contact
- **Email**: moatazsarapil@gmail.com
- **Subject**: `[SECURITY] Frappe Visual - Brief Description`

### What to Include
1. Description of the vulnerability
2. Steps to reproduce
3. Impact assessment (data exposure, unauthorized access, etc.)
4. Affected version(s)
5. Suggested fix (if available)

### Response Timeline
- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 5 business days
- **Fix release**: Within 7 days for critical issues

### What to Expect
- We will confirm receipt of your report
- We will investigate and assess the severity
- We will develop and test a fix
- We will release a patch and credit you (if desired)

## Security Measures

### Server-Side
- All API endpoints require authentication (`@frappe.whitelist()`)
- QueryBuilder only — no raw SQL queries
- License keys encrypted at rest (Password field type)
- No external network requests

### Client-Side
- Canvas rendering (Cytoscape.js) — immune to XSS
- HTML labels sanitized before rendering
- No `eval()` or dynamic code execution
- Content Security Policy (CSP) compatible

### Data Privacy
- No personal data collected or processed
- No telemetry or usage tracking
- No cookies beyond Frappe session
- GDPR compliant by design

## Third-Party Dependencies

All bundled dependencies are open-source with compatible licenses:
- Cytoscape.js (MIT)
- ELK.js (EPL-2.0)
- GSAP (Standard License)
- Lottie-web (MIT)
- Tippy.js (MIT)
