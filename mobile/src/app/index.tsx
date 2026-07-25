import { Redirect } from "expo-router";
import { portalFor, useAuthStore } from "@/lib/auth-store";

/**
 * بوابة الدخول للمسار "/" — إعادة توجيه تعريفية خالصة (بلا مؤقّت ولا async).
 *
 * الجذر (`_layout.tsx`) لا يعرض شجرة المسارات إلا بعد اكتمال الترطيب، لذا حين
 * تُركَّب هذه الشاشة تكون `status` إما "guest" أو "authenticated" (لا "loading")،
 * و`onboardingSeen`/`user` جاهزة. هكذا يكون التوجيه بعد الدخول حتميًا ولا يرتد
 * إلى صفحة تسجيل الدخول (كان سبب «تكرار الدخول» بوابة قديمة بمؤقّت + async).
 */
export default function IndexGate() {
  const status = useAuthStore((s) => s.status);
  const onboardingSeen = useAuthStore((s) => s.onboardingSeen);
  const user = useAuthStore((s) => s.user);

  if (!onboardingSeen) return <Redirect href="/onboarding" />;
  if (status === "authenticated") {
    return <Redirect href={portalFor(user?.roles) === "merchant" ? "/(merchant)" : "/(tabs)"} />;
  }
  return <Redirect href="/login" />;
}
