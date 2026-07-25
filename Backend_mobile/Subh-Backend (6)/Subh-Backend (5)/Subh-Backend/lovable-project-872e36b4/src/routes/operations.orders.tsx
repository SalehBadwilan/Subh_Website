import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, MapPin, Package, Search } from "lucide-react";
import { toast } from "sonner";
import {
  OperationsPage,
  EmptyState,
} from "@/components/operations/OperationsShell";
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
import { useAppStore } from "@/lib/app-store";
import {
  opsOrderStatusLabels,
  type OpsOrderStatus,
  type Order,
} from "@/lib/customer-data";
import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operations/orders")({
  head: () => ({
    meta: [
      { title: "الطلبات — لوحة العمليات" },
      { name: "robots", content: "noindex" },
    ],
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

function opsOf(o: Order): OpsOrderStatus {
  return o.opsStatus ?? "new";
}

function OperationsOrdersPage() {
  const { orders, updateOrderOpsStatus } = useAppStore();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const s = opsOf(o);
      if (tab !== "all" && s !== tab) return false;
      if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [orders, tab, q]);

  function advance(o: Order, next: OpsOrderStatus, msg: string) {
    updateOrderOpsStatus(o.id, next);
    setActive({ ...o, opsStatus: next });
    toast.success(msg);
  }

  if (orders.length === 0) {
    return (
      <OperationsPage
        title="الطلبات"
        subtitle="جميع طلبات العملاء الواردة إلى المنصة."
      >
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات حالياً."
          hint="ستظهر طلبات العملاء هنا فور استلامها."
        />
      </OperationsPage>
    );
  }

  return (
    <OperationsPage
      title="الطلبات"
      subtitle="تابع مراحل تجهيز الطلبات وحدّث الحالة."
    >
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
                    <span className="text-sm font-extrabold text-foreground num">
                      {o.id}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        tone[s],
                      )}
                    >
                      {opsOrderStatusLabels[s]}
                    </span>
                  </div>
                  {o.delivery && (
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {o.delivery.recipient}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    {o.delivery && (
                      <>
                        <MapPin className="h-3 w-3" /> {o.delivery.city} •{" "}
                      </>
                    )}
                    <span className="num" dir="ltr">
                      {o.date}
                    </span>
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-extrabold text-foreground num">
                    {formatSAR(o.total)}
                  </p>
                  <p className="text-xs text-muted-foreground num">
                    {o.itemCount} منتجات
                  </p>
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
                  <span className="num">{active.id}</span>
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
                  {active.delivery
                    ? `${active.delivery.recipient} • ${active.delivery.city} • ${active.date}`
                    : active.date}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">
                  المنتجات
                </p>
                <ul className="space-y-2">
                  {active.items.map((it, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">
                          {it.product.name}
                        </span>
                      </span>
                      <span className="text-muted-foreground num">
                        × {it.qty} • {formatSAR(it.product.price)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="text-lg font-extrabold text-foreground num">
                    {formatSAR(active.total)}
                  </span>
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-start">
                {opsOf(active) === "new" && (
                  <Button
                    onClick={() =>
                      advance(active, "preparing", "بدأ تجهيز الطلب.")
                    }
                  >
                    بدء التجهيز
                  </Button>
                )}
                {opsOf(active) === "preparing" && (
                  <Button
                    onClick={() =>
                      advance(active, "ready", "الطلب جاهز للشحن.")
                    }
                  >
                    جاهز للشحن
                  </Button>
                )}
                {opsOf(active) === "ready" && (
                  <Button
                    onClick={() =>
                      advance(active, "out_for_delivery", "خرج الطلب للتوصيل.")
                    }
                  >
                    خرج للتوصيل
                  </Button>
                )}
                {opsOf(active) === "out_for_delivery" && (
                  <Button
                    onClick={() =>
                      advance(active, "delivered", "تم توصيل الطلب.")
                    }
                  >
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
