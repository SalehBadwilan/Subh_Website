/**
 * ثوابت مشتركة — تعادل قسم constants في `packages/shared`.
 * حالات الطلب/الدفع هنا هي المرجع الموحّد (نفس صياغة الويب حرفيًا) بين
 * الويب والموبايل، وتغطي حالات الباك إند الحقيقية (وليس التعداد الوهمي القديم).
 */
import type { PaymentMethodKey } from "./types";

/** عملة العرض */
export const CURRENCY_LABEL = "ر.س";

/** مهلة إعادة إرسال رمز التحقق */
export const OTP_RESEND_SECONDS = 45;

/** طول رمز التحقق */
export const OTP_LENGTH = 6;

/** حالات الطلب الحقيقية من الباك إند (نفس صياغة orderStatusLabels في الويب). */
export const orderStatusLabels: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  paid: "مدفوع",
  preparing: "قيد التجهيز",
  processing: "قيد التجهيز",
  ready_to_ship: "جاهز للشحن",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  returned: "مرتجع",
  refunded: "مسترد",
};

export const paymentStatusLabels: Record<string, string> = {
  initiated: "بدأت العملية",
  authorized: "مُصرَّح بها",
  captured: "تم الدفع",
  failed: "فشل الدفع",
  refunded: "مستردة",
  disputed: "متنازع عليها",
};

export const paymentMethodLabels: Record<PaymentMethodKey, string> = {
  card: "بطاقة ائتمانية",
  mada: "مدى",
  apple_pay: "Apple Pay",
  stc_pay: "STC Pay",
};

export const settlementStatusLabels: Record<string, string> = {
  pending: "بانتظار التحويل",
  processing: "قيد المعالجة",
  paid: "مدفوعة",
  failed: "فشلت",
};

export const subscriptionChangeTypeLabels: Record<string, string> = {
  upgrade: "ترقية",
  downgrade: "تخفيض",
  change_period: "تغيير مدّة",
};
