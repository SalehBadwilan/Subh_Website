import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/cart")({
  head: () => ({
    meta: [
      { title: "السلّة — صبح" },
      { name: "description", content: "استعرض منتجات سلّتك على صبح وأكمل الشراء." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, updateQty, removeItem, subtotal } = useCart();
  const shipping = subtotal > 200 || subtotal === 0 ? 0 : 25;
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="سلّتي" />
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">سلّتك فارغة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            استعرض منتجات صبح وأضف ما يعجبك.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/customer">ابدأ التسوّق</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="سلّتي"
        subtitle={`${lines.length} منتج${lines.length > 1 ? "ات" : ""} جاهزة للشراء`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {lines.map(({ product, qty }) => (
            <li
              key={product.id}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3 sm:gap-4 sm:p-4"
            >
              <Link
  to="/customer/product/$id"
  params={{ id: product.id }}
  className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl sm:w-28"
  aria-label={product.name}
>
  {product.image ? (
    <img
      src={product.image}
      alt={product.name}
      className="h-full w-full object-cover"
    />
  ) : (
    <div
      className="h-full w-full"
      style={{
        background: `linear-gradient(
          135deg,
          oklch(0.92 0.06 ${product.hue}),
          oklch(0.82 0.09 ${product.hue})
        )`,
      }}
    />
  )}
</Link>
              <div className="flex flex-1 flex-col">
                <Link
                  to="/customer/product/$id"
                  params={{ id: product.id }}
                  className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary"
                >
                  {product.name}
                </Link>
                <div className="mt-1 text-[11px] font-semibold text-primary/80">
                  شحن وضمان من صبح
                </div>

                <div className="mt-auto flex items-end justify-between pt-2">
                  <div className="flex items-center rounded-full border border-border">
                    <button
                      type="button"
                      onClick={() => updateQty(product.id, -1)}
                      className="grid h-8 w-8 place-items-center hover:bg-muted"
                      aria-label="إنقاص"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="num w-8 text-center text-sm font-bold">{qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(product.id, 1)}
                      className="grid h-8 w-8 place-items-center hover:bg-muted"
                      aria-label="زيادة"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="num text-base font-black text-foreground">
                      {product.price * qty} <span className="text-xs font-bold">ر.س</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="إزالة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-foreground">ملخّص الطلب</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="المجموع الفرعي" value={`${subtotal} ر.س`} />
            <Row
              label="الشحن"
              value={shipping === 0 ? "مجّاني" : `${shipping} ر.س`}
              hint={shipping === 0 ? "برعاية صبح" : undefined}
            />
            <div className="my-2 border-t border-border" />
            <Row label="الإجمالي" value={`${total} ر.س`} bold />
          </dl>
          <Button asChild size="lg" className="mt-5 h-12 w-full rounded-full text-base font-bold">
            <Link to="/customer/checkout">إتمام الشراء</Link>
          </Button>
          <Link
            to="/customer"
            className="mt-3 block text-center text-xs font-semibold text-primary hover:underline"
          >
            متابعة التسوّق
          </Link>
        </aside>
      </div>
    </PageContainer>
  );
}

function Row({
  label,
  value,
  bold,
  hint,
}: {
  label: string;
  value: string;
  bold?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={cn("text-muted-foreground", bold && "font-bold text-foreground")}>{label}</dt>
      <dd className={cn("num font-semibold text-foreground", bold && "text-lg font-black")}>
        {value}
        {hint && <span className="mr-2 text-[10px] font-normal text-primary">{hint}</span>}
      </dd>
    </div>
  );
}
