/**
 * نظام تصميم «صبح» — نسخة الموبايل.
 *
 * القيم منقولة من نظام تصميم الويب (src/styles.css في مشروع الويب):
 * Primary: Teal #0F766E · الخط: Cairo · الاتجاه: RTL · نصف القطر الأساسي: 14
 *
 * أي تعديل على الهوية يجب أن يتم في المكانين معًا (ويب + موبايل)
 * حتى تبقى المنصتان بنفس الهوية البصرية.
 */
import { Platform } from "react-native";

export const colors = {
  background: "#FFFFFF",
  foreground: "#0F172A",

  card: "#FFFFFF",
  cardForeground: "#0F172A",

  /** Primary — Teal #0F766E (نفس قيمة الويب) */
  primary: "#0F766E",
  primaryForeground: "#F7FDFC",
  primarySoft: "#DEF3F0",
  /** يستخدم في نهاية تدرّج البنر (to-teal-800 في الويب) */
  primaryDark: "#115E59",

  secondary: "#F4F5F7",
  secondaryForeground: "#263140",

  muted: "#F4F5F7",
  mutedForeground: "#64748B",

  accent: "#DEF3F0",
  accentForeground: "#115E59",

  destructive: "#DC2626",
  destructiveForeground: "#FEF2F2",
  destructiveSoft: "#FEE2E2",

  success: "#16A34A",
  successSoft: "#DCFCE7",

  warning: "#F59E0B",
  warningSoft: "#FEF3C7",

  border: "#E5E9EF",
  input: "#E5E9EF",
  ring: "#0F766E",
} as const;

/** مقاسات الحواف — مشتقة من --radius: 0.875rem (14px) في الويب */
export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 18,
  x2: 22, // rounded-2xl
  x3: 26, // rounded-3xl
  full: 999,
} as const;

/**
 * خط Cairo (نفس خط الويب) — يُحمَّل في src/app/_layout.tsx.
 * استخدم هذه الأسماء دائمًا بدل كتابة اسم الخط يدويًا.
 */
export const font = {
  regular: "Cairo_400Regular",
  medium: "Cairo_500Medium",
  semibold: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
  extrabold: "Cairo_800ExtraBold",
  black: "Cairo_900Black",
} as const;

export type FontWeightKey = keyof typeof font;

/** ظلال مطابقة تقريبًا لـ shadow-soft / shadow-elevated في الويب */
export const shadow = {
  soft: Platform.select({
    web: { boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  }) as object,
  elevated: Platform.select({
    web: { boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06)" },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
  }) as object,
} as const;

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const c = lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * تدرّج باستيل لصور المنتجات المؤقتة — يعادل تدرّج oklch حسب hue
 * المستخدم في ProductCard على الويب.
 */
export function productTone(hue: number): [string, string] {
  return [hslToHex(hue, 55, 88), hslToHex(hue, 55, 72)];
}
