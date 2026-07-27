import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Store, Eye, FileText } from "lucide-react";
import { AdminPage, statusLabels, statusTone } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useMerchantStore,
  type MerchantApplication,
} from "@/lib/merchant-store";
import { useAdminStore } from "@/lib/admin-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/merchants")({
  head: () => ({ meta: [{ title: "التجّار — لوحة الإدارة" }] }),
  component: MerchantsPage,
});

export function MerchantsPage() {
  const { applications } = useMerchantStore();
  const { packages, catalog } = useAdminStore();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MerchantApplication | null>(null);

  const merchants = useMemo(
    () =>
      applications
        .filter((a) => a.status === "approved")
        .filter(
          (a) =>
            !q ||
            a.profile.businessName.includes(q) ||
            a.profile.ownerName.includes(q) ||
            a.profile.city.includes(q),
        ),
    [applications, q],
  );

  function packageName(id: string) {
    return packages.find((p) => p.id === id)?.name ?? id;
  }

  function assignedCount(merchantId: string) {
    return catalog.filter((p) => p.assignedMerchantIds.includes(merchantId)).length;
  }

  if (applications.filter((a) => a.status === "approved").length === 0) {
    return (
      <AdminPage title="التجّار" subtitle="قائمة التجّار المعتمدين على المنصة.">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Store className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا يوجد تجار معتمدون حتى الآن.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            اعتمد طلبات الانضمام لتظهر هنا كتجّار.
          </p>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="التجّار" subtitle="قائمة التجّار المعتمدين على المنصة.">
      <div className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم التاجر أو المالك أو المدينة"
            className="h-11 rounded-full pr-10"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {merchants.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m)}
            className="rounded-2xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-extrabold text-primary">
                {m.profile.businessName.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-foreground">
                    {m.profile.businessName}
                  </p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      statusTone[m.status],
                    )}
                  >
                    {statusLabels[m.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.profile.ownerName} • {m.profile.city}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {packageName(m.profile.package)}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 num">
                    {assignedCount(m.id)} منتج
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
        {merchants.length === 0 && (
          <p className="col-span-full rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            لا توجد نتائج مطابقة.
          </p>
        )}
      </div>

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
                  {selected.profile.ownerName} • انضم في {selected.profile.joinedAt}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <Row label="السجل التجاري" value={selected.profile.crNumber} mono />
                <Row label="الرقم الضريبي" value={selected.profile.taxNumber} mono />
                <Row label="الجوال" value={selected.profile.phone} mono ltr />
                <Row label="البريد" value={selected.profile.email} ltr />
                <Row label="المدينة" value={selected.profile.city} />
                <Row label="العنوان" value={selected.profile.address || "—"} />
                <Row label="الباقة" value={packageName(selected.profile.package)} />
                <Row label="المنتجات المسندة" value={`${assignedCount(selected.id)}`} mono />
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">السجل التجاري (ملف)</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {selected.crFileName || "cr-application.pdf"}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function Row({
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
