import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, ShoppingBag, Store, Users } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getOperationsReports, type ApiOperationsReports } from "@/lib/api";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "التقارير — لوحة الإدارة" }] }),
  component: ReportsPage,
});

export function ReportsPage() {
  const [report, setReport] = useState<ApiOperationsReports | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOperationsReports();
        setReport(data);
      } catch (err) {
        console.error(err);
        toast.error("تعذر تحميل التقارير");
      }
    }

    load();
  }, []);

  if (!report) {
    return (
      <AdminPage title="التقارير" subtitle="جاري تحميل البيانات...">
        <div className="p-6 text-center">جاري تحميل البيانات...</div>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="التقارير" subtitle="تقارير تشغيلية من قاعدة البيانات">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={ShoppingBag}
          label="إجمالي المنتجات"
          value={report.inventory.total_skus}
          tone="sky"
        />

        <Kpi
          icon={Store}
          label="إجمالي الوحدات"
          value={report.inventory.total_units_on_hand}
          tone="emerald"
        />

        <Kpi
          icon={TrendingUp}
          label="منخفضة المخزون"
          value={report.inventory.low_stock_skus}
          tone="amber"
        />

        <Kpi
          icon={Users}
          label="نفدت من المخزون"
          value={report.inventory.out_of_stock_skus}
          tone="violet"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-bold">أكثر المنتجات تعديلًا</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-right">المنتج</th>
                <th className="p-3 text-right">SKU</th>
                <th className="p-3 text-center">الحركات</th>
                <th className="p-3 text-center">صافي التغيير</th>
                <th className="p-3 text-center">الرصيد الحالي</th>
              </tr>
            </thead>

            <tbody>
              {report.top_adjusted_skus.map((item) => (
                <tr key={item.inventory_id} className="border-b">
                  <td className="p-3">{item.name_ar ?? "-"}</td>
                  <td className="p-3">{item.sku}</td>
                  <td className="p-3 text-center">{item.movements}</td>
                  <td className="p-3 text-center">{item.net_delta}</td>
                  <td className="p-3 text-center">{item.current_on_hand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPage>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string | number;
  tone: "sky" | "amber" | "emerald" | "violet";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-foreground num">{value}</p>
    </div>
  );
}
