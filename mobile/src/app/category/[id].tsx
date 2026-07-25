import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { colors } from "@/lib/theme";
import { getCategories, getProducts, toUiCategory, toUiProduct, type Category, type Product } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** منتجات فئة — تعادل صفحة /customer/category/$id في الويب */
export default function CategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setStatus("loading");
    const [catsRes, productsRes] = await Promise.all([
      getCategories(),
      getProducts({ categoryId: id, limit: 50 }),
    ]);
    if (!catsRes.ok || !productsRes.ok) {
      setStatus("error");
      return;
    }
    const found = catsRes.data.find((c) => c.id === id);
    setCategory(found ? toUiCategory(found) : null);
    setProducts(productsRes.data.map(toUiProduct));
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
        <View style={styles.headerText}>
          <AppText weight="extrabold" size={18}>
            {category?.name ?? "الفئة"}
          </AppText>
          {category?.description ? (
            <AppText size={11.5} color={colors.mutedForeground}>
              {category.description}
            </AppText>
          ) : null}
        </View>
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
        <EmptyState
          icon="cube-outline"
          title="لا توجد منتجات في هذه الفئة حاليًا"
          body="تُضاف المنتجات مركزيًا من إدارة صبح — عد قريبًا."
          actionLabel="العودة"
          onAction={() => router.back()}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrap}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} style={styles.card} />}
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
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    gap: 0,
    flex: 1,
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
  rowWrap: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  card: {
    flex: 1,
  },
});
