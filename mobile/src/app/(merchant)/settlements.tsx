import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import {
  CURRENCY_LABEL,
  getSettlements,
  readSettlementsSummary,
  settlementStatusLabels,
  type ApiSettlement,
  type SettlementsSummary,
} from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

const STATUS_TONE: Record<ApiSettlement["status"], { bg: string; fg: string }> = {
  pending: { bg: colors.warningSoft, fg: "#92400E" },
  processing: { bg: colors.primarySoft, fg: colors.primary },
  paid: { bg: colors.successSoft, fg: colors.success },
  failed: { bg: colors.destructiveSoft, fg: colors.destructive },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

/** التسويات المالية — عبر `GET /merchant/settlements` (كيان منفصل عن الطلبات). */
export default function MerchantSettlementsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [settlements, setSettlements] = useState<ApiSettlement[]>([]);
  const [summary, setSummary] = useState<SettlementsSummary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getSettlements();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setSettlements(res.data);
    setSummary(readSettlementsSummary(res.summary));
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
          التسويات المالية
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل التسويات"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : settlements.length === 0 ? (
        <EmptyState icon="wallet-outline" title="لا توجد تسويات بعد" />
      ) : (
        <FlatList
          data={settlements}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            summary ? (
              <View style={styles.summaryCard}>
                <SummaryRow label="إجمالي المبيعات" value={summary.gross_sales_sar} />
                <SummaryRow label="العمولة" value={-summary.commission_sar} />
                <SummaryRow label="المرتجعات" value={-summary.refunds_sar} />
                <View style={styles.divider} />
                <SummaryRow label="صافي المستحق" value={summary.net_payable_sar} big />
              </View>
            ) : null
          }
          renderItem={({ item }) => <SettlementRow settlement={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, big }: { label: string; value: number; big?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText weight={big ? "extrabold" : "medium"} size={big ? 15 : 13} color={big ? colors.foreground : colors.mutedForeground}>
        {label}
      </AppText>
      <AppText weight={big ? "black" : "semibold"} size={big ? 16 : 13.5} ltr>
        {value} {CURRENCY_LABEL}
      </AppText>
    </View>
  );
}

function SettlementRow({ settlement }: { settlement: ApiSettlement }) {
  const tone = STATUS_TONE[settlement.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <AppText weight="bold" size={13} ltr>
          {settlement.reference}
        </AppText>
        <View style={[styles.statusTag, { backgroundColor: tone.bg }]}>
          <AppText weight="semibold" size={11} color={tone.fg}>
            {settlementStatusLabels[settlement.status] ?? settlement.status}
          </AppText>
        </View>
      </View>
      <AppText size={11.5} color={colors.mutedForeground} ltr>
        {formatDate(settlement.period_from)} – {formatDate(settlement.period_to)}
      </AppText>
      <AppText weight="black" size={16} style={{ marginTop: 4 }}>
        {settlement.net_payable_sar} {CURRENCY_LABEL}
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
    gap: 12,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
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
});
