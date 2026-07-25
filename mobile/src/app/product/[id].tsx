import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { useCartStore } from "@/lib/cart-store";
import { colors, productTone, radius } from "@/lib/theme";
import { CURRENCY_LABEL, getProductById, toUiProduct, type Product } from "@/shared";

type LoadStatus = "loading" | "error" | "notfound" | "ready";

/**
 * تفاصيل المنتج — بيانات حقيقية من `GET /products/:id`.
 * كما في الويب: اسم التاجر يظهر هنا فقط، والضمان باسم صبح.
 */
export default function ProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const addItem = useCartStore((s) => s.addItem);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [product, setProduct] = useState<Product | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setStatus("loading");
    const res = await getProductById(id);
    if (!res.ok) {
      setStatus(res.code === "http_error" && res.status === 404 ? "notfound" : "error");
      return;
    }
    setProduct(toUiProduct(res.data));
    setCategoryName(res.data.category?.name_ar ?? null);
    setStatus("ready");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  if (status === "loading") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === "error" || status === "notfound" || !product) {
    return (
      <SafeAreaView style={styles.screen}>
        <EmptyState
          icon={status === "notfound" ? "alert-circle-outline" : "cloud-offline-outline"}
          title={status === "notfound" ? "المنتج غير موجود" : "تعذّر تحميل المنتج"}
          body={status === "error" ? "تأكد من اتصالك بالإنترنت وحاول مجددًا." : undefined}
          actionLabel={status === "error" ? "إعادة المحاولة" : "العودة"}
          onAction={status === "error" ? load : () => router.back()}
        />
      </SafeAreaView>
    );
  }

  const [toneStart, toneEnd] = productTone(product.hue);
  const discounted = !!product.oldPrice && product.oldPrice > product.price;
  const outOfStock = product.inStock === false;

  function handleAdd() {
    if (!product || outOfStock) return;
    addItem(product, qty);
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1800);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={[styles.hero, { height: Math.min(width, 420) }]}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[toneStart, toneEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, { height: Math.min(width, 420) }]}
            >
              <View style={styles.heroIcon}>
                <Ionicons name="bag-handle-outline" size={54} color="#FFFFFF" />
              </View>
            </LinearGradient>
          )}
          {/* زر الرجوع — السهم لليمين لأن التنقل عربي RTL */}
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
          </Pressable>
          {product.badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: discounted ? colors.destructive : colors.background },
              ]}
            >
              <AppText
                weight="bold"
                size={11}
                color={discounted ? colors.destructiveForeground : colors.foreground}
              >
                {product.badge}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
            <AppText weight="semibold" size={12} color={colors.primary}>
              شحن وضمان من صبح
            </AppText>
            {categoryName ? (
              <AppText size={12} color={colors.mutedForeground}>
                · {categoryName}
              </AppText>
            ) : null}
          </View>

          <AppText weight="extrabold" size={20}>
            {product.name}
          </AppText>

          <AppText size={12.5} color={colors.mutedForeground}>
            يُباع عبر {product.merchant} — بضمان منصة صبح وأسعارها الموحّدة.
          </AppText>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color={colors.warning} />
            <AppText weight="semibold" size={13} ltr>
              {product.rating.toFixed(1)}
            </AppText>
            <AppText size={13} color={colors.mutedForeground} ltr>
              ({product.reviews})
            </AppText>
            <AppText size={12} color={colors.mutedForeground}>
              تقييم العملاء
            </AppText>
          </View>

          <View style={styles.priceRow}>
            <AppText weight="black" size={26}>
              {product.price}{" "}
              <AppText weight="bold" size={14}>
                {CURRENCY_LABEL}
              </AppText>
            </AppText>
            {discounted ? (
              <AppText
                size={14}
                color={colors.mutedForeground}
                style={{ textDecorationLine: "line-through" }}
              >
                {product.oldPrice} {CURRENCY_LABEL}
              </AppText>
            ) : null}
          </View>

          {outOfStock ? (
            <View style={styles.stockBadge}>
              <Ionicons name="close-circle-outline" size={14} color={colors.destructive} />
              <AppText weight="semibold" size={12} color={colors.destructive}>
                غير متوفر حاليًا
              </AppText>
            </View>
          ) : null}

          <AppText size={13} color={colors.mutedForeground} style={styles.description}>
            {product.description ?? "منتج مختار بعناية ضمن تشكيلة صبح، بجودة معتمدة وسعر موحّد تحدّده المنصة."}
          </AppText>

          <View style={styles.actionRow}>
            <View style={styles.stepper}>
              <Pressable onPress={() => setQty((q) => q + 1)} style={styles.stepBtn} accessibilityRole="button">
                <Ionicons name="add" size={18} color={colors.foreground} />
              </Pressable>
              <AppText weight="bold" size={16} ltr style={styles.qty}>
                {qty}
              </AppText>
              <Pressable
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                style={styles.stepBtn}
                accessibilityRole="button"
              >
                <Ionicons name="remove" size={18} color={colors.foreground} />
              </Pressable>
            </View>
            <Button
              title={outOfStock ? "غير متوفر" : added ? "تمت الإضافة ✓" : "أضف إلى السلّة"}
              onPress={handleAdd}
              disabled={outOfStock}
              icon={
                added || outOfStock ? undefined : (
                  <Ionicons name="cart-outline" size={18} color={colors.primaryForeground} />
                )
              }
              style={styles.addBtn}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scroll: {
    paddingBottom: 32,
  },
  hero: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.muted,
  },
  heroIcon: {
    width: 110,
    height: 110,
    borderRadius: radius.x3,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 14,
    right: 16,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  body: {
    padding: 20,
    gap: 8,
  },
  trustRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  ratingRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  priceRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  stockBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  description: {
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
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
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    minWidth: 26,
    textAlign: "center",
  },
  addBtn: {
    flex: 1,
  },
});
