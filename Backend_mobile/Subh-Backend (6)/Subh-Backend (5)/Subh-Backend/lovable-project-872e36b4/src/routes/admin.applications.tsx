import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, CheckCircle2, XCircle, Eye, FileText } from "lucide-react";
import { AdminPage, statusLabels, statusTone } from "@/components/admin/AdminShell";
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
import { toast } from "sonner";
import {
  useMerchantStore,
  type MerchantApplication,
} from "@/lib/merchant-store";
import { useAdminStore } from "@/lib/admin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/applications")({
  head: () => ({ meta: [{ title: "طلبات التجّار — لوحة الإدارة" }] }),
  component: ApplicationsPage,
});

type TabKey = "all" | "pending" | "approved" | "rejected";
const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "معتمد" },
  { key: "rejected", label: "مرفوض" },
];

export function ApplicationsPage() {
  const { applications, approveApplication, rejectApplication } =
    useMerchantStore();
  const { packages } = useAdminStore();
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MerchantApplication | null>(null);
  const [rejectFor, setRejectFor] = useState<MerchantApplication | null>(null);
  const [reason, setReason] = useState("");

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (tab !== "all" && a.status !== tab) return false;
      if (
        q &&
        !a.profile.businessName.includes(q) &&
        !a.profile.ownerName.includes(q) &&
        !a.profile.crNumber.includes(q)
      )
        return false;
      return true;
    });
  }, [applications, tab, q]);

  function packageName(id: string) {
    return packages.find((p) => p.id === id)?.name ?? id;
  }

  function onApprove(a: MerchantApplication) {
    approveApplication(a.id);
    setSelected(null);
    toast.success(`تم اعتماد ${a.profile.businessName}. أصبحت لوحة التاجر متاحة.`);
  }

  function onReject() {
    if (!rejectFor) return;
    rejectApplication(rejectFor.id, reason.trim() || undefined);
    toast.success(`تم رفض طلب ${rejectFor.profile.businessName}.`);
    setRejectFor(null);
    setSelected(null);
    setReason("");
  }

  return (
    <AdminPage
      title="طلبات التجّار"
      subtitle="راجع طلبات انضمام التجّار واعتمدها أو ارفضها."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم النشاط أو المالك أو رقم السجل"
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

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا توجد طلبات انضمام حالياً.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ستظهر هنا طلبات التجّار فور تقديمها عبر نموذج تسجيل التاجر.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1.4fr,1fr,140px,120px,140px,180px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground md:grid">
            <span>النشاط</span>
            <span>المالك</span>
            <span>السجل التجاري</span>
            <span>الباقة</span>
            <span>تاريخ الإرسال</span>
            <span className="text-left">الحالة / إجراءات</span>
          </div>
          {filtered.map((a) => (
            <div
              key={a.id}
              className="grid gap-2 border-b border-border px-4 py-3 last:border-0 md:grid-cols-[1.4fr,1fr,140px,120px,140px,180px] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {a.profile.businessName}
                </p>
                <p className="text-xs text-muted-foreground md:hidden">
                  {a.profile.ownerName}
                </p>
              </div>
              <span className="hidden text-sm text-muted-foreground md:block">
                {a.profile.ownerName}
              </span>
              <span className="hidden text-xs font-semibold text-muted-foreground num md:block">
                {a.profile.crNumber}
              </span>
              <span className="hidden text-xs font-semibold text-foreground md:block">
                {packageName(a.profile.package)}
              </span>
              <span className="hidden text-xs text-muted-foreground md:block">
                {a.submittedAt}
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    statusTone[a.status],
                  )}
                >
                  {statusLabels[a.status]}
                </span>
                <Button size="sm" variant="outline" onClick={() => setSelected(a)}>
                  <Eye className="h-3.5 w-3.5" />
                  عرض
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.profile.businessName}
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      statusTone[selected.status],
                    )}
                  >
                    {statusLabels[selected.status]}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {selected.profile.ownerName} • {selected.submittedAt}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <DetailRow label="السجل التجاري" value={selected.profile.crNumber} mono />
                <DetailRow label="الرقم الضريبي" value={selected.profile.taxNumber} mono />
                <DetailRow label="الجوال" value={selected.profile.phone} mono ltr />
                <DetailRow label="البريد" value={selected.profile.email} ltr />
                <DetailRow label="المدينة" value={selected.profile.city} />
                <DetailRow label="العنوان" value={selected.profile.address || "—"} />
                <DetailRow label="الباقة" value={packageName(selected.profile.package)} />
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">السجل التجاري (ملف)</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {selected.crFileName || "cr-application.pdf"}
                  </span>
                </div>
                {selected.rejectionReason && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    <b>سبب الرفض:</b> {selected.rejectionReason}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                {selected.status === "pending" && (
                  <>
                    <Button
                      onClick={() => onApprove(selected)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      اعتماد
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectFor(selected);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      رفض
                    </Button>
                  </>
                )}
                {selected.status === "rejected" && (
                  <Button
                    onClick={() => onApprove(selected)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    اعتماد
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الانضمام</DialogTitle>
            <DialogDescription>
              اكتب سببًا موجزًا للرفض ليتم إبلاغ التاجر به.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">سبب الرفض (اختياري)</Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: السجل التجاري غير واضح، يرجى إعادة الرفع…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>
              إلغاء
            </Button>
            <Button onClick={onReject} className="bg-rose-600 hover:bg-rose-700">
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function DetailRow({
  label,
  value,
  mono,
  ltr,
}: {
  label: string;
  value: string;
  mono?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-bold text-foreground", mono && "num")}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </span>
    </div>
  );
}
