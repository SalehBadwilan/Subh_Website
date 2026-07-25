import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, getSalesSummary, orderStatusLabels, type MerchantSalesSummary } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** المبيعات — ملخّص عبر `GET /merchant/sales-summary`. */
export default function MerchantSalesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [summary, setSummary] = useState<MerchantSalesSummary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getSalesSummary();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setSummary(res.data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18}>
          المبيعات
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" || !summary ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل المبيعات"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.totalsCard}>
            <TotalRow label="عدد الطلبات" value={String(summary.totals.orders)} />
            <TotalRow label="إجمالي المبيعات" value={`${summary.totals.gross_revenue_sar} ${CURRENCY_LABEL}`} />
            <TotalRow label={`العمولة (${(summary.totals.commission_rate * 100).toFixed(0)}%)`} value={`-${summary.totals.commission_sar} ${CURRENCY_LABEL}`} valueColor={colors.destructive} />
            <View style={styles.divider} />
            <TotalRow label="صافي المستحق" value={`${summary.totals.net_payable_sar} ${CURRENCY_LABEL}`} big />
          </View>

          {Object.keys(summary.by_status).length > 0 ? (
            <View style={styles.card}>
              <AppText weight="bold" size={14} style={{ marginBottom: 10 }}>
                حسب الحالة
              </AppText>
              {Object.entries(summary.by_status).map(([key, v]) => (
                <View key={key} style={styles.row}>
                  <AppText size={13} color={colors.mutedForeground}>
                    {orderStatusLabels[key] ?? key}
                  </AppText>
                  <AppText weight="semibold" size={13} ltr>
                    {v.count} · {v.total_sar} {CURRENCY_LABEL}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          {summary.daily.length > 0 ? (
            <View style={styles.card}>
              <AppText weight="bold" size={14} style={{ marginBottom: 10 }}>
                يوميًا
              </AppText>
              {summary.daily.map((d) => (
                <View key={d.day} style={styles.row}>
                  <AppText size={13} color={colors.mutedForeground} ltr>
                    {d.day}
                  </AppText>
                  <AppText weight="semibold" size={13} ltr>
                    {d.orders} طلب · {d.revenue_sar} {CURRENCY_LABEL}
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

function TotalRow({
  label,
  value,
  valueColor = colors.foreground,
  big,
}: {
  label: string;
  value: string;
  valueColor?: string;
  big?: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppText weight={big ? "extrabold" : "medium"} size={big ? 16 : 13} color={big ? colors.foreground : colors.mutedForeground}>
        {label}
      </AppText>
      <AppText weight={big ? "black" : "semibold"} size={big ? 17 : 13.5} color={valueColor} ltr>
        {value}
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
  scroll: {
    padding: 20,
    gap: 16,
  },
  totalsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
