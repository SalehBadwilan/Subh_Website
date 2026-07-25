import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/auth-store";
import { colors, radius } from "@/lib/theme";
import { updateMyProfile } from "@/shared";

/** تعديل الملف الشخصي — `PUT /users/me` (ذاتي، عبر JWT) */
export default function ProfileEditScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = fullName.trim().length > 0;

  async function handleSave() {
    if (!user || !isValid) return;
    setSaving(true);
    setError(null);
    const res = await updateMyProfile({ full_name: fullName.trim(), email: email.trim() });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // /users/me لا يُرجع merchant_id/roles — تُبقى كما هي من الجلسة الحالية.
    await updateUser({ ...user, ...res.data });
    router.back();
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18}>
          تعديل الملف الشخصي
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <AppText weight="semibold" size={12.5}>
            الاسم الكامل
          </AppText>
          <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholderTextColor={colors.mutedForeground} />
        </View>

        <View style={styles.field}>
          <AppText weight="semibold" size={12.5}>
            البريد الإلكتروني
          </AppText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={[styles.input, styles.inputLtr]}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <AppText weight="semibold" size={12.5}>
            رقم الجوال
          </AppText>
          <View style={styles.readonlyBox}>
            <AppText size={14} color={colors.mutedForeground} ltr>
              {user?.phone ?? ""}
            </AppText>
          </View>
          <AppText size={11} color={colors.mutedForeground}>
            لا يمكن تغيير رقم الجوال — تواصل مع الدعم عند الحاجة.
          </AppText>
        </View>

        {error ? (
          <AppText weight="medium" size={12} color={colors.destructive}>
            {error}
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
  inputLtr: {
    textAlign: "left",
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
