import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";
import { colors, radius } from "@/lib/theme";
import { CURRENCY_LABEL, confirmPayment, initiatePayment, paymentMethodLabels, type PaymentMethodKey } from "@/shared";

const METHODS: PaymentMethodKey[] = ["card", "mada", "apple_pay", "stc_pay"];
const METHOD_ICONS: Record<PaymentMethodKey, keyof typeof Ionicons.glyphMap> = {
  card: "card-outline",
  mada: "card-outline",
  apple_pay: "logo-apple",
  stc_pay: "phone-portrait-outline",
};

/** إتمام الشراء ٣/٣ — الدفع (مزوّد اختبار) */
export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const order = useCheckoutStore((s) => s.order);
  const clearCart = useCartStore((s) => s.clear);

  const [method, setMethod] = useState<PaymentMethodKey>("card");
  const [last4, setLast4] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فحص لمرة واحدة عند التركيب فقط — وليس تفاعليًا مع كل تغيير على order،
  // لأن شاشات التدفّق السابقة قد تبقى مُركَّبة في الخلفية (Stack على الويب)
  // وقد يُصفَّر order من شاشة النجاح بعد نجاح الدفع، فيُعيد هذا التأثير
  // التوجيه خطأً إلى خطوة العنوان لو ظلّ تفاعليًا.
  useEffect(() => {
    if (!order) router.replace("/checkout/address");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!order) return null;

  async function handlePay() {
    if (!order) return;
    setPaying(true);
    setError(null);

    const initRes = await initiatePayment(order.id, method);
    if (!initRes.ok) {
      setPaying(false);
      setError(initRes.error);
      return;
    }

    const confirmRes = await confirmPayment(initRes.data.payment.id, last4.trim() ? { last4: last4.trim() } : undefined);
    setPaying(false);
    if (!confirmRes.ok) {
      setError(confirmRes.error);
      return;
    }
    if (confirmRes.data.payment.status === "failed") {
      setError("تم رفض عملية الدفع. جرّب وسيلة أخرى أو تحقّق من البيانات.");
      return;
    }

    clearCart();
    // لا نُصفّر متجر إتمام الشراء هنا — شاشة النجاح تفعل ذلك بعد التحميل،
    // تفاديًا لسباق يُعيد التوجيه لخطوة العنوان قبل أن يكتمل الانتقال.
    router.replace(`/checkout/success?orderId=${order.id}`);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18} style={{ flex: 1 }}>
          الدفع
        </AppText>
        <AppText weight="medium" size={12} color={colors.mutedForeground} ltr>
          3 / 3
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.totalCard}>
          <AppText size={13} color={colors.mutedForeground}>
            المبلغ المطلوب
          </AppText>
          <AppText weight="black" size={28}>
            {order.total_sar} <AppText weight="bold" size={15}>{CURRENCY_LABEL}</AppText>
          </AppText>
        </View>

        <AppText weight="bold" size={13.5} style={{ marginBottom: 8 }}>
          وسيلة الدفع
        </AppText>
        <View style={styles.methods}>
          {METHODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              style={[styles.methodRow, method === m && styles.methodRowSelected]}
              accessibilityRole="button"
            >
              <Ionicons
                name={method === m ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={method === m ? colors.primary : colors.mutedForeground}
              />
              <Ionicons name={METHOD_ICONS[m]} size={18} color={colors.foreground} />
              <AppText weight="semibold" size={13.5} style={{ flex: 1 }}>
                {paymentMethodLabels[m]}
              </AppText>
            </Pressable>
          ))}
        </View>

        {(method === "card" || method === "mada") ? (
          <View style={styles.field}>
            <AppText weight="semibold" size={12.5}>
              آخر 4 أرقام من البطاقة (اختباري)
            </AppText>
            <TextInput
              value={last4}
              onChangeText={setLast4}
              placeholder="أي رقم — 0002 لمحاكاة الرفض"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
            <AppText weight="medium" size={12.5} color={colors.destructive} style={{ flex: 1 }}>
              {error}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="ادفع الآن" loadingTitle="جارٍ معالجة الدفع…" onPress={handlePay} loading={paying} />
      </View>
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
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 20,
    gap: 8,
  },
  totalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  methods: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  methodRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  methodRowSelected: {
    backgroundColor: colors.primarySoft,
  },
  field: {
    gap: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.input,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Cairo_400Regular",
    color: colors.foreground,
    textAlign: "left",
  },
  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
