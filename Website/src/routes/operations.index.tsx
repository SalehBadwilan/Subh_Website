import { createFileRoute } from "@tanstack/react-router";

import { formatSAR } from "@/lib/admin-data";
import { ClipboardList, Boxes, PackageCheck, Truck, AlertTriangle } from "lucide-react";
import { OperationsPage } from "@/components/operations/OperationsShell";

import { useEffect, useMemo, useState } from "react";
import { getOperationsDashboard, type ApiOperationsDashboard } from "@/lib/api-operations";

export const Route = createFileRoute("/operations/")({
  head: () => ({
    meta: [{ title: "لوحة العمليات — صبح" }, { name: "robots", content: "noindex" }],
  }),
  component: OperationsDashboard,
});

const LOW_STOCK_THRESHOLD = 20;

function OperationsDashboard() {
  const [dashboard, setDashboard] = useState<ApiOperationsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getOperationsDashboard()
      .then((data) => setDashboard(data))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    if (!dashboard) {
      return {
        newOrders: 0,
        preparing: 0,
        ready: 0,
        deliveredToday: 0,
        lowStock: 0,
        totalStock: 0,
        revenueToday: 0,
      };
    }

    return {
      newOrders: dashboard.orders.by_status.paid ?? 0,
      preparing: dashboard.orders.by_status.preparing ?? 0,
      ready:
        (dashboard.orders.by_status.ready_to_ship ?? 0) + (dashboard.orders.by_status.shipped ?? 0),
      deliveredToday: dashboard.shipments.delivered,
      lowStock: dashboard.inventory.low_stock_skus,
      totalStock: dashboard.inventory.total_skus,

      // الباك إند الحالي لا يعيد الإيرادات
      revenueToday: 0,
    };
  }, [dashboard]);

  const cards = [
    {
      label: "طلبات جديدة",
      value: stats.newOrders,
      icon: ClipboardList,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "قيد التجهيز",
      value: stats.preparing,
      icon: Boxes,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "جاهزة/خرجت للتوصيل",
      value: stats.ready,
      icon: Truck,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "تم توصيلها اليوم",
      value: stats.deliveredToday,
      icon: PackageCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "تنبيهات مخزون منخفض",
      value: stats.lowStock,
      icon: AlertTriangle,
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  return (
    <OperationsPage title="لوحة العمليات" subtitle="نظرة سريعة على الطلبات والمخزون والشحنات.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${c.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{c.label}</p>
                  <p className="num text-2xl font-black text-foreground">{c.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">إجمالي المخزون الحالي</p>
          <p className="num mt-1 text-2xl font-black text-foreground">{stats.totalStock}</p>
          <p className="mt-1 text-xs text-muted-foreground">مجموع الكميات في كتالوج المنصة.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">إيرادات اليوم</p>
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
