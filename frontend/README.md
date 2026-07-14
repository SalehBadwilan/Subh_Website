# @sabah/web — Next.js

تطبيق الويب لمنصة صبح (متجر العميل + لوحة التاجر + لوحة الإدارة).

## التشغيل
```bash
# من جذر المستودع:
npm install
npm run dev:web      # http://localhost:3000
```

## الصفحات المتوفرة (اليوم 2)
- `/` — الرئيسية (نسخة أولية تثبت RTL + الهوية).
- `/styleguide` — دليل النمط (كل الـ tokens والمكوّنات).
- صفحات الحالة: 404، خطأ، تحميل.

## البنية
```
app/
├─ layout.tsx          # <html lang="ar" dir="rtl"> + الخطوط + Providers
├─ providers.tsx       # QueryClient + Toast
├─ globals.css         # Tailwind + RTL + قواعد أساسية
├─ page.tsx            # الرئيسية
├─ styleguide/         # دليل النمط
├─ not-found.tsx       # 404
├─ error.tsx           # ErrorBoundary
└─ loading.tsx         # Skeleton عام
components/ui/         # Button, Input, Skeleton, Toast, Badge, IdempotentSubmitButton
lib/                   # api-client, auth-store, utils
tailwind.config.ts     # مدمج بـ Design Tokens من @sabah/shared
```

## الهوية البصرية
- **اللون الأساسي:** أزرق صبح `#0099FF` (من `@sabah/shared` theme).
- **الخطوط:** Tajawal (نص) + Cairo (عناوين) عبر `next/font/google`.
- **الاتجاه:** RTL إلزامي (`dir="rtl"` على `<html>`).

## متغيرات البيئة
انظر `.env.example`.
