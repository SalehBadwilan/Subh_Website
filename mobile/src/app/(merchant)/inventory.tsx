import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { getMyInventory, updateInventory, type ApiMerchantInventoryRow } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** المخزون — تعديل الكمية المتاحة (`on_hand`) عبر `PUT /inventory/:id`. */
export default function MerchantInventoryScreen() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rows, setRows] = useState<ApiMerchantInventoryRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMyInventory();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setRows(res.data);
    setStatus("ready");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleAdjust(row: ApiMerchantInventoryRow, delta: number) {
    const nextOnHand = Math.max(0, row.on_hand + delta);
    if (nextOnHand === row.on_hand) return;
    setSavingId(row.id);
    const res = await updateInventory(row.id, { on_hand: nextOnHand });
    setSavingId(null);
    if (res.ok) {
      // PUT /inventory/:id يُرجع صفّ المخزون الخام فقط (بلا product/merchant_product
      // أو available المحسوب) — على عكس GET /merchant/inventory المُخصَّب بـ
      // serializeInventory. لذا نُدمج الحقول المحدَّثة فقط بدل استبدال الصف كاملًا.
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                on_hand: res.data.on_hand,
                reserved: res.data.reserved,
                reorder_threshold: res.data.reorder_threshold,
                available: Math.max(0, res.data.on_hand - res.data.reserved),
              }
            : r,
        ),
      );
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AppText weight="extrabold" size={22}>
          المخزون
        </AppText>
        <AppText size={12.5} color={colors.mutedForeground}>
          حدّث الكمية المتوفرة لكل منتج
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل المخزون"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : rows.length === 0 ? (
        <EmptyState icon="cube-outline" title="لا توجد عناصر مخزون بعد" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <InventoryRow row={item} saving={savingId === item.id} onAdjust={(delta) => handleAdjust(item, delta)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function InventoryRow({
  row,
  saving,
  onAdjust,
}: {
  row: ApiMerchantInventoryRow;
  saving: boolean;
  onAdjust: (delta: number) => void;
}) {
  const lowStock = row.available <= row.reorder_threshold;

  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <AppText weight="bold" size={13.5} numberOfLines={2}>
          {row.product?.name_ar ?? row.sku}
        </AppText>
        <AppText size={11.5} color={colors.mutedForeground} ltr>
          {row.sku}
        </AppText>
        <View style={styles.metaRow}>
          <AppText size={11.5} color={colors.mutedForeground}>
            محجوز: {row.reserved}
          </AppText>
          <AppText size={11.5} color={lowStock ? colors.destructive : colors.mutedForeground}>
            متاح: {row.available}
          </AppText>
        </View>
      </View>

      <View style={styles.stepper}>
        <Pressable onPress={() => onAdjust(1)} disabled={saving} style={styles.stepBtn} accessibilityRole="button">
          <Ionicons name="add" size={16} color={colors.foreground} />
        </Pressable>
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.qty} />
        ) : (
          <AppText weight="bold" size={15} ltr style={styles.qty}>
            {row.on_hand}
          </AppText>
        )}
        <Pressable
          onPress={() => onAdjust(-1)}
          disabled={saving || row.on_hand <= 0}
          style={styles.stepBtn}
          accessibilityRole="button"
        >
          <Ionicons name="remove" size={16} color={colors.foreground} />
        </Pressable>
      </View>
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
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  stepper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    minWidth: 28,
    textAlign: "center",
  },
});
