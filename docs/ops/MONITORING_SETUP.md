# Frappe Visual — Monitoring Setup

## What to Monitor

Frappe Visual is a lightweight app with minimal server-side footprint. Monitoring focuses on:

1. **API response times** — detect slow metadata queries
2. **Client-side errors** — JavaScript rendering failures
3. **License validation** — track key validation patterns
4. **Build health** — asset compilation status

---

## Server-Side Monitoring

### Frappe Logger

```python
# Enable in site_config.json
{
    "logging": 1,
    "enable_frappe_logger": 1
}
```

### API Endpoint Health Check

```bash
# Simple health check (requires auth)
curl -s -o /dev/null -w "%{http_code}" \
    "https://mysite.com/api/method/frappe_visual.api.get_quick_stats?app_name=frappe"
```

### Monitor Specific Metrics

```python
# Custom monitoring script
import frappe
import time

def check_frappe_visual_health():
    """Run as scheduled task or external monitor."""
    
    # Check API response time
    start = time.time()
    try:
        from frappe_visual.api import get_quick_stats
        result = get_quick_stats("frappe")
        elapsed = time.time() - start
        
        if elapsed > 5.0:
            frappe.logger("frappe_visual").warning(
                f"Slow API response: {elapsed:.2f}s"
            )
        
        return {"status": "healthy", "response_time": elapsed}
    except Exception as e:
        return {"status": "error", "error": str(e)}
```

---

## Client-Side Monitoring

### Browser Error Tracking

```javascript
// Add to fv_bootstrap.js or site-level script
window.addEventListener("error", (event) => {
    if (event.filename && event.filename.includes("frappe_visual")) {
        frappe.call({
            method: "frappe.client.log_error",
            args: {
                title: "Frappe Visual JS Error",
                message: `${event.message} at ${event.filename}:${event.lineno}`
            }
        });
    }
});
```

### Performance Marks

```javascript
// Already built into the loading flow
performance.mark("fv-bundle-load-start");
frappe.require("frappe_visual.bundle.js", () => {
    performance.mark("fv-bundle-load-end");
    performance.measure("fv-bundle-load", 
        "fv-bundle-load-start", "fv-bundle-load-end");
});
```

---

## Alerting

### Recommended Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| API response > 5s | Warning | Check DB performance |
| API response > 15s | Critical | Scale resources |
| JS errors > 10/hour | Warning | Check browser compat |
| License failures > 10/hour | Warning | Check for abuse |
| Build failure | Critical | Fix and rebuild |
