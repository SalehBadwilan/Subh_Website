import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/auth-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { colors, radius } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  /** شاشات تُبنى في مرحلة لاحقة من الخطة (Stack من هذا التبويب) */
  soon?: string;
};

/** المزيد — بوابة التاجر: روابط الشاشات الثانوية + تسجيل الخروج. */
export default function MerchantMoreScreen() {
  const router = useRouter();
  const merchant = useMerchantStore((s) => s.merchant);
  const signOut = useAuthStore((s) => s.signOut);

  const items: MenuItem[] = [
    {
      icon: "bar-chart-outline",
      label: "المبيعات",
      onPress: () => router.push("/sales"),
    },
    {
      icon: "wallet-outline",
      label: "التسويات المالية",
      onPress: () => router.push("/settlements"),
    },
    {
      icon: "ribbon-outline",
      label: "الاشتراك",
      onPress: () => router.push("/subscription"),
    },
    {
      icon: "people-outline",
      label: "الموظفون",
      onPress: () => router.push("/employees"),
    },
    {
      icon: "business-outline",
      label: "الملف التجاري",
      onPress: () => router.push("/profile"),
    },
  ];

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AppText weight="extrabold" size={22}>
          المزيد
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {merchant ? (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Ionicons name="storefront" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="extrabold" size={15}>
                {merchant.commercial_name}
              </AppText>
              <AppText size={11.5} color={colors.mutedForeground}>
                تاجر
              </AppText>
            </View>
          </View>
        ) : null}

        <View style={styles.menuCard}>
          {items.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              disabled={!item.onPress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.menuRow,
                i < items.length - 1 && styles.menuDivider,
                pressed && { backgroundColor: colors.muted },
              ]}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <AppText
                weight="semibold"
                size={14}
                style={{ flex: 1, opacity: item.soon ? 0.5 : 1 }}
              >
                {item.label}
              </AppText>
              {item.soon ? (
                <View style={styles.soonTag}>
                  <AppText
                    weight="semibold"
                    size={10}
                    color={colors.mutedForeground}
                  >
                    {item.soon}
                  </AppText>
                </View>
              ) : (
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
          ))}
        </View>

        <Button
          title="تسجيل الخروج"
          variant="outline"
          onPress={handleSignOut}
          icon={
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.destructive}
            />
          }
          style={styles.signOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: {
    padding: 20,
    gap: 14,
  },
  profileCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  soonTag: {
    backgroundColor: colors.muted,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  signOut: {
    borderColor: colors.destructiveSoft,
    marginTop: 4,
  },
});
