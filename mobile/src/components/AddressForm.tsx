import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { colors, radius } from "@/lib/theme";
import { createAddress, updateAddress, type AddressInput, type ApiAddress } from "@/shared";

const EMPTY_FORM: AddressInput = {
  recipient_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal_code: "",
  is_default: false,
};

/** نموذج عنوان (إضافة/تعديل) — يُستخدم في شاشة العناوين وفي إتمام الشراء. */
export function AddressForm({
  editing,
  onCancel,
  onSaved,
}: {
  editing: ApiAddress | null;
  onCancel?: () => void;
  onSaved: (address: ApiAddress) => void;
}) {
  const [form, setForm] = useState<AddressInput>(
    editing
      ? {
          recipient_name: editing.recipient_name,
          phone: editing.phone,
          line1: editing.line1,
          line2: editing.line2 ?? "",
          city: editing.city,
          region: editing.region,
          postal_code: editing.postal_code ?? "",
          is_default: editing.is_default,
        }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    form.recipient_name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.line1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.region.trim().length > 0;

  async function handleSave() {
    if (!isValid) {
      setError("يرجى تعبئة الاسم والجوال والعنوان والمدينة والمنطقة.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = editing ? await updateAddress(editing.id, form) : await createAddress(form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(res.data);
  }

  function field<K extends keyof AddressInput>(key: K, label: string, opts: { keyboardType?: "default" | "phone-pad" } = {}) {
    return (
      <View style={styles.field} key={key}>
        <AppText weight="semibold" size={12.5}>
          {label}
        </AppText>
        <TextInput
          value={String(form[key] ?? "")}
          onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
          style={styles.input}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={opts.keyboardType}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {field("recipient_name", "اسم المستلم")}
      {field("phone", "رقم الجوال", { keyboardType: "phone-pad" })}
      {field("line1", "العنوان (الحي والشارع)")}
      {field("line2", "تفاصيل إضافية (اختياري)")}
      {field("city", "المدينة")}
      {field("region", "المنطقة")}
      {field("postal_code", "الرمز البريدي (اختياري)")}

      <Pressable
        onPress={() => setForm((f) => ({ ...f, is_default: !f.is_default }))}
        style={styles.defaultToggle}
        accessibilityRole="button"
      >
        <Ionicons
          name={form.is_default ? "checkbox" : "square-outline"}
          size={20}
          color={form.is_default ? colors.primary : colors.mutedForeground}
        />
        <AppText size={13} weight="semibold">
          تعيين كعنوان افتراضي
        </AppText>
      </Pressable>

      {error ? (
        <AppText weight="medium" size={12} color={colors.destructive}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="حفظ العنوان"
          loadingTitle="جارٍ الحفظ…"
          onPress={handleSave}
          loading={saving}
          disabled={!isValid}
          style={{ flex: 1 }}
        />
        {onCancel ? <Button title="إلغاء" variant="outline" onPress={onCancel} style={{ flex: 1 }} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
  defaultToggle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  actions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 6,
  },
});
