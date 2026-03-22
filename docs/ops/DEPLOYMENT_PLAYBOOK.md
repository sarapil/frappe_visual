# Frappe Visual — Deployment Playbook

## Pre-Deployment Checklist

- [ ] All tests pass: `bench --site mysite run-tests --app frappe_visual`
- [ ] Assets build without errors: `bench build --app frappe_visual`
- [ ] No linting errors
- [ ] CHANGELOG.md updated
- [ ] Version bumped in `__init__.py` and `pyproject.toml`
- [ ] Git tag created: `git tag v0.1.0`

---

## Deployment: Frappe Cloud

### First-Time Installation
1. Navigate to site dashboard → Apps
2. Search "Frappe Visual" in Marketplace
3. Click "Install"
4. Wait for deployment (typically 2-5 minutes)
5. Navigate to `/app/visual-hub`

### Updates
- Automatic if subscribed to "latest" channel
- Manual: Site dashboard → Apps → Frappe Visual → Update

---

## Deployment: Self-Hosted (Production)

### Step 1: Install App
```bash
cd ~/frappe-bench
bench get-app --branch main https://github.com/ArkanLab/frappe_visual.git
bench --site production.mysite.com install-app frappe_visual
```

### Step 2: Build Production Assets
```bash
bench build --app frappe_visual --production
```

### Step 3: Migrate
```bash
bench --site production.mysite.com migrate
```

### Step 4: Clear Cache
```bash
bench --site production.mysite.com clear-cache
```

### Step 5: Restart
```bash
sudo supervisorctl restart all
# or
bench restart
```

### Step 6: Verify
```bash
# Check app is listed
bench --site production.mysite.com list-apps | grep frappe_visual

# Check version
bench version | grep frappe_visual

# Test API
curl -s "https://production.mysite.com/api/method/frappe_visual.api.get_quick_stats?app_name=frappe" \
    -H "Authorization: token api_key:api_secret"
```

---

## Rollback Procedure

```bash
# 1. Restore backup
bench --site production.mysite.com restore /path/to/backup.sql.gz

# 2. Revert app to previous version
cd apps/frappe_visual
git checkout v0.0.9  # previous version tag

# 3. Rebuild
bench build --app frappe_visual --production

# 4. Migrate
bench --site production.mysite.com migrate

# 5. Restart
bench restart
```

---

## Zero-Downtime Deployment

For sites with high availability requirements:

```bash
# 1. Build on staging first
bench build --app frappe_visual --production

# 2. Hot-swap assets (Nginx serves static files)
# Assets are already in the correct location after build

# 3. Migrate (locks briefly)
bench --site production.mysite.com migrate

# 4. Graceful reload
sudo supervisorctl signal HUP frappe-bench-web:*
```
