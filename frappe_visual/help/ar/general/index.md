---
title: مواضيع عامة
icon: book
context_type: index
priority: 1
---

# مواضيع عامة — Frappe Visual

يغطي هذا القسم المواضيع العامة حول Frappe Visual التي لا تندرج تحت فئات محددة.

## البدء السريع

1. **تثبيت frappe_visual** — أضفه إلى بيئتك عبر `bench get-app frappe_visual`
2. **بناء الأصول** — نفّذ `bench build --app frappe_visual`
3. **زيارة المركز المرئي** — انتقل إلى `/desk#visual-hub` لعرض جميع المكونات

## المفاهيم الأساسية

- **التحميل الكسول**: يتم تحميل الحزمة الرئيسية عند الطلب عبر `frappe.require("frappe_visual.bundle.js")`
- **المحسّنات التلقائية**: تنشط محسّنات النماذج والقوائم ومساحات العمل تلقائياً في كل صفحة
- **الاختصارات غير المتزامنة**: استخدم `frappe.visual.kanban()` و `frappe.visual.heatmap()` وغيرها من أي تطبيق
- **نظام الأيقونات**: استخدم دائماً `frappe.visual.icons` — لا تستخدم Font Awesome أو SVG مباشر

## هل تحتاج مساعدة؟

- انقر على زر ❓ في أي نموذج أو صفحة للحصول على مساعدة سياقية
- زُر [معالج الإعداد](/desk#frappe-visual-onboarding) للجولة التعريفية
- جرّب [الملعب](/desk#visual-playground) للتجربة العملية
