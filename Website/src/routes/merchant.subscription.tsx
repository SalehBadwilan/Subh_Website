import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Loader2, RefreshCcw, Sparkles, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMerchant } from "@/lib/merchant-context";

import { ApiRequestError } from "@/lib/api";
import {
  createSubscription,
  getPlans,
  getSubscriptions,
  type ApiPlan,
  type ApiSubscription,
} from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

import PaymentDialog from "@/components/merchant/PaymentDialog";



export const Route = createFileRoute("/merchant/subscription")({
  head: () => ({ meta: [{ title: "الاشتراك — صبح تاجر" }] }),
  component: SubscriptionPage,
});

const periodLabels: Record<ApiPlan["billing_period"], string> = {
  monthly: "شهريًا",
  quarterly: "ربع سنوي",
  yearly: "سنويًا",
};

const subStatusLabels: Record<ApiSubscription["status"], string> = {
  active: "نشط",
  past_due: "متأخر السداد",
  cancelled: "ملغي",
  expired: "منتهي",
};

type LoadStatus = "loading" | "success" | "error";

function SubscriptionPage() {
  const { merchant } = useMerchant();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [subs, setSubs] = useState<ApiSubscription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [openPayment, setOpenPayment] = useState(false);
const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const load = useCallback(() => {
    if (!merchant) return;
    setStatus("loading");
    setError(null);
    // Real backend calls: GET /api/plans + GET /api/merchant-subscriptions
    Promise.all([getPlans(), getSubscriptions(merchant.id)])
      .then(([p, s]) => {
        setPlans(p.filter((x) => x.is_active));
        setSubs(s);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب بيانات الاشتراك.");
        setStatus("error");
      });
  }, [merchant]);

  useEffect(load, [load]);

  const activeSub = [...subs]
  .filter((s) => s.status === "active")
  .sort(
    (a, b) =>
      new Date(b.started_at).getTime() -
      new Date(a.started_at).getTime()
  )[0];

const activePlan = activeSub
  ? plans.find((p) => p.id === activeSub.plan_id)
  : undefined;

  async function subscribe(plan: ApiPlan) {
    if (!merchant) return;
    setSubscribing(plan.id);
    try {
      // Real backend call: POST /api/merchant-subscriptions
      const created = await createSubscription(merchant.id, plan.id);
      setSubs((prev) => [created, ...prev]);
      toast.success(`تم تفعيل اشتراكك في «${plan.name_ar}».`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر تفعيل الاشتراك.");
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <MerchantPage
      title="اشتراك متجرك"
      subtitle="باقات حقيقية من نظام صبح — الاشتراك يُسجَّل فورًا في قاعدة البيانات"
    >
      {status === "loading" && (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      )}

      {status === "error" && (
        <div role="alert" className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
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

     {status === "success" && ( 
        <>
          {/* Current subscription */}
          {activeSub ? (
            <section className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <BadgeCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold text-foreground">
                  اشتراكك الحالي: {activePlan?.name_ar ?? "باقة"}
                </h2>
                <p className="num mt-0.5 text-xs text-muted-foreground">
                  ينتهي في{" "}
                  {new Date(activeSub.current_period_end).toLocaleDateString("ar-SA", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {subStatusLabels[activeSub.status]}
              </span>
            </section>
          ) : (
            <p className="mb-6 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              لا يوجد اشتراك نشط لمتجرك — اختر باقة لتفعيلها.
            </p>
          )}

          {/* Plans */}
          {plans.length === 0 ? (
  <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
    لا توجد باقات متاحة حاليًا.
  </div>
) : (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {plans.map((plan) => {
      const isCurrent = activePlan?.id === plan.id;

      return (
        <li
  key={plan.id}
  className={cn(
    "flex flex-col rounded-2xl border bg-card p-5",
    isCurrent ? "border-primary shadow-soft" : "border-border",
  )}
>
  <div className="flex items-center gap-2">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
      <Sparkles className="h-4 w-4" />
    </span>

    <h3 className="text-sm font-extrabold text-foreground">
      {plan.name_ar}
    </h3>
  </div>

  <div className="mt-4 flex items-end gap-1">
    <span className="num text-3xl font-black text-foreground">
      {Number.parseFloat(String(plan.price_sar))}
    </span>

    <span className="pb-1 text-xs font-bold text-muted-foreground">
      ر.س / {periodLabels[plan.billing_period]}
    </span>
  </div>

  <Button
    className="mt-5 rounded-full font-bold"
    variant={isCurrent ? "outline" : "default"}
    disabled={isCurrent || subscribing !== null}
    onClick={() => {
      setSelectedPlan(plan);
      setOpenPayment(true);
    }}
  >
    {subscribing === plan.id && (
      <Loader2 className="h-4 w-4 animate-spin" />
    )}

    {isCurrent ? "باقتك الحالية" : "اشترك الآن"}
  </Button>
</li>
      );
    })}
  </ul>
)}
          
          

          {/* History */}
          {subs.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-base font-extrabold text-foreground">سجلّ الاشتراكات</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {subs.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-semibold text-foreground">
                      {plans.find((p) => p.id === s.plan_id)?.name_ar ?? "باقة"}
                    </span>
                    <span className="num text-xs text-muted-foreground">
                      {new Date(s.started_at).toLocaleDateString("ar-SA")} →{" "}
                      {new Date(s.current_period_end).toLocaleDateString("ar-SA")}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                        s.status === "active"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-border bg-muted text-foreground",
                      )}
                    >
                      {subStatusLabels[s.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
            )}
      
      <PaymentDialog
        open={openPayment}
        onOpenChange={setOpenPayment}
        planName={selectedPlan?.name_ar ?? ""}
        price={Number(selectedPlan?.price_sar ?? 0)}
        onSuccess={async () => {
          if (selectedPlan) {
            await subscribe(selectedPlan);
          }
        }}
      />
    </MerchantPage>
  );
}