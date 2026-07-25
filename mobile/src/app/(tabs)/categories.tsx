import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import { getCategories, toUiCategory, type Category } from "@/shared";

type LoadStatus = "loading" | "error" | "ready";

/** شبكة الفئات — تعادل صفحة /customer/categories في الويب */
export default function CategoriesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [categories, setCategories] = useState<Category[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getCategories();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setCategories(res.data.map(toUiCategory));
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <AppText weight="extrabold" size={22}>
          الفئات
        </AppText>
        <AppText size={12.5} color={colors.mutedForeground}>
          كل ما تحتاجه في مكان واحد
        </AppText>
      </View>

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الفئات"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : categories.length === 0 ? (
        <EmptyState icon="shapes-outline" title="لا توجد فئات حاليًا" body="تُضاف الفئات مركزيًا من إدارة صبح." />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(c) => c.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrap}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/category/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
            >
              <View style={[styles.iconTile, { backgroundColor: item.tone.bg }]}>
                <MaterialCommunityIcons
                  name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={30}
                  color={item.tone.fg}
                />
              </View>
              <AppText weight="bold" size={14}>
                {item.name}
              </AppText>
              {item.description ? (
                <AppText size={11} color={colors.mutedForeground} numberOfLines={2}>
                  {item.description}
                </AppText>
              ) : null}
            </Pressable>
          )}
        />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 2,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  rowWrap: {
    // أول عنصر يظهر يمينًا (RTL)
    flexDirection: "row-reverse",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.x2,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: radius.x2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    alignSelf: "flex-end",
  },
});
