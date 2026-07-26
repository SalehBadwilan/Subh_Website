import { createFileRoute } from "@tanstack/react-router";


import {
  OperationsPage,
  EmptyState,
} from "@/components/operations/OperationsShell";


import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  getOperationsReports,
  type ApiOperationsReports,
} from "@/lib/api-operations";



export const Route = createFileRoute("/operations/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — لوحة العمليات" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperationsReportsPage,
});



function OperationsReportsPage() {

  const [report, setReport] = useState<ApiOperationsReports | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getOperationsReports()
    .then((data) => {
      console.log("REPORT DATA:", data);
      setReport(data);
    })
    .catch((err) => {
      console.error("REPORT ERROR:", err);
    })
    .finally(() => {
      setLoading(false);
    });
}, []);



if (loading) {
  return (
    <OperationsPage
      title="التقارير التشغيلية"
      subtitle="جاري تحميل البيانات..."
    >
      <div className="p-6 text-center text-muted-foreground">
        جاري تحميل البيانات...
      </div>
    </OperationsPage>
  );
}

if (!report) {
  return (
    <OperationsPage
      title="التقارير التشغيلية"
      subtitle="تعذر تحميل البيانات."
    >
      <div className="p-6 text-center text-destructive">
        تعذر تحميل البيانات.
      </div>
    </OperationsPage>
  );
}

  if (
  report.inventory.total_skus === 0 &&
  report.adjustments.count === 0
) {
  return (
    <OperationsPage
      title="التقارير التشغيلية"
      subtitle="ملخص الطلبات والتوصيلات وحركات المخزون."
    >
      <EmptyState
        icon={BarChart3}
        title="لا توجد بيانات كافية لعرض التقارير."
        hint="ستظهر التقارير تلقائياً عند وجود بيانات."
      />
    </OperationsPage>
  );
}
console.log("REPORT", report);

  const rows: { label: string; value: string }[] = [
  {
    label: "إجمالي الشحنات",
    value: String(report.shipments.total),
  },
  {
    label: "الشحنات المكتملة",
    value: String(report.shipments.delivered),
  },
  {
    label: "معدل نجاح التوصيل",
    value:
      report.shipments.delivery_success_rate_pct == null
        ? "-"
        : `${report.shipments.delivery_success_rate_pct}%`,
  },
  {
    label: "إجمالي الأصناف",
    value: String(report.inventory.total_skus),
  },
  {
    label: "الأصناف منخفضة المخزون",
    value: String(report.inventory.low_stock_skus),
  },
  {
    label: "عدد تعديلات المخزون",
    value: String(report.adjustments.count),
  },
];

try {
  console.log(report);
} catch (e) {
  console.error(e);
}
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
        <h2 className="text-xl font-bold">
  توزيع الطلبات حسب الحالة
</h2>

<ul className="space-y-2">
  {Object.entries(report?.fulfilment.orders_by_status ?? {}).map(
    ([status, count]) => (
      <li
        key={status}
        className="flex items-center justify-between border-b pb-2"
      >
        <span>{status}</span>
        <span className="font-semibold">{count}</span>
      </li>
    )
  )}
</ul>
      </div>
    </OperationsPage>
  );
}
