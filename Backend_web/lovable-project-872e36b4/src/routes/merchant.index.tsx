import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ClipboardList,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
} from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import {
  formatSAR,
  merchantOrderStatusLabels,
  merchantOrderStatusTone,
} from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { useAdminStore } from "@/lib/admin-store";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — صبح تاجر" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { orders, employees, currentMerchantId } = useMerchantStore();
  const { catalog } = useAdminStore();
  const products = useMemo(
    () =>
      currentMerchantId
        ? catalog.filter(
            (p) => p.active && p.assignedMerchantIds.includes(currentMerchantId),
          )
        : [],
    [catalog, currentMerchantId],
  );

  const todayOrders = orders.filter((o) => o.date.includes("اليوم")).length;
  const pendingOrders = orders.filter(
    (o) => o.status === "new" || o.status === "accepted" || o.status === "preparing",
  ).length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const monthlySales = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + o.total, 0);
  const monthlyProfit = Math.round(monthlySales * 0.22);
  const activeProducts = products.filter((p) => p.stock > 0).length;
  const lowStock = products.filter(
    (p) => p.stock > 0 && p.stock <= Math.max(5, Math.round(p.stock * 0.1)),
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const inventoryAlerts = lowStock + outOfStock;

  const bestSellers = [...products]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 4);
  const recentOrders = orders.slice(0, 5);

  return (
    <MerchantPage
      title="لوحة التحكم"
      subtitle="نظرة عامة على أداء متجرك اليوم."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="طلبات اليوم" value={todayOrders} tone="sky" />
        <StatCard icon={Clock} label="طلبات قيد التنفيذ" value={pendingOrders} tone="amber" />
        <StatCard icon={CheckCircle2} label="طلبات مكتملة" value={completedOrders} tone="emerald" />
        <StatCard icon={DollarSign} label="مبيعات الشهر" value={formatSAR(monthlySales)} tone="violet" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="أرباح الشهر" value={formatSAR(monthlyProfit)} tone="emerald" />
        <StatCard icon={Package} label="منتجات نشطة" value={activeProducts} tone="sky" />
        <StatCard icon={AlertTriangle} label="تنبيهات المخزون" value={inventoryAlerts} tone="amber" />
        <StatCard icon={CheckCircle2} label="الموظفون" value={employees.length} tone="violet" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-foreground">مبيعات آخر ٧ أيام</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              الإجمالي: <span className="num">{formatSAR(0)}</span>
            </span>
          </div>
          <div className="grid h-56 place-items-center text-center">
            <div>
              <p className="text-sm font-bold text-foreground">لا توجد مبيعات بعد</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ستظهر مبيعاتك هنا فور استلام أول طلب مكتمل.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-foreground">الأكثر مبيعًا</h2>
          </div>
          {bestSellers.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              لا توجد منتجات بعد.
            </p>
          ) : (
            <ul className="space-y-3">
              {bestSellers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary num">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground num">
                      المخزون: {p.stock} • {formatSAR(p.price)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">أحدث الطلبات</h2>
          <Link
            to="/merchant/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            عرض الكل
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات حتى الآن.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground num">{o.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.customer} • {o.city}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground num">{formatSAR(o.total)}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                      merchantOrderStatusTone[o.status],
                    )}
                  >
                    {merchantOrderStatusLabels[o.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </MerchantPage>
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
