import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, BadgeCheck, ClipboardList, DollarSign, Package, Users } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";
import {
  getMerchantEmployees,
  getMerchantOrders,
  getMerchantProducts,
  getSubscriptions,
} from "@/lib/api-merchant";
import { orderStatusLabels, orderStatusTone, type ApiOrder } from "@/lib/api-customer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/")({
  head: () => ({ meta: [{ title: "لوحة التحكم — صبح تاجر" }] }),
  component: MerchantDashboard,
});

function money(v: string | number): number {
  return Number.parseFloat(String(v)) || 0;
}

type Stats = {
  ordersCount: number;
  revenue: number;
  productsCount: number;
  employeesCount: number;
  hasActiveSub: boolean;
  recentOrders: ApiOrder[];
};

function MerchantDashboard() {
  const { merchant } = useMerchant();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!merchant) return;
    // Dashboard aggregates computed from the REAL lists (the backend has no
    // /api/merchant/dashboard endpoint).
    Promise.all([
      getMerchantOrders(merchant.id),
      getMerchantProducts(merchant.id),
      getMerchantEmployees(merchant.id).catch(() => []),
      getSubscriptions(merchant.id).catch(() => []),
    ])
      .then(([ordersRes, productsRes, employees, subs]) => {
        const orders = ordersRes.orders;
        setStats({
          ordersCount: ordersRes.pagination?.total ?? orders.length,
          revenue: orders.reduce((s, o) => s + money(o.total_sar), 0),
          productsCount: productsRes.pagination?.total ?? productsRes.items.length,
          employeesCount: employees.length,
          hasActiveSub: subs.some((s) => s.status === "active"),
          recentOrders: orders.slice(0, 5),
        });
      })
      .catch(() => setStats(null));
  }, [merchant]);

  if (!merchant) return null;

  const cards = stats
    ? [
        {
          label: "إجمالي الطلبات",
          value: String(stats.ordersCount),
          icon: ClipboardList,
          tone: "bg-sky-50 text-sky-600",
        },
        {
          label: "الإيرادات (ر.س)",
          value: stats.revenue.toFixed(0),
          icon: DollarSign,
          tone: "bg-emerald-50 text-emerald-600",
        },
        {
          label: "منتجات متجرك",
          value: String(stats.productsCount),
          icon: Package,
          tone: "bg-amber-50 text-amber-600",
        },
        {
          label: "الموظفون",
          value: String(stats.employeesCount),
          icon: Users,
          tone: "bg-fuchsia-50 text-fuchsia-600",
        },
      ]
    : null;

  return (
    <MerchantPage
      title={`مرحبًا، ${merchant.commercial_name}`}
      subtitle="نظرة حية من نظام صبح — كل الأرقام من قاعدة البيانات الحقيقية"
      action={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
            merchant.status === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {merchant.status === "active" ? "متجر نشط" : merchant.status}
        </span>
      }
    >
      {/* Stat cards */}
      {cards === null ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <li key={label} className="rounded-2xl border border-border bg-card p-4">
              <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tone)}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="num mt-3 text-2xl font-black text-foreground">{value}</div>
              <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{label}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Subscription nudge */}
      {stats && !stats.hasActiveSub && (
        <Link
          to="/merchant/subscription"
          className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm font-semibold text-primary transition-colors hover:border-primary"
        >
          <ArrowUpRight className="h-4 w-4 shrink-0" />
          لا يوجد اشتراك نشط لمتجرك — فعّل باقة الآن
        </Link>
      )}

      {/* Recent orders */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">أحدث الطلبات</h2>
          <Link
            to="/merchant/orders"
            className="text-xs font-semibold text-primary hover:underline"
          >
            كل الطلبات
          </Link>
        </div>
        {stats === null ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : stats.recentOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات على متجرك بعد.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {stats.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="num text-sm font-bold text-foreground">{o.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.placed_at ?? o.created_at ?? "").toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                      orderStatusTone[o.status] ?? "bg-muted text-foreground border-border",
                    )}
                  >
                    {orderStatusLabels[o.status] ?? o.status}
                  </span>
                  <span className="num text-sm font-black text-foreground">
                    {money(o.total_sar)} ر.س
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MerchantPage>
  );
}
