import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useCartLines, useCartSubtotal } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, placeOrder, type CartLine } from "@/shared";

/** إتمام الشراء ٢/٣ — مراجعة الطلب وإنشاؤه */
export default function CheckoutReviewScreen() {
  const router = useRouter();
  const address = useCheckoutStore((s) => s.address);
  const order = useCheckoutStore((s) => s.order);
  const setOrder = useCheckoutStore((s) => s.setOrder);
  const lines = useCartLines();
  const subtotal = useCartSubtotal();

  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فحص لمرة واحدة عند التركيب فقط — راجع التعليق المطابق في checkout/payment.tsx:
  // شاشات الخطوات السابقة قد تبقى مُركَّبة في الخلفية، وتصفير المتجر من شاشة
  // النجاح لاحقًا يجب ألّا يُعيد توجيه شاشة غادرها المستخدم فعليًا.
  useEffect(() => {
    if (!address) {
      router.replace("/checkout/address");
      return;
    }
    // طلب سابق قائم لهذا التدفّق — تجنّب إنشاء طلب مكرَّر عند العودة للخلف.
    if (order) {
      router.replace("/checkout/payment");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!address || order) return null;

  async function handleConfirm() {
    if (!address) return;
    setPlacing(true);
    setError(null);
    const res = await placeOrder({
      shippingAddressId: address.id,
      items: lines.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      notes: notes.trim() || undefined,
    });
    setPlacing(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOrder(res.data);
    router.push("/checkout/payment");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18} style={{ flex: 1 }}>
          مراجعة الطلب
        </AppText>
        <AppText weight="medium" size={12} color={colors.mutedForeground} ltr>
          2 / 3
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Section title="عنوان الشحن">
          <AppText weight="bold" size={13.5}>
            {address.recipient_name}
          </AppText>
          <AppText size={12} color={colors.mutedForeground} ltr>
            {address.phone}
          </AppText>
          <AppText size={12} color={colors.mutedForeground}>
            {address.line1}
            {address.line2 ? `، ${address.line2}` : ""} · {address.city}
          </AppText>
          <Pressable onPress={() => router.push("/checkout/address")} accessibilityRole="button" style={{ alignSelf: "flex-end" }}>
            <AppText weight="semibold" size={12} color={colors.primary}>
              تغيير العنوان
            </AppText>
          </Pressable>
        </Section>

        <Section title="المنتجات">
          {lines.map((line) => (
            <OrderLineRow key={line.product.id} line={line} />
          ))}
        </Section>

        <Section title="ملاحظات (اختياري)">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="أي تعليمات إضافية للتوصيل…"
            placeholderTextColor={colors.mutedForeground}
            style={styles.notesInput}
            multiline
          />
        </Section>

        <View style={styles.totalsCard}>
          <TotalRow label="المجموع الفرعي" value={`${subtotal} ${CURRENCY_LABEL}`} />
          <TotalRow label="الشحن" value="مجاني" valueColor={colors.success} />
          <View style={styles.divider} />
          <TotalRow label="الإجمالي" value={`${subtotal} ${CURRENCY_LABEL}`} big />
        </View>

        {error ? (
          <AppText weight="medium" size={12.5} color={colors.destructive}>
            {error}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="تأكيد الطلب" loadingTitle="جارٍ إنشاء الطلب…" onPress={handleConfirm} loading={placing} />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText weight="bold" size={13.5} style={{ marginBottom: 8 }}>
        {title}
      </AppText>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function OrderLineRow({ line }: { line: CartLine }) {
  return (
    <View style={styles.lineRow}>
      <AppText size={13} style={{ flex: 1 }} numberOfLines={2}>
        {line.product.name} × {line.qty}
      </AppText>
      <AppText weight="bold" size={13} ltr>
        {line.product.price * line.qty} {CURRENCY_LABEL}
      </AppText>
    </View>
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
    <View style={styles.totalRow}>
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
  scroll: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 0,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  lineRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 4,
  },
  notesInput: {
    minHeight: 60,
    fontSize: 13,
    fontFamily: "Cairo_400Regular",
    color: colors.foreground,
    textAlign: "right",
    textAlignVertical: "top",
  },
  totalsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  totalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
