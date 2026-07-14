/**
 * توليد مفتاح idempotency — يُستخدم في طلبات الكتابة الحرجة (الدفع/الطلب).
 * يُولَّد مرة عند فتح صفحة الدفع ويُعاد استخدامه للإرسال المتكرر،
 * فيضمن الخادم عدم إنشاء نفس الطلب مرتين.
 */
export function generateIdempotencyKey(): string {
  // crypto.randomUUID متاح في المتصفحات الحديثة وNode 19+ وReact Native (polyfill).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback — تركيب UUIDv4 يدوياً.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
