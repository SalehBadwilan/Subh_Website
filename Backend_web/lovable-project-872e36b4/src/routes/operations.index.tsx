import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ClipboardList,
  Boxes,
  PackageCheck,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { OperationsPage } from "@/components/operations/OperationsShell";
import { useAppStore } from "@/lib/app-store";
import { useAdminStore } from "@/lib/admin-store";
import { formatSAR } from "@/lib/admin-data";

export const Route = createFileRoute("/operations/")({
  head: () => ({
    meta: [
      { title: "لوحة العمليات — صبح" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperationsDashboard,
});

const LOW_STOCK_THRESHOLD = 20;

function OperationsDashboard() {
  const { orders } = useAppStore();
  const { catalog } = useAdminStore();

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const opsOf = (id: string | undefined) => id ?? "new";
    return {
      newOrders: orders.filter((o) => opsOf(o.opsStatus) === "new").length,
      preparing: orders.filter((o) => o.opsStatus === "preparing").length,
      ready: orders.filter(
        (o) => o.opsStatus === "ready" || o.opsStatus === "out_for_delivery",
      ).length,
      deliveredToday: orders.filter(
        (o) => o.opsStatus === "delivered" && o.date === today,
      ).length,
      lowStock: catalog.filter((p) => p.active && p.stock <= LOW_STOCK_THRESHOLD)
        .length,
      totalStock: catalog.reduce((s, p) => s + p.stock, 0),
      revenueToday: orders
        .filter((o) => o.date === today && o.status !== "cancelled")
        .reduce((s, o) => s + o.total, 0),
    };
  }, [orders, catalog]);

  const cards = [
    { label: "طلبات جديدة", value: stats.newOrders, icon: ClipboardList, tone: "bg-sky-50 text-sky-700" },
    { label: "قيد التجهيز", value: stats.preparing, icon: Boxes, tone: "bg-amber-50 text-amber-700" },
    { label: "جاهزة/خرجت للتوصيل", value: stats.ready, icon: Truck, tone: "bg-indigo-50 text-indigo-700" },
    { label: "تم توصيلها اليوم", value: stats.deliveredToday, icon: PackageCheck, tone: "bg-emerald-50 text-emerald-700" },
    { label: "تنبيهات مخزون منخفض", value: stats.lowStock, icon: AlertTriangle, tone: "bg-rose-50 text-rose-700" },
  ];

  return (
    <OperationsPage
      title="لوحة العمليات"
      subtitle="نظرة سريعة على الطلبات والمخزون والشحنات."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${c.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {c.label}
                  </p>
                  <p className="num text-2xl font-black text-foreground">
                    {c.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            إجمالي المخزون الحالي
          </p>
          <p className="num mt-1 text-2xl font-black text-foreground">
            {stats.totalStock}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            مجموع الكميات في كتالوج المنصة.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            إيرادات اليوم
          </p>
          <p className="num mt-1 text-2xl font-black text-foreground">
            {formatSAR(stats.revenueToday)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            محسوبة من طلبات العملاء غير الملغاة اليوم.
          </p>
        </div>
      </div>
    </OperationsPage>
  );
}
