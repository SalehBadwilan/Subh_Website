/** تحويل نص عربي/إنجليزي إلى slug آمن للـ URL. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    // استبدال المسافات بـ -
    .replace(/\s+/g, '-')
    // إزالة كل ما ليس حرفاً أو رقماً أو -
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    // دمج - المتتالية
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
