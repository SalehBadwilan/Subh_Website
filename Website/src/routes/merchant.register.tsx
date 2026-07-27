import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getUser } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api";
import {
  applicationStatusLabels,
  createMerchantApplication,
  getMyApplications,
  getPlans,
  type ApiMerchantApplication,
  type ApiPlan,
} from "@/lib/api-merchant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/register")({
  head: () => ({
    meta: [
      { title: "انضم كتاجر — صبح" },
      { name: "description", content: "قدّم طلب انضمامك كتاجر على منصة صبح." },
    ],
  }),
  component: MerchantRegisterPage,
});

type FormState = {
  commercialName: string;
  crNumber: string;
  iban: string;
  vatNumber: string;
  notes: string;
};

const emptyForm: FormState = {
  commercialName: "",
  crNumber: "",
  iban: "",
  vatNumber: "",
  notes: "",
};

const statusTone: Record<ApiMerchantApplication["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  under_review: "border-sky-200 bg-sky-50 text-sky-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

function MerchantRegisterPage() {
  const userId = getUser()?.id ?? null;

  const [apps, setApps] = useState<ApiMerchantApplication[] | null>(null);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const pendingApplication = apps?.find(
    (app) => app.status === "pending" || app.status === "under_review",
  );

  const approvedApplication = apps?.find((app) => app.status === "approved");

  const rejectedApplication = apps?.find((app) => app.status === "rejected");

  const load = useCallback(() => {
    if (!userId) return;
    // Real backend calls: my previous applications + the available plans.
    getMyApplications(userId)
      .then(setApps)
      .catch(() => setApps([]));
    getPlans()
      .then((p) => setPlans(p.filter((x) => x.is_active)))
      .catch(() => setPlans([]));
  }, [userId]);

  useEffect(load, [load]);
  const navigate = useNavigate();

  useEffect(() => {
    if (approvedApplication) {
      toast.success("🎉 تم قبول طلبك، أهلاً بك في لوحة التاجر.");

      navigate({
        to: "/merchant",
      });
    }
  }, [approvedApplication, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error("سجّل الدخول أولًا لتقديم الطلب.");
      return;
    }
    if (!form.commercialName.trim() || !form.crNumber.trim() || !form.iban.trim()) {
      toast.error("الاسم التجاري والسجل التجاري والآيبان حقول مطلوبة.");
      return;
    }
    setSaving(true);
    try {
      // Real backend call: POST /api/merchant-applications
      const created = await createMerchantApplication({
        user_id: userId,
        commercial_name: form.commercialName.trim(),
        commercial_registration_no: form.crNumber.trim(),
        iban: form.iban.trim(),
        vat_number: form.vatNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setApps((prev) => [created, ...(prev ?? [])]);
      setForm(emptyForm);
      toast.success("تم إرسال طلبك — سيراجعه فريق صبح.");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        await load();

        toast.info("لديك طلب قيد المراجعة بالفعل.");

        return;
      }

      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر إرسال الطلب.");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <MerchantPage
      title="انضم كتاجر إلى صبح"
      subtitle="قدّم طلبك الحقيقي وسيُسجَّل مباشرة في نظام صبح لمراجعته"
    >
      <Link
        to="/customer/profile"
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        العودة لحسابي
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Application form */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            بيانات النشاط التجاري
          </h2>
          {rejectedApplication && !pendingApplication && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-bold text-red-700">تم رفض طلبك السابق</h3>

              <p className="mt-2 text-sm text-red-600">
                {rejectedApplication.rejection_reason ??
                  "يمكنك تعديل البيانات ثم إرسال الطلب مرة أخرى."}
              </p>
            </div>
          )}
          {pendingApplication ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
              <h3 className="text-lg font-bold text-amber-800">✅ تم استلام طلبك</h3>

              <p className="mt-2 text-sm text-muted-foreground">
                طلب انضمامك كتاجر قيد المراجعة، وسيتم إشعارك عند انتهاء المراجعة.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                عادةً تتم مراجعة الطلب خلال
                <span className="font-bold"> 1–3 أيام عمل</span>.
              </p>

              <div className="mt-6 space-y-3 text-right">
                <div className="flex justify-between rounded-xl border bg-white px-4 py-3">
                  <span className="text-muted-foreground">رقم الطلب</span>
                  <span className="font-bold">
                    {`REQ-${pendingApplication.id.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>

                <div className="flex justify-between rounded-xl border bg-white px-4 py-3">
                  <span className="text-muted-foreground">الحالة</span>
                  <span className="font-bold text-amber-700">
                    {pendingApplication.status === "pending" ? "قيد المراجعة" : "تحت المراجعة"}
                  </span>
                </div>

                <div className="flex justify-between rounded-xl border bg-white px-4 py-3">
                  <span className="text-muted-foreground">تاريخ الإرسال</span>
                  <span className="font-bold">
                    {new Date(pendingApplication.created_at).toLocaleDateString("ar-SA")}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="r-name" className="text-xs font-semibold">
                  الاسم التجاري *
                </Label>
                <Input
                  id="r-name"
                  value={form.commercialName}
                  onChange={(e) => setField("commercialName", e.target.value)}
                  maxLength={150}
                  className="mt-1"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="r-cr" className="text-xs font-semibold">
                    رقم السجل التجاري *
                  </Label>
                  <Input
                    id="r-cr"
                    dir="ltr"
                    value={form.crNumber}
                    onChange={(e) => setField("crNumber", e.target.value)}
                    maxLength={50}
                    className="num mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="r-vat" className="text-xs font-semibold">
                    الرقم الضريبي (اختياري)
                  </Label>
                  <Input
                    id="r-vat"
                    dir="ltr"
                    value={form.vatNumber}
                    onChange={(e) => setField("vatNumber", e.target.value)}
                    className="num mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="r-iban" className="text-xs font-semibold">
                  الآيبان (IBAN) *
                </Label>
                <Input
                  id="r-iban"
                  dir="ltr"
                  placeholder="SA..."
                  value={form.iban}
                  onChange={(e) => setField("iban", e.target.value)}
                  maxLength={34}
                  className="num mt-1"
                />
              </div>

              <div>
                <Label htmlFor="r-notes" className="text-xs font-semibold">
                  ملاحظات (اختياري)
                </Label>
                <Textarea
                  id="r-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className="mt-1 resize-none"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full rounded-full text-base font-bold"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الإرسال...
                  </>
                ) : (
                  "إرسال طلب الانضمام"
                )}
              </Button>
            </form>
          )}
        </section>

        <div className="space-y-6">
          {/* My applications */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 text-sm font-extrabold text-foreground">طلباتك السابقة</h2>

            {apps === null ? (
              <Skeleton className="h-16 rounded-xl" aria-hidden="true" />
            ) : apps.length === 0 ? (
              <p className="text-xs text-muted-foreground">لم تقدّم أي طلب بعد.</p>
            ) : (
              <ul className="space-y-2">
                {apps.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-bold text-foreground">{a.commercial_name}</p>
                      <p className="num mt-0.5 text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("ar-SA")}
                      </p>
                      {a.status === "rejected" && a.rejection_reason && (
                        <p className="mt-1 text-rose-600">{a.rejection_reason}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                        statusTone[a.status],
                      )}
                    >
                      {applicationStatusLabels[a.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Plans preview */}
          {plans.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                باقات الاشتراك بعد القبول
              </h2>
              <ul className="space-y-2">
                {plans.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border p-3 text-xs"
                  >
                    <span className="font-bold text-foreground">{p.name_ar}</span>
                    <span className="num font-black text-primary">
                      {Number.parseFloat(String(p.price_sar))} ر.س
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                بعد قبول طلبك، سيتم تفعيل حساب التاجر، ويمكنك اختيار الباقة المناسبة والاشتراك من
                لوحة التاجر.
              </p>
            </section>
          )}
        </div>
      </div>
    </MerchantPage>
  );
}
