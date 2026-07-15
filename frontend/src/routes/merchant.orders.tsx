import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, MapPin, Package, ClipboardList } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
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
import { toast } from "sonner";
import {
  formatSAR,
  merchantOrderStatusLabels,
  merchantOrderStatusTone,
  type MerchantOrder,
  type MerchantOrderStatus,
} from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/orders")({
  head: () => ({ meta: [{ title: "الطلبات — صبح تاجر" }] }),
  component: OrdersPage,
});

const tabs: { key: "all" | MerchantOrderStatus; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "new", label: "جديد" },
  { key: "accepted", label: "مقبول" },
  { key: "preparing", label: "قيد التجهيز" },
  { key: "ready", label: "جاهز" },
  { key: "completed", label: "مكتمل" },
];

function OrdersPage() {
  const { orders } = useMerchantStore();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<MerchantOrder | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (tab !== "all" && o.status !== tab) return false;
      if (q && !o.id.toLowerCase().includes(q.toLowerCase()) && !o.customer.includes(q)) return false;
      return true;
    });
  }, [orders, tab, q]);

  function updateStatus(_id: string, _next: MerchantOrderStatus, msg: string) {
    toast.success(msg);
  }

  if (orders.length === 0) {
    return (
      <MerchantPage title="الطلبات" subtitle="استقبل الطلبات وتابع مراحل تجهيزها.">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا توجد طلبات حتى الآن.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ستظهر طلبات العملاء هنا فور استلامها.
          </p>
        </div>
      </MerchantPage>
    );
  }


  return (
    <MerchantPage title="الطلبات" subtitle="استقبل الطلبات وتابع مراحل تجهيزها.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الطلب أو اسم العميل"
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
        {filtered.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setActive(o)}
            className="block w-full rounded-2xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-foreground num">{o.id}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      merchantOrderStatusTone[o.status],
                    )}
                  >
                    {merchantOrderStatusLabels[o.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{o.customer}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <MapPin className="h-3 w-3" /> {o.city} • {o.date}
                </p>
              </div>
              <div className="text-left">
                <p className="text-lg font-extrabold text-foreground num">{formatSAR(o.total)}</p>
                <p className="text-xs text-muted-foreground num">{o.itemCount} منتجات</p>
              </div>
            </div>
          </button>
        ))}
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
                      merchantOrderStatusTone[active.status],
                    )}
                  >
                    {merchantOrderStatusLabels[active.status]}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {active.customer} • {active.city} • {active.date}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">المنتجات</p>
                <ul className="space-y-2">
                  {active.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{it.name}</span>
                      </span>
                      <span className="text-muted-foreground num">
                        × {it.qty} • {formatSAR(it.price)}
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
                {active.status === "new" && (
                  <Button onClick={() => updateStatus(active.id, "accepted", "تم قبول الطلب.")}>
                    قبول الطلب
                  </Button>
                )}
                {active.status === "accepted" && (
                  <Button onClick={() => updateStatus(active.id, "preparing", "بدأ تجهيز الطلب.")}>
                    بدء التجهيز
                  </Button>
                )}
                {active.status === "preparing" && (
                  <Button
                    onClick={() => updateStatus(active.id, "ready", "الطلب جاهز للاستلام.")}
                  >
                    جاهز للاستلام
                  </Button>
                )}
                {active.status === "ready" && (
                  <Button variant="secondary" disabled>
                    بانتظار مندوب التوصيل
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
    </MerchantPage>
  );
}
