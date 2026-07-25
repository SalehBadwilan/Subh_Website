import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, ShoppingBag, Store, Users } from "lucide-react";
import { AdminPage } from "@/components/admin/AdminShell";
import { useAdminStore } from "@/lib/admin-store";
import { useMerchantStore } from "@/lib/merchant-store";
import { formatSAR } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "التقارير — لوحة الإدارة" }] }),
  component: ReportsPage,
});

export function ReportsPage() {
  const { catalog, categories, packages, users } = useAdminStore();
  const { applications } = useMerchantStore();

  const approved = applications.filter((a) => a.status === "approved");
  const pending = applications.filter((a) => a.status === "pending");
  const rejected = applications.filter((a) => a.status === "rejected");
  const customers = users.filter((u) => u.role === "customer");

  const hasSales = false; // No completed orders exist yet.
  const totalRevenue = 0;
  const totalOrders = 0;

  const perPackage = packages.map((p) => ({
    ...p,
    count: approved.filter((a) => a.profile.package === p.id).length,
  }));
  const maxPkg = Math.max(1, ...perPackage.map((p) => p.count));

  const perCategory = categories.map((c) => ({
    ...c,
    count: catalog.filter((p) => p.categoryId === c.id).length,
  }));
  const maxCat = Math.max(1, ...perCategory.map((c) => c.count));

  return (
    <AdminPage
      title="التقارير"
      subtitle="مؤشرات المنصة محسوبة من الحالة الحالية."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Store} label="التجّار المعتمدون" value={approved.length} tone="emerald" />
        <Kpi icon={Users} label="العملاء" value={customers.length} tone="sky" />
        <Kpi icon={ShoppingBag} label="إجمالي الطلبات" value={totalOrders} tone="violet" />
        <Kpi icon={TrendingUp} label="إجمالي الإيرادات" value={formatSAR(totalRevenue)} tone="amber" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-extrabold text-foreground">
            التجّار حسب الباقة
          </h2>
          <p className="text-xs text-muted-foreground">
            توزيع التجّار المعتمدين على الباقات المتاحة.
          </p>
          {approved.length === 0 ? (
            <EmptyBlock text="لا يوجد تجّار معتمدون بعد لعرض التوزيع." />
          ) : (
            <div className="mt-4 space-y-3">
              {perPackage.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{p.name}</span>
                    <span className="font-bold text-muted-foreground num">
                      {p.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(p.count / maxPkg) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-extrabold text-foreground">
            المنتجات حسب الفئة
          </h2>
          <p className="text-xs text-muted-foreground">
            عدد المنتجات في كتالوج المنصة لكل فئة.
          </p>
          <div className="mt-4 space-y-3">
            {perCategory.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{c.name}</span>
                  <span className="font-bold text-muted-foreground num">
                    {c.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(c.count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-extrabold text-foreground">
            طلبات الانضمام
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <MiniBlock label="قيد المراجعة" value={pending.length} tone="amber" />
            <MiniBlock label="معتمد" value={approved.length} tone="emerald" />
            <MiniBlock label="مرفوض" value={rejected.length} tone="rose" />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-extrabold text-foreground">المبيعات</h2>
          {hasSales ? null : (
            <EmptyBlock text="لا توجد بيانات مبيعات حتى الآن لتوليد تقرير." />
          )}
        </section>
      </div>
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

function MiniBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "rose";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className={cn("rounded-xl p-3", tones[tone])}>
      <p className="text-xs font-bold">{label}</p>
      <p className="mt-1 text-2xl font-extrabold num">{value}</p>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-border py-8 text-center">
      <BarChart3 className="h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
