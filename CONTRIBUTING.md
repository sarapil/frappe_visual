# Contributing to Frappe Visual

Thank you for your interest in contributing to Frappe Visual! 🎉

## Getting Started

### Prerequisites
- Frappe v16+ development environment
- Python 3.11+
- Node.js 18+

### Setup

```bash
# Clone and install
bench get-app --branch develop https://github.com/ArkanLab/frappe_visual.git
bench --site dev.localhost install-app frappe_visual

# Install JS dependencies
cd apps/frappe_visual && npm install

# Build for development
bench build --app frappe_visual

# Watch mode
bench watch --apps frappe_visual
```

## Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Changes
- Python code: `frappe_visual/`
- JavaScript core: `frappe_visual/public/js/frappe_visual/core/`
- Components: `frappe_visual/public/js/frappe_visual/components/`
- Styles: `frappe_visual/public/scss/`

### 3. Test Your Changes
```bash
# Python tests
bench --site dev.localhost run-tests --app frappe_visual

# Build and check for errors
bench build --app frappe_visual
```

### 4. Submit a Pull Request
- Fill out the PR template
- Reference any related issues
- Add screenshots for UI changes

## Code Standards

### Python
- Use `frappe.qb` (QueryBuilder) — no raw SQL
- Add docstrings to all public functions
- Use type hints
- All API endpoints need `@frappe.whitelist()`

### JavaScript
- Use `const`/`let` — no `var`
- Wrap user-facing strings in `__()`
- Add JSDoc comments
- Implement `destroy()` on classes

### CSS/SCSS
- Use CSS custom properties for colors
- Use logical properties for RTL support
- No `!important` unless absolutely necessary

## Commit Messages

Follow conventional commits:
```
feat: add new layout algorithm
fix: correct RTL minimap position
docs: update API documentation
refactor: simplify DataAdapter
test: add license validation tests
```

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

## Requesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## Code of Conduct

Be respectful, inclusive, and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## License

By contributing, you agree that your contributions will be licensed under GPL-3.0.
