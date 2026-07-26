/**
 * PaymentPanel — the payment-gateway UI for a pending order.
 *
 * Talks to the REAL backend payment module:
 *   POST /api/payments/initiate      → Payment(initiated) + provider intent
 *   POST /api/payments/:id/confirm   → capture (or decline) + finalize order
 *
 * The active provider is configured server-side. In the training environment
 * it is the built-in TEST gateway: no real card data is ever entered here —
 * the panel offers an explicit "simulate success / simulate decline" choice
 * (decline = the provider's reserved test card ending in 0002). On capture the
 * backend marks the order paid, issues the invoice, and notifies the customer.
 */
import { useState } from "react";
import { Apple, CheckCircle2, CreditCard, Loader2, Smartphone, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ApiRequestError } from "@/lib/api";
import {
  confirmPayment,
  initiatePayment,
  type ApiPayment,
  type PaymentMethodKey,
} from "@/lib/api-customer";
import { cn } from "@/lib/utils";

const METHODS: { key: PaymentMethodKey; label: string; icon: typeof CreditCard }[] = [
  { key: "card", label: "بطاقة ائتمانية", icon: CreditCard },
  { key: "mada", label: "مدى", icon: CreditCard },
  { key: "apple_pay", label: "Apple Pay", icon: Apple },
  { key: "stc_pay", label: "STC Pay", icon: Smartphone },
];

type Phase = "idle" | "paying" | "captured" | "failed";

export function PaymentPanel({
  orderId,
  amountSar,
  onPaid,
}: {
  orderId: string;
  amountSar: number;
  onPaid?: (payment: ApiPayment) => void;
}) {
  const [method, setMethod] = useState<PaymentMethodKey>("card");
  const [phase, setPhase] = useState<Phase>("idle");
  const [payment, setPayment] = useState<ApiPayment | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(simulateDecline: boolean) {
    setPhase("paying");
    setError(null);
    try {
      // 1) Initiate (idempotent server-side: reuses an initiated payment).
      const { payment: p } = await initiatePayment(orderId, method);
      // 2) Confirm. Test-provider convention: last4 0002 → declined.
      const result = await confirmPayment(p.id, {
        last4: simulateDecline ? "0002" : "4242",
      });
      setPayment(result.payment);
      if (result.status === "captured" || result.already_paid) {
        setPhase("captured");
        onPaid?.(result.payment);
      } else {
        setPhase("failed");
        setError("رفض مزود الدفع العملية (محاكاة بطاقة مرفوضة). جرّب الدفع مرة أخرى.");
      }
    } catch (err) {
      setPhase("failed");
      setError(err instanceof ApiRequestError ? err.message : "تعذّر إتمام عملية الدفع.");
    }
  }

  if (phase === "captured") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <p className="mt-2 text-sm font-extrabold text-emerald-700">تم الدفع بنجاح</p>
        <p className="num mt-1 text-xs text-emerald-700">
          {payment?.amount_sar ?? amountSar} ر.س عبر {METHODS.find((m) => m.key === method)?.label}
        </p>
        <p className="mt-1 text-[11px] text-emerald-700/80">
          صدرت فاتورتك وتم تسجيل الطلب كمدفوع في نظام صبح.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
        <CreditCard className="h-4 w-4 text-primary" />
        الدفع
        <span className="num mr-auto text-base font-black text-foreground">
          {amountSar} <span className="text-xs font-bold">ر.س</span>
        </span>
      </h2>

      <RadioGroup
        value={method}
        onValueChange={(v) => setMethod(v as PaymentMethodKey)}
        className="grid gap-2"
      >
        {METHODS.map(({ key, label, icon: Icon }) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
              method === key ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <RadioGroupItem value={key} disabled={phase === "paying"} />
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </label>
        ))}
      </RadioGroup>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="mt-4 h-12 w-full rounded-full text-base font-bold"
        disabled={phase === "paying"}
        onClick={() => pay(false)}
      >
        {phase === "paying" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            جارٍ الدفع عبر البوابة…
          </>
        ) : (
          "ادفع الآن"
        )}
      </Button>
      <button
        type="button"
        className="mt-2 w-full text-center text-[11px] font-semibold text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
        disabled={phase === "paying"}
        onClick={() => pay(true)}
      >
        محاكاة بطاقة مرفوضة (لاختبار حالة الفشل)
      </button>
      <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        بيئة تدريبية — بوابة دفع تجريبية من الباك إند، لا تُدخل أي بيانات بطاقة حقيقية.
      </p>
    </div>
  );
}
