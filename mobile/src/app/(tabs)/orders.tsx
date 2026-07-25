import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, getOrders, orderStatusLabels, type ApiOrder } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  pending_payment: { bg: colors.warningSoft, fg: "#92400E" },
  paid: { bg: colors.primarySoft, fg: colors.primary },
  preparing: { bg: colors.primarySoft, fg: colors.primary },
  processing: { bg: colors.primarySoft, fg: colors.primary },
  ready_to_ship: { bg: colors.primarySoft, fg: colors.primary },
  shipped: { bg: colors.primarySoft, fg: colors.primary },
  delivered: { bg: colors.successSoft, fg: colors.success },
  cancelled: { bg: colors.destructiveSoft, fg: colors.destructive },
  returned: { bg: colors.destructiveSoft, fg: colors.destructive },
  refunded: { bg: colors.destructiveSoft, fg: colors.destructive },
};

/**
 * طلباتي — تعادل صفحة /customer/orders في الويب.
 * بيانات حقيقية من `GET /orders`.
 */
export default function OrdersScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [orders, setOrders] = useState<ApiOrder[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getOrders();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setOrders(res.data);
    setStatus("ready");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AppText weight="extrabold" size={22}>
          طلباتي
        </AppText>
        <AppText size={12.5} color={colors.mutedForeground}>
          تتبّع حالة طلباتك وفواتيرك
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الطلبات"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="لا توجد طلبات بعد"
          body="بعد إتمام أول عملية شراء ستجد هنا طلباتك وحالتها خطوة بخطوة حتى باب المنزل."
          actionLabel="تصفّح المنتجات"
          onAction={() => router.push("/(tabs)")}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OrderRow order={item} onPress={() => router.push(`/order/${item.id}`)} />}
        />
      )}
    </SafeAreaView>
  );
}

function OrderRow({ order, onPress }: { order: ApiOrder; onPress: () => void }) {
  const tone = STATUS_TONE[order.status] ?? { bg: colors.muted, fg: colors.mutedForeground };
  const label = orderStatusLabels[order.status] ?? order.status;
  const itemsCount = order.items.length;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} accessibilityRole="button">
      <View style={styles.rowTop}>
        <AppText weight="bold" size={14} ltr>
          #{order.number}
        </AppText>
        <View style={[styles.statusTag, { backgroundColor: tone.bg }]}>
          <AppText weight="semibold" size={11} color={tone.fg}>
            {label}
          </AppText>
        </View>
      </View>
      <AppText size={12} color={colors.mutedForeground}>
        {itemsCount} {itemsCount === 1 ? "منتج" : "منتجات"}
      </AppText>
      <View style={styles.rowBottom}>
        <AppText weight="black" size={15}>
          {order.total_sar} {CURRENCY_LABEL}
        </AppText>
        <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
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
    gap: 2,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 20,
    gap: 12,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTag: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rowBottom: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
