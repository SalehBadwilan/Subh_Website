import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/auth-store";
import { colors, radius } from "@/lib/theme";

type Slide = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: "storefront-outline",
    title: "كل الأسواق في تطبيق واحد",
    body: "منتجات مختارة من تجّار موثوقين بأسعار موحّدة تحدّدها منصة صبح — بلا مفاجآت.",
  },
  {
    icon: "truck-fast-outline",
    title: "توصيل سريع وضمان صبح",
    body: "شحن لجميع مدن المملكة، مع ضمان صبح على كل طلب واسترجاع سهل.",
  },
  {
    icon: "shield-check-outline",
    title: "ادفع بأمان وتتبّع طلبك",
    body: "وسائل دفع آمنة وتتبّع لحظي لحالة طلبك من التأكيد حتى باب المنزل.",
  },
];

/** شاشة تعريفية تُعرض مرة واحدة عند أول تشغيل (حسب خطة اليوم 4) */
export default function Onboarding() {
  const router = useRouter();
  const markOnboardingSeen = useAuthStore((s) => s.markOnboardingSeen);
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    await markOnboardingSeen();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={finish} accessibilityRole="button" hitSlop={8}>
          <AppText weight="semibold" size={13} color={colors.mutedForeground}>
            تخطّي
          </AppText>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={slide.icon} size={64} color={colors.primary} />
        </View>
        <AppText weight="extrabold" size={24} center>
          {slide.title}
        </AppText>
        <AppText size={14} color={colors.mutedForeground} center style={styles.body}>
          {slide.body}
        </AppText>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && { width: 22, backgroundColor: colors.primary },
              ]}
            />
          ))}
        </View>
        <Button
          title={isLast ? "ابدأ الآن" : "متابعة"}
          onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 148,
    height: 148,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  body: {
    maxWidth: 300,
  },
  footer: {
    padding: 24,
    gap: 20,
  },
  dots: {
    // النقاط تتقدم من اليمين إلى اليسار مع تقدّم الشرائح (RTL)
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
});
