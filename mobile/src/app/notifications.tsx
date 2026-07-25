import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { getNotifications, markAllNotificationsRead, type ApiNotification } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

const CHANNEL_META: Record<ApiNotification["channel"], { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  in_app: { icon: "notifications-outline", bg: "#DEF3F0", fg: "#0F766E" },
  sms: { icon: "chatbubble-outline", bg: "#F4F5F7", fg: "#64748B" },
  email: { icon: "mail-outline", bg: "#F4F5F7", fg: "#64748B" },
  push: { icon: "notifications-outline", bg: "#FEF3C7", fg: "#B45309" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** الإشعارات — بيانات حقيقية من `GET /notifications` */
export default function NotificationsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getNotifications();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setNotifications(res.data);
    setStatus("ready");
    if (res.data.some((n) => !n.is_read)) {
      void markAllNotificationsRead();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          style={styles.backBtn}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18}>
          الإشعارات
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الإشعارات"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-outline" title="لا توجد إشعارات بعد" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = CHANNEL_META[item.channel];
            return (
              <View style={[styles.card, !item.is_read && styles.cardUnread]}>
                <View style={[styles.iconTile, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.fg} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <AppText weight="bold" size={13.5} style={{ flexShrink: 1 }}>
                      {item.title_ar}
                    </AppText>
                    {!item.is_read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <AppText size={12} color={colors.mutedForeground}>
                    {item.body_ar}
                  </AppText>
                  <AppText size={10.5} color={colors.mutedForeground} ltr>
                    {formatTime(item.created_at)}
                  </AppText>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.muted,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 20,
    gap: 10,
  },
  card: {
    flexDirection: "row-reverse",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardUnread: {
    borderColor: colors.primary + "40",
    backgroundColor: "#FBFEFD",
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.destructive,
  },
});
