import { EmptyState } from "@/components/EmptyState";
import { AppText } from "@/components/ui/AppText";

import { colors, radius } from "@/lib/theme";
import {
  createSubscription,
  CURRENCY_LABEL,
  getMerchantProfile,
  getMySubscription,
  getPlans,
  type ApiPlan,
  type MerchantSubscriptionState,
} from "@/shared";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoadStatus = "loading" | "error" | "ready";

const BILLING_PERIOD_LABELS: Record<ApiPlan["billing_period"], string> = {
  monthly: "شهريًا",
  quarterly: "كل 3 أشهر",
  yearly: "سنويًا",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * الاشتراك — تدفّق «طلب مراجعة» وليس اشتراكًا فوريًا ذاتيًا: التاجر يختار
 * خطة ويرسل طلب تغيير، تراجعه إدارة صبح من admin.subscription-requests
 * بالويب وتعتمده — عندها فقط يتحدّث الاشتراك فعليًا.
 */
export default function MerchantSubscriptionScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [sub, setSub] = useState<MerchantSubscriptionState | null>(null);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ApiPlan | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const handleCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 16);

    setCardNumber(numbers.replace(/(.{4})/g, "$1 ").trim());
  };

  const handleExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 4);

    if (numbers.length >= 3) {
      setExpiry(`${numbers.slice(0, 2)}/${numbers.slice(2)}`);
    } else {
      setExpiry(numbers);
    }
  };

  const handleCvv = (value: string) => {
    setCvv(value.replace(/\D/g, "").slice(0, 3));
  };

  const isFormValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardHolder.trim().length > 2 &&
    expiry.length === 5 &&
    cvv.length === 3;
  const [subscribing, setSubscribing] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMySubscription();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setSub(res.data);
    const plansRes = await getPlans();

    if (plansRes.ok) {
      setPlans(plansRes.data);
    }

    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubscribe() {
    if (!selectedPlan) return;

    try {
      setSubscribing(true);

      const profile = await getMerchantProfile();

      if (!profile.ok || !profile.data?.merchant) {
        Alert.alert("خطأ", "تعذر الحصول على بيانات التاجر.");
        return;
      }

      await createSubscription(profile.data.merchant.id, selectedPlan.id);

      setPaymentVisible(false);
      await load();

      Alert.alert("تم", "تم الاشتراك بنجاح.");
    } catch (error: any) {
      Alert.alert("خطأ", error?.message ?? "تعذر إتمام الاشتراك.");
    } finally {
      setSubscribing(false);
    }
  }

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
        <AppText weight="extrabold" size={18}>
          الاشتراك
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" || !sub ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الاشتراك"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.currentCard}>
            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <AppText weight="extrabold" size={22}>
                الاشتراك الحالي
              </AppText>

              <View
                style={{
                  backgroundColor: "#E8F8EE",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                <AppText
                  style={{
                    color: "#22A06B",
                    fontWeight: "700",
                  }}
                >
                  {sub.status === "active" ? "نشط" : sub.status}
                </AppText>
              </View>
            </View>

            <AppText weight="bold" size={20} style={{ marginBottom: 8 }}>
              {sub.plan?.name_ar}
            </AppText>

            <AppText
              size={14}
              color={colors.mutedForeground}
              style={{ marginBottom: 24 }}
            >
              الخطة المناسبة لإدارة أعمالك.
            </AppText>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#ECECEC",
                paddingTop: 18,
                flexDirection: "row-reverse",
                justifyContent: "space-between",
              }}
            >
              <View>
                <AppText size={13} color={colors.mutedForeground}>
                  تاريخ الانتهاء
                </AppText>

                <AppText weight="bold" style={{ marginTop: 6 }}>
                  {formatDate(sub.current_period_end)}
                </AppText>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <AppText size={13} color={colors.mutedForeground}>
                  السعر
                </AppText>

                <AppText weight="bold" style={{ marginTop: 6 }}>
                  {sub.plan?.price_sar} {CURRENCY_LABEL}
                </AppText>
              </View>
            </View>
          </View>

          <AppText weight="bold" size={14} style={{ marginTop: 4 }}>
            الخطط المتاحة
          </AppText>

          {plans
            .filter((plan) => plan.id !== sub?.plan?.id)
            .map((plan) => (
              <Pressable key={plan.id} style={styles.planCard}>
                <View>
                  <AppText weight="extrabold" size={18}>
                    {plan.name_ar}
                  </AppText>

                  <AppText
                    size={14}
                    color={colors.mutedForeground}
                    style={{ marginTop: 6 }}
                  >
                    {plan.price_sar} {CURRENCY_LABEL} /{" "}
                    {BILLING_PERIOD_LABELS[plan.billing_period]}
                  </AppText>

                  <Pressable
                    onPress={() => {
                      setSelectedPlan(plan);
                      setPaymentVisible(true);
                    }}
                    style={{
                      marginTop: 16,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                  >
                    <AppText style={{ color: "#fff" }}>اشترك الآن</AppText>
                  </Pressable>
                </View>
              </Pressable>
            ))}
        </ScrollView>
      )}
      <Modal
        visible={paymentVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.45)",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              borderRadius: 20,
              backgroundColor: "#fff",
              padding: 20,
            }}
          >
            <AppText
              weight="bold"
              size={22}
              style={{
                marginBottom: 24,
                textAlign: "right",
              }}
            >
              الدفع
            </AppText>

            <TextInput
              placeholder="رقم البطاقة"
              placeholderTextColor="#94A3B8"
              selectionColor={colors.primary}
              value={cardNumber}
              keyboardType="number-pad"
              onChangeText={handleCardNumber}
              style={styles.input}
            />

            <TextInput
              placeholder="اسم حامل البطاقة"
              placeholderTextColor="#94A3B8"
              selectionColor={colors.primary}
              value={cardHolder}
              onChangeText={setCardHolder}
              style={styles.input}
            />

            <View
              style={{
                flexDirection: "row",
                gap: 12,
              }}
            >
              <TextInput
                placeholder="MM/YY"
                placeholderTextColor="#94A3B8"
                selectionColor={colors.primary}
                value={expiry}
                onChangeText={handleExpiry}
                style={[styles.input, { flex: 1 }]}
              />

              <TextInput
  placeholder="CVV"
  placeholderTextColor="#94A3B8"
  selectionColor={colors.primary}
  value={cvv}
  keyboardType="number-pad"
  onChangeText={handleCvv}
  style={[styles.input, { flex: 1 }]}
/>
</View>

            <Pressable
              disabled={!isFormValid || subscribing}
              onPress={handleSubscribe}
              style={{
                backgroundColor: isFormValid ? colors.primary : "#ccc",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <AppText
                style={{
                  color: "#fff",
                  fontWeight: "700",
                }}
              >
                {subscribing
                  ? "جارٍ الدفع..."
                  : `ادفع ${selectedPlan?.price_sar ?? ""} ${CURRENCY_LABEL}`}
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setPaymentVisible(false)}
              style={{
                marginTop: 12,
                alignItems: "center",
                paddingVertical: 12,
              }}
            >
              <AppText>إلغاء</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
 input: {
  height: 54,
  backgroundColor: "#F8FAFC",
  borderWidth: 1,
  borderColor: "#D9E2EC",
  borderRadius: 14,
  paddingHorizontal: 16,
  marginBottom: 14,
  color: "#0F172A",
  fontSize: 16,
},
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
  padding: 20,
  gap: 12,
},

currentCard: {
  backgroundColor: "#FCFCFD",
  borderRadius: 22,
  padding: 22,

  borderWidth: 1,
  borderColor: "#E5E7EB",

  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: {
    width: 0,
    height: 2,
  },
  elevation: 3,

  marginBottom: 24,
},
  pendingBanner: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.x2,
    padding: 14,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E8ECF2",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
});
