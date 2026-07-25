import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { colors, radius } from "@/lib/theme";
import {
  aiProductSearch,
  filterProductsByText,
  getCategories,
  getProducts,
  toUiCategory,
  toUiProduct,
  type ApiProduct,
  type Category,
  type Product,
  type SearchIntent,
} from "@/shared";

type SearchMode = "literal" | "ai";
type LiteralStatus = "loading" | "error" | "ready";
type AiStatus = "idle" | "loading" | "error" | "ready";

/**
 * البحث — يجمع مساري بحث الويب في شاشة واحدة مناسبة للموبايل:
 *   • «بحث» (افتراضي) = يجلب الكتالوج مرّة ويُفلتر على العميل بالاسم/الوصف/SKU
 *     مع رقائق فئات — مطابقٌ لـ customer.search (الباك إند بلا بحث نصّي حر).
 *   • «بحث ذكي» = POST /ai/product-search (يطابق customer.ai-search) — فهم دلالي،
 *     يُرجع ملخّص intent فقط لأسباب الخصوصية (بلا كلمات خام).
 */
export default function SearchScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("literal");
  const [query, setQuery] = useState("");

  // --- وضع البحث الحرفي (كتالوج محلي) ---
  const [literalStatus, setLiteralStatus] = useState<LiteralStatus>("loading");
  const [catalog, setCatalog] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);

  // --- وضع البحث الذكي ---
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [aiProducts, setAiProducts] = useState<Product[]>([]);
  const [intent, setIntent] = useState<SearchIntent | null>(null);

  const loadCatalog = useCallback(async () => {
    setLiteralStatus("loading");
    const [prodRes, catRes] = await Promise.all([getProducts({ limit: 100 }), getCategories()]);
    if (!prodRes.ok) {
      setLiteralStatus("error");
      return;
    }
    setCatalog(prodRes.data);
    setCategories(catRes.ok ? catRes.data.map(toUiCategory) : []);
    setLiteralStatus("ready");
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const literalResults = useMemo(() => {
    let rows = catalog;
    if (activeCat) rows = rows.filter((p) => (p.category_id ?? p.category?.id) === activeCat);
    return filterProductsByText(rows, query).map(toUiProduct);
  }, [catalog, query, activeCat]);

  async function runAiSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    setAiStatus("loading");
    setIntent(null);
    const res = await aiProductSearch(q);
    if (!res.ok) {
      setAiStatus("error");
      return;
    }
    setAiProducts(res.data.products.map(toUiProduct));
    setIntent(res.data.intent);
    setAiStatus("ready");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.searchBar}>
          <Ionicons name={mode === "ai" ? "sparkles" : "search"} size={16} color={colors.primary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => mode === "ai" && runAiSearch()}
            placeholder={mode === "ai" ? "اكتب طلبك بجملة كاملة…" : "ابحث بالاسم أو SKU…"}
            placeholderTextColor={colors.mutedForeground}
            style={styles.input}
            returnKeyType="search"
            autoFocus
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel="مسح" hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.modeRow}>
        <ModeTab label="بحث" icon="search" active={mode === "literal"} onPress={() => setMode("literal")} />
        <ModeTab label="بحث ذكي" icon="sparkles" active={mode === "ai"} onPress={() => setMode("ai")} />
      </View>

      {mode === "literal" ? (
        <LiteralResults
          status={literalStatus}
          results={literalResults}
          categories={categories}
          activeCat={activeCat}
          onToggleCat={(id) => setActiveCat((cur) => (cur === id ? null : id))}
          onRetry={loadCatalog}
        />
      ) : (
        <AiResults status={aiStatus} products={aiProducts} intent={intent} onRetry={runAiSearch} />
      )}
    </SafeAreaView>
  );
}

function LiteralResults({
  status,
  results,
  categories,
  activeCat,
  onToggleCat,
  onRetry,
}: {
  status: LiteralStatus;
  results: Product[];
  categories: Category[];
  activeCat: string | null;
  onToggleCat: (id: string) => void;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (status === "error") {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="تعذّر تحميل المنتجات"
        body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
        actionLabel="إعادة المحاولة"
        onAction={onRetry}
      />
    );
  }
  return (
    <>
      {categories.length > 0 ? (
        <View style={styles.catRow}>
          <FlatList
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.catList}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onToggleCat(item.id)}
                style={[styles.catChip, activeCat === item.id && styles.catChipActive]}
                accessibilityRole="button"
              >
                <AppText weight="semibold" size={12} color={activeCat === item.id ? colors.primaryForeground : colors.foreground}>
                  {item.name}
                </AppText>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      {results.length === 0 ? (
        <EmptyState icon="search-outline" title="لا توجد نتائج مطابقة" body="جرّب صياغة مختلفة أو اختر فئة أخرى." />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrap}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} style={styles.card} />}
        />
      )}
    </>
  );
}

function AiResults({
  status,
  products,
  intent,
  onRetry,
}: {
  status: AiStatus;
  products: Product[];
  intent: SearchIntent | null;
  onRetry: () => void;
}) {
  if (status === "idle") {
    return (
      <EmptyState
        icon="sparkles-outline"
        title="ابحث بذكاء عن أي منتج"
        body="اكتب ما تريده بجملة طبيعية ثم اضغط بحث — وسيفهم صبح طلبك ويعرض أقرب النتائج."
      />
    );
  }
  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (status === "error") {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="تعذّر إتمام البحث"
        body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
        actionLabel="إعادة المحاولة"
        onAction={onRetry}
      />
    );
  }
  if (products.length === 0) {
    return <EmptyState icon="search-outline" title="لا توجد نتائج مطابقة" body="جرّب صياغة مختلفة أو كلمات أعم." />;
  }
  return (
    <>
      {intent ? <IntentBar intent={intent} /> : null}
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.rowWrap}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ProductCard product={item} style={styles.card} />}
      />
    </>
  );
}

function ModeTab({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && styles.modeTabActive]} accessibilityRole="button">
      <Ionicons name={icon} size={14} color={active ? colors.primaryForeground : colors.mutedForeground} />
      <AppText weight="semibold" size={12.5} color={active ? colors.primaryForeground : colors.mutedForeground}>
        {label}
      </AppText>
    </Pressable>
  );
}

function IntentBar({ intent }: { intent: SearchIntent }) {
  const chips: string[] = [];
  if (intent.keywords_count) chips.push(`${intent.keywords_count} كلمات مفتاحية`);
  if (intent.has_price_filter) chips.push("فلتر سعر");
  if (intent.has_category_filter) chips.push("فلتر فئة");
  if (chips.length === 0) return null;
  return (
    <View style={styles.intentBar}>
      <Ionicons name="sparkles" size={13} color={colors.primary} />
      <AppText size={11.5} color={colors.mutedForeground}>
        فهم صبح طلبك: {chips.join(" · ")}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
    textAlign: "right",
  },
  modeRow: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modeTab: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  modeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  catRow: {
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  catChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  intentBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
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
