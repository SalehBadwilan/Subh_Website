import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { AppText } from "./ui/AppText";
import { useCartStore } from "@/lib/cart-store";
import { colors, productTone, radius, shadow } from "@/lib/theme";
import { CURRENCY_LABEL, type Product } from "@/shared";

/**
 * بطاقة المنتج — مطابقة لبطاقة الويب (ApiProductCard.tsx) لمنتجات الباك إند
 * الحقيقية: صورة حقيقية من `product_images` بملء الإطار (object-cover) فوق
 * تدرّج احتياطي، شارة الفئة، شارة «نفدت الكمية»، سطر الثقة، اسم التاجر،
 * الاسم، الوصف، ثم السعر وSKU مع زر إضافة دائري.
 *
 * (لا تقييم/مراجعات على البطاقة — الباك إند لا يوفّرها؛ مطابقٌ للويب الذي
 * يعرضها فقط لبيانات الـ mock القديمة.)
 */
export function ProductCard({ product, style }: { product: Product; style?: ViewStyle }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const discounted = !!product.oldPrice && product.oldPrice > product.price;
  const outOfStock = product.inStock === false;
  const [toneStart, toneEnd] = productTone(product.hue);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={() => router.push(`/product/${product.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }, style]}
    >
      <View style={styles.image}>
        {product.imageUrl ? (
          // صورة حقيقية مرفوعة من الباك إند (جدول product_images) — تملأ الإطار.
          // نستخدم Image من react-native (وليس expo-image) لأن الأخير يضبط
          // loading="lazy" على الويب فلا تُحمّل الصور داخل قوائم RN-web الأفقية.
          <Image
            source={{ uri: product.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={product.name}
          />
        ) : (
          <LinearGradient
            colors={[toneStart, toneEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.imageFallback]}
          >
            <View style={styles.imageIcon}>
              <Ionicons name="sparkles-outline" size={28} color="#FFFFFF" />
            </View>
          </LinearGradient>
        )}

        {product.categoryName ? (
          <View style={styles.categoryBadge}>
            <AppText weight="bold" size={10} color={colors.foreground} numberOfLines={1}>
              {product.categoryName}
            </AppText>
          </View>
        ) : null}

        {outOfStock ? (
          <View style={styles.stockBadge}>
            <AppText weight="bold" size={10} color={colors.destructiveForeground}>
              نفدت الكمية
            </AppText>
          </View>
        ) : product.badge ? (
          <View style={[styles.stockBadge, { backgroundColor: discounted ? colors.destructive : colors.background }]}>
            <AppText weight="bold" size={10} color={discounted ? colors.destructiveForeground : colors.foreground}>
              {product.badge}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText weight="semibold" size={10.5} color={colors.primary}>
          شحن وضمان من صبح
        </AppText>
        <AppText size={10.5} color={colors.mutedForeground} numberOfLines={1}>
          <AppText weight="semibold" size={10.5} color={colors.mutedForeground}>
            التاجر:{" "}
          </AppText>
          {product.merchant}
        </AppText>
        <AppText weight="bold" size={13} numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>
        {product.description ? (
          <AppText size={11} color={colors.mutedForeground} numberOfLines={2}>
            {product.description}
          </AppText>
        ) : null}

        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <AppText weight="black" size={17}>
              {product.price}{" "}
              <AppText weight="bold" size={11}>
                {CURRENCY_LABEL}
              </AppText>
            </AppText>
            {discounted ? (
              <AppText
                size={11}
                color={colors.mutedForeground}
                style={{ textDecorationLine: "line-through" }}
              >
                {product.oldPrice} {CURRENCY_LABEL}
              </AppText>
            ) : product.sku ? (
              <AppText size={10} color={colors.mutedForeground} ltr>
                SKU: {product.sku}
              </AppText>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`أضف ${product.name} إلى السلّة`}
            disabled={outOfStock}
            onPress={(e) => {
              e.stopPropagation();
              addItem(product, 1);
            }}
            style={({ pressed }) => [styles.addBtn, outOfStock && styles.addBtnDisabled, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="add" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.soft,
  },
  image: {
    aspectRatio: 1,
    backgroundColor: colors.muted,
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.x2,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    maxWidth: "70%",
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    ...shadow.soft,
  },
  stockBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: colors.destructive,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    ...shadow.soft,
  },
  body: {
    padding: 14,
    gap: 3,
  },
  name: {
    minHeight: 40,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  priceCol: {
    flexShrink: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  addBtnDisabled: {
    backgroundColor: colors.mutedForeground,
    opacity: 0.5,
  },
});
