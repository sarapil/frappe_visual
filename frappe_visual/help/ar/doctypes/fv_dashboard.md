---
title: لوحة معلومات FV
icon: layout-dashboard
context_type: doctype
context_reference: FV Dashboard
priority: 20
roles: [FV Admin, FV Manager]
---

# لوحة معلومات FV

**FV Dashboard** هي لوحة معلومات بصرية قابلة للتكوين مع أنواع متعددة من الأدوات. يمكن تضمينها في مساحات العمل أو النماذج أو كصفحات مستقلة.

## # title

اسم اللوحة المعروض في الترويسة والتنقل.

## # dashboard_layout

تكوين شبكة التخطيط: `grid-2`، `grid-3`، `grid-4`، أو `masonry`.

## # refresh_interval

فترة التحديث التلقائي بالثواني. الحد الأدنى: 10 ثوانٍ.

## # is_public

عند التفعيل، تكون اللوحة متاحة لجميع المستخدمين.

## # workspace

ربط اختياري بمساحة عمل.

## الأدوات (جدول فرعي)

تحتوي كل لوحة على صفوف **FV Dashboard Widget**:

| الحقل           | الوصف                                                                 |
| --------------- | --------------------------------------------------------------------- |
| `widget_type`   | نوع المخطط: number_card, bar, line, donut, heatmap, sparkline, kanban |
| `widget_config` | تكوين JSON للأداة                                                     |
| `width`         | عرض الشبكة: 1-12 عموداً                                               |
| `height`        | ارتفاع الشبكة بالصفوف                                                 |
| `position`      | ترتيب الفرز داخل اللوحة                                               |
