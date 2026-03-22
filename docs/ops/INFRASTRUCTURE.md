# Frappe Visual — Infrastructure Guide

## Requirements

### Minimum (Free Tier)
- Frappe v16+
- Python 3.11+
- Node.js 18+
- MariaDB 10.6+
- Redis 6+
- 512 MB RAM (for build process)

### Recommended (Premium)
- Same as above
- 1 GB RAM (for ELK.js layout computation)

### Frappe Cloud
- No infrastructure management needed
- Auto-provisioned on app installation
- Scaling handled by Frappe Cloud

---

## Self-Hosted Architecture

```
┌─────────────────────────────────────┐
│  Browser (Client)                   │
│  ├── fv_bootstrap.js (2KB, global)  │
│  └── frappe_visual.bundle.js (400KB)│
│      ├── Cytoscape.js               │
│      ├── ELK.js (Web Worker)        │
│      ├── GSAP                       │
│      └── App Components             │
└──────────────┬──────────────────────┘
               │ HTTP/WS
┌──────────────┴──────────────────────┐
│  Frappe Web Server (Gunicorn)       │
│  ├── frappe_visual/api.py           │
│  ├── frappe_visual/utils/           │
│  └── Frappe Core (ORM, Auth, etc.)  │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│  MariaDB │ Redis (Cache + Queue)    │
└─────────────────────────────────────┘
```

### Key Points
- **No additional services** — Frappe Visual uses existing Frappe infrastructure
- **No background workers** required (all synchronous)
- **ELK.js runs client-side** in a Web Worker (no server CPU impact)
- **Redis caching** used for license validation (1hr TTL)

---

## Docker Deployment

```yaml
# Works with standard Frappe Docker images
# No additional containers needed
# Just install the app:
# bench get-app frappe_visual
# bench --site mysite install-app frappe_visual
```

---

## CDN / Static Assets

Assets are served by Frappe's built-in static file server.

For production with Nginx:
```nginx
location /assets/frappe_visual/ {
    alias /home/frappe/frappe-bench/sites/assets/frappe_visual/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Resource Usage

| Resource | Usage | Notes |
|----------|-------|-------|
| Disk | ~5 MB | App code + bundled JS |
| RAM (server) | ~10 MB | Metadata caching |
| RAM (client) | ~50-200 MB | Depends on graph size |
| CPU (server) | Minimal | Metadata queries only |
| CPU (client) | Moderate | Graph rendering + layout |
| Network | ~400 KB | Initial bundle load (cached) |
