# Frappe Visual — Metrics Definition

## Key Performance Indicators (KPIs)

### Adoption Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Monthly Active Sites | Sites with ≥1 API call/month | 100+ in 6 months |
| Weekly Active Users | Users visiting Visual Hub/week | 500+ in 6 months |
| Install Rate | New installations per month | 50+/month |
| Retention (30-day) | % of sites still active after 30 days | >60% |

### Engagement Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Graphs Generated | AppMap/RelationshipExplorer renders | Track trend |
| Avg Session Duration | Time on Visual Hub page | >3 minutes |
| Layout Switches | Number of layout changes per session | >2 (exploration) |
| Export Count | SVG/PNG exports per month | Track trend |
| Feature Discovery | % of users using ≥3 features | >40% |

### Revenue Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| MRR | Monthly Recurring Revenue | $5K in 12 months |
| Conversion Rate | Free → Paid conversion | >5% |
| Churn Rate | Monthly cancellation rate | <5% |
| ARPU | Average Revenue Per User | $50/month |
| LTV | Lifetime Value | >$600 |

### Technical Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| API P95 Latency | 95th percentile response time | <2 seconds |
| Bundle Load Time | Time to load main JS bundle | <1 second |
| Graph Render Time | Time from API response to render | <3 seconds |
| JS Error Rate | Client errors per 1000 renders | <5 |
| Build Success Rate | CI/CD green builds | >95% |

---

## Measurement Methods

### Server-Side
- Frappe's built-in request logger
- Custom `frappe.logger("frappe_visual")` calls
- Redis metrics for cache hit rate

### Client-Side
- `performance.measure()` API
- Error event listeners
- Custom analytics events (opt-in)

### Business
- Frappe Cloud Marketplace analytics
- License key activation tracking
- GitHub stars/forks as proxy metrics
