<div dir="rtl">

# دليل المسؤول — Frappe Visual

## التثبيت

### المتطلبات
- فريب الإصدار 16 أو أحدث
- Python 3.11+
- Node.js 18+

### خطوات التثبيت

```bash
# تثبيت التطبيق
bench get-app --branch main https://github.com/ArkanLab/frappe_visual.git

# تثبيت على الموقع
bench --site mysite install-app frappe_visual

# بناء الأصول
bench build --app frappe_visual
```

---

## الإعدادات

انتقل إلى: **الإعداد → الإعدادات → إعدادات Frappe Visual**

### مفتاح الترخيص
- **فريب كلاود**: لا يلزم مفتاح (يتم الكشف تلقائياً)
- **استضافة ذاتية**: أدخل المفتاح بتنسيق `XXXX-XXXX-XXXX-HASH`

### التخطيط الافتراضي
اختر تخطيط الرسم البياني الافتراضي:
- fcose (القوة الموجهة)
- breadthfirst (تسلسل هرمي)
- elk-layered (ELK الطبقي)
- elk-tree (ELK شجري)
- elk-stress (ELK ضغط)
- elk-radial (ELK دائري)

### الخيارات
- ✅ **تمكين الرسوم المتحركة** — تأثيرات GSAP
- ✅ **تمكين الخريطة المصغرة** — تنقل مصغر
- ✅ **الوضع الداكن التلقائي** — يتبع إعدادات المتصفح
- ✅ **RTL التلقائي** — يتبع لغة الموقع

---

## الصلاحيات

### الأدوار المطلوبة
- **مدير النظام**: وصول كامل (قراءة، كتابة، إنشاء، حذف)
- **جميع المستخدمين**: يمكنهم الوصول إلى Visual Hub (قراءة فقط)

### تخصيص الصلاحيات
```python
# في hooks.py للتطبيق الخاص بك
has_permission = {
    "Frappe Visual Settings": "my_app.permissions.check_visual_access"
}
```

---

## استكشاف الأخطاء

### الأصول لا تُحمّل
```bash
bench build --app frappe_visual --force
bench --site mysite clear-cache
```

### خطأ في قاعدة البيانات
```bash
bench --site mysite migrate
```

### الوقت الحقيقي لا يعمل
```bash
# تحقق من تشغيل socketio
ps aux | grep socketio
bench restart
```

---

## التحديث

```bash
cd apps/frappe_visual
git pull origin main
bench setup requirements --node
bench build --app frappe_visual
bench --site mysite migrate
bench --site mysite clear-cache
bench restart
```

---

## النسخ الاحتياطي

```bash
# نسخ احتياطي كامل
bench --site mysite backup

# استعادة
bench --site mysite restore /path/to/backup.sql.gz
```

</div>
