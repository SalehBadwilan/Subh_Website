import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Apple,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Smartphone,
  Truck,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { useCart } from "@/lib/cart-context";
import { useAppStore } from "@/lib/app-store";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الشراء — صبح" },
      { name: "description", content: "أكمل الدفع على صبح بأمان." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type PaymentMethod = "card" | "apple" | "stc";

type CardForm = {
  holder: string;
  number: string;
  expiry: string;
  cvv: string;
};

type CardErrors = Partial<Record<keyof CardForm, string>>;

function validateCard(form: CardForm): CardErrors {
  const errors: CardErrors = {};
  if (!form.holder.trim()) {
    errors.holder = "اسم حامل البطاقة مطلوب.";
  } else if (form.holder.trim().length < 3) {
    errors.holder = "الاسم قصير جدًا.";
  }

  const digits = form.number.replace(/\s+/g, "");
  if (!digits) {
    errors.number = "رقم البطاقة مطلوب.";
  } else if (!/^\d+$/.test(digits)) {
    errors.number = "رقم البطاقة يجب أن يحتوي على أرقام فقط.";
  } else if (digits.length < 13 || digits.length > 19) {
    errors.number = "رقم البطاقة غير صحيح.";
  }

  if (!form.expiry) {
    errors.expiry = "تاريخ الانتهاء مطلوب.";
  } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expiry)) {
    errors.expiry = "الصيغة MM/YY";
  } else {
    const [mmStr, yyStr] = form.expiry.split("/");
    const mm = Number(mmStr);
    const yy = Number(yyStr) + 2000;
    const end = new Date(yy, mm, 0, 23, 59, 59);
    if (end.getTime() < Date.now()) errors.expiry = "البطاقة منتهية.";
  }

  if (!/^\d{3,4}$/.test(form.cvv)) {
    errors.cvv = "CVV يجب أن يكون 3 أو 4 أرقام.";
  }

  return errors;
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function CheckoutPage() {
  const ready = useRequireAuth();
  const navigate = useNavigate();
  const { lines, subtotal, clear } = useCart();
  const { addresses, addOrder, addNotification } = useAppStore();

  const [addressId, setAddressId] = useState<string | undefined>(
    () => addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id,
  );
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [card, setCard] = useState<CardForm>({
    holder: "",
    number: "",
    expiry: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<CardErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  const shipping = subtotal > 200 || subtotal === 0 ? 0 : 25;
  const total = subtotal + shipping;

  const liveErrors = useMemo(() => validateCard(card), [card]);
  const shownErrors = showErrors ? liveErrors : errors;

  if (!ready) return null;


  function setCardField<K extends keyof CardForm>(key: K, value: string) {
    setCard((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0 || !addressId) return;

    if (payment !== "card") {
      setUnavailableOpen(true);
      return;
    }

    const validation = validateCard(card);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setShowErrors(true);
      toast.error("يرجى تصحيح بيانات البطاقة قبل المتابعة.");
      return;
    }

    setPlacing(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2400));

    const order = addOrder({
      items: lines.map((l) => ({ product: l.product, qty: l.qty })),
      total,
      delivery: addresses.find((a) => a.id === addressId),
      payment,
    });



    addNotification({
      type: "order",
      title: "تم إنشاء طلبك بنجاح",
      body: `طلبك ${order.id} قيد التجهيز. الإجمالي ${order.total} ر.س.`,
    });
    addNotification({
      type: "order",
      title: "تم إتمام الدفع",
      body: `تم استلام الدفع لطلب ${order.id}.`,
    });

    toast.success("تم الدفع بنجاح", {
      description: `طلبك ${order.id} أُنشئ.`,
    });

    clear();
    setPlacing(false);
    setPlaced(true);
    setTimeout(() => navigate({ to: "/customer/orders" }), 1800);
  }

  if (placed) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-foreground">تم إنشاء طلبك</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            شكرًا لتسوّقك من صبح. سنوجّهك إلى صفحة طلباتك.
          </p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="إتمام الشراء"
        subtitle="راجع تفاصيل طلبك وأكمل الدفع بأمان مع صبح"
      />

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Section icon={<MapPin className="h-4 w-4" />} title="عنوان التوصيل">
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                لا يوجد لديك عنوان محفوظ.{" "}
                <Link to="/customer/addresses" className="font-semibold text-primary hover:underline">
                  أضف عنوانًا
                </Link>
              </div>
            ) : (
              <RadioGroup value={addressId} onValueChange={setAddressId} className="space-y-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    htmlFor={`addr-${a.id}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                      addressId === a.id ? "border-primary bg-primary-soft/50" : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <RadioGroupItem id={`addr-${a.id}`} value={a.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        {a.label}
                        {a.isDefault && (
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                            افتراضي
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.recipient} · <span className="num" dir="ltr">{a.phone}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.city} — {a.district} — {a.street}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
            <Link
              to="/customer/addresses"
              className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
            >
              إدارة العناوين
            </Link>
          </Section>

          <Section icon={<Truck className="h-4 w-4" />} title="طريقة الشحن">
            <div className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">شحن صبح القياسي</span>
                <span className="num font-bold text-primary">
                  {shipping === 0 ? "مجّاني" : `${shipping} ر.س`}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                يصل خلال ٢ إلى ٥ أيام عمل. جميع الطلبات مؤمّنة من صبح.
              </p>
            </div>
          </Section>

          <Section icon={<CreditCard className="h-4 w-4" />} title="طريقة الدفع">
            <RadioGroup
              value={payment}
              onValueChange={(v) => setPayment(v as PaymentMethod)}
              className="space-y-2"
            >
              <PaymentOption
                id="pay-card"
                value="card"
                active={payment === "card"}
                icon={<CreditCard className="h-4 w-4" />}
                label="بطاقة ائتمانية"
                hint="فيزا، ماستركارد، مدى"
              />
              <PaymentOption
                id="pay-apple"
                value="apple"
                active={payment === "apple"}
                icon={<Apple className="h-4 w-4" />}
                label="Apple Pay"
                hint="الدفع السريع عبر Apple"
              />
              <PaymentOption
                id="pay-stc"
                value="stc"
                active={payment === "stc"}
                icon={<Smartphone className="h-4 w-4" />}
                label="STC Pay"
                hint="الدفع عبر محفظة STC Pay"
              />
            </RadioGroup>

            {payment === "card" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-4">
                <div>
                  <Label htmlFor="card-holder" className="text-xs font-semibold">
                    اسم حامل البطاقة
                  </Label>
                  <Input
                    id="card-holder"
                    value={card.holder}
                    onChange={(e) => setCardField("holder", e.target.value)}
                    placeholder="كما هو مطبوع على البطاقة"
                    autoComplete="cc-name"
                    className="mt-1"
                    aria-invalid={!!shownErrors.holder}
                  />
                  {shownErrors.holder && (
                    <p className="mt-1 text-xs text-destructive">{shownErrors.holder}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="card-number" className="text-xs font-semibold">
                    رقم البطاقة
                  </Label>
                  <Input
                    id="card-number"
                    value={card.number}
                    onChange={(e) => setCardField("number", formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    dir="ltr"
                    className="num mt-1"
                    aria-invalid={!!shownErrors.number}
                  />
                  {shownErrors.number && (
                    <p className="mt-1 text-xs text-destructive">{shownErrors.number}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="card-exp" className="text-xs font-semibold">
                      تاريخ الانتهاء
                    </Label>
                    <Input
                      id="card-exp"
                      value={card.expiry}
                      onChange={(e) => setCardField("expiry", formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      dir="ltr"
                      className="num mt-1"
                      aria-invalid={!!shownErrors.expiry}
                    />
                    {shownErrors.expiry && (
                      <p className="mt-1 text-xs text-destructive">{shownErrors.expiry}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="card-cvv" className="text-xs font-semibold">
                      CVV
                    </Label>
                    <Input
                      id="card-cvv"
                      value={card.cvv}
                      onChange={(e) =>
                        setCardField("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="123"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      dir="ltr"
                      className="num mt-1"
                      aria-invalid={!!shownErrors.cvv}
                    />
                    {shownErrors.cvv && (
                      <p className="mt-1 text-xs text-destructive">{shownErrors.cvv}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-foreground">ملخّص الطلب</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {lines.map(({ product, qty }) => (
              <li key={product.id} className="flex justify-between gap-2">
                <span className="line-clamp-1 text-muted-foreground">
                  {product.name} <span className="num">× {qty}</span>
                </span>
                <span className="num shrink-0 font-semibold text-foreground">
                  {product.price * qty} ر.س
                </span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-border" />
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">المجموع الفرعي</dt>
              <dd className="num font-semibold">{subtotal} ر.س</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">الشحن</dt>
              <dd className="num font-semibold">{shipping === 0 ? "مجّاني" : `${shipping} ر.س`}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-black">
              <dt>الإجمالي</dt>
              <dd className="num">{total} ر.س</dd>
            </div>
          </dl>
          <Button
            type="submit"
            size="lg"
            className="mt-5 h-12 w-full rounded-full text-base font-bold"
            disabled={placing || !addressId || lines.length === 0}
          >
            {placing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ معالجة الدفع…
              </>
            ) : payment === "card" ? (
              `ادفع ${total} ر.س`
            ) : (
              "تأكيد الطلب"
            )}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            بإتمام الطلب أنت توافق على شروط صبح.
          </p>
        </aside>
      </form>

      <Dialog open={unavailableOpen} onOpenChange={setUnavailableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>وسيلة الدفع غير متاحة حاليًا</DialogTitle>
            <DialogDescription>
              سيتم تفعيل وسيلة الدفع هذه عند ربط بوابة الدفع في المرحلة القادمة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-full"
              onClick={() => setUnavailableOpen(false)}
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function PaymentOption({
  id,
  value,
  active,
  icon,
  label,
  hint,
}: {
  id: string;
  value: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
        active ? "border-primary bg-primary-soft/50" : "border-border bg-card hover:border-primary/40",
      )}
    >
      <RadioGroupItem id={id} value={value} />
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-sm font-bold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </Label>
  );
}
