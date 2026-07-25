/**
 * نماذج البيانات المحلية (UI shapes) لمنصة «صبح» — موبايل.
 *
 * `Product`/`Category` هما الشكل الذي تستهلكه المكوّنات المشتركة
 * (ProductCard, cart-store) — تُبنيان من استجابة API الحقيقية عبر
 * `toUiProduct`/`toUiCategory` في shared/api-customer.ts، وليستا بيانات
 * وهمية. الحقول الاختيارية الجديدة (imageUrl/inStock/...) تأتي من الباك إند
 * الحقيقي ولا وجود لها في نسخة الـ Mock القديمة.
 */

export type Category = {
  id: string;
  name: string;
  /** اسم أيقونة من MaterialCommunityIcons */
  icon: string;
  /** ألوان بطاقة الفئة { خلفية، نص } — تعادل tone في الويب */
  tone: { bg: string; fg: string };
  description?: string;
};

export type Product = {
  id: string;
  name: string;
  merchant: string;
  categoryId: string;
  /** اسم الفئة العربي — يُعرض كشارة على البطاقة (مطابقة لبطاقة الويب) */
  categoryName?: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: string;
  /** درجة اللون لصورة المنتج المؤقتة (يُستخدم فقط إن لم توجد صورة حقيقية) */
  hue: number;
  description?: string;
  /** رابط صورة حقيقية من الباك إند (product_images) — إن وُجد يُستخدم بدل التدرّج */
  imageUrl?: string;
  /** رمز SKU — يُستخدم في لقطة سطر الطلب عند الدفع */
  sku?: string;
  inStock?: boolean;
  stockAvailable?: number;
};

export type CartLine = {
  product: Product;
  qty: number;
};

/** طرق الدفع المدعومة فعليًا من الباك إند (مزوّد اختبار). */
export type PaymentMethodKey = "card" | "mada" | "apple_pay" | "stc_pay";
