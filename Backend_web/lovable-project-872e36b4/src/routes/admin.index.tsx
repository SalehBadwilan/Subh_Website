import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ClipboardCheck,
  Store,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Layers,
  BadgeCheck,
} from "lucide-react";
import { AdminPage, statusLabels, statusTone } from "@/components/admin/AdminShell";
import { formatSAR } from "@/lib/admin-data";
import { useAdminStore } from "@/lib/admin-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — صبح" }] }),
  component: AdminDashboard,
});

export function AdminDashboard() {
  const { applications } = useMerchantStore();
  const { catalog, categories, packages, users } = useAdminStore();

  const pending = applications.filter((a) => a.status === "pending");
  const approved = applications.filter((a) => a.status === "approved");
  const rejected = applications.filter((a) => a.status === "rejected");
  const customers = users.filter((u) => u.role === "customer");
  const admins = users.filter((u) => u.role === "admin");
  const activeProducts = catalog.filter((p) => p.active).length;
  const activePackages = packages.filter((p) => p.active).length;
  const activeCategories = categories.filter((c) => c.active).length;

  // No real orders yet — reported honestly.
  const totalOrders = 0;
  const totalRevenue = 0;

  const recentApplications = [...applications]
    .sort((a, b) => (a.status === "pending" ? -1 : 1))
    .slice(0, 5);

  return (
    <AdminPage
      title="لوحة الإدارة"
      subtitle="نظرة عامة على حالة المنصة اليوم."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardCheck} label="طلبات قيد المراجعة" value={pending.length} tone="amber" />
        <StatCard icon={Store} label="التجّار المعتمدون" value={approved.length} tone="emerald" />
        <StatCard icon={Users} label="العملاء" value={customers.length} tone="sky" />
        <StatCard icon={Package} label="منتجات المنصة" value={activeProducts} tone="violet" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="إجمالي الطلبات" value={totalOrders} tone="sky" />
        <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={formatSAR(totalRevenue)} tone="emerald" />
        <StatCard icon={Layers} label="فئات نشطة" value={activeCategories} tone="violet" />
        <StatCard icon={BadgeCheck} label="باقات نشطة" value={activePackages} tone="amber" />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-foreground">أحدث طلبات التجّار</h2>
          <Link
            to="/admin/applications"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            عرض الكل
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            لا توجد طلبات تجّار حتى الآن.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {recentApplications.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {a.profile.businessName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.profile.ownerName} • {a.submittedAt}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                    statusTone[a.status],
                  )}
                >
                  {statusLabels[a.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MiniStat label="طلبات معتمدة" value={approved.length} tone="emerald" />
        <MiniStat label="طلبات مرفوضة" value={rejected.length} tone="rose" />
        <MiniStat label="مسؤولون" value={admins.length} tone="sky" />
      </div>
    </AdminPage>
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
  const tones = {
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
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

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "sky";
}) {
  const toneCls = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    sky: "text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold num", toneCls[tone])}>{value}</p>
    </div>
  );
}
