import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { AddressForm } from "@/components/AddressForm";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { deleteAddress, getAddresses, type ApiAddress } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";
type View_ = { mode: "list" } | { mode: "form"; editing: ApiAddress | null };

/** العناوين — CRUD كامل عبر `/addresses` */
export default function AddressesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [addresses, setAddresses] = useState<ApiAddress[]>([]);
  const [view, setView] = useState<View_>({ mode: "list" });

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getAddresses();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setAddresses(res.data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    const res = await deleteAddress(id);
    if (res.ok) setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  if (view.mode === "form") {
    return (
      <SafeAreaView edges={["top"]} style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            onPress={() => setView({ mode: "list" })}
            accessibilityRole="button"
            accessibilityLabel="إلغاء"
            style={styles.backBtn}
          >
            <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
          </Pressable>
          <AppText weight="extrabold" size={18}>
            {view.editing ? "تعديل العنوان" : "عنوان جديد"}
          </AppText>
        </View>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <AddressForm
            editing={view.editing}
            onSaved={(saved) => {
              setAddresses((prev) => {
                const exists = prev.some((a) => a.id === saved.id);
                const next = exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved];
                return saved.is_default ? next.map((a) => (a.id === saved.id ? a : { ...a, is_default: false })) : next;
              });
              setView({ mode: "list" });
            }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18} style={{ flex: 1 }}>
          عناويني
        </AppText>
        <Pressable
          onPress={() => setView({ mode: "form", editing: null })}
          accessibilityRole="button"
          accessibilityLabel="إضافة عنوان"
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </Pressable>
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
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="لا توجد عناوين محفوظة"
          body="أضف عنوانًا لتسريع إتمام الشراء لاحقًا."
          actionLabel="إضافة عنوان"
          onAction={() => setView({ mode: "form", editing: null })}
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AddressCard
              address={item}
              onEdit={() => setView({ mode: "form", editing: item })}
              onDelete={() => handleDelete(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: ApiAddress;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <AppText weight="bold" size={14}>
          {address.recipient_name}
        </AppText>
        {address.is_default ? (
          <View style={styles.defaultTag}>
            <AppText weight="semibold" size={10.5} color={colors.primary}>
              افتراضي
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText size={12.5} color={colors.mutedForeground} ltr>
        {address.phone}
      </AppText>
      <AppText size={12.5} color={colors.mutedForeground}>
        {address.line1}
        {address.line2 ? `، ${address.line2}` : ""}
      </AppText>
      <AppText size={12.5} color={colors.mutedForeground}>
        {address.city} · {address.region}
      </AppText>
      <View style={styles.cardActions}>
        <Pressable onPress={onEdit} style={styles.actionBtn} accessibilityRole="button">
          <Ionicons name="create-outline" size={15} color={colors.primary} />
          <AppText weight="semibold" size={12} color={colors.primary}>
            تعديل
          </AppText>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.actionBtn} accessibilityRole="button">
          <Ionicons name="trash-outline" size={15} color={colors.destructive} />
          <AppText weight="semibold" size={12} color={colors.destructive}>
            حذف
          </AppText>
        </Pressable>
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  defaultTag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cardActions: {
    flexDirection: "row-reverse",
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  formScroll: {
    padding: 20,
  },
});
