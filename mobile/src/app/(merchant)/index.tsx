import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { useMerchantStore } from "@/lib/merchant-store";
import { colors, radius, shadow } from "@/lib/theme";
import { CURRENCY_LABEL, getMerchantDashboard, orderStatusLabels, type MerchantDashboard } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** لوحة تحكم التاجر — بيانات حقيقية من `GET /merchant/dashboard` (SQL مُجمَّع على السيرفر). */
export default function MerchantDashboardScreen() {
  const merchant = useMerchantStore((s) => s.merchant);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMerchantDashboard();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setDashboard(res.data);
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
          لوحة التحكم
        </AppText>
        <AppText size={12.5} color={colors.mutedForeground}>
          {merchant?.commercial_name ?? dashboard?.commercial_name ?? ""}
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" || !dashboard ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل لوحة التحكم"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            <KpiCard icon="receipt-outline" label="إجمالي الطلبات" value={String(dashboard.kpis.total_orders)} />
            <KpiCard
              icon="cash-outline"
              label="الإيرادات"
              value={`${dashboard.kpis.revenue_sar} ${CURRENCY_LABEL}`}
            />
            <KpiCard icon="checkmark-done-outline" label="طلبات مكتملة" value={String(dashboard.kpis.fulfilled_orders)} />
            <KpiCard icon="pricetags-outline" label="منتجات نشطة" value={String(dashboard.kpis.active_listings)} />
            <KpiCard
              icon="alert-circle-outline"
              label="مخزون منخفض"
              value={String(dashboard.kpis.low_stock_skus)}
              accent={dashboard.kpis.low_stock_skus > 0}
            />
            <KpiCard
              icon="time-outline"
              label="طلبات تحديث معلّقة"
              value={String(dashboard.kpis.pending_update_requests)}
            />
          </View>

          {Object.keys(dashboard.kpis.orders_by_status).length > 0 ? (
            <View style={styles.statusCard}>
              <AppText weight="bold" size={14} style={{ marginBottom: 10 }}>
                الطلبات حسب الحالة
              </AppText>
              {Object.entries(dashboard.kpis.orders_by_status).map(([statusKey, count]) => (
                <View key={statusKey} style={styles.statusRow}>
                  <AppText size={13} color={colors.mutedForeground}>
                    {orderStatusLabels[statusKey] ?? statusKey}
                  </AppText>
                  <AppText weight="bold" size={13} ltr>
                    {count}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, accent && { backgroundColor: colors.destructiveSoft }]}>
        <Ionicons name={icon} size={18} color={accent ? colors.destructive : colors.primary} />
      </View>
      <AppText weight="black" size={19} ltr>
        {value}
      </AppText>
      <AppText size={11.5} color={colors.mutedForeground}>
        {label}
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
  scroll: {
    padding: 20,
    gap: 16,
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    width: "47%",
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
    ...shadow.soft,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statusRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
