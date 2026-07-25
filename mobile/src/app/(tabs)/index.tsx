import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { BrandMark } from "@/components/BrandMark";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, radius, shadow } from "@/lib/theme";
import {
  getCategories,
  getNotifications,
  getProducts,
  toUiCategory,
  toUiProduct,
  type Category,
  type Product,
} from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/**
 * الشاشة الرئيسية — مطابقة لرئيسية الويب (customer.index.tsx):
 * ترويسة بحث، بنر ترحيبي، الفئات، ثم أقسام منتجات مبنية على فرز حقيقي
 * (الأحدث / الأقل سعرًا) — الباك إند لا يوفّر "الأكثر مبيعًا" أو خصومات
 * كحقول فعلية، فلا تُفترض بيانات غير موجودة.
 */
export default function HomeScreen() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);
  const [cheapest, setCheapest] = useState<Product[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const [catRes, newestRes, cheapRes, notifRes] = await Promise.all([
      getCategories(),
      getProducts({ sort: "newest", limit: 10 }),
      getProducts({ sort: "price_asc", limit: 10 }),
      getNotifications(),
    ]);
    if (!catRes.ok) {
      setStatus("error");
      return;
    }
    setCategories(catRes.data.map(toUiCategory));
    setNewest(newestRes.ok ? newestRes.data.map(toUiProduct) : []);
    setCheapest(cheapRes.ok ? cheapRes.data.map(toUiProduct) : []);
    setHasUnread(notifRes.ok ? notifRes.data.some((n) => !n.is_read) : false);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <HomeHeader hasUnread={hasUnread} />
      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الرئيسية"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <HeroBanner />
          <CategoriesRow categories={categories} />
          {newest.length > 0 ? (
            <ProductSection
              title="وصل حديثًا"
              subtitle="أحدث الإضافات إلى المنصة"
              icon="add-circle-outline"
              products={newest}
            />
          ) : null}
          {cheapest.length > 0 ? (
            <ProductSection
              title="الأقل سعرًا"
              subtitle="أفضل الأسعار الموحّدة على صبح"
              icon="pricetag-outline"
              products={cheapest}
              accent
            />
          ) : null}
          <HomeFooter />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function HomeHeader({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <BrandMark size={34} />
      <Pressable
        onPress={() => router.push("/search")}
        style={styles.searchBar}
        accessibilityRole="search"
        accessibilityLabel="بحث"
      >
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <AppText size={13} color={colors.mutedForeground}>
          ابحث عن منتج أو فئة…
        </AppText>
      </Pressable>
      <Pressable
        onPress={() => router.push("/notifications")}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="الإشعارات"
      >
        <Ionicons name="notifications-outline" size={21} color={colors.foreground} />
        {hasUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    </View>
  );
}

function HeroBanner() {
  const router = useRouter();
  return (
    <LinearGradient
      colors={[colors.primary, colors.primary, colors.primaryDark]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.hero}
    >
      <View style={[styles.heroCircle, { top: -64, left: -64, width: 190, height: 190 }]} />
      <View style={[styles.heroCircle, { bottom: -96, right: -40, width: 220, height: 220, opacity: 0.6 }]} />

      <View style={styles.heroChip}>
        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
        <AppText weight="semibold" size={11} color="#FFFFFF">
          حصريًا على صبح
        </AppText>
      </View>
      <AppText weight="black" size={28} color="#FFFFFF" style={styles.heroTitle}>
        أسواق المملكة{"\n"}بين يديك
      </AppText>
      <AppText size={13} color="rgba(255,255,255,0.85)" style={styles.heroBody}>
        منصة مركزية تجمع أفضل المنتجات بأسعار موحّدة وضمان صبح وتوصيل سريع لجميع مدن المملكة.
      </AppText>

      <View style={styles.heroButtons}>
        <Pressable
          onPress={() => router.push("/(tabs)/categories")}
          style={styles.heroBtnWhite}
          accessibilityRole="button"
        >
          <AppText weight="bold" size={13.5} color={colors.primary}>
            تسوّق العروض
          </AppText>
          <Ionicons name="chevron-back" size={15} color={colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/categories")}
          style={styles.heroBtnOutline}
          accessibilityRole="button"
        >
          <AppText weight="bold" size={13.5} color="#FFFFFF">
            تصفّح الفئات
          </AppText>
        </Pressable>
      </View>

      <View style={styles.heroTrust}>
        <TrustItem icon="truck-fast-outline" label="توصيل من صبح" />
        <TrustItem icon="star-outline" label="ضمان صبح" />
        <TrustItem icon="tag-outline" label="أسعار موحّدة" />
      </View>
    </LinearGradient>
  );
}

function TrustItem({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.trustItem}>
      <MaterialCommunityIcons name={icon} size={15} color="rgba(255,255,255,0.9)" />
      <AppText size={11} color="rgba(255,255,255,0.85)">
        {label}
      </AppText>
    </View>
  );
}

function CategoriesRow({ categories }: { categories: Category[] }) {
  const router = useRouter();
  if (categories.length === 0) return null;
  return (
    <View>
      <View style={styles.sectionPad}>
        <SectionHeader
          title="تسوّق حسب الفئة"
          subtitle="كل ما تحتاجه في مكان واحد"
          actionLabel="كل الفئات"
          onAction={() => router.push("/(tabs)/categories")}
        />
      </View>
      <FlatList
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/category/${item.id}`)}
            style={styles.categoryCard}
            accessibilityRole="button"
          >
            <View style={[styles.categoryIcon, { backgroundColor: item.tone.bg }]}>
              <MaterialCommunityIcons
                name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={26}
                color={item.tone.fg}
              />
            </View>
            <AppText weight="semibold" size={11.5} center numberOfLines={1}>
              {item.name}
            </AppText>
          </Pressable>
        )}
      />
    </View>
  );
}

function ProductSection({
  title,
  subtitle,
  icon,
  products,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  products: Product[];
  accent?: boolean;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(Math.round(width * 0.62), 240);

  return (
    <View>
      <View style={styles.sectionPad}>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          icon={icon}
          accent={accent}
          actionLabel="عرض الكل"
          onAction={() => router.push("/(tabs)/categories")}
        />
      </View>
      <FlatList
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => <ProductCard product={item} style={{ width: cardWidth }} />}
      />
    </View>
  );
}

function HomeFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerBrand}>
        <BrandMark size={28} />
        <AppText weight="extrabold" size={16}>
          صبح
        </AppText>
      </View>
      <AppText size={11} color={colors.mutedForeground} center>
        © {new Date().getFullYear()} صبح. جميع الحقوق محفوظة.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.destructive,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  scroll: {
    paddingVertical: 20,
    gap: 28,
    backgroundColor: colors.muted,
  },
  sectionPad: {
    paddingHorizontal: 20,
  },
  hList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  hero: {
    marginHorizontal: 20,
    borderRadius: radius.x3,
    padding: 24,
    overflow: "hidden",
    ...shadow.elevated,
  },
  heroCircle: {
    position: "absolute",
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroTitle: {
    marginTop: 14,
    lineHeight: 42,
  },
  heroBody: {
    marginTop: 6,
    maxWidth: 320,
  },
  heroButtons: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  heroBtnWhite: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 20,
    height: 44,
  },
  heroBtnOutline: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: radius.full,
    paddingHorizontal: 20,
    height: 44,
  },
  heroTrust: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 18,
  },
  trustItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  categoryCard: {
    width: 88,
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.x2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: radius.x3,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  footerBrand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
});
