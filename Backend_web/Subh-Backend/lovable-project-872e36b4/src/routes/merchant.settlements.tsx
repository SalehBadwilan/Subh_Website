import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { formatSAR } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/settlements")({
  head: () => ({ meta: [{ title: "التسويات المالية — صبح تاجر" }] }),
  component: SettlementsPage,
});

function SettlementsPage() {
  const { settlements, orders } = useMerchantStore();
  const paid = settlements
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + s.amount, 0);
  const completed = orders.filter((o) => o.status === "completed");
  const current = completed.reduce((s, o) => s + o.total, 0);
  const pending = orders
    .filter((o) => o.status === "ready")
    .reduce((s, o) => s + o.total, 0);

  return (
    <MerchantPage
      title="التسويات المالية"
      subtitle="متابعة أرصدتك المالية وسجل التسويات مع صبح."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <BalanceCard
          icon={Wallet}
          label="الرصيد الحالي"
          amount={current}
          tone="emerald"
          hint="متاح للتسوية في الدفعة القادمة"
        />
        <BalanceCard
          icon={Clock}
          label="رصيد معلّق"
          amount={pending}
          tone="amber"
          hint="طلبات لم يمرّ عليها ٣ أيام بعد"
        />
        <BalanceCard
          icon={CheckCircle2}
          label="إجمالي المدفوع"
          amount={paid}
          tone="sky"
          hint="مجموع التسويات المكتملة"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-extrabold text-foreground">سجل التسويات</h2>
        </div>
        {settlements.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-bold text-foreground">
              لا توجد تسويات حتى الآن.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ستظهر التسويات بعد إتمام مبيعات مكتملة.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[140px,1fr,1fr,120px,120px] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-bold text-muted-foreground md:grid">
              <span>التاريخ</span>
              <span>المرجع</span>
              <span>الطريقة</span>
              <span className="text-left">المبلغ</span>
              <span className="text-left">الحالة</span>
            </div>
            <ul className="divide-y divide-border">
              {settlements.map((s) => (
                <li
                  key={s.id}
                  className="grid gap-2 px-4 py-3 md:grid-cols-[140px,1fr,1fr,120px,120px] md:items-center"
                >
                  <span className="text-sm font-semibold text-foreground">{s.date}</span>
                  <span className="text-xs font-semibold text-muted-foreground num">{s.reference}</span>
                  <span className="text-xs text-muted-foreground">{s.method}</span>
                  <span className="text-sm font-extrabold text-foreground num md:text-left">
                    {formatSAR(s.amount)}
                  </span>
                  <span className="md:text-left">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      مدفوع
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </MerchantPage>
  );
}


function BalanceCard({
  icon: Icon,
  label,
  amount,
  tone,
  hint,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  amount: number;
  tone: "emerald" | "amber" | "sky";
  hint: string;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <span className={cn("grid h-11 w-11 place-items-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-foreground num">{formatSAR(amount)}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
