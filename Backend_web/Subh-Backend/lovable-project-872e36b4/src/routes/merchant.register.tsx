import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { packages, saudiCities, formatSAR } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/register")({
  head: () => ({
    meta: [
      { title: "انضم كتاجر — صبح" },
      {
        name: "description",
        content: "سجّل نشاطك التجاري وانضم إلى منصة صبح متعددة التجّار.",
      },
    ],
  }),
  component: MerchantRegisterPage,
});

type MerchantForm = {
  businessName: string;
  crNumber: string;
  taxNumber: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
};

const stepLabels = [
  "معلومات النشاط",
  "السجل التجاري",
  "الباقة",
  "المراجعة",
  "إرسال الطلب",
];

function MerchantRegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MerchantForm>({
    businessName: "",
    crNumber: "",
    taxNumber: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MerchantForm, string>>>({});
  const [crFile, setCrFile] = useState<{ name: string; size: number } | null>(null);
  const [pkg, setPkg] = useState<string>("growth");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { submitApplication } = useMerchantStore();

  const totalSteps = 5;

  function updateField<K extends keyof MerchantForm>(k: K, v: MerchantForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateStep1() {
    const e: Partial<Record<keyof MerchantForm, string>> = {};
    if (!form.businessName.trim()) e.businessName = "أدخل اسم النشاط التجاري";
    if (!/^\d{10}$/.test(form.crNumber)) e.crNumber = "رقم السجل التجاري يجب أن يتكون من ١٠ أرقام";
    if (form.taxNumber && !/^\d{15}$/.test(form.taxNumber))
      e.taxNumber = "الرقم الضريبي يجب أن يتكون من ١٥ رقمًا";
    if (!form.ownerName.trim()) e.ownerName = "أدخل اسم صاحب النشاط الكامل";
    if (!/^5\d{8}$/.test(form.phone.replace(/\D/g, "")))
      e.phone = "رقم جوال سعودي يبدأ بـ 5 ويتكون من 9 أرقام";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "أدخل بريدًا إلكترونيًا صحيحًا";
    if (!form.city) e.city = "اختر المدينة";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !crFile) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmitApplication(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    submitApplication({
      businessName: form.businessName,
      crNumber: form.crNumber,
      taxNumber: form.taxNumber,
      ownerName: form.ownerName,
      phone: `+966${form.phone}`,
      email: form.email,
      city: form.city,
      address: "",
      package: pkg,
      crFileName: crFile?.name,
    });

    setSubmitting(false);
    setStep(5);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setCrFile({ name: f.name, size: f.size });
    e.target.value = "";
  }

  const selectedPackage = useMemo(() => packages.find((p) => p.id === pkg)!, [pkg]);

  return (
    <AuthLayout
      step={
        step <= 4
          ? { current: step, total: 4, label: stepLabels[step - 1] }
          : undefined
      }
    >
      {step < 5 && (
        <div className="mb-8">
          <StepIndicator current={step} total={4} labels={stepLabels.slice(0, 4)} />
        </div>
      )}

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goNext();
          }}
          className="space-y-5"
          noValidate
        >
          <Header title="معلومات النشاط التجاري" subtitle="ابدأ بتعبئة بيانات نشاطك الأساسية." />

          <Field label="اسم النشاط التجاري" error={errors.businessName} htmlFor="businessName">
            <Input
              id="businessName"
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              placeholder="مثال: متجر النخبة"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="رقم السجل التجاري" error={errors.crNumber} htmlFor="crNumber">
              <Input
                id="crNumber"
                inputMode="numeric"
                className="num"
                value={form.crNumber}
                onChange={(e) => updateField("crNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10 أرقام"
              />
            </Field>
            <Field label="الرقم الضريبي (اختياري)" error={errors.taxNumber} htmlFor="taxNumber">
              <Input
                id="taxNumber"
                inputMode="numeric"
                className="num"
                value={form.taxNumber}
                onChange={(e) => updateField("taxNumber", e.target.value.replace(/\D/g, "").slice(0, 15))}
                placeholder="15 رقمًا"
              />
            </Field>
          </div>

          <Field label="اسم صاحب النشاط الكامل" error={errors.ownerName} htmlFor="ownerName">
            <Input
              id="ownerName"
              value={form.ownerName}
              onChange={(e) => updateField("ownerName", e.target.value)}
              placeholder="الاسم الرباعي"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="رقم الجوال" error={errors.phone} htmlFor="phone">
              <div dir="ltr" className="flex items-stretch overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-primary/20">
                <span className="border-l border-input bg-muted px-3 text-sm font-semibold text-muted-foreground grid place-items-center num">
                  +966
                </span>
                <input
                  id="phone"
                  inputMode="numeric"
                  className="num w-full bg-transparent px-3 py-2 text-sm outline-none"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="5XXXXXXXX"
                />
              </div>
            </Field>
            <Field label="البريد الإلكتروني" error={errors.email} htmlFor="email">
              <Input
                id="email"
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="name@example.com"
              />
            </Field>
          </div>

          <Field label="المدينة" error={errors.city} htmlFor="city">
            <Select value={form.city} onValueChange={(v) => updateField("city", v)}>
              <SelectTrigger id="city">
                <SelectValue placeholder="اختر المدينة" />
              </SelectTrigger>
              <SelectContent>
                {saudiCities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              لديك حساب؟ تسجيل الدخول
            </Link>
            <Button type="submit" size="lg" className="rounded-xl font-bold">
              التالي
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Header
            title="رفع السجل التجاري"
            subtitle="يرجى رفع صورة واضحة من السجل التجاري بصيغة PDF أو صورة."
          />

          {!crFile ? (
            <label
              htmlFor="cr-upload"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-6 py-12 text-center transition-colors hover:border-primary/40 hover:bg-muted/60"
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">اضغط لرفع الملف</p>
                <p className="mt-1 text-xs text-muted-foreground">PDF أو JPG أو PNG • حتى ١٠ ميجابايت</p>
              </div>
              <input
                id="cr-upload"
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={onFileChange}
              />
            </label>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{crFile.name}</p>
                <p className="text-xs text-muted-foreground num">
                  {(crFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <label
                htmlFor="cr-replace"
                className="cursor-pointer rounded-lg border border-input px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                استبدال
                <input
                  id="cr-replace"
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={onFileChange}
                />
              </label>
              <button
                type="button"
                onClick={() => setCrFile(null)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="حذف"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <NavRow onBack={goBack} onNext={goNext} nextDisabled={!crFile} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <Header title="اختر باقة الاشتراك" subtitle="يمكنك ترقية الباقة لاحقًا في أي وقت." />

          <div className="grid gap-3">
            {packages.map((p) => {
              const selected = pkg === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPkg(p.id)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border p-5 text-right transition-all",
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  {p.featured && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      الأكثر اختيارًا
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-foreground">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.tagline}</p>
                    </div>
                    <div className="text-left">
                      <div className="num text-2xl font-extrabold text-foreground">
                        {p.price.toLocaleString("ar-SA")}
                      </div>
                      <div className="text-[11px] font-semibold text-muted-foreground">ر.س / شهريًا</div>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <NavRow onBack={goBack} onNext={goNext} />
        </div>
      )}

      {step === 4 && (
        <form onSubmit={onSubmitApplication} className="space-y-5">
          <Header
            title="مراجعة المعلومات"
            subtitle="راجع البيانات قبل إرسال طلب الانضمام."
          />

          <ReviewSection title="معلومات النشاط" onEdit={() => setStep(1)}>
            <ReviewRow label="اسم النشاط" value={form.businessName} />
            <ReviewRow label="رقم السجل التجاري" value={form.crNumber} mono />
            <ReviewRow label="الرقم الضريبي" value={form.taxNumber || "—"} mono />
            <ReviewRow label="صاحب النشاط" value={form.ownerName} />
            <ReviewRow label="رقم الجوال" value={`+966${form.phone}`} mono />
            <ReviewRow label="البريد الإلكتروني" value={form.email} />
            <ReviewRow label="المدينة" value={form.city} />
          </ReviewSection>

          <ReviewSection title="السجل التجاري" onEdit={() => setStep(2)}>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{crFile?.name ?? "—"}</span>
            </div>
          </ReviewSection>

          <ReviewSection title="الباقة المختارة" onEdit={() => setStep(3)}>
            <ReviewRow label="الباقة" value={selectedPackage.name} />
            <ReviewRow
              label="السعر الشهري"
              value={formatSAR(selectedPackage.price)}
              mono
            />
          </ReviewSection>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={goBack}>
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Button>
            <Button type="submit" size="lg" className="rounded-xl font-bold" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ الإرسال…
                </>
              ) : (
                "إرسال الطلب"
              )}
            </Button>
          </div>
        </form>
      )}

      {step === 5 && (
        <div className="space-y-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              تم إرسال طلب الانضمام بنجاح
            </h1>
            <p className="text-sm text-muted-foreground">
              شكرًا لانضمامك إلى منصة صبح. سيقوم فريق الإدارة بمراجعة طلبك
              وسنتواصل معك عبر البريد الإلكتروني ورقم الجوال المسجّل خلال ٢٤–٤٨ ساعة عمل.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-right">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">حالة الطلب</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                قيد المراجعة
              </span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">النشاط</span>
                <span className="font-semibold text-foreground">{form.businessName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الباقة</span>
                <span className="font-semibold text-foreground">{selectedPackage.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاريخ الإرسال</span>
                <span className="font-semibold text-foreground num">
                  {new Date().toLocaleDateString("ar-SA")}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            سيتم تفعيل حساب التاجر تلقائيًا بعد اعتماد الطلب من فريق الإدارة.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/">العودة إلى الرئيسية</Link>
            </Button>
            <Button
              className="rounded-xl font-bold"
              onClick={() => navigate({ to: "/merchant" })}
            >
              معاينة لوحة التاجر (تطوير)
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-1.5 text-center sm:text-right">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowRight className="h-4 w-4" />
        رجوع
      </Button>
      <Button
        type="button"
        size="lg"
        className="rounded-xl font-bold"
        onClick={onNext}
        disabled={nextDisabled}
      >
        التالي
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <ol className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={n} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-xs font-bold num transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary/15 text-primary ring-2 ring-primary",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <span
              className={cn(
                "hidden text-[11px] font-semibold sm:block",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {labels[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold text-foreground", mono && "num")}>{value}</span>
    </div>
  );
}
