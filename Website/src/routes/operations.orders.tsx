import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, MapPin, Package, Search } from "lucide-react";
import {
  getOperationsOrders,
  updateOperationsOrderStatus,
  type ApiOperationsOrder,
} from "@/lib/api";
import { toast } from "sonner";
import { OperationsPage, EmptyState } from "@/components/operations/OperationsShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { opsOrderStatusLabels, type OpsOrderStatus } from "@/lib/customer-data";
import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operations/orders")({
  head: () => ({
    meta: [{ title: "الطلبات — لوحة العمليات" }, { name: "robots", content: "noindex" }],
  }),
  component: OperationsOrdersPage,
});

const tabs: { key: "all" | OpsOrderStatus; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "new", label: "جديد" },
  { key: "preparing", label: "قيد التجهيز" },
  { key: "ready", label: "جاهز للشحن" },
  { key: "out_for_delivery", label: "خرج للتوصيل" },
  { key: "delivered", label: "تم التوصيل" },
  { key: "cancelled", label: "ملغى" },
];

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

function OperationsOrdersPage() {
  const [orders, setOrders] = useState<ApiOperationsOrder[]>([]);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ApiOperationsOrder | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await getOperationsOrders();
        console.log("Orders:", data);
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error("تعذر تحميل الطلبات");
      }
    }

    loadOrders();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const s = opsOf(o);
      if (tab !== "all" && s !== tab) return false;
      if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [orders, tab, q]);

  async function advance(o: ApiOperationsOrder, next: OpsOrderStatus, msg: string) {
    try {
      const backendStatus =
        next === "new"
          ? "paid"
          : next === "preparing"
            ? "preparing"
            : next === "ready"
              ? "ready_to_ship"
              : next === "out_for_delivery"
                ? "shipped"
                : next === "delivered"
                  ? "delivered"
                  : "cancelled";

      await updateOperationsOrderStatus(o.id, backendStatus);

      const data = await getOperationsOrders();
      setOrders(data);

      const updated = data.find((x) => x.id === o.id) ?? null;
      setActive(updated);

      toast.success(msg);
    } catch (err) {
      console.error(err);
      toast.error("تعذر تحديث حالة الطلب");
    }
  }

  if (orders.length === 0) {
    return (
      <OperationsPage title="الطلبات" subtitle="جميع طلبات العملاء الواردة إلى المنصة.">
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات حالياً."
          hint="ستظهر طلبات العملاء هنا فور استلامها."
        />
      </OperationsPage>
    );
  }

  return (
    <OperationsPage title="الطلبات" subtitle="تابع مراحل تجهيز الطلبات وحدّث الحالة.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الطلب"
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

      <div className="space-y-3">
        {filtered.map((o) => {
          const s = opsOf(o);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setActive(o)}
              className="block w-full rounded-2xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
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
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {o.customer.full_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    {o.shipment && (
                      <>
                        <MapPin className="h-3 w-3" />
                        {o.shipment.carrier} •{" "}
                      </>
                    )}

                    <span className="num" dir="ltr">
                      {new Date(o.placed_at).toLocaleDateString("ar-SA")}
                    </span>
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-extrabold text-foreground num">
                    {formatSAR(o.total_sar)}
                  </p>
                  <p className="text-xs text-muted-foreground num">{o.items.length} منتجات</p>
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            لا توجد طلبات مطابقة.
          </p>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="num">{active.number}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      tone[opsOf(active)],
                    )}
                  >
                    {opsOrderStatusLabels[opsOf(active)]}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {active.customer
                    ? `${active.customer.full_name} • ${new Date(active.placed_at).toLocaleDateString("ar-SA")}`
                    : new Date(active.placed_at).toLocaleDateString("ar-SA")}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">المنتجات</p>
                <ul className="space-y-2">
                  {active.items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{it.name_snapshot_ar}</span>
                      </span>
                      <span className="text-muted-foreground num">
                        × {it.quantity} • {formatSAR(it.unit_price_sar)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="text-lg font-extrabold text-foreground num">
                    {formatSAR(active.total_sar)}
                  </span>
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                {opsOf(active) === "new" && (
                  <Button onClick={() => advance(active, "preparing", "بدأ تجهيز الطلب.")}>
                    بدء التجهيز
                  </Button>
                )}
                {opsOf(active) === "preparing" && (
                  <Button onClick={() => advance(active, "ready", "الطلب جاهز للشحن.")}>
                    جاهز للشحن
                  </Button>
                )}
                {opsOf(active) === "ready" && (
                  <Button onClick={() => advance(active, "out_for_delivery", "خرج الطلب للتوصيل.")}>
                    خرج للتوصيل
                  </Button>
                )}
                {opsOf(active) === "out_for_delivery" && (
                  <Button onClick={() => advance(active, "delivered", "تم توصيل الطلب.")}>
                    تم التوصيل
                  </Button>
                )}
                <Button variant="outline" onClick={() => setActive(null)}>
                  إغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
