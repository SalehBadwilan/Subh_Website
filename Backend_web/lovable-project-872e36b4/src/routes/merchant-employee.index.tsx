import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { useAppStore } from "@/lib/app-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { useAdminStore } from "@/lib/admin-store";
import { opsOrderStatusLabels } from "@/lib/customer-data";
import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant-employee/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — موظف تاجر صبح" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { orders } = useAppStore();
  const { currentMerchantId } = useMerchantStore();
  const { catalog } = useAdminStore();

  // Products assigned to this merchant (and therefore visible to the employee).
  const assignedProducts = useMemo(
    () =>
      currentMerchantId
        ? catalog.filter(
            (p) => p.active && p.assignedMerchantIds.includes(currentMerchantId),
          )
        : [],
    [catalog, currentMerchantId],
  );

  // Orders assigned to this employee. With no backend assignment, this is
  // always empty on a fresh system — shown as a proper empty state.
  const assignedOrders = orders.filter(() => false);

  const preparingOrders = assignedOrders.filter(
    (o) => o.opsStatus === "preparing" || o.opsStatus === "new",
  ).length;
  const completedOrders = assignedOrders.filter(
    (o) => o.opsStatus === "delivered",
  ).length;
  const inventoryAlerts = assignedProducts.filter(
    (p) => p.stock === 0 || p.stock <= Math.max(5, Math.round(p.stock * 0.1)),
  ).length;

  return (
    <MerchantEmployeePage
      title="لوحة التحكم"
      subtitle="نظرة عامة على مهامك اليومية."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="الطلبات المسندة"
          value={assignedOrders.length}
          tone="sky"
        />
        <StatCard
          icon={Clock}
          label="طلبات قيد التجهيز"
          value={preparingOrders}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="طلبات مكتملة"
          value={completedOrders}
          tone="emerald"
        />
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
          <h2 className="text-base font-extrabold text-foreground">
            أحدث الطلبات المسندة
          </h2>
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
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground num">{o.id}</p>
                  <p className="text-xs text-muted-foreground">{o.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground num">
                    {formatSAR(o.total)}
                  </span>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground">
                    {opsOrderStatusLabels[o.opsStatus ?? "new"]}
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
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-extrabold text-foreground num">
          {value}
        </p>
      </div>
    </div>
  );
}
