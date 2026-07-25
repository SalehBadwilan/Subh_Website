import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { useCartLines, useCartStore, useCartSubtotal } from "@/lib/cart-store";
import { colors, productTone, radius } from "@/lib/theme";
import { CURRENCY_LABEL, type CartLine } from "@/shared";

/**
 * السلّة — تعادل صفحة /customer/cart في الويب.
 * السلّة محفوظة محليًا (متطلب «لا فقدان للسلة» في الوثيقة).
 */
export default function CartScreen() {
  const router = useRouter();
  const lines = useCartLines();
  const subtotal = useCartSubtotal();

  if (lines.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <Header />
        <EmptyState
          icon="cart-outline"
          title="سلّتك فارغة"
          body="ابدأ التسوّق وأضف منتجاتك المفضلة — سلّتك تُحفظ تلقائيًا ولن تفقدها."
          actionLabel="ابدأ التسوّق"
          onAction={() => router.push("/(tabs)")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <Header count={lines.length} />
      <FlatList
        data={lines}
        keyExtractor={(l) => l.product.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <CartRow line={item} />}
        ListFooterComponent={
          <View style={styles.summary}>
            <SummaryRow label="المجموع الفرعي" value={`${subtotal} ${CURRENCY_LABEL}`} />
            <SummaryRow label="الشحن" value="مجاني" valueColor={colors.success} />
            <View style={styles.divider} />
            <SummaryRow label="الإجمالي" value={`${subtotal} ${CURRENCY_LABEL}`} big />
            <Button
              title="إتمام الشراء"
              onPress={() => router.push("/checkout/address")}
              icon={<Ionicons name="bag-check-outline" size={18} color={colors.primaryForeground} />}
              style={{ marginTop: 6 }}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <View style={styles.header}>
      <AppText weight="extrabold" size={22}>
        السلّة
      </AppText>
      {count ? (
        <AppText size={12.5} color={colors.mutedForeground}>
          {count} {count === 1 ? "منتج" : "منتجات"} في سلّتك
        </AppText>
      ) : null}
    </View>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const { setQty, removeItem } = useCartStore();
  const [toneStart, toneEnd] = productTone(line.product.hue);

  return (
    <View style={styles.row}>
      <LinearGradient colors={[toneStart, toneEnd]} style={styles.thumb}>
        <Ionicons name="bag-handle-outline" size={24} color="#FFFFFF" />
      </LinearGradient>

      <View style={styles.rowBody}>
        <AppText weight="bold" size={13} numberOfLines={2}>
          {line.product.name}
        </AppText>
        <AppText weight="black" size={15}>
          {line.product.price * line.qty}{" "}
          <AppText weight="bold" size={10.5}>
            {CURRENCY_LABEL}
          </AppText>
        </AppText>
        <View style={styles.stepper}>
          <StepBtn icon="add" onPress={() => setQty(line.product.id, line.qty + 1)} />
          <AppText weight="bold" size={14} ltr style={styles.qty}>
            {line.qty}
          </AppText>
          <StepBtn icon="remove" onPress={() => setQty(line.product.id, line.qty - 1)} />
        </View>
      </View>

      <Pressable
        onPress={() => removeItem(line.product.id)}
        accessibilityRole="button"
        accessibilityLabel={`إزالة ${line.product.name}`}
        style={styles.remove}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function StepBtn({ icon, onPress }: { icon: "add" | "remove"; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.stepBtn} accessibilityRole="button">
      <Ionicons name={icon} size={16} color={colors.foreground} />
    </Pressable>
  );
}

function SummaryRow({
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
    <View style={styles.summaryRow}>
      <AppText weight={big ? "extrabold" : "medium"} size={big ? 16 : 13} color={big ? colors.foreground : colors.mutedForeground}>
        {label}
      </AppText>
      <AppText weight={big ? "black" : "semibold"} size={big ? 17 : 13.5} color={valueColor}>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 2,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  row: {
    flexDirection: "row-reverse",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  stepper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    minWidth: 22,
    textAlign: "center",
  },
  remove: {
    alignSelf: "flex-start",
    padding: 4,
  },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
