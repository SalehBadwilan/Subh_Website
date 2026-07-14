# @sabah/shared

الحزمة المشتركة بين `apps/web` (Next.js) و `apps/mobile` (Expo). خالية من React — تعمل في أي بيئة JS.

## المحتوى
- **`types/`** — كل نماذج البيانات (User, Order, Product, Cart, ...).
- **`constants/`** — ثوابت العمل (حالات الطلب، الأدوار، الصلاحيات، الإعدادات).
- **`utils/`** — دوال نقية (تحقق الجوال السعودي، حساب الأسعار/الضريبة، idempotency، zod schemas، تنسيق التواريخ).
- **`theme/`** — Design Tokens (الألوان، الخطوط، المسافات، الظلال). المصدر الوحيد للحقيقة.
- **`api/`** — عميل HTTP موحّد + دوال لكل مورد + تبديل mock/live.
- **`mock/`** — قاعدة بيانات وهمية + معالجات + بيانات أولية.

## الاستخدام
```ts
import { OrderStatus, formatSAR, isValidSaudiPhone, createApiClient } from '@sabah/shared';

formatSAR(149);                       // "149.00 ر.س"
isValidSaudiPhone('0512345678');      // true
OrderStatus.DELIVERED;                // 'delivered'

const api = createApiClient({
  env: 'web',
  getAccessToken: () => localStorage.getItem('token'),
  onUnauthorized: () => router.push('/login'),
});
const { data } = await api.products.list(api.client, { q: 'كوب' });
```

## التطوير
```bash
npm -w packages/shared run typecheck
npm -w packages/shared run test
```
