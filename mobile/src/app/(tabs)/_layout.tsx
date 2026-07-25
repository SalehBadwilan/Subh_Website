import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useAuthStore } from "@/lib/auth-store";
import { useCartCount } from "@/lib/cart-store";
import { colors, font } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={22} color={color as string} />
  );
}

/**
 * التنقّل السفلي — نفس عناصر MobileBottomNav في الويب:
 * الرئيسية · الفئات · السلّة · طلباتي · حسابي.
 *
 * ملاحظة RTL: التبويبات تُرسم من اليسار لليمين، لذلك نعلنها بترتيب
 * معكوس حتى تظهر «الرئيسية» في أقصى اليمين كما يتوقع مستخدم عربي.
 */
export default function TabsLayout() {
  const cartCount = useCartCount();
  const status = useAuthStore((s) => s.status);

  // حماية المسارات — يعادل useRequireAuth في الويب:
  // لا محتوى محمي قبل اكتمال قراءة الجلسة، والضيف يُعاد لتسجيل الدخول.
  if (status === "loading") return null;
  if (status === "guest") return <Redirect href="/login" />;

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: font.semibold,
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: colors.muted },
      }}
    >
      <Tabs.Screen
        name="account"
        options={{ title: "حسابي", tabBarIcon: tabIcon("person", "person-outline") }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "طلباتي", tabBarIcon: tabIcon("receipt", "receipt-outline") }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "السلّة",
          tabBarIcon: tabIcon("cart", "cart-outline"),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.destructive,
            color: colors.destructiveForeground,
            fontFamily: font.bold,
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{ title: "الفئات", tabBarIcon: tabIcon("grid", "grid-outline") }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: "الرئيسية", tabBarIcon: tabIcon("home", "home-outline") }}
      />
    </Tabs>
  );
}
