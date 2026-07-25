import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/auth-store";
import { colors, radius } from "@/lib/theme";

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  /** ميزة قيد الإنجاز في مرحلة لاحقة من الخطة */
  soon?: string;
};

/** حسابي — تعادل صفحة /customer/profile في الويب */
export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const items: MenuItem[] = [
    { icon: "notifications-outline", label: "الإشعارات", onPress: () => router.push("/notifications") },
    { icon: "receipt-outline", label: "طلباتي", onPress: () => router.push("/(tabs)/orders") },
    { icon: "location-outline", label: "عناويني", onPress: () => router.push("/account/addresses") },
    { icon: "storefront-outline", label: "كن تاجرًا معنا", onPress: () => router.push("/merchant-register") },
    { icon: "headset-outline", label: "الدعم والمساعدة", onPress: () => router.push("/account/support") },
  ];

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AppText weight="extrabold" size={22}>
          حسابي
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={styles.profileText}>
            <AppText weight="extrabold" size={16}>
              {user?.full_name || "عميل صبح"}
            </AppText>
            <AppText size={13} color={colors.mutedForeground} ltr>
              {user?.phone ?? ""}
            </AppText>
          </View>
          <Pressable
            onPress={() => router.push("/account/profile-edit")}
            accessibilityRole="button"
            accessibilityLabel="تعديل الملف الشخصي"
            style={styles.editBtn}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </Pressable>
        </View>

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
              <AppText weight="semibold" size={14} style={{ flex: 1, opacity: item.soon ? 0.5 : 1 }}>
                {item.label}
              </AppText>
              {item.soon ? (
                <View style={styles.soonTag}>
                  <AppText weight="semibold" size={10} color={colors.mutedForeground}>
                    {item.soon}
                  </AppText>
                </View>
              ) : (
                <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
              )}
            </Pressable>
          ))}
        </View>

        <Button
          title="تسجيل الخروج"
          variant="outline"
          onPress={handleSignOut}
          icon={<Ionicons name="log-out-outline" size={18} color={colors.destructive} />}
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
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    gap: 2,
    flex: 1,
    alignItems: "flex-end",
  },
  editBtn: {
    width: 34,
    height: 34,
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
