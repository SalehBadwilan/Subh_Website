import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search, Store, WifiOff } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError } from "@/lib/api";
import { getAdminMerchants, type AdminMerchant } from "@/lib/api-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/merchants")({
  head: () => ({ meta: [{ title: "التجّار — لوحة الإدارة" }] }),
  component: MerchantsPage,
});

const merchantStatusLabels: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
  terminated: "ملغى",
};

const merchantStatusTone: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  suspended: "border-amber-200 bg-amber-50 text-amber-700",
  terminated: "border-rose-200 bg-rose-50 text-rose-700",
};

type LoadStatus = "loading" | "success" | "error";

export function MerchantsPage() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/admin/merchants — the IBAN arrives MASKED
    // from the server (****last4); the full value never reaches the browser.
    getAdminMerchants({ limit: 100 })
      .then((r) => {
        setMerchants(r.merchants);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب التجّار.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(
    () =>
      merchants.filter(
        (m) =>
          !q || m.commercial_name.includes(q) || (m.commercial_registration_no ?? "").includes(q),
      ),
    [merchants, q],
  );

  return (
    <AdminPage
      title="التجّار"
      subtitle="سجل التجّار الحقيقي — نفس البيانات التي تظهر لبوابة التاجر وطلبات العملاء."
    >
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم التجاري أو رقم السجل"
          className="h-11 rounded-full pr-10"
        />
      </div>

      {status === "loading" && (
        <div className="grid gap-3 sm:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
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
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {merchants.length === 0 ? "لا يوجد تجّار بعد." : "لا نتائج مطابقة للبحث."}
          </p>
        </div>
      )}

      {status === "success" && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Store className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {m.commercial_name}
                    </p>
                    <p className="num text-xs text-muted-foreground">
                      سجل: {m.commercial_registration_no ?? "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    merchantStatusTone[m.status] ?? "border-border bg-muted text-foreground",
                  )}
                >
                  {merchantStatusLabels[m.status] ?? m.status}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <dt className="text-muted-foreground">العمولة</dt>
                  <dd className="num mt-0.5 font-bold text-foreground">
                    {m.commission_rate != null ? `${Math.round(m.commission_rate * 100)}٪` : "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <dt className="text-muted-foreground">الآيبان (مقنّع)</dt>
                  <dd className="num mt-0.5 font-bold text-foreground" dir="ltr">
                    {m.iban ?? "—"}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <dt className="text-muted-foreground">الرقم الضريبي</dt>
                  <dd className="num mt-0.5 font-bold text-foreground">{m.vat_number ?? "—"}</dd>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <dt className="text-muted-foreground">التقييم</dt>
                  <dd className="num mt-0.5 font-bold text-foreground">
                    {m.rating_avg != null ? m.rating_avg.toFixed(1) : "—"} ({m.rating_count})
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
