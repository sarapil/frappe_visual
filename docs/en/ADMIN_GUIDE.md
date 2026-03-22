# Admin Guide — Frappe Visual

## Installation

### Requirements
- Frappe v16 or later
- Python 3.11+
- Node.js 18+

### Installation Steps

```bash
# Install the app
bench get-app --branch main https://github.com/ArkanLab/frappe_visual.git

# Install on site
bench --site mysite install-app frappe_visual

# Build assets
bench build --app frappe_visual
```

---

## Configuration

Navigate to: **Setup → Settings → Frappe Visual Settings**

### License Key
- **Frappe Cloud**: No key needed (auto-detected)
- **Self-hosted**: Enter key in format `XXXX-XXXX-XXXX-HASH`

### Default Layout
Choose the default graph layout:
- fcose (force-directed)
- breadthfirst (hierarchical)
- elk-layered (ELK layered)
- elk-tree (ELK tree)
- elk-stress (ELK stress)
- elk-radial (ELK radial)

### Options
- ✅ **Enable Animations** — GSAP effects
- ✅ **Enable Minimap** — Minimap navigation
- ✅ **Auto Dark Mode** — Follow browser settings
- ✅ **Auto RTL** — Follow site language

---

## Permissions

### Required Roles
- **System Manager**: Full access (Read, Write, Create, Delete)
- **All Users**: Can access Visual Hub (read-only)

---

## Troubleshooting

### Assets not loading
```bash
bench build --app frappe_visual --force
bench --site mysite clear-cache
```

### Database errors
```bash
bench --site mysite migrate
```

### Real-time not working
```bash
ps aux | grep socketio
bench restart
```

---

## Updating

```bash
cd apps/frappe_visual
git pull origin main
bench setup requirements --node
bench build --app frappe_visual
bench --site mysite migrate
bench --site mysite clear-cache
bench restart
```

---

## Backup & Restore

```bash
# Full backup
bench --site mysite backup

# Restore
bench --site mysite restore /path/to/backup.sql.gz
```
