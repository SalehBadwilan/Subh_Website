import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useMerchantStore } from "@/lib/merchant-store";
import { colors, radius } from "@/lib/theme";
import { updateMerchant } from "@/shared";

/** الملف التجاري — تعديل الاسم التجاري والآيبان عبر `PUT /merchants/:id`. */
export default function MerchantProfileScreen() {
  const router = useRouter();
  const merchant = useMerchantStore((s) => s.merchant);
  const setMerchant = useMerchantStore.setState;

  const [commercialName, setCommercialName] = useState(merchant?.commercial_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isValid = commercialName.trim().length > 0;

  async function handleSave() {
    if (!merchant || !isValid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await updateMerchant(merchant.id, { commercial_name: commercialName.trim() });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setMerchant({ merchant: res.data });
    setSaved(true);
  }

  if (!merchant) return null;

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18}>
          الملف التجاري
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <AppText weight="semibold" size={12.5}>
            الاسم التجاري
          </AppText>
          <TextInput
            value={commercialName}
            onChangeText={(v) => { setCommercialName(v); setSaved(false); }}
            style={styles.input}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <ReadonlyField label="السجل التجاري" value={merchant.commercial_registration_no} />
        <ReadonlyField label="الرقم الضريبي" value={merchant.vat_number ?? "—"} />
        <ReadonlyField label="الآيبان" value={merchant.iban} />
        <ReadonlyField label="نسبة العمولة" value={merchant.commission_rate != null ? `${(merchant.commission_rate * 100).toFixed(1)}%` : "—"} />
        <ReadonlyField
          label="التقييم"
          value={merchant.rating_avg != null ? `${merchant.rating_avg.toFixed(1)} (${merchant.rating_count})` : "لا يوجد بعد"}
        />

        {error ? (
          <AppText weight="medium" size={12} color={colors.destructive}>
            {error}
          </AppText>
        ) : null}
        {saved ? (
          <AppText weight="medium" size={12} color={colors.success}>
            تم الحفظ بنجاح.
          </AppText>
        ) : null}

        <Button
          title="حفظ التغييرات"
          loadingTitle="جارٍ الحفظ…"
          onPress={handleSave}
          loading={saving}
          disabled={!isValid}
          style={{ marginTop: 6 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <AppText weight="semibold" size={12.5}>
        {label}
      </AppText>
      <View style={styles.readonlyBox}>
        <AppText size={14} color={colors.mutedForeground} ltr>
          {value}
        </AppText>
      </View>
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
    gap: 14,
  },
  field: {
    gap: 6,
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
    textAlign: "right",
  },
  readonlyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.muted,
  },
});
