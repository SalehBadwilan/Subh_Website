import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, RefreshCcw, Users, WifiOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useMerchant } from "@/lib/merchant-context";
import { ApiRequestError, type AuthUser } from "@/lib/api";
import {
  addMerchantEmployee,
  employeeRoleLabels,
  deleteMerchantEmployee,
  getEmployeeUser,
  getMerchantEmployees,
  updateMerchantEmployee,
  type ApiMerchantEmployee,
} from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/employees")({
  head: () => ({ meta: [{ title: "الموظفون — صبح تاجر" }] }),
  component: EmployeesPage,
});

type JoinedEmployee = ApiMerchantEmployee & { user?: AuthUser };

type LoadStatus = "loading" | "success" | "error";

function EmployeesPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [rows, setRows] = useState<JoinedEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!merchant) return;
    setStatus("loading");
    setError(null);
    // Real backend calls: employee links + each linked user's profile.
    getMerchantEmployees(merchant.id)
      .then(async (links) => {
        const joined = await Promise.all(
          links.map(async (l) => {
            try {
              return { ...l, user: await getEmployeeUser(l.user_id) };
            } catch {
              return { ...l, user: undefined };
            }
          }),
        );
        setRows(joined);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الموظفين.");
        setStatus("error");
      });
  }, [merchant]);

  useEffect(load, [load]);

  async function toggleActive(row: JoinedEmployee) {
    setBusyId(row.id);
    try {
      // Real backend call: PUT /api/merchant-employees/:id
      const updated = await updateMerchantEmployee(row.id, { is_active: !row.is_active });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      toast.success(updated.is_active ? "تم تفعيل الموظف." : "تم إيقاف الموظف.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر التحديث.");
    } finally {
      setBusyId(null);
    }
  }
  async function handleDelete(id: string) {
    if (!window.confirm("هل أنت متأكد من حذف الموظف؟")) return;

    setBusyId(id);

    try {
      await deleteMerchantEmployee(id);

      setRows((prev) => prev.filter((r) => r.id !== id));

      toast.success("تم حذف الموظف");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذر حذف الموظف");
    } finally {
      setBusyId(null);
    }
  }

  async function submitNew(e: FormEvent) {
    e.preventDefault();
    if (!merchant) return;
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("الاسم ورقم الجوال مطلوبان.");
      return;
    }
    setSaving(true);
    try {
      // Real backend call: POST /api/merchant-employees (auto-provisions the
      // user by phone + grants the merchant_employee role).
      const created = await addMerchantEmployee({
        merchantId: merchant.id,
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        role: "merchant_staff",
      });
      const user = created.user ?? (await getEmployeeUser(created.user_id).catch(() => undefined));
      setRows((prev) => [...prev, { ...created, user }]);
      setDialogOpen(false);
      setForm({
        name: "",
        phone: "",
        email: "",
      });
      toast.success("تمت إضافة الموظف وإنشاء حسابه.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّرت إضافة الموظف.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MerchantPage
      title="فريق متجرك"
      subtitle="موظفون حقيقيون مرتبطون بمتجرك في نظام صبح"
      action={
        <Button className="rounded-full font-bold" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          إضافة موظف
        </Button>
      }
    >
      {status === "loading" && (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-20 rounded-2xl" />
            </li>
          ))}
        </ul>
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
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            لا يوجد موظفون بعد — أضف أول موظف لفريقك.
          </p>
        </div>
      )}

      {status === "success" && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-bold text-foreground">
                  {row.user?.full_name ?? "موظف"}
                </p>
                <p className="num mt-0.5 text-xs text-muted-foreground" dir="ltr">
                  {row.user?.phone ?? row.user_id.slice(0, 8)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                  row.role === "merchant_owner"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted text-foreground",
                )}
              >
                {employeeRoleLabels[row.role]}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(row.id)}
                  disabled={busyId === row.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <span className="text-[11px] font-semibold text-muted-foreground">
                  {row.is_active ? "نشط" : "موقوف"}
                </span>

                <Switch
                  checked={row.is_active}
                  disabled={busyId === row.id}
                  onCheckedChange={() => toggleActive(row)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
            <DialogDescription>
              سيُنشأ حساب حقيقي للموظف في نظام صبح ويُربط بمتجرك.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitNew} className="space-y-3">
            <div>
              <Label htmlFor="emp-name" className="text-xs font-semibold">
                الاسم الكامل
              </Label>
              <Input
                id="emp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="emp-phone" className="text-xs font-semibold">
                رقم الجوال
              </Label>
              <Input
                id="emp-phone"
                dir="ltr"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="num mt-1"
              />
            </div>
            <div>
              <Label htmlFor="emp-email" className="text-xs font-semibold">
                البريد الإلكتروني <span className="text-muted-foreground">(اختياري)</span>
              </Label>
              <Input
                id="emp-email"
                dir="ltr"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                إلغاء
              </Button>
              <Button type="submit" className="rounded-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                إضافة الموظف
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MerchantPage>
  );
}
