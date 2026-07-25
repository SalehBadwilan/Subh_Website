import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/EmptyState";
import { colors, radius } from "@/lib/theme";
import {
  addEmployee,
  employeeRoleLabels,
  getMyEmployees,
  toggleEmployeeActive,
  updateEmployeeRole,
  type ApiMerchantEmployee,
} from "@/shared";

type LoadStatus = "loading" | "error" | "ready";
type EditableRole = "merchant_manager" | "merchant_staff";

/** الموظفون — إضافة بالجوال (auto-provision)، تغيير دور، تعطيل/تفعيل (لا حذف). */
export default function MerchantEmployeesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [employees, setEmployees] = useState<ApiMerchantEmployee[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    const res = await getMyEmployees();
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setEmployees(res.data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(id: string) {
    const res = await toggleEmployeeActive(id);
    if (res.ok) setEmployees((prev) => prev.map((e) => (e.id === id ? res.data : e)));
  }

  async function handleRoleChange(id: string, role: EditableRole) {
    const res = await updateEmployeeRole(id, role);
    if (res.ok) setEmployees((prev) => prev.map((e) => (e.id === id ? res.data : e)));
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع" style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={20} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" size={18} style={{ flex: 1 }}>
          الموظفون
        </AppText>
        <Pressable
          onPress={() => setShowForm((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="إضافة موظف"
          style={styles.addBtn}
        >
          <Ionicons name={showForm ? "close" : "add"} size={22} color={colors.primary} />
        </Pressable>
      </View>

      {showForm ? <AddEmployeeForm onAdded={(emp) => { setEmployees((prev) => [emp, ...prev]); setShowForm(false); }} /> : null}

      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الموظفين"
          body="تأكد من اتصالك بالإنترنت وحاول مجددًا."
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      ) : employees.length === 0 ? (
        <EmptyState icon="people-outline" title="لا يوجد موظفون بعد" body="أضف موظفًا برقم جواله لمنحه صلاحية الدخول." />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <EmployeeRow employee={item} onToggle={() => handleToggle(item.id)} onRoleChange={(r) => handleRoleChange(item.id, r)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AddEmployeeForm({ onAdded }: { onAdded: (e: ApiMerchantEmployee) => void }) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<EditableRole>("merchant_staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!phone.trim()) {
      setError("رقم الجوال مطلوب.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addEmployee({ phone: phone.trim(), fullName: fullName.trim() || undefined, role });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAdded(res.data);
  }

  return (
    <ScrollView contentContainerStyle={styles.formCard} keyboardShouldPersistTaps="handled">
      <View style={styles.field}>
        <AppText weight="semibold" size={12.5}>
          رقم الجوال
        </AppText>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+9665XXXXXXXX"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, styles.inputLtr]}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.field}>
        <AppText weight="semibold" size={12.5}>
          الاسم (اختياري)
        </AppText>
        <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholderTextColor={colors.mutedForeground} />
      </View>
      <View style={styles.roleRow}>
        {(["merchant_staff", "merchant_manager"] as EditableRole[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={[styles.roleChip, role === r && styles.roleChipSelected]}
            accessibilityRole="button"
          >
            <AppText weight="semibold" size={12.5} color={role === r ? colors.primaryForeground : colors.foreground}>
              {employeeRoleLabels[r]}
            </AppText>
          </Pressable>
        ))}
      </View>
      {error ? (
        <AppText weight="medium" size={12} color={colors.destructive}>
          {error}
        </AppText>
      ) : null}
      <Button title="إضافة الموظف" loadingTitle="جارٍ الإضافة…" onPress={handleSave} loading={saving} />
    </ScrollView>
  );
}

function EmployeeRow({
  employee,
  onToggle,
  onRoleChange,
}: {
  employee: ApiMerchantEmployee;
  onToggle: () => void;
  onRoleChange: (role: EditableRole) => void;
}) {
  const isOwner = employee.role === "merchant_owner";
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <AppText weight="bold" size={13.5}>
          {employee.user?.full_name || "بلا اسم"}
        </AppText>
        {!employee.is_active ? (
          <View style={styles.inactiveTag}>
            <AppText weight="semibold" size={10} color={colors.destructive}>
              معطّل
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText size={11.5} color={colors.mutedForeground} ltr>
        {employee.user?.phone ?? ""}
      </AppText>

      {isOwner ? (
        <AppText size={12} color={colors.mutedForeground} style={{ marginTop: 6 }}>
          {employeeRoleLabels.merchant_owner}
        </AppText>
      ) : (
        <View style={styles.actionsRow}>
          <View style={styles.roleRow}>
            {(["merchant_staff", "merchant_manager"] as EditableRole[]).map((r) => (
              <Pressable
                key={r}
                onPress={() => onRoleChange(r)}
                style={[styles.roleChip, employee.role === r && styles.roleChipSelected]}
                accessibilityRole="button"
              >
                <AppText weight="semibold" size={11} color={employee.role === r ? colors.primaryForeground : colors.foreground}>
                  {employeeRoleLabels[r]}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={onToggle} style={styles.toggleBtn} accessibilityRole="button">
            <Ionicons
              name={employee.is_active ? "close-circle-outline" : "checkmark-circle-outline"}
              size={16}
              color={employee.is_active ? colors.destructive : colors.success}
            />
            <AppText weight="semibold" size={11.5} color={employee.is_active ? colors.destructive : colors.success}>
              {employee.is_active ? "تعطيل" : "تفعيل"}
            </AppText>
          </Pressable>
        </View>
      )}
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
  formCard: {
    padding: 20,
    gap: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  roleRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    justifyContent: "space-between",
  },
  inactiveTag: {
    backgroundColor: colors.destructiveSoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
});
