import { createFileRoute } from "@tanstack/react-router";
import { type ApiOrder } from "@/lib/api-customer";

import { BarChart3, CheckCircle2, ClipboardList, Package } from "lucide-react";
import {
  MerchantEmployeePage,
  EmptyState,
} from "@/components/merchant-employee/MerchantEmployeeShell";

import { useEffect, useState } from "react";

import {
  getEmployeeOrders,
  getEmployeeProducts,
  type ApiEmployeeProduct,
} from "@/lib/api-merchant";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant-employee/reports")({
  head: () => ({ meta: [{ title: "التقارير — موظف تاجر" }] }),
  component: EmployeeReportsPage,
});

function EmployeeReportsPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiEmployeeProduct[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [reportData, productData] = await Promise.all([
          getEmployeeOrders(),
          getEmployeeProducts(),
        ]);
        console.log("REPORT", reportData);

        setOrders(reportData);

        setProducts(productData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <MerchantEmployeePage title="التقارير" subtitle="جاري تحميل التقارير...">
        <div className="py-8 text-center">جاري تحميل التقارير...</div>
      </MerchantEmployeePage>
    );
  }

  const totalOrders = orders.length;

  const completed = orders.filter((o) => o.status === "delivered").length;

  const assignedProducts = products;

  const isEmpty = totalOrders === 0 && assignedProducts.length === 0;
  return (
    <MerchantEmployeePage title="التقارير" subtitle="تقارير تشغيلية بسيطة عن مهامك.">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="إجمالي الطلبات" value={totalOrders} tone="sky" />
        <StatCard icon={CheckCircle2} label="طلبات مكتملة" value={completed} tone="emerald" />
        <StatCard
          icon={Package}
          label="منتجات مسندة"
          value={assignedProducts.length}
          tone="violet"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">نشاط الطلبات</h2>
        </div>
        {isEmpty ? (
          <div className="py-4">
            <EmptyState
              icon={BarChart3}
              title="لا توجد بيانات بعد."
              description="ستظهر تقاريرك التشغيلية هنا فور بدء استلام الطلبات."
            />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا يوجد نشاط في هذه الفترة.
          </p>
        )}
      </section>
    </MerchantEmployeePage>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string | number;
  tone: "sky" | "emerald" | "violet";
}) {
  const tones: Record<typeof tone, string> = {
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-foreground num">{value}</p>
      </div>
    </div>
  );
}
