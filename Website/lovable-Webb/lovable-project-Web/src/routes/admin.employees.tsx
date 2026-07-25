import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Power, RefreshCcw, ShieldCheck, UserCog, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiRequestError } from "@/lib/api";
import {
  addAdminEmployee,
  deleteAdminEmployee,
 
  getAdminEmployees,
  updateAdminEmployee,
  type AdminEmployee,
  
} from "@/lib/api-admin";
import { useCanManage } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "موظفو الإدارة — لوحة الإدارة" }] }),
  component: AdminEmployeesPage,
});

   

type LoadStatus = "loading" | "success" | "error";
const ADMIN_PERMISSIONS = [
  { label: "لوحة التحكم", value: "dashboard" },
  { label: "المستخدمون", value: "users" },
  { label: "التجار", value: "merchants" },
  { label: "المنتجات", value: "products" },
  { label: "الفئات", value: "categories" },
  { label: "طلبات التجار", value: "applications" },
  { label: "تذاكر الدعم", value: "support_tickets" },
  { label: "التقارير", value: "reports" },
];

const WAREHOUSE_PERMISSIONS = [
  { label: "المنتجات", value: "products" },
  { label: "الفئات", value: "categories" },
  { label: "طلبات التجار", value: "applications" },
  { label: "التقارير", value: "reports" },
];

function AdminEmployeesPage() {
  const canManage = useCanManage();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rows, setRows] = useState<AdminEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    
  name: "",
  phone: "",
  employeeType: "admin" as "admin" | "warehouse",
  permissions: [] as string[],
});
const visiblePermissions =
  form.employeeType === "warehouse"
    ? WAREHOUSE_PERMISSIONS
    : ADMIN_PERMISSIONS;
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/admin-employees (joined with the user).
    getAdminEmployees()
      .then((data) => {
        setRows(data);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب موظفي الإدارة.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("الاسم ورقم الجوال مطلوبان.");
      return;
    }
    setSaving(true);
    try {
      // Real backend call: provisions the user + grants admin_employee role.
      await addAdminEmployee({
  phone: form.phone.trim(),
  full_name: form.name.trim(),
  employeeType: form.employeeType,
  permissions: form.permissions,
});
      toast.success("أُضيف موظف الإدارة — سيدخل لوحته عند تسجيل دخوله برقمه.");
      setOpen(false);
      setForm({
  name: "",
  phone: "",
  employeeType: "admin",
  permissions: [],
});
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّرت إضافة الموظف.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: AdminEmployee) {
    setBusyId(row.id);
    try {
      const updated = await updateAdminEmployee(row.id, { is_active: !row.is_active });
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_active: updated.is_active } : r)),
      );
      toast.success(updated.is_active ? "تم تفعيل الموظف." : "تم إيقاف الموظف.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر التحديث.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AdminEmployee) {
    setBusyId(row.id);
    try {
      // Also revokes the admin_employee role server-side.
      await deleteAdminEmployee(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("أُزيل موظف الإدارة وسُحبت صلاحيته.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّرت الإزالة.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminPage
      title="موظفو الإدارة"
      subtitle="أضف موظفي إدارة بصلاحية قراءة فقط — يدخلون لوحة موظف الإدارة عند تسجيل الدخول برقمهم."
      action={
        canManage ? (
          <Button className="rounded-full font-bold" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة موظف إدارة
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        موظف الإدارة يحصل على صلاحية <span className="font-bold text-foreground">قراءة فقط</span> —
        يستعرض الطلبات والتجّار والمنتجات والتقارير، ولا يمكنه التعديل أو الوصول لأقسام الإدارة
        الكاملة.
      </div>

      {status === "loading" && (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <UserCog className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا يوجد موظفو إدارة بعد.</p>
        </div>
      )}

      {status === "success" && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => {
            const user = row.User ?? row.user ?? null;
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <UserCog className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold text-foreground">
                    {user?.full_name ?? "موظف إدارة"}
                  </p>
                  <p className="num mt-0.5 text-xs text-muted-foreground" dir="ltr">
                    {user?.phone ?? row.user_id.slice(0, 8)}
                  </p>
                </div>
                
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    row.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700",
                  )}
                >
                  {row.is_active ? "نشط" : "موقوف"}
                </span>
                {canManage && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => toggle(row)}
                    >
                      {busyId === row.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {row.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busyId === row.id}
                      onClick={() => remove(row)}
                    >
                      إزالة
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={(o) => !o && !saving && setOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
  {form.employeeType === "admin"
    ? "إضافة موظف إدارة"
    : "إضافة موظف مستودع"}
</DialogTitle>
            <DialogDescription>
  {form.employeeType === "admin"
    ? "يُنشأ حساب بصلاحية قراءة فقط داخل لوحة موظف الإدارة."
    : "يُنشأ حساب لموظف المستودع لإدارة الطلبات والشحنات والمخزون."}
</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="ae-name" className="text-xs font-semibold">
                الاسم الكامل
              </Label>
              <Input
                id="ae-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="ae-phone" className="text-xs font-semibold">
                رقم الجوال
              </Label>
              <Input
                id="ae-phone"
                dir="ltr"
                inputMode="tel"
                placeholder="+9665XXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="num mt-1"
              />
            </div>
            <div>
  <Label className="text-xs font-semibold">
    نوع الموظف
  </Label>

  <Select
    value={form.employeeType}
    onValueChange={(v) => {
  const type = v as "admin" | "warehouse";

  setForm((f) => ({
    ...f,
    employeeType: type,
    permissions:
      type === "warehouse"
        ? f.permissions.filter((p) =>
            WAREHOUSE_PERMISSIONS.some((x) => x.value === p)
          )
        : f.permissions,
  }));
}}
  >
    <SelectTrigger className="mt-1">
  <SelectValue />
</SelectTrigger>

<SelectContent>
  <SelectItem value="admin">
    موظف إدارة
  </SelectItem>

  <SelectItem value="warehouse">
    موظف مستودع
  </SelectItem>
</SelectContent>
</Select>
</div>

<div className="space-y-3">
  <Label className="text-xs font-semibold">
    الصلاحيات
  </Label>

  {visiblePermissions.map((item) => (
    <div key={item.value} className="flex items-center gap-2">
      <Checkbox
        checked={form.permissions.includes(item.value)}
        onCheckedChange={(checked) => {
          setForm((f) => ({
            ...f,
            permissions: checked
              ? [...f.permissions, item.value]
              : f.permissions.filter((p) => p !== item.value),
          }));
        }}
      />
      <Label>{item.label}</Label>
    </div>
  ))}
</div>
            
            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                إلغاء
              </Button>
              <Button type="submit" className="rounded-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                إضافة
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
