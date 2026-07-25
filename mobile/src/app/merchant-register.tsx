import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { colors, radius } from "@/lib/theme";
import {
  applicationStatusLabels,
  getMyApplications,
  submitMerchantApplication,
  type ApiMerchantApplication,
} from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

const STATUS_TONE: Record<ApiMerchantApplication["status"], { bg: string; fg: string }> = {
  pending: { bg: colors.warningSoft, fg: "#92400E" },
  under_review: { bg: colors.primarySoft, fg: colors.primary },
  approved: { bg: colors.successSoft, fg: colors.success },
  rejected: { bg: colors.destructiveSoft, fg: colors.destructive },
};

/** طلب الانضمام كتاجر — متاح لأي مستخدم مسجَّل بلا دور merchant. */
export default function MerchantRegisterScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [application, setApplication] = useState<ApiMerchantApplication | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMyApplications();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setApplication(res.data[0] ?? null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showForm = status === "ready" && (!application || application.status === "rejected");

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18}>
          كن تاجرًا معنا
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <View style={styles.loading}>
          <AppText weight="medium" size={13} color={colors.destructive} center>
            تعذّر تحميل حالة الطلب.
          </AppText>
          <Button title="إعادة المحاولة" onPress={load} size="sm" style={{ marginTop: 10 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {application && application.status !== "rejected" ? (
            <ApplicationStatusCard application={application} />
          ) : (
            <>
              {application?.status === "rejected" ? (
                <View style={styles.rejectedBanner}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.destructive} />
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold" size={13} color={colors.destructive}>
                      رُفض الطلب السابق
                    </AppText>
                    {application.rejection_reason ? (
                      <AppText size={11.5} color={colors.destructive}>
                        {application.rejection_reason}
                      </AppText>
                    ) : null}
                    <AppText size={11.5} color={colors.mutedForeground} style={{ marginTop: 2 }}>
                      يمكنك تصحيح البيانات وإرسال طلب جديد.
                    </AppText>
                  </View>
                </View>
              ) : null}
              <RegisterForm onSubmitted={(app) => setApplication(app)} />
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ApplicationStatusCard({ application }: { application: ApiMerchantApplication }) {
  const tone = STATUS_TONE[application.status];
  return (
    <View style={styles.statusCard}>
      <View style={styles.statusIconWrap}>
        <Ionicons name="storefront-outline" size={34} color={colors.primary} />
      </View>
      <AppText weight="extrabold" size={17} center>
        {application.commercial_name}
      </AppText>
      <View style={[styles.statusTag, { backgroundColor: tone.bg }]}>
        <AppText weight="semibold" size={12.5} color={tone.fg}>
          {applicationStatusLabels[application.status]}
        </AppText>
      </View>
      <AppText size={12.5} color={colors.mutedForeground} center style={{ marginTop: 8 }}>
        {application.status === "approved"
          ? "تمت الموافقة على طلبك — سجّل الخروج ثم الدخول مجددًا لتفعيل بوابة التاجر."
          : "طلبك قيد المراجعة من فريق صبح، سنُعلمك فور اتخاذ قرار."}
      </AppText>
    </View>
  );
}

function RegisterForm({ onSubmitted }: { onSubmitted: (app: ApiMerchantApplication) => void }) {
  const [commercialName, setCommercialName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [iban, setIban] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = commercialName.trim().length > 0 && registrationNo.trim().length > 0 && iban.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) {
      setError("يرجى تعبئة الاسم التجاري والسجل التجاري والآيبان.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await submitMerchantApplication({
      commercial_name: commercialName.trim(),
      commercial_registration_no: registrationNo.trim(),
      iban: iban.trim(),
      vat_number: vatNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSubmitted(res.data);
  }

  return (
    <View style={styles.form}>
      {field("الاسم التجاري", commercialName, setCommercialName)}
      {field("رقم السجل التجاري", registrationNo, setRegistrationNo, { keyboardType: "default", ltr: true })}
      {field("الآيبان", iban, setIban, { ltr: true, autoCapitalize: "characters" })}
      {field("الرقم الضريبي (اختياري)", vatNumber, setVatNumber, { ltr: true })}
      {field("ملاحظات (اختياري)", notes, setNotes, { multiline: true })}

      {error ? (
        <AppText weight="medium" size={12} color={colors.destructive}>
          {error}
        </AppText>
      ) : null}

      <Button title="إرسال الطلب" loadingTitle="جارٍ الإرسال…" onPress={handleSubmit} loading={saving} disabled={!isValid} />
    </View>
  );
}

function field(
  label: string,
  value: string,
  onChange: (v: string) => void,
  opts: { keyboardType?: "default"; ltr?: boolean; multiline?: boolean; autoCapitalize?: "characters" } = {},
) {
  return (
    <View style={styles.field} key={label}>
      <AppText weight="semibold" size={12.5}>
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, opts.ltr && styles.inputLtr, opts.multiline && styles.inputMultiline]}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize={opts.autoCapitalize}
        multiline={opts.multiline}
      />
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  statusIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statusTag: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rejectedBanner: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.x2,
    padding: 14,
  },
  form: {
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
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
});
