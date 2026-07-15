import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import {
  OperationsPage,
  EmptyState,
} from "@/components/operations/OperationsShell";
import { useAppStore } from "@/lib/app-store";
import { useAdminStore } from "@/lib/admin-store";
import { formatSAR } from "@/lib/admin-data";
import type { OpsOrderStatus, Order } from "@/lib/customer-data";
import { opsOrderStatusLabels } from "@/lib/customer-data";

export const Route = createFileRoute("/operations/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — لوحة العمليات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperationsReportsPage,
});

function opsOf(o: Order): OpsOrderStatus {
  return o.opsStatus ?? "new";
}

function OperationsReportsPage() {
  const { orders } = useAppStore();
  const { stockMovements } = useAdminStore();

  const totals = useMemo(() => {
    const byStatus: Record<OpsOrderStatus, number> = {
      new: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    };
    let revenue = 0;
    for (const o of orders) {
      byStatus[opsOf(o)] += 1;
      if (o.status !== "cancelled") revenue += o.total;
    }
    return {
      byStatus,
      total: orders.length,
      revenue,
      delivered: byStatus.delivered,
      movements: stockMovements.length,
      inbound: stockMovements
        .filter((m) => m.delta > 0)
        .reduce((s, m) => s + m.delta, 0),
      outbound: stockMovements
        .filter((m) => m.delta < 0)
        .reduce((s, m) => s + Math.abs(m.delta), 0),
    };
  }, [orders, stockMovements]);

  if (totals.total === 0 && totals.movements === 0) {
    return (
      <OperationsPage
        title="التقارير التشغيلية"
        subtitle="ملخص الطلبات والتوصيلات وحركات المخزون."
      >
        <EmptyState
          icon={BarChart3}
          title="لا توجد بيانات كافية لعرض التقارير."
          hint="ستظهر التقارير تلقائياً عند وجود طلبات وحركات مخزون."
        />
      </OperationsPage>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "إجمالي الطلبات", value: String(totals.total) },
    { label: "طلبات مكتملة (مسلَّمة)", value: String(totals.delivered) },
    { label: "إيرادات الطلبات (غير الملغاة)", value: formatSAR(totals.revenue) },
    { label: "حركات المخزون", value: String(totals.movements) },
    { label: "كميات مضافة", value: String(totals.inbound) },
    { label: "كميات مخصومة", value: String(totals.outbound) },
  ];

  return (
    <OperationsPage
      title="التقارير التشغيلية"
      subtitle="مؤشرات مباشرة من حالة الطلبات والمخزون."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {r.label}
            </p>
            <p className="num mt-1 text-2xl font-black text-foreground">
              {r.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-extrabold text-foreground">
          توزيع الطلبات حسب الحالة
        </h2>
        <ul className="space-y-2">
          {(Object.keys(totals.byStatus) as OpsOrderStatus[]).map((k) => {
            const count = totals.byStatus[k];
            const pct = totals.total ? (count / totals.total) * 100 : 0;
            return (
              <li key={k}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">
                    {opsOrderStatusLabels[k]}
                  </span>
                  <span className="num text-muted-foreground">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </OperationsPage>
  );
}
