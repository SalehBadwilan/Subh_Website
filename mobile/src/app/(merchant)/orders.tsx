import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, getMyOrders, orderStatusLabels, type ApiMerchantOrder } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  pending_payment: { bg: colors.warningSoft, fg: "#92400E" },
  paid: { bg: colors.primarySoft, fg: colors.primary },
  preparing: { bg: colors.primarySoft, fg: colors.primary },
  ready_to_ship: { bg: colors.primarySoft, fg: colors.primary },
  shipped: { bg: colors.primarySoft, fg: colors.primary },
  delivered: { bg: colors.successSoft, fg: colors.success },
  cancelled: { bg: colors.destructiveSoft, fg: colors.destructive },
  returned: { bg: colors.destructiveSoft, fg: colors.destructive },
};

/** طلبات التاجر — قراءة فقط من الموبايل، عبر `GET /merchant/orders`. */
export default function MerchantOrdersScreen() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [orders, setOrders] = useState<ApiMerchantOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMyOrders();
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
          الطلبات
        </AppText>
        <AppText size={12.5} color={colors.mutedForeground}>
          عرض فقط — تحديث الحالة من لوحة الويب
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
        <EmptyState icon="receipt-outline" title="لا توجد طلبات بعد" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: ApiMerchantOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = STATUS_TONE[order.status] ?? { bg: colors.muted, fg: colors.mutedForeground };
  const label = orderStatusLabels[order.status] ?? order.status;

  return (
    <Pressable onPress={onToggle} style={styles.card} accessibilityRole="button">
      <View style={styles.cardTop}>
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
        {order.customer?.full_name ?? "عميل"} · {order.items.length} {order.items.length === 1 ? "منتج" : "منتجات"}
      </AppText>
      <View style={styles.cardBottom}>
        <AppText weight="black" size={15}>
          {order.total_sar} {CURRENCY_LABEL}
        </AppText>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </View>

      {expanded ? (
        <View style={styles.itemsWrap}>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <AppText size={12.5} style={{ flex: 1 }} numberOfLines={1}>
                {it.name_snapshot_ar} × {it.quantity}
              </AppText>
              <AppText weight="semibold" size={12.5} ltr>
                {it.line_total_sar} {CURRENCY_LABEL}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  cardTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTag: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardBottom: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  itemsWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
});
