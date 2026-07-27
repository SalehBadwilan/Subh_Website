import { createFileRoute } from "@tanstack/react-router";

import { Truck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { OperationsPage, EmptyState } from "@/components/operations/OperationsShell";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import {
  getOperationsOrders,
  updateOperationsOrderStatus,
  type ApiOperationsOrder,
} from "@/lib/api";
import { opsOrderStatusLabels, type OpsOrderStatus } from "@/lib/customer-data";
import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operations/shipments")({
  head: () => ({
    meta: [{ title: "الشحنات — لوحة العمليات" }, { name: "robots", content: "noindex" }],
  }),
  component: OperationsShipmentsPage,
});

const shipmentStatuses: OpsOrderStatus[] = ["preparing", "ready", "out_for_delivery", "delivered"];

const tone: Record<OpsOrderStatus, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200",
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
  out_for_delivery: "bg-violet-50 text-violet-700 border-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

function opsOf(o: ApiOperationsOrder): OpsOrderStatus {
  switch (o.status) {
    case "pending_payment":
    case "paid":
      return "new";
    case "preparing":
      return "preparing";
    case "ready_to_ship":
      return "ready";
    case "shipped":
      return "out_for_delivery";
    case "delivered":
      return "delivered";
    case "cancelled":
    case "returned":
      return "cancelled";
    default:
      return "new";
  }
}

function OperationsShipmentsPage() {
  const [orders, setOrders] = useState<ApiOperationsOrder[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOperationsOrders();
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error("تعذر تحميل الشحنات");
      }
    }

    load();
  }, []);

  const shipments = useMemo(
    () =>
      orders.filter((o) => {
        const s = opsOf(o);
        return s === "ready" || s === "out_for_delivery";
      }),
    [orders],
  );

  const active = orders.filter(
    (o) => opsOf(o) === "preparing" || opsOf(o) === "ready" || opsOf(o) === "out_for_delivery",
  );

  if (active.length === 0 && shipments.length === 0) {
    return (
      <OperationsPage title="الشحنات" subtitle="طلبات جاهزة للشحن أو في الطريق.">
        <EmptyState
          icon={Truck}
          title="لا توجد شحنات حالياً."
          hint="عندما يصبح الطلب جاهزاً للشحن سيظهر تلقائياً هنا."
        />
      </OperationsPage>
    );
  }

  async function next(o: ApiOperationsOrder) {
    const s = opsOf(o);

    const backendStatus =
      s === "preparing"
        ? "ready_to_ship"
        : s === "ready"
          ? "shipped"
          : s === "out_for_delivery"
            ? "delivered"
            : null;

    if (!backendStatus) return;

    try {
      await updateOperationsOrderStatus(o.id, backendStatus);

      const data = await getOperationsOrders();
      setOrders(data);

      toast.success("تم تحديث حالة الشحنة.");
    } catch (err) {
      console.error(err);
      toast.error("تعذر تحديث الشحنة");
    }
  }

  function labelForNext(o: ApiOperationsOrder): string | null {
    const s = opsOf(o);

    if (s === "preparing") return "جاهز للشحن";
    if (s === "ready") return "خروج للتوصيل";
    if (s === "out_for_delivery") return "تم التوصيل";

    return null;
  }

  return (
    <OperationsPage title="الشحنات" subtitle="طابور الطلبات الجاهزة والخارجة للتوصيل.">
      <ul className="space-y-3">
        {(active.length > 0 ? active : shipments).map((o) => {
          const s = opsOf(o);
          const nextLabel = labelForNext(o);
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground num">{o.number}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        tone[s],
                      )}
                    >
                      {opsOrderStatusLabels[s]}
                    </span>
                  </div>
                  {o.customer && (
                    <>
                      <p className="mt-1 text-xs font-semibold text-foreground">
                        {o.customer.full_name}
                      </p>

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {o.customer.phone}
                      </p>
                    </>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground num">
                    {o.items.length} منتجات • {formatSAR(o.total_sar)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {nextLabel && (
                    <Button size="sm" onClick={() => next(o)}>
                      {nextLabel}
                    </Button>
                  )}
                </div>
              </div>

              <ol className="mt-4 flex items-center gap-2">
                {shipmentStatuses.map((st) => {
                  const currentIdx = shipmentStatuses.indexOf(s);
                  const idx = shipmentStatuses.indexOf(st);
                  const done = currentIdx >= idx && currentIdx !== -1;
                  return (
                    <li key={st} className="flex flex-1 items-center gap-2">
                      <span
                        className={cn("h-2 w-2 rounded-full", done ? "bg-primary" : "bg-muted")}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-bold",
                          done ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {opsOrderStatusLabels[st]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ul>
    </OperationsPage>
  );
}
