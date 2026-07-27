import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DollarSign, RefreshCcw, ShoppingBag, TrendingUp, WifiOff } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import { ApiRequestError } from "@/lib/api";
import { orderStatusLabels, type ApiOrder } from "@/lib/api-customer";
import { getMerchantOrders } from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/sales")({
  head: () => ({ meta: [{ title: "المبيعات والتقارير — صبح تاجر" }] }),
  component: SalesPage,
});

function money(v: string | number): number {
  return Number.parseFloat(String(v)) || 0;
}

type LoadStatus = "loading" | "success" | "error";

function SalesPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!merchant) return;
    setStatus("loading");
    setError(null);
    // Sales summary computed client-side from the REAL orders list — the
    // backend has no /api/merchant/sales-summary endpoint.
    getMerchantOrders(merchant.id)
      .then((r) => {
        setOrders(r.orders);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب المبيعات.");
        setStatus("error");
      });
  }, [merchant]);

  useEffect(load, [load]);

  const revenue = orders.reduce((s, o) => s + money(o.total_sar), 0);
  const avg = orders.length > 0 ? revenue / orders.length : 0;
  const byStatus = orders.reduce<Record<string, { count: number; total: number }>>((acc, o) => {
    const cur = acc[o.status] ?? { count: 0, total: 0 };
    acc[o.status] = { count: cur.count + 1, total: cur.total + money(o.total_sar) };
    return acc;
  }, {});

  const stats = [
    {
      label: "إجمالي الإيرادات",
      value: `${revenue.toFixed(0)} ر.س`,
      icon: DollarSign,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "عدد الطلبات",
      value: String(orders.length),
      icon: ShoppingBag,
      tone: "bg-sky-50 text-sky-600",
    },
    {
      label: "متوسط قيمة الطلب",
      value: `${avg.toFixed(0)} ر.س`,
      icon: TrendingUp,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <MerchantPage title="المبيعات والتقارير" subtitle="ملخّص محسوب مباشرة من طلبات متجرك الحقيقية">
      {status === "loading" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
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

      {status === "success" && (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, tone }) => (
              <li key={label} className="rounded-2xl border border-border bg-card p-5">
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="num mt-3 text-2xl font-black text-foreground">{value}</div>
                <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{label}</div>
              </li>
            ))}
          </ul>

          <section className="mt-8">
            <h2 className="mb-3 text-base font-extrabold text-foreground">حسب حالة الطلب</h2>
            {Object.keys(byStatus).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                لا توجد بيانات مبيعات بعد.
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {Object.entries(byStatus).map(([s, v]) => (
                  <li key={s} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-semibold text-foreground">
                      {orderStatusLabels[s] ?? s}
                    </span>
                    <span className="num text-muted-foreground">
                      {v.count} طلب ·{" "}
                      <span className="font-bold text-foreground">{v.total.toFixed(0)} ر.س</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </MerchantPage>
  );
}
