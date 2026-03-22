# Frappe Visual — Quality Assurance

## Testing Strategy

### Unit Tests
- **Python**: `frappe_visual/tests/test_api.py`, `test_license.py`
- **Framework**: Frappe's unittest runner
- **Coverage target**: 80%+

### Integration Tests
- API endpoint responses
- License validation flows
- Settings DocType CRUD

### Manual Testing Checklist

#### Visual Hub
- [ ] Page loads without errors
- [ ] App dropdown shows all installed apps
- [ ] Selecting app renders graph
- [ ] All 9 layouts work
- [ ] Search filters nodes correctly
- [ ] Minimap renders and navigates
- [ ] Dark mode toggle works
- [ ] RTL mode works
- [ ] SVG export downloads valid file
- [ ] PNG export downloads valid file

#### Relationship Explorer
- [ ] Double-click opens explorer
- [ ] Depth 1/2/3 all work
- [ ] "Load more" expands correctly
- [ ] Back navigation works

#### Premium Features
- [ ] Feature gating blocks correctly on free tier
- [ ] All features unlock with valid license
- [ ] Frappe Cloud auto-detection works

---

## Code Quality Standards

### Python
- [ ] No raw SQL (QueryBuilder only)
- [ ] All functions have docstrings
- [ ] Type hints on public functions
- [ ] No circular imports
- [ ] `@frappe.whitelist()` on all API endpoints

### JavaScript
- [ ] No `var` declarations (use `const`/`let`)
- [ ] No global namespace pollution
- [ ] All strings wrapped in `__()` for i18n
- [ ] No `eval()` or `Function()`
- [ ] `destroy()` method on all classes

### CSS
- [ ] CSS custom properties for all colors
- [ ] Logical properties for RTL
- [ ] No `!important` overrides
- [ ] Mobile-responsive

---

## CI/CD Pipeline

### On Every PR
1. Lint Python (ruff)
2. Lint JavaScript (eslint)
3. Run Python tests
4. Check Frappe compatibility

### On Release
1. All PR checks
2. Build production assets
3. Tag version
4. Generate release notes
