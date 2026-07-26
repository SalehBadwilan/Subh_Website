import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Package, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { getUser, useRequireAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api";
import { getOrders, orderStatusLabels, orderStatusTone, type ApiOrder } from "@/lib/api-customer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/orders/")({
  head: () => ({
    meta: [
      { title: "طلباتي — صبح" },
      { name: "description", content: "جميع طلباتك على صبح في مكان واحد." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
}

type LoadStatus = "loading" | "success" | "error";

function OrdersPage() {
  const ready = useRequireAuth();
  const userId = getUser()?.id ?? null;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/orders (scoped to the JWT user server-side)
    getOrders()
      .then((r) => {
        setOrders(r.orders);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الطلبات.");
        setStatus("error");
      });
  }, [userId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  return (
    <PageContainer>
      <PageHeader title="طلباتي" subtitle="طلباتك الحقيقية المسجّلة في نظام صبح" />

      {status === "loading" && (
        <ul className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-2 h-4 w-32" />
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

      {status === "success" && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-bold text-foreground">لا توجد طلبات حتى الآن</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            عندما تُنشئ طلبك الأول، سيظهر هنا مباشرةً.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/customer">ابدأ التسوّق</Link>
          </Button>
        </div>
      )}

      {status === "success" && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to="/customer/orders/$id"
                params={{ id: o.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:shadow-soft"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Package className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="num block text-sm font-bold text-foreground">{o.number}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatDate(o.placed_at ?? o.created_at ?? "")}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                      orderStatusTone[o.status] ?? "bg-muted text-foreground border-border",
                    )}
                  >
                    {orderStatusLabels[o.status] ?? o.status}
                  </span>
                  <span className="num text-sm font-black text-foreground">
                    {Number.parseFloat(String(o.total_sar))} ر.س
                  </span>
                </span>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
