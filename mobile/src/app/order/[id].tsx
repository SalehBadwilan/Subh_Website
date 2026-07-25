import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, getOrder, orderStatusLabels, type ApiOrder, type ApiOrderItem } from "@/shared";

type LoadStatus = "loading" | "error" | "notfound" | "ready";

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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

/** تفاصيل الطلب — بيانات حقيقية من `GET /orders/:id` */
export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [order, setOrder] = useState<ApiOrder | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setStatus("loading");
    const res = await getOrder(id);
    if (!res.ok) {
      setStatus(res.code === "http_error" && res.status === 404 ? "notfound" : "error");
      return;
    }
    setOrder(res.data);
    setStatus("ready");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

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
          {order ? `طلب #${order.number}` : "تفاصيل الطلب"}
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" || status === "notfound" || !order ? (
        <EmptyState
          icon={status === "notfound" ? "alert-circle-outline" : "cloud-offline-outline"}
          title={status === "notfound" ? "الطلب غير موجود" : "تعذّر تحميل الطلب"}
          body={status === "error" ? "تأكد من اتصالك بالإنترنت وحاول مجددًا." : undefined}
          actionLabel={status === "error" ? "إعادة المحاولة" : "العودة"}
          onAction={status === "error" ? load : () => router.back()}
        />
      ) : (
        <FlatList
          data={order.items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<OrderSummaryCard order={order} />}
          renderItem={({ item }) => <OrderItemRow item={item} />}
          ListFooterComponent={<OrderTotalsCard order={order} />}
        />
      )}
    </SafeAreaView>
  );
}

function OrderSummaryCard({ order }: { order: ApiOrder }) {
  const tone = STATUS_TONE[order.status] ?? { bg: colors.muted, fg: colors.mutedForeground };
  const label = orderStatusLabels[order.status] ?? order.status;
  const placedAt = formatDate(order.placed_at ?? order.created_at ?? null);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={[styles.statusTag, { backgroundColor: tone.bg }]}>
          <AppText weight="semibold" size={12} color={tone.fg}>
            {label}
          </AppText>
        </View>
        {placedAt ? (
          <AppText size={12} color={colors.mutedForeground}>
            {placedAt}
          </AppText>
        ) : null}
      </View>
      {order.notes_ar ? (
        <AppText size={12.5} color={colors.mutedForeground}>
          {order.notes_ar}
        </AppText>
      ) : null}
    </View>
  );
}

function OrderItemRow({ item }: { item: ApiOrderItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemBody}>
        <AppText weight="bold" size={13.5} numberOfLines={2}>
          {item.name_snapshot_ar}
        </AppText>
        <AppText size={11.5} color={colors.mutedForeground} ltr>
          {item.sku_snapshot}
        </AppText>
        <AppText size={12} color={colors.mutedForeground} ltr>
          {item.unit_price_sar} {CURRENCY_LABEL} × {item.quantity}
        </AppText>
      </View>
      <AppText weight="black" size={15}>
        {item.line_total_sar} {CURRENCY_LABEL}
      </AppText>
    </View>
  );
}

function OrderTotalsCard({ order }: { order: ApiOrder }) {
  return (
    <View style={styles.totalsCard}>
      <TotalRow label="المجموع الفرعي" value={order.subtotal_sar} />
      {order.discount_sar > 0 ? <TotalRow label="الخصم" value={-order.discount_sar} /> : null}
      <TotalRow label="الشحن" value={order.shipping_sar} freeAtZero />
      <TotalRow label="ضريبة القيمة المضافة" value={order.vat_sar} />
      <View style={styles.divider} />
      <TotalRow label="الإجمالي" value={order.total_sar} big />
    </View>
  );
}

function TotalRow({
  label,
  value,
  big,
  freeAtZero,
}: {
  label: string;
  value: number;
  big?: boolean;
  freeAtZero?: boolean;
}) {
  const display = freeAtZero && value === 0 ? "مجاني" : `${value} ${CURRENCY_LABEL}`;
  return (
    <View style={styles.totalRow}>
      <AppText weight={big ? "extrabold" : "medium"} size={big ? 16 : 13} color={big ? colors.foreground : colors.mutedForeground}>
        {label}
      </AppText>
      <AppText weight={big ? "black" : "semibold"} size={big ? 17 : 13.5} ltr>
        {display}
      </AppText>
    </View>
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
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    marginBottom: 4,
  },
  summaryTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusTag: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  itemRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  totalsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
