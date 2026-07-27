import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MapPin, Package, RefreshCcw, Truck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { useRequireAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api";
import { getOrder, orderStatusLabels, orderStatusTone, type ApiOrder } from "@/lib/api-customer";
import { PaymentPanel } from "@/components/customer/PaymentPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/orders/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل الطلب — صبح" },
      { name: "description", content: "تفاصيل طلبك على صبح." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetailsPage,
});

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(v: string | number): number {
  return Number.parseFloat(String(v)) || 0;
}

type LoadStatus = "loading" | "success" | "error";

function OrderDetailsPage() {
  const ready = useRequireAuth();
  const { id } = Route.useParams();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/orders/:id (items included, user-scoped)
    getOrder(id)
      .then((o) => {
        setOrder(o);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الطلب.");
        setStatus("error");
      });
  }, [id]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  return (
    <PageContainer>
      <Link
        to="/customer/orders"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        كل الطلبات
      </Link>

      {status === "loading" && (
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
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
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={load} variant="outline" className="rounded-full">
              <RefreshCcw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/customer/orders">طلباتي</Link>
            </Button>
          </div>
        </div>
      )}

      {status === "success" && order && (
        <>
          <PageHeader
            title={
              <span className="inline-flex flex-wrap items-center gap-3">
                <span className="num">{order.number}</span>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-bold",
                    orderStatusTone[order.status] ?? "bg-muted text-foreground border-border",
                  )}
                >
                  {orderStatusLabels[order.status] ?? order.status}
                </span>
              </span>
            }
            subtitle={`أُنشئ في ${formatDate(order.placed_at ?? order.created_at)}`}
          />

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Items */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
                <Package className="h-4 w-4 text-primary" />
                المنتجات
              </h2>
              {(order.items ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد عناصر مسجّلة لهذا الطلب.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {(order.items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name_snapshot_ar}
                            className="h-16 w-16 rounded-xl border border-border object-cover"
                          />
                        )}

                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-bold text-foreground">
                            {item.name_snapshot_ar}
                          </p>

                          <p className="num mt-0.5 text-xs text-muted-foreground">
                            SKU: {item.sku_snapshot} × {item.quantity}
                          </p>
                        </div>
                      </div>

                      <span className="num shrink-0 text-sm font-black text-foreground">
                        {money(item.line_total_sar)} ر.س
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Summary + history */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
                  <Truck className="h-4 w-4 text-primary" />
                  ملخّص المبالغ
                </h2>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">المجموع الفرعي</dt>
                    <dd className="num font-semibold">{money(order.subtotal_sar)} ر.س</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">الشحن</dt>
                    <dd className="num font-semibold">{money(order.shipping_sar)} ر.س</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">الضريبة</dt>
                    <dd className="num font-semibold">{money(order.vat_sar)} ر.س</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 text-base">
                    <dt className="font-extrabold text-foreground">الإجمالي</dt>
                    <dd className="num font-black text-foreground">{money(order.total_sar)} ر.س</dd>
                  </div>
                </dl>
              </section>

              {order.status === "pending_payment" ? (
                // Real payment gateway: initiate + confirm, then reload the
                // order so the paid status/invoice reflect immediately.
                <PaymentPanel orderId={order.id} amountSar={money(order.total_sar)} onPaid={load} />
              ) : (
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    حالة الطلب
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    الحالة الحالية: {orderStatusLabels[order.status] ?? order.status}
                  </p>
                  {order.paid_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      تم الدفع في {formatDate(order.paid_at)}
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
