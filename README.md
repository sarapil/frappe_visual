# Frappe Visual

<div align="center">

<img src="frappe_visual/public/images/frappe_visual-logo.svg" alt="Frappe Visual Logo" width="180">

**Graph-based Visual UX Framework for Frappe v16**

Interactive node-graph visualizations for application architecture, doctype relationships, and data models.

Powered by **Cytoscape.js + ELK.js + GSAP + Lottie-web**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](LICENSE)
[![Frappe v16](https://img.shields.io/badge/Frappe-v16-blue.svg)](https://frappeframework.com)

</div>

---

<div dir="rtl">

## فريب فيجوال

إطار عمل بصري مبني على الرسوم البيانية لمنصة فريب — تصورات تفاعلية لهيكلية التطبيقات وعلاقات أنواع المستندات ونماذج البيانات.

</div>

---

## ✨ Features

- 🗺️ **App Map** — Complete interactive visualization of any Frappe app structure
- 🔗 **Relationship Explorer** — DocType relationship graphs with depth expansion
- 🎬 **Storyboard Wizard** — Multi-step animated wizard with branching logic
- 📊 **Visual Dashboard** — Card-based widgets with badges and sparklines
- 🪟 **Floating Windows** — Desktop-style draggable detail panels
- 🎨 **30+ Node Types** — Semantic color system for every DocType category
- 🌙 **Dark Mode** — Complete dark theme with auto-detection
- 🔄 **RTL Support** — Full Arabic/Hebrew right-to-left layout
- ✨ **Animations** — Ant-line, pulse, stagger, breathe effects (GSAP)
- 🔍 **Search & Filter** — Full-text search with type filtering
- 🗺️ **Minimap** — Navigator overview for large graphs
- 📤 **Export** — SVG and PNG download
- 📐 **9 Layout Algorithms** — fcose, breadthfirst, ELK variants, circle, grid, concentric
- 📱 **Responsive** — Works from 320px to 4K displays

## 🚀 Installation

```bash
bench get-app --branch main https://github.com/ArkanLab/frappe_visual.git
bench --site <site> install-app frappe_visual
bench build --app frappe_visual
```

## 📖 Usage

### Visual Hub
Navigate to `/app/visual-hub` to explore any installed Frappe app interactively.

### JavaScript API
```javascript
// Render an app map (lazy loads the 400KB bundle on demand)
await frappe.visual.appMap('#container', 'erpnext');

// Relationship explorer
await frappe.visual.relationshipExplorer('#container', 'Sales Invoice', { depth: 2 });
```

### Python API
```python
from frappe_visual.api import get_app_map, get_doctype_relationships

# Get full app structure
app_data = get_app_map("erpnext")

# Get doctype relationships
rels = get_doctype_relationships("Sales Invoice", depth=2)
```

## 💰 Pricing

| Feature | Free | Professional | Enterprise |
|---------|------|-------------|-----------|
| App Map | ✅ | ✅ | ✅ |
| Relationship Explorer | ✅ | ✅ | ✅ |
| Dark Mode + RTL | ✅ | ✅ | ✅ |
| Basic Layouts | ✅ | ✅ | ✅ |
| Advanced ELK Layouts | ❌ | ✅ | ✅ |
| Animations | ❌ | ✅ | ✅ |
| Export (SVG/PNG) | ❌ | ✅ | ✅ |
| Floating Windows | ❌ | ✅ | ✅ |
| MCP Integration | ❌ | ❌ | ✅ |
| White Labeling | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API_DOCS.md)
- [Developer Cookbook](docs/developer/COOKBOOK.md)
- [Extension Guide](docs/developer/EXTENSION_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [دليل المستخدم (عربي)](docs/ar/USER_GUIDE.md)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

GPL-3.0 — See [LICENSE](LICENSE) for details.

## 👥 Author

**Arkan Lab** — [arkan.it.com](https://arkan.it.com)

📧 moatazsarapil@gmail.com

## Contact

For support and inquiries:
- Phone: +201508268982
- WhatsApp: https://wa.me/201508268982

