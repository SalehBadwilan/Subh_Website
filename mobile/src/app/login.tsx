import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { AuthHeader } from "@/components/AuthHeader";
import { useAuthStore } from "@/lib/auth-store";
import { colors, font, radius } from "@/lib/theme";
import {
  cleanSaudiMobile,
  isValidSaudiMobile,
  requestOtp,
  SAUDI_MOBILE_ERROR,
  toInternationalSaudi,
} from "@/shared";

/**
 * تسجيل الدخول برقم الجوال السعودي — مطابق لصفحة /login في الويب:
 * نفس التحقق (يبدأ بـ 5 · 9 أرقام)، نفس النصوص، ونفس الهوية.
 */
export default function LoginScreen() {
  const router = useRouter();
  const setPhone = useAuthStore((s) => s.setPhone);
  const setDevOtp = useAuthStore((s) => s.setDevOtp);

  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const isValid = isValidSaudiMobile(digits);

  function handleChange(v: string) {
    setDigits(cleanSaudiMobile(v));
    if (error) setError(null);
  }

  async function onSubmit() {
    if (!isValid) {
      setError(SAUDI_MOBILE_ERROR);
      return;
    }
    setLoading(true);
    const phone = toInternationalSaudi(digits);
    const res = await requestOtp(phone);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPhone(phone);
    setDevOtp(res.data.devOtp ?? null);
    router.push("/verify");
  }

  const borderColor = error ? colors.destructive : focused ? colors.primary : colors.input;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader step={{ current: 1, total: 2 }} />

          <View style={styles.form}>
            <View style={styles.titleWrap}>
              <AppText weight="extrabold" size={26} center>
                مرحبًا بك في صبح
              </AppText>
              <AppText size={13} color={colors.mutedForeground} center>
                أدخل رقم جوالك السعودي لإرسال رمز التحقق.
              </AppText>
            </View>

            <View style={styles.field}>
              <AppText weight="semibold" size={13}>
                رقم الجوال
              </AppText>
              {/* حقل الرقم يُعرض LTR كما في الويب: البادئة +966 ثم الرقم */}
              <View style={[styles.phoneRow, { borderColor }]}>
                <View style={styles.prefix}>
                  <Ionicons name="call-outline" size={15} color={colors.mutedForeground} />
                  <AppText weight="semibold" size={14} color={colors.mutedForeground} ltr>
                    +966
                  </AppText>
                </View>
                <TextInput
                  value={digits}
                  onChangeText={handleChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="5X XXX XXXX"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={9}
                  editable={!loading}
                  style={styles.phoneInput}
                  accessibilityLabel="رقم الجوال"
                />
              </View>
              {error ? (
                <AppText weight="medium" size={11.5} color={colors.destructive}>
                  {error}
                </AppText>
              ) : (
                <AppText size={11.5} color={colors.mutedForeground}>
                  مثال: 5X XXX XXXX
                </AppText>
              )}
            </View>

            <Button
              title="متابعة"
              loadingTitle="جارٍ الإرسال…"
              onPress={onSubmit}
              loading={loading}
              disabled={!isValid}
            />

            <AppText size={11.5} color={colors.mutedForeground} center style={styles.terms}>
              بمتابعتك، فإنك توافق على{" "}
              <AppText size={11.5} weight="bold">
                شروط الاستخدام
              </AppText>{" "}
              و{" "}
              <AppText size={11.5} weight="bold">
                سياسة الخصوصية
              </AppText>
              .
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
  },
  form: {
    flex: 1,
    justifyContent: "center",
    gap: 22,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 48,
  },
  titleWrap: {
    gap: 4,
    marginBottom: 6,
  },
  field: {
    gap: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderWidth: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  prefix: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.muted,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderColor: colors.input,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: font.semibold,
    color: colors.foreground,
    letterSpacing: 1.5,
    textAlign: "left",
  },
  terms: {
    marginTop: 4,
  },
});
