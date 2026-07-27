import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, MapPin, Package, Search } from "lucide-react";
import { toast } from "sonner";
import {
  MerchantEmployeePage,
  EmptyState,
} from "@/components/merchant-employee/MerchantEmployeeShell";
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

import { useEffect, useMemo, useState } from "react";

import { getEmployeeOrders, updateEmployeeOrderStatus } from "@/lib/api-merchant";

import { orderStatusLabels, type ApiOrder } from "@/lib/api-customer";

import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant-employee/orders")({
  head: () => ({ meta: [{ title: "الطلبات المسندة — موظف تاجر" }] }),
  component: EmployeeOrdersPage,
});

const tabs = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "جديد" },
  { key: "preparing", label: "قيد التجهيز" },
  { key: "ready_to_ship", label: "جاهز للشحن" },
  { key: "shipped", label: "تم الشحن" },
  { key: "delivered", label: "تم التوصيل" },
] as const;

const tone: Record<string, string> = {
  pending: "bg-sky-50 text-sky-700 border-sky-200",
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  ready_to_ship: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-violet-50 text-violet-700 border-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

function opsOf(o: ApiOrder) {
  return o.status;
}

function EmployeeOrdersPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ApiOrder | null>(null);

  // Orders assigned to this employee. Backend assignment is not implemented,
  // so on a fresh system this is always empty — shown as a proper empty state.
  const assignedOrders = orders;
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getEmployeeOrders();
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error("تعذر تحميل الطلبات");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    return assignedOrders.filter((o) => {
      const s = opsOf(o);
      if (tab !== "all" && s !== tab) return false;
      if (q && !o.id.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [assignedOrders, tab, q]);

  async function advance(o: ApiOrder, status: string, msg: string) {
    try {
      const updated = await updateEmployeeOrderStatus(o.id, status);

      setOrders((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));

      setActive(updated);

      toast.success(msg);
    } catch (err) {
      console.error(err);
      toast.error("تعذر تحديث الحالة");
    }
  }

  if (assignedOrders.length === 0) {
    return (
      <MerchantEmployeePage
        title="الطلبات المسندة"
        subtitle="اعرض الطلبات المسندة إليك وحدّث حالة تجهيزها."
      >
        <EmptyState
          icon={ClipboardList}
          title="لا توجد طلبات مسندة إليك."
          description="ستظهر الطلبات هنا فور إسنادها إليك من قِبل التاجر."
        />
      </MerchantEmployeePage>
    );
  }

  return (
    <MerchantEmployeePage
      title="الطلبات المسندة"
      subtitle="اعرض الطلبات المسندة إليك وحدّث حالة تجهيزها."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
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
                    <span className="text-sm font-extrabold text-foreground num">{o.id}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        tone[s],
                      )}
                    >
                      {orderStatusLabels[s]}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> —
                  </p>
                  <p className="text-xs text-muted-foreground num">
                    {o.placed_at ?? o.created_at ?? "-"}
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
                  <span className="num">{active.id}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      tone[opsOf(active)],
                    )}
                  >
                    {orderStatusLabels[opsOf(active)]}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  "عنوان التوصيل"
                  {" • "}
                  {active.placed_at ?? active.created_at ?? "-"}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-bold text-muted-foreground">المنتجات</p>
                <ul className="space-y-2">
                  {active.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{it.name_snapshot_ar}</span>
                      </span>
                      <span className="text-muted-foreground num">× {it.quantity}</span>
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
                {opsOf(active) === "pending" && (
                  <Button onClick={() => advance(active, "preparing", "بدأ تجهيز الطلب.")}>
                    بدء التجهيز
                  </Button>
                )}
                {opsOf(active) === "preparing" && (
                  <Button onClick={() => advance(active, "ready_to_ship", "الطلب جاهز للشحن.")}>
                    جاهز للشحن
                  </Button>
                )}
                {opsOf(active) === "ready" && (
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
    </MerchantEmployeePage>
  );
}
