import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MapPin, Package, Plus, Truck, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { PaymentPanel } from "@/components/customer/PaymentPanel";
import { useCart } from "@/lib/cart-context";
import { useRequireAuth } from "@/lib/auth";
import { ApiRequestError } from "@/lib/api";
import {
  getAddresses,
  placeOrder,
  saveServerCart,
  type ApiAddress,
  type ApiOrder,
} from "@/lib/api-customer";
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

function CheckoutPage() {
  const ready = useRequireAuth();
  const { lines, subtotal, clear } = useCart();

  const [addresses, setAddresses] = useState<ApiAddress[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<ApiOrder | null>(null);
  const [paid, setPaid] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    // Real backend call: GET /api/addresses (scoped to the JWT user).
    getAddresses()
      .then((addrs) => {
        setAddresses(addrs);
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        setAddressId(def?.id ?? null);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiRequestError ? err.message : "تعذّر تجهيز صفحة الدفع.");
      });
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) return null;

  const shipping = 0;
  const total = subtotal + shipping;

  async function submitOrder() {
    if (!addressId || lines.length === 0) return;
    setPlacing(true);
    try {
      // The backend resolves the authorized merchant per line (from
      // merchant_products) and validates stock, so we send only the product + qty.
      const items = lines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));
      // Snapshot the cart server-side (best effort — the order is the real record).
      saveServerCart(items).catch(() => undefined);
      // Real backend call: POST /api/orders — validates address, merchant
      // authorization and STOCK atomically; decrements inventory; returns the
      // order with status 'pending_payment'.
      const order = await placeOrder({ shippingAddressId: addressId, items });
      setPlacedOrder(order);
      clear();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "تعذّر إنشاء الطلب.");
    } finally {
      setPlacing(false);
    }
  }

  // ---- order placed → pay, then success ------------------------------------
  if (placedOrder) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-lg space-y-6">
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div
              className={cn(
                "mx-auto grid h-16 w-16 place-items-center rounded-full",
                paid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
              )}
            >
              {paid ? <CheckCircle2 className="h-8 w-8" /> : <Package className="h-8 w-8" />}
            </div>
            <h1 className="mt-4 text-xl font-extrabold text-foreground">
              {paid ? "اكتمل طلبك بنجاح!" : "تم إنشاء طلبك — بقي الدفع"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              رقم الطلب <span className="num font-bold text-foreground">{placedOrder.number}</span>{" "}
              — مسجّل في نظام صبح الحقيقي{paid ? " ومدفوع بالكامل." : "."}
            </p>
            <p className="num mt-2 text-2xl font-black text-foreground">
              {placedOrder.total_sar} <span className="text-sm font-bold">ر.س</span>
            </p>
            {paid && (
              <div className="mt-6 grid gap-2">
                <Button asChild className="rounded-full font-bold">
                  <Link to="/customer/orders/$id" params={{ id: placedOrder.id }}>
                    عرض تفاصيل الطلب
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full font-bold">
                  <Link to="/customer">متابعة التسوّق</Link>
                </Button>
              </div>
            )}
          </div>

          {!paid && (
            <PaymentPanel
              orderId={placedOrder.id}
              amountSar={Number(placedOrder.total_sar)}
              onPaid={() => setPaid(true)}
            />
          )}
        </div>
      </PageContainer>
    );
  }

  // ---- empty cart guard -----------------------------------------------------
  if (lines.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="إتمام الشراء" />
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">سلّتك فارغة — أضف منتجات أولًا.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/customer">تسوّق الآن</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="إتمام الشراء" subtitle="خطوة أخيرة ويصلك طلبك من صبح" />

      {loadError && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          {loadError}
          <button type="button" onClick={load} className="mr-auto text-xs font-bold underline">
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Address — real /api/addresses */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              عنوان التوصيل
            </h2>

            {addresses === null ? (
              <div className="space-y-2" aria-hidden="true">
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center">
                <p className="text-sm text-muted-foreground">لا يوجد لديك عنوان محفوظ بعد.</p>
                <Button asChild size="sm" className="mt-3 rounded-full">
                  <Link to="/customer/addresses">
                    <Plus className="h-4 w-4" />
                    أضف عنوانًا أولًا
                  </Link>
                </Button>
              </div>
            ) : (
              <RadioGroup
                value={addressId ?? undefined}
                onValueChange={(v) => setAddressId(v)}
                className="grid gap-2"
              >
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                      addressId === a.id ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <RadioGroupItem value={a.id} className="mt-0.5" />
                    <span className="min-w-0 text-xs">
                      <span className="block text-sm font-bold text-foreground">
                        {a.recipient_name}
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {a.city} — {a.region} — {a.line1}
                      </span>
                      <span className="num block text-muted-foreground" dir="ltr">
                        {a.phone}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}
          </section>

          <p className="rounded-2xl border border-border bg-card px-5 py-4 text-[11px] leading-relaxed text-muted-foreground">
            بعد تأكيد الطلب يتحقق النظام من توفر الكمية ويحجزها، ثم تنتقل مباشرةً إلى بوابة الدفع
            لإكمال العملية.
          </p>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Truck className="h-4 w-4 text-primary" />
            ملخّص الطلب
          </h2>
          <ul className="space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.product.id} className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-foreground">
                  {l.product.name}{" "}
                  <span className="num text-xs text-muted-foreground">×{l.qty}</span>
                </span>
                <span className="num shrink-0 font-semibold text-foreground">
                  {l.product.price * l.qty} ر.س
                </span>
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-border" />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">المجموع الفرعي</dt>
              <dd className="num font-semibold text-foreground">{subtotal} ر.س</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">الشحن</dt>
              <dd className="text-xs font-semibold text-emerald-600">مجّاني برعاية صبح</dd>
            </div>
            <div className="flex justify-between pt-2 text-base">
              <dt className="font-extrabold text-foreground">الإجمالي</dt>
              <dd className="num font-black text-foreground">{total} ر.س</dd>
            </div>
          </dl>

          <Button
            type="button"
            size="lg"
            className="mt-5 h-12 w-full rounded-full text-base font-bold"
            disabled={placing || !addressId || addresses === null}
            onClick={submitOrder}
          >
            {placing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ إنشاء الطلب…
              </>
            ) : (
              "تأكيد الطلب والانتقال للدفع"
            )}
          </Button>
        </aside>
      </div>
    </PageContainer>
  );
}
