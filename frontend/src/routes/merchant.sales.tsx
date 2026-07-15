import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, ShoppingBag, DollarSign, Users } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { formatSAR } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/sales")({
  head: () => ({ meta: [{ title: "المبيعات والتقارير — صبح تاجر" }] }),
  component: SalesPage,
});

function SalesPage() {
  const { orders } = useMerchantStore();
  const completed = orders.filter((o) => o.status === "completed");
  const revenue = completed.reduce((s, o) => s + o.total, 0);
  const profit = Math.round(revenue * 0.22);
  const ordersCount = completed.length;
  const uniqueCustomers = new Set(completed.map((o) => o.customer)).size;
  const avgOrder = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  return (
    <MerchantPage title="المبيعات والتقارير" subtitle="ملخّص أدائك اليومي والأسبوعي والشهري.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={DollarSign} label="إجمالي المبيعات" value={formatSAR(revenue)} tone="emerald" />
        <Stat icon={TrendingUp} label="صافي الأرباح" value={formatSAR(profit)} tone="sky" />
        <Stat icon={ShoppingBag} label="عدد الطلبات المكتملة" value={`${ordersCount}`} tone="violet" />
        <Stat icon={Users} label="عدد العملاء" value={`${uniqueCustomers}`} tone="amber" />
      </div>

      {ordersCount === 0 ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا توجد مبيعات حتى الآن.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ستظهر التقارير والرسوم البيانية بعد إتمام أول طلب.
          </p>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-base font-extrabold text-foreground">ملخّص سريع</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <SmallStat label="عدد الطلبات" value={`${ordersCount}`} />
            <SmallStat label="متوسط قيمة الطلب" value={formatSAR(avgOrder)} />
            <SmallStat label="إجمالي الإيرادات" value={formatSAR(revenue)} tone="emerald" />
            <SmallStat label="صافي الأرباح" value={formatSAR(profit)} tone="emerald" />
          </div>
        </section>
      )}
    </MerchantPage>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
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

function SmallStat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-extrabold num",
          tone === "emerald" && "text-emerald-600",
          tone === "rose" && "text-rose-600",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
