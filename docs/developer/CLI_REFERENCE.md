# Frappe Visual — CLI Reference

> Command-line operations for development, building, and deployment

---

## Bench Commands

### Installation

```bash
# Install from Git
bench get-app --branch main https://github.com/ArkanLab/frappe_visual.git

# Install on site
bench --site mysite.localhost install-app frappe_visual

# Verify installation
bench --site mysite.localhost list-apps
```

### Building

```bash
# Build all assets
bench build --app frappe_visual

# Watch mode (development)
bench watch --apps frappe_visual

# Build with production optimization
bench build --app frappe_visual --production
```

### Database & Migrations

```bash
# Run migrations after doctype changes
bench --site mysite.localhost migrate

# Clear cache
bench --site mysite.localhost clear-cache

# Clear website cache
bench --site mysite.localhost clear-website-cache
```

### Updates

```bash
# Pull latest code
cd apps/frappe_visual && git pull origin main

# Update dependencies
bench setup requirements --node
bench setup requirements --python

# Full update cycle
bench update --apps frappe_visual --no-backup
```

---

## Development Commands

### Create new components

```bash
# Navigate to app directory
cd apps/frappe_visual

# Run linters
npx eslint frappe_visual/public/js/ --fix
```

### Testing

```bash
# Run Python tests
bench --site mysite.localhost run-tests --app frappe_visual

# Run specific test
bench --site mysite.localhost run-tests \
    --app frappe_visual \
    --module frappe_visual.tests.test_api

# Run with verbose output
bench --site mysite.localhost run-tests --app frappe_visual -v
```

### Debugging

```bash
# Start bench with debug logging
bench start --verbose

# Check Frappe console
bench --site mysite.localhost console
>>> import frappe_visual
>>> print(frappe_visual.__version__)

# Check installed version
bench version --format json | grep frappe_visual
```

---

## Deployment Commands

### Production Setup

```bash
# Setup production (Supervisor + Nginx)
sudo bench setup production $USER

# Restart after config changes
bench restart

# Setup SSL
bench setup lets-encrypt mysite.com
```

### Maintenance

```bash
# Backup
bench --site mysite.localhost backup

# Restore
bench --site mysite.localhost restore \
    /path/to/database.sql.gz

# Disable maintenance mode
bench --site mysite.localhost set-maintenance-mode off
```
