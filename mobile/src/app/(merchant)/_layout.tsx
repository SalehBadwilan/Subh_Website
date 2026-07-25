import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View, type ColorValue } from "react-native";
import { EmptyState } from "@/components/EmptyState";
import { portalFor, useAuthStore } from "@/lib/auth-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { colors, font } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={22} color={color as string} />
  );
}

/**
 * بوابة التاجر — حارس ثلاثي الطبقات (يعادل PortalGuard+MerchantProvider+
 * MerchantGate في الويب، بمخازن Zustand بدل React Context):
 *   1) مصادقة: ضيف → تسجيل الدخول.
 *   2) دور: غير تاجر (roles) → إعادة صامتة لبوابة العميل، بلا شاشة رفض.
 *   3) حالة حساب التاجر الفعلية: لا حساب/موقوف/ملغى/خطأ → EmptyState مناسبة.
 */
export default function MerchantLayout() {
  const router = useRouter();
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const merchantStatus = useMerchantStore((s) => s.status);
  const loadMerchant = useMerchantStore((s) => s.load);

  const isMerchantRole = authStatus === "authenticated" && portalFor(user?.roles) === "merchant";

  useEffect(() => {
    if (isMerchantRole) void loadMerchant();
  }, [isMerchantRole, loadMerchant]);

  if (authStatus === "loading") return null;
  if (authStatus === "guest") return <Redirect href="/login" />;
  if (!isMerchantRole) return <Redirect href="/(tabs)" />;

  if (merchantStatus === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (merchantStatus === "none") {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="storefront-outline"
          title="لست تاجرًا بعد"
          body="أرسل طلب انضمام كتاجر على صبح للوصول إلى لوحة التحكم."
          actionLabel="طلب الانضمام كتاجر"
          onAction={() => router.push("/merchant-register")}
        />
      </View>
    );
  }

  if (merchantStatus === "suspended" || merchantStatus === "terminated") {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="alert-circle-outline"
          title={merchantStatus === "suspended" ? "حساب التاجر موقوف" : "حساب التاجر ملغى"}
          body="تواصل مع فريق صبح لمزيد من التفاصيل."
          actionLabel="تسجيل الخروج"
          onAction={async () => {
            await signOut();
            router.replace("/login");
          }}
        />
      </View>
    );
  }

  if (merchantStatus === "error") {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل حساب التاجر"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={() => void loadMerchant()}
        />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.muted },
      }}
    >
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: tabIcon("ellipsis-horizontal-circle", "ellipsis-horizontal-circle-outline") }} />
      <Tabs.Screen name="inventory" options={{ title: "المخزون", tabBarIcon: tabIcon("cube", "cube-outline") }} />
      <Tabs.Screen name="products" options={{ title: "المنتجات", tabBarIcon: tabIcon("pricetags", "pricetags-outline") }} />
      <Tabs.Screen name="orders" options={{ title: "الطلبات", tabBarIcon: tabIcon("receipt", "receipt-outline") }} />
      <Tabs.Screen name="index" options={{ title: "لوحة التحكم", tabBarIcon: tabIcon("grid", "grid-outline") }} />
      {/* شاشات Stack تُفتح من تبويب «المزيد» — مخفية عن شريط التبويبات نفسه */}
      <Tabs.Screen name="sales" options={{ href: null }} />
      <Tabs.Screen name="settlements" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
      <Tabs.Screen name="employees" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
