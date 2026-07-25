import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Info, RefreshCcw, Search, WifiOff } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import { ApiRequestError } from "@/lib/api";
import { orderStatusLabels, orderStatusTone, type ApiOrder } from "@/lib/api-customer";
import { getMerchantOrders } from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/orders")({
  head: () => ({ meta: [{ title: "الطلبات — صبح تاجر" }] }),
  component: MerchantOrdersPage,
});

function money(v: string | number): number {
  return Number.parseFloat(String(v)) || 0;
}

type LoadStatus = "loading" | "success" | "error";

function MerchantOrdersPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!merchant) return;
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/orders?merchant_id=
    getMerchantOrders(merchant.id)
      .then((r) => {
        setOrders(r.orders);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الطلبات.");
        setStatus("error");
      });
  }, [merchant]);

  useEffect(load, [load]);

  const statuses = useMemo(() => [...new Set(orders.map((o) => o.status))], [orders]);

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return o.number.toLowerCase().includes(needle);
  });

  return (
    <MerchantPage title="طلبات متجرك" subtitle="طلبات حقيقية من نظام صبح مرتبطة بمتجرك">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الطلب…"
            className="h-11 rounded-full bg-card pr-10"
            aria-label="بحث في الطلبات"
          />
        </div>
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === s ? null : s))}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              statusFilter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            {orderStatusLabels[s] ?? s}
          </button>
        ))}
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        تحديث حالة الطلب غير متاح — الباكند الحالي لا يوفّر مسار تعديل حالة الطلبات، فتُعرض الحالات
        للقراءة فقط.
      </p>

      {status === "loading" && (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
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

      {status === "success" && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {orders.length === 0 ? "لا توجد طلبات على متجرك بعد." : "لا توجد نتائج مطابقة."}
          </p>
        </div>
      )}

      {status === "success" && filtered.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {filtered.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="min-w-0">
                <p className="num text-sm font-bold text-foreground">{o.number}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(o.placed_at ?? o.created_at ?? "").toLocaleString("ar-SA", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    orderStatusTone[o.status] ?? "bg-muted text-foreground border-border",
                  )}
                >
                  {orderStatusLabels[o.status] ?? o.status}
                </span>
                <span className="num text-sm font-black text-foreground">
                  {money(o.total_sar)} ر.س
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MerchantPage>
  );
}
