# Frappe Visual — Troubleshooting

## Common Issues

### 1. Visual Hub shows blank page

**Symptoms**: Navigate to `/app/visual-hub` but no content appears.

**Solutions**:
```bash
# Rebuild assets
bench build --app frappe_visual --force

# Clear all caches
bench --site mysite clear-cache
bench --site mysite clear-website-cache

# Hard refresh browser (Ctrl+Shift+R)
```

### 2. "frappe.visual is undefined" in console

**Symptoms**: JavaScript error when trying to use the API.

**Cause**: Bootstrap not loaded or build failed.

**Solutions**:
```bash
# Check if bootstrap is in hooks
grep "fv_bootstrap" apps/frappe_visual/frappe_visual/hooks.py

# Rebuild
bench build --app frappe_visual

# Verify asset exists
ls sites/assets/frappe_visual/js/fv_bootstrap.js
```

### 3. Graph renders but nodes overlap

**Symptoms**: All nodes pile up in the center.

**Solutions**:
- Switch to a different layout (try "elk-layered")
- Increase the graph container size
- Check if the container has explicit height:
  ```css
  #my-container { height: 600px; }
  ```

### 4. ELK layouts not working

**Symptoms**: Only fcose and breadthfirst layouts work.

**Cause**: ELK.js Web Worker may fail to load.

**Solutions**:
```bash
# Check if elkjs is installed
ls apps/frappe_visual/node_modules/elkjs/

# Reinstall dependencies
cd apps/frappe_visual && npm install

# Rebuild
bench build --app frappe_visual
```

### 5. Dark mode not switching

**Symptoms**: Theme stays light even when Frappe dark mode is enabled.

**Solutions**:
- Check "Auto Dark Mode" is enabled in Settings
- Verify ThemeManager is initialized:
  ```javascript
  console.log(frappe.visual?.themeManager?.currentTheme);
  ```
- Check MutationObserver:
  ```javascript
  document.documentElement.getAttribute("data-theme");
  ```

### 6. License key not validating

**Symptoms**: "Invalid license" even with correct key.

**Solutions**:
```python
# Check key format (must be XXXX-XXXX-XXXX-HASH)
bench --site mysite console
>>> from frappe_visual.utils.license import LicenseValidator
>>> v = LicenseValidator()
>>> v._validate_key("YOUR-KEY-HERE")

# Clear Redis cache
>>> import frappe
>>> frappe.cache().delete_value("fv_license_status")
```

### 7. RTL layout incorrect

**Symptoms**: Elements don't flip properly in Arabic.

**Solutions**:
- Verify Frappe's HTML dir attribute:
  ```javascript
  document.documentElement.getAttribute("dir"); // should be "rtl"
  ```
- Check "Auto RTL" in Settings
- Force RTL:
  ```javascript
  frappe.visual.themeManager.setRTL(true);
  ```

### 8. Export produces empty file

**Symptoms**: SVG/PNG download but image is blank.

**Solutions**:
- Ensure graph has rendered before exporting
- Check container visibility (not hidden by tab)
- Try zooming to fit first:
  ```javascript
  cy.fit();
  // Then export
  ```

### 9. Performance issues with large apps

**Symptoms**: UI freezes when visualizing apps with 500+ DocTypes.

**Solutions**:
- Use ELK layouts (computed in Web Worker, doesn't block UI)
- Disable animations in Settings
- Disable minimap for very large graphs
- Use search/filter to reduce visible nodes

### 10. Migration errors after install

**Symptoms**: Database errors when running `bench migrate`.

**Solutions**:
```bash
# Run migrate with verbose output
bench --site mysite migrate --verbose

# If specific DocType fails, recreate
bench --site mysite console
>>> frappe.delete_doc("DocType", "Frappe Visual Settings", force=1)
>>> exit
bench --site mysite migrate
```
