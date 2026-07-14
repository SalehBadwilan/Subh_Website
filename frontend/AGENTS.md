# AGENTS.md — توجيه الوكيل لمنصة «صبح»

> هذا الملف يوجّه أي وكيل/مساعد/مطوّر يعمل على مستودع `sabah/`. اقرأه قبل أي تعديل.

## 1. الهوية والنطاق
- **المنتج:** منصة «صبح» — سوق إلكتروني سعودي متعدد التجار.
- **النطاق:** Frontend فقط (ويب + موبايل). الـ Backend عبر طبقة Mock حتى جاهزيته (اليوم 6).
- **الجمهور:** عملاء سعوديون (B2C)، تجار، موظفو عمليات، إدارة.

## 2. اللغة والاتجاه (RTL أساسي)
- **اللغة الافتراضية:** العربية (`lang="ar"`).
- **الاتجاه:** RTL إلزامي في كل صفحة ومكوّن.
  - ويب: `<html lang="ar" dir="rtl">`.
  - موبايل: `I18nManager.forceRTL(true)` في `app.json`.
- استخدم **الخصائص المنطقية** دائماً: `ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-` — لا `pl-`/`pr-`/`left`/`right`.
- plugin `tailwindcss-rtl` مفعّل. لا تكتب قيم يدوية لـ `direction`.
- الأيقونات الاتجاهية (الأسهم) تنقلب تلقائياً في RTL؛ تحقق بصرياً من كل سهم.

## 3. TypeScript
- **صارم** (`strict: true`) في كل `tsconfig`.
- **يُمنع `any`** تماماً. إن اضطررت — استخدم `unknown` + type guard، ووثّق السبب.
- كل الأنواع المشتركة في `packages/shared/src/types/` — لا تكرّر نوعاً في ويب أو موبايل.
- استخدم `enum` للحالات (OrderStatus, MerchantStatus...) + `Record<Enum, string>` للترجمة العربية.
- الأسماء: PascalCase للأنواع/المكوّنات، camelCase للدوال/المتغيرات، SCREAMING_SNAKE للثوابت.

## 4. المكوّنات (UI)
- **PascalCase** لأسماء المكوّنات والملفات (`ProductCard.tsx`).
- ملف المكوّن **< 200 سطر**. إن زاد — قسّمه.
- مكوّن واحد = ملف واحد = تصدير افتراضي واحد.
- Props موقّعة بـ `interface` مسمّاة (`ProductCardProps`).
- الحالة المشتركة عبر **Zustand** (cart, session). بيانات الخادم عبر **TanStack Query**.
- لا منطق أعمال داخل المكوّن — استدعِ `utils/` أو `api/` من `@sabah/shared`.

## 5. الـ Design Tokens
- المصدر الوحيد للألوان/الخطوط/المسافات: `packages/shared/src/theme/`.
- لا تكتب قيم لون أو خط خام (`#0099FF`, `font-family: ...`) في صفحة أو مكوّن — استخدم الـ token.
- اللون الأساسي: **أزرق صبح `#0099FF`** (انظر `docs/changes.md` للانحراف عن البرتقالي).
- الخطوط: Tajawal (نص) + Cairo (عناوين).

## 6. المنع المزدوج (Idempotency) — حرج
- كل عمليات الكتابة الحرجة (الدفع، تأكيد الطلب) عبر **`IdempotentSubmitButton`**.
- يولّد `idempotency-key` (`crypto.randomUUID()`) مرة عند فتح الصفحة، يُعاد استخدامه للإرسال المتكرر.
- يُعطّل الزر أثناء المعالجة ويمنع النقر المزدوج.
- هذا يحمي من تكرار الطلب عند ضعف الشبكة (سيناريو 3).

## 7. الأمان في الواجهة
- صلاحيات: `requireAuth()` + `requireRole(role)` على المسارات المحمية (`(merchant)`, `(admin)`).
- إخفاء بيانات حساسة عن الأدوار غير المصرّح لها (سعر التكلفة عن العميل، بيانات تجار آخرين عن التاجر).
- معالجة 401/403: إعادة توجيه لطيفة + رسالة عربية واضحة. لا كشف تفاصيل تقنية.
- الجلسة ويب: `httpOnly` cookie. موبايل: `expo-secure-store`.
- لا تخزّن token في `localStorage`/`AsyncStorage` العادي.

## 8. عزل بيانات التاجر
- `merchantApi` يُرجع بيانات التاجر الحالي فقط. لا تسريب بيانات بين التجار.
- موظف التاجر محدود بصلاحياته (سيناريو 8: يُمنع من التقارير المالية).

## 9. سير العمل
- **commit صغير** + رسالة واضحة بالعربية أو الإنجليزية.
- **لا افتراضات:** أي غموض يُرفع للعميل ويُوثّق في `docs/questions.md` قبل البناء.
- **أي انحراف عن خطة Excel** يُوثّق في `docs/changes.md` مع السبب.
- القرارات التقنية المعمارية في `docs/decisions.md` (ADR-lite).
- كل PR يمرّ بـ checklist: RTL، TypeScript strict، لا `any`، tokens مستخدمة، idempotency للكتابة، صلاحيات محقّقة.

## 10. التشغيل
```bash
npm install                      # من الجذر — يثبّت كل workspaces
npm run dev:web                  # Next.js على http://localhost:3000
npm run dev:mobile               # Expo
npm run typecheck                # tsc -b لكل الحزم
npm run lint                     # eslint .
npm run format                   # prettier --write .
```

## 11. متغيرات البيئة
- `NEXT_PUBLIC_API_MODE=mock|live` (ويب).
- `EXPO_PUBLIC_API_MODE=mock|live` (موبايل).
- `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` — عنوان الـ Backend الحقيقي (يوم 6).
- كل ملف `.env.local` غير مُتبَع؛ `.env.example` مُتبَع كقالب.
