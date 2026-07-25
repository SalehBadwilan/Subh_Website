import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { colors, radius } from "@/lib/theme";
import { createSupportTicket, supportCategoryLabels, type SupportCategory } from "@/shared";

/** جهات التواصل — مطابقة لـ customer.support في الويب. */
const CONTACTS: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; href: string }[] = [
  { icon: "call-outline", label: "اتصل بنا", value: "+966 56 002 4444", href: "tel:+966920000000" },
  { icon: "mail-outline", label: "البريد", value: "care@subh.sa", href: "mailto:care@subh.sa" },
  { icon: "logo-whatsapp", label: "واتساب", value: "+966 56 002 4444", href: "https://wa.me/966550000000" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "كم يستغرق التوصيل؟", a: "شحن صبح القياسي يصل خلال ٢ إلى ٥ أيام عمل لجميع مدن المملكة." },
  { q: "هل يمكنني إرجاع منتج؟", a: "نعم، يمكنك إرجاع أي منتج خلال ١٤ يومًا من الاستلام مع ضمان صبح." },
  { q: "كيف أتتبّع طلبي؟", a: "من صفحة «طلباتي» تجد حالة كل طلب وتحديثاته." },
  { q: "ما طرق الدفع المتاحة؟", a: "بطاقات الائتمان، مدى، المحافظ الإلكترونية، والدفع عند الاستلام." },
];

const CATEGORIES: SupportCategory[] = ["general", "billing", "delivery", "product", "returns", "other"];

/** الدعم — تعادل صفحة /customer/support في الويب: تذكرة دعم حقيقية + تواصل + FAQ. */
export default function SupportScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<SupportCategory>("general");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const isValid = subject.trim().length >= 3 && message.trim().length >= 5;

  async function handleSubmit() {
    if (!isValid) {
      setError("يرجى كتابة موضوع (٣ أحرف على الأقل) ورسالة (٥ أحرف على الأقل).");
      return;
    }
    setSending(true);
    setError(null);
    const res = await createSupportTicket({ subject_ar: subject.trim(), message_ar: message.trim(), category });
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
    setSubject("");
    setMessage("");
    setCategory("general");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText weight="extrabold" size={18}>
            الدعم
          </AppText>
          <AppText size={11.5} color={colors.mutedForeground}>
            فريق صبح جاهز لمساعدتك على مدار الساعة
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.contactRow}>
          {CONTACTS.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => Linking.openURL(c.href).catch(() => undefined)}
              style={styles.contactCard}
              accessibilityRole="button"
              accessibilityLabel={`${c.label}: ${c.value}`}
            >
              <View style={styles.contactIcon}>
                <Ionicons name={c.icon} size={18} color={colors.primary} />
              </View>
              <AppText size={10.5} color={colors.mutedForeground}>
                {c.label}
              </AppText>
              <AppText weight="bold" size={11} ltr numberOfLines={1}>
                {c.value}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <View style={styles.cardTitleIcon}>
              <Ionicons name="headset-outline" size={16} color={colors.primary} />
            </View>
            <AppText weight="bold" size={15}>
              أرسل رسالة إلى الدعم
            </AppText>
          </View>

          <View style={styles.field}>
            <AppText weight="semibold" size={12.5}>
              الموضوع
            </AppText>
            <TextInput
              value={subject}
              onChangeText={(v) => { setSubject(v); setSent(false); if (error) setError(null); }}
              placeholder="مثال: استفسار عن طلب"
              placeholderTextColor={colors.mutedForeground}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <AppText weight="semibold" size={12.5}>
              التصنيف
            </AppText>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.categoryChip, category === c && styles.categoryChipSelected]}
                  accessibilityRole="button"
                >
                  <AppText weight="semibold" size={11.5} color={category === c ? colors.primaryForeground : colors.foreground}>
                    {supportCategoryLabels[c]}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <AppText weight="semibold" size={12.5}>
              الرسالة
            </AppText>
            <TextInput
              value={message}
              onChangeText={(v) => { setMessage(v); setSent(false); if (error) setError(null); }}
              placeholder="اكتب تفاصيل استفسارك…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, styles.textarea]}
              multiline
            />
          </View>

          {error ? (
            <AppText weight="medium" size={12} color={colors.destructive}>
              {error}
            </AppText>
          ) : null}
          {sent ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <AppText weight="semibold" size={12} color={colors.success} style={{ flex: 1 }}>
                تم استلام رسالتك، سيتواصل معك فريق صبح قريبًا.
              </AppText>
            </View>
          ) : null}

          <Button
            title="إرسال"
            loadingTitle="جارٍ الإرسال…"
            onPress={handleSubmit}
            loading={sending}
            disabled={!isValid}
            icon={<Ionicons name="send" size={16} color={colors.primaryForeground} />}
          />
        </View>

        <View style={styles.card}>
          <AppText weight="bold" size={15} style={{ marginBottom: 4 }}>
            أسئلة شائعة
          </AppText>
          {FAQS.map((f, i) => (
            <Pressable
              key={f.q}
              onPress={() => setOpenFaq((cur) => (cur === i ? null : i))}
              style={[styles.faqRow, i < FAQS.length - 1 && styles.faqDivider]}
              accessibilityRole="button"
            >
              <View style={styles.faqQuestion}>
                <AppText weight="bold" size={13} style={{ flex: 1 }}>
                  {f.q}
                </AppText>
                <Ionicons name={openFaq === i ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
              </View>
              {openFaq === i ? (
                <AppText size={12} color={colors.mutedForeground} style={{ marginTop: 6, lineHeight: 20 }}>
                  {f.a}
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
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
    gap: 16,
  },
  contactRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  contactCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  cardTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
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
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  categoryWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  successBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  faqRow: {
    paddingVertical: 10,
  },
  faqDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  faqQuestion: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
});
