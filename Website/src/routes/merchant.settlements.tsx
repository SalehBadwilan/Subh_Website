import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Info, Percent, RefreshCcw, Wallet, WifiOff } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import { ApiRequestError } from "@/lib/api";
import { type ApiOrder } from "@/lib/api-customer";
import { getMerchantOrders } from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/settlements")({
  head: () => ({ meta: [{ title: "التسويات المالية — صبح تاجر" }] }),
  component: SettlementsPage,
});

function money(v: string | number): number {
  return Number.parseFloat(String(v)) || 0;
}

type LoadStatus = "loading" | "success" | "error";

function SettlementsPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!merchant) return;
    setStatus("loading");
    setError(null);
    // Settlements are DERIVED from the real orders + the merchant's real
    // commission_rate (no settlements endpoint exists on this backend).
    getMerchantOrders(merchant.id)
      .then((r) => {
        setOrders(r.orders);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب البيانات.");
        setStatus("error");
      });
  }, [merchant]);

  useEffect(load, [load]);

  if (!merchant) return null;

  const commission = money(merchant.commission_rate);
  const gross = orders.reduce((s, o) => s + money(o.total_sar), 0);
  const commissionAmount = gross * commission;
  const net = gross - commissionAmount;

  const rows = [
    { label: "إجمالي المبيعات", value: gross, tone: "text-foreground" },
    {
      label: `عمولة صبح (${Math.round(commission * 100)}٪)`,
      value: -commissionAmount,
      tone: "text-rose-600",
    },
    { label: "صافي المستحق لك", value: net, tone: "text-emerald-600" },
  ];

  return (
    <MerchantPage
      title="التسويات المالية"
      subtitle="محتسبة من طلباتك الحقيقية ونسبة العمولة المسجّلة في عقدك"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
          <Percent className="h-3.5 w-3.5" />
          <span className="num">IBAN: …{merchant.iban.slice(-4)}</span>
        </span>
      }
    >
      {status === "loading" && <Skeleton className="h-52 rounded-2xl" aria-hidden="true" />}

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

      {status === "success" && (
        <>
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-foreground">ملخّص التسوية الحالية</h2>
                <p className="num text-xs text-muted-foreground">{orders.length} طلب مشمول</p>
              </div>
            </div>
            <dl className="divide-y divide-border">
              {rows.map(({ label, value, tone }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <dt className="font-semibold text-muted-foreground">{label}</dt>
                  <dd className={cn("num font-black", tone)}>
                    {value < 0 ? "−" : ""}
                    {Math.abs(value).toFixed(2)} ر.س
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            لا يوفّر الباكند الحالي سجل تحويلات بنكية — الأرقام أعلاه محتسبة لحظيًا من طلبات متجرك
            الحقيقية ونسبة العمولة ({Math.round(commission * 100)}٪) المسجّلة في ملفك.
          </p>
        </>
      )}
    </MerchantPage>
  );
}
