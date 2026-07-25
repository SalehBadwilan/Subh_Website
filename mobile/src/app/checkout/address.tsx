import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { AddressForm } from "@/components/AddressForm";
import { EmptyState } from "@/components/EmptyState";
import { useCheckoutStore } from "@/lib/checkout-store";
import { colors, radius } from "@/lib/theme";
import { getAddresses, type ApiAddress } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** إتمام الشراء ١/٣ — اختيار عنوان الشحن */
export default function CheckoutAddressScreen() {
  const router = useRouter();
  const setAddress = useCheckoutStore((s) => s.setAddress);
  const currentAddress = useCheckoutStore((s) => s.address);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentAddress?.id ?? null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getAddresses();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setAddresses(res.data);
    if (!selectedId) {
      const preferred = res.data.find((a) => a.is_default) ?? res.data[0];
      if (preferred) setSelectedId(preferred.id);
    }
    setStatus("ready");
    setShowForm(res.data.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleContinue() {
    const address = addresses.find((a) => a.id === selectedId);
    if (!address) return;
    setAddress(address);
    router.push("/checkout/review");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18} style={{ flex: 1 }}>
          عنوان الشحن
        </AppText>
        <AppText weight="medium" size={12} color={colors.mutedForeground} ltr>
          1 / 3
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل العناوين"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : showForm ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AddressForm
            editing={null}
            onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            onSaved={(saved) => {
              setAddresses((prev) => [...prev, saved]);
              setSelectedId(saved.id);
              setShowForm(false);
            }}
          />
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {addresses.map((address) => (
              <Pressable
                key={address.id}
                onPress={() => setSelectedId(address.id)}
                style={[styles.card, selectedId === address.id && styles.cardSelected]}
                accessibilityRole="button"
              >
                <Ionicons
                  name={selectedId === address.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selectedId === address.id ? colors.primary : colors.mutedForeground}
                />
                <View style={styles.cardBody}>
                  <AppText weight="bold" size={14}>
                    {address.recipient_name}
                  </AppText>
                  <AppText size={12} color={colors.mutedForeground} ltr>
                    {address.phone}
                  </AppText>
                  <AppText size={12} color={colors.mutedForeground}>
                    {address.line1}
                    {address.line2 ? `، ${address.line2}` : ""} · {address.city}
                  </AppText>
                </View>
              </Pressable>
            ))}

            <Pressable onPress={() => setShowForm(true)} style={styles.addRow} accessibilityRole="button">
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <AppText weight="semibold" size={13} color={colors.primary}>
                إضافة عنوان جديد
              </AppText>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <Button title="متابعة" onPress={handleContinue} disabled={!selectedId} />
          </View>
        </>
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
  card: {
    flexDirection: "row-reverse",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  addRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
