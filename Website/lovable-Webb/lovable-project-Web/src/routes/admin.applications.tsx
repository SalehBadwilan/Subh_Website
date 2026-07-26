import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
  Search,
  WifiOff,
  XCircle,
} from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ApiRequestError } from "@/lib/api";
import {
  approveApplication,
  getAdminApplications,
  rejectApplication,
  type AdminApplication,
} from "@/lib/api-admin";
import { useHasPermission } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [{ title: "طلبات التجّار — لوحة الإدارة" }] }),
  component: ApplicationsPage,
});

const statusLabels: Record<AdminApplication["status"], string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const statusTone: Record<AdminApplication["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  under_review: "border-sky-200 bg-sky-50 text-sky-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const tabs: { key: AdminApplication["status"] | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "approved", label: "معتمدة" },
  { key: "rejected", label: "مرفوضة" },
];

type LoadStatus = "loading" | "success" | "error";

export function ApplicationsPage() {
  const canManage = useHasPermission("applications");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<AdminApplication | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/admin/merchant-applications.
    getAdminApplications({ limit: 100 })
      .then((r) => {
        setApps(r.applications);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الطلبات.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      apps.filter((a) => {
        if (tab !== "all" && a.status !== tab) return false;
        if (q && !a.commercial_name.includes(q) && !(a.user?.full_name ?? "").includes(q))
          return false;
        return true;
      }),
    [apps, q, tab],
  );

  async function approve(a: AdminApplication) {
    setBusyId(a.id);
    try {
      // Real backend call: creates the Merchant + roles inside a transaction.
      await approveApplication(a.id);
      toast.success(`تم اعتماد «${a.commercial_name}» وإنشاء حساب التاجر.`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر اعتماد الطلب.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectFor) return;
    setBusyId(rejectFor.id);
    try {
      await rejectApplication(rejectFor.id, reason.trim() || undefined);
      toast.success("تم رفض الطلب.");
      setRejectFor(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "تعذّر رفض الطلب.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminPage
      title="طلبات التجّار"
      subtitle="طلبات الانضمام الحقيقية — الاعتماد يُنشئ حساب تاجر فعليًا في قاعدة البيانات."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم التجاري أو اسم المتقدّم"
            className="h-11 rounded-full pr-10"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold transition-colors",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
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

      {status === "success" && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">لا توجد طلبات مطابقة.</p>
        </div>
      )}

      {status === "success" && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{a.commercial_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.user?.full_name ?? "—"}
                    {a.user?.phone ? (
                      <span className="num" dir="ltr">
                        {" "}
                        • {a.user.phone}
                      </span>
                    ) : null}
                  </p>
                  <p className="num mt-1 text-[11px] text-muted-foreground">
                    سجل تجاري: {a.commercial_registration_no ?? "—"} • آيبان (مقنّع):{" "}
                    <span dir="ltr">{a.iban ?? "—"}</span>
                  </p>
                  {a.status === "rejected" && a.rejection_reason && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">
                      سبب الرفض: {a.rejection_reason}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    statusTone[a.status],
                  )}
                >
                  {statusLabels[a.status]}
                </span>
              </div>

              {canManage && (a.status === "pending" || a.status === "under_review") && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" disabled={busyId === a.id} onClick={() => approve(a)}>
                    {busyId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    اعتماد
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === a.id}
                    onClick={() => setRejectFor(a)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    رفض
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent className="max-w-md">
          {rejectFor && (
            <>
              <DialogHeader>
                <DialogTitle>رفض طلب الانضمام</DialogTitle>
                <DialogDescription>{rejectFor.commercial_name}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="reject-reason">سبب الرفض (يظهر للمتقدّم)</Label>
                <Textarea
                  id="reject-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: بيانات السجل التجاري غير مكتملة."
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectFor(null)}>
                  إلغاء
                </Button>
                <Button variant="destructive" onClick={reject} disabled={busyId === rejectFor.id}>
                  {busyId === rejectFor.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  تأكيد الرفض
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
