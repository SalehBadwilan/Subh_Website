import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useCheckoutStore } from "@/lib/checkout-store";
import { colors, radius } from "@/lib/theme";

/** إتمام الشراء — شاشة النجاح */
export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const resetCheckout = useCheckoutStore((s) => s.reset);

  // يُصفَّر هنا (وليس قبل الانتقال من شاشة الدفع) لتفادي سباق يُعيد
  // توجيه شاشة الدفع لخطوة العنوان بمجرد أن يصبح order فارغًا.
  useEffect(() => {
    resetCheckout();
  }, [resetCheckout]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <AppText weight="extrabold" size={22} center>
          تم إنشاء طلبك بنجاح!
        </AppText>
        <AppText size={13.5} color={colors.mutedForeground} center style={{ maxWidth: 300 }}>
          سيصلك إشعار بكل تحديث على حالة الطلب حتى وصوله إلى باب المنزل.
        </AppText>

        <View style={styles.actions}>
          {orderId ? (
            <Button
              title="عرض تفاصيل الطلب"
              onPress={() => router.replace(`/order/${orderId}`)}
              style={{ minWidth: 220 }}
            />
          ) : null}
          <Button
            title="متابعة التسوّق"
            variant="outline"
            onPress={() => router.replace("/(tabs)")}
            style={{ minWidth: 220 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actions: {
    marginTop: 20,
    gap: 10,
    alignItems: "center",
  },
});
