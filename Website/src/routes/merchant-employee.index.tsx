import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ArrowUpRight,
  ClipboardList,
  Clock,
  CheckCircle2,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  MerchantEmployeePage,
  EmptyState,
} from "@/components/merchant-employee/MerchantEmployeeShell";

import { useEffect, useState } from "react";

import {
  getEmployeeDashboard,
  getEmployeeOrders,
  getEmployeeProducts,
  type ApiEmployeeDashboard,
  type ApiEmployeeProduct,
} from "@/lib/api-merchant";

import { orderStatusLabels, type ApiOrder } from "@/lib/api-customer";

import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant-employee/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — موظف تاجر صبح" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<ApiEmployeeDashboard | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiEmployeeProduct[]>([]);
  const assignedOrders = orders;
  const assignedProducts = products;

  const preparingOrders = dashboard?.kpis?.fulfilment_queue ?? 0;

  const completedOrders = orders.filter((o) => o.status === "delivered").length;

  const inventoryAlerts = products.filter(
    (p) => p.inventory && p.inventory.available <= p.inventory.reorder_threshold,
  ).length;

  useEffect(() => {
    async function load() {
      try {
        const [dash, orderList, productList] = await Promise.all([
          getEmployeeDashboard(),
          getEmployeeOrders(),
          getEmployeeProducts(),
        ]);

        setDashboard(dash);
        setOrders(orderList);
        setProducts(productList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <MerchantEmployeePage title="لوحة التحكم" subtitle="نظرة عامة على مهامك اليومية.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="الطلبات المسندة"
          value={assignedOrders.length}
          tone="sky"
        />
        <StatCard icon={Clock} label="طلبات قيد التجهيز" value={preparingOrders} tone="amber" />
        <StatCard icon={CheckCircle2} label="طلبات مكتملة" value={completedOrders} tone="emerald" />
        <StatCard
          icon={Package}
          label="المنتجات المسندة"
          value={assignedProducts.length}
          tone="violet"
        />
        <StatCard
          icon={AlertTriangle}
          label="تنبيهات المخزون"
          value={inventoryAlerts}
          tone="rose"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">أحدث الطلبات المسندة</h2>
          <Link
            to="/merchant-employee/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            عرض الكل
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {assignedOrders.length === 0 ? (
          <div className="py-6">
            <EmptyState
              icon={ClipboardList}
              title="لا توجد طلبات مسندة إليك."
              description="ستظهر الطلبات هنا فور إسنادها إليك من قِبل التاجر."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {assignedOrders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground num">{o.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.placed_at ?? o.created_at ?? "-"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground num">
                    {formatSAR(o.total_sar)}
                  </span>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
                    {orderStatusLabels[o.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
  tone: "sky" | "amber" | "emerald" | "violet" | "rose";
}) {
  const tones: Record<typeof tone, string> = {
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
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
