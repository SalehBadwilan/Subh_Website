import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, getMyProducts, toggleMerchantProduct, type ApiMerchantProductRow } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** منتجاتي — تفعيل/تعطيل فقط (لا إنشاء من الموبايل)، عبر `GET /merchant/products`. */
export default function MerchantProductsScreen() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [products, setProducts] = useState<ApiMerchantProductRow[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMyProducts();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setProducts(res.data);
    setStatus("ready");
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function handleToggle(row: ApiMerchantProductRow) {
    if (!row.merchant_product_id) return;
    setTogglingId(row.id);
    const res = await toggleMerchantProduct(row.merchant_product_id, !row.is_active);
    setTogglingId(null);
    if (res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === row.id ? { ...p, is_active: res.data.is_active } : p)));
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AppText weight="extrabold" size={22}>
          منتجاتي
        </AppText>
        <AppText size={12.5} color={colors.mutedForeground}>
          فعّل أو عطّل ظهور منتجاتك في متجر صبح
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل المنتجات"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : products.length === 0 ? (
        <EmptyState icon="pricetags-outline" title="لا توجد منتجات بعد" body="تُضاف المنتجات عبر لوحة الإدارة." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductRow row={item} toggling={togglingId === item.id} onToggle={() => handleToggle(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ProductRow({
  row,
  toggling,
  onToggle,
}: {
  row: ApiMerchantProductRow;
  toggling: boolean;
  onToggle: () => void;
}) {
  const lowStock = row.inventory && row.inventory.available <= row.inventory.reorder_threshold;

  return (
    <View style={styles.card}>
      <View style={styles.cardBody}>
        <AppText weight="bold" size={13.5} numberOfLines={2}>
          {row.name_ar}
        </AppText>
        <AppText size={11.5} color={colors.mutedForeground} ltr>
          {row.sku}
        </AppText>
        <View style={styles.metaRow}>
          <AppText weight="black" size={14}>
            {row.price_sar} {CURRENCY_LABEL}
          </AppText>
          {row.inventory ? (
            <AppText size={11.5} color={lowStock ? colors.destructive : colors.mutedForeground}>
              متوفر: {row.inventory.available}
            </AppText>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={onToggle}
        disabled={toggling || !row.merchant_product_id}
        style={[styles.toggle, row.is_active ? styles.toggleOn : styles.toggleOff]}
        accessibilityRole="button"
        accessibilityLabel={row.is_active ? "تعطيل المنتج" : "تفعيل المنتج"}
      >
        {toggling ? (
          <ActivityIndicator size="small" color={row.is_active ? colors.primaryForeground : colors.mutedForeground} />
        ) : (
          <Ionicons
            name={row.is_active ? "checkmark-circle" : "close-circle-outline"}
            size={16}
            color={row.is_active ? colors.primaryForeground : colors.mutedForeground}
          />
        )}
        <AppText weight="semibold" size={11.5} color={row.is_active ? colors.primaryForeground : colors.mutedForeground}>
          {row.is_active ? "مفعّل" : "معطّل"}
        </AppText>
      </Pressable>
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
  toggle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 78,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  toggleOff: {
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
