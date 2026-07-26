import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
  RefreshCcw,
  WifiOff,
} from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError } from "@/lib/api";
import {
  formatSAR,
  getAdminApplications,
  getAdminDashboard,
  type AdminApplication,
  type AdminKpis,
} from "@/lib/api-admin";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — صبح" }] }),
  component: AdminDashboard,
});

const appStatusLabels: Record<AdminApplication["status"], string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const appStatusTone: Record<AdminApplication["status"], string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  under_review: "bg-sky-50 text-sky-700 border-sky-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

type LoadStatus = "loading" | "success" | "error";

export function AdminDashboard() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [recentApps, setRecentApps] = useState<AdminApplication[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend calls: GET /api/admin/dashboard + latest applications.
    Promise.all([getAdminDashboard(), getAdminApplications({ limit: 5 })])
      .then(([k, apps]) => {
        setKpis(k);
        setRecentApps(apps.applications);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب مؤشرات المنصة.");
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  return (
    <AdminPage title="لوحة الإدارة" subtitle="مؤشرات المنصة الحقيقية من قاعدة البيانات.">
      {status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="mt-3 h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && kpis && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ClipboardCheck}
              label="طلبات تجّار قيد المراجعة"
              value={kpis.pending_applications}
              tone="amber"
            />
            <StatCard
              icon={Store}
              label="إجمالي التجّار"
              value={kpis.total_merchants}
              tone="emerald"
            />
            <StatCard icon={Users} label="المستخدمون" value={kpis.total_users} tone="sky" />
            <StatCard
              icon={Package}
              label="منتجات المنصة"
              value={kpis.total_products}
              tone="violet"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ShoppingBag}
              label="إجمالي الطلبات"
              value={kpis.total_orders}
              tone="sky"
            />
            <StatCard
              icon={DollarSign}
              label="إيرادات محقّقة (GMV)"
              value={formatSAR(kpis.gmv_sar)}
              tone="emerald"
            />
            <StatCard
              icon={Layers}
              label="منتجات مفعّلة"
              value={kpis.products_by_status.active ?? 0}
              tone="violet"
            />
            <StatCard icon={BadgeCheck} label="الباقات" value={kpis.total_packages} tone="amber" />
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
            {recentApps.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                لا توجد طلبات تجّار حتى الآن.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentApps.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{a.commercial_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.user?.full_name ?? "—"}
                        {a.user?.phone ? ` • ${a.user.phone}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-bold",
                        appStatusTone[a.status],
                      )}
                    >
                      {appStatusLabels[a.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MiniStat
              label="تجّار نشطون"
              value={kpis.merchants_by_status.active ?? 0}
              tone="emerald"
            />
            <MiniStat label="طلبات مدفوعة" value={kpis.orders_by_status.paid ?? 0} tone="sky" />
            <MiniStat
              label="بانتظار الدفع"
              value={kpis.orders_by_status.pending_payment ?? 0}
              tone="rose"
            />
          </div>
        </>
      )}
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
