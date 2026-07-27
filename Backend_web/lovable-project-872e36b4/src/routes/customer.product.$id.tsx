import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, ShieldCheck, Star, Truck, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/customer/CustomerShell";
import { ProductCard } from "@/components/customer/ProductCard";
import type { Product } from "@/lib/customer-data";
import { getCategory, getProduct, getProductsByCategory } from "@/lib/customer-data";
import { useCart } from "@/lib/cart-context";

export const Route = createFileRoute("/customer/product/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    const related = getProductsByCategory(product.categoryId)
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
    const category = getCategory(product.categoryId);
    return { product, related, category };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — صبح` },
          {
            name: "description",
            content: `${loaderData.product.name} متوفّر على صبح بسعر ${loaderData.product.price} ر.س مع شحن وضمان صبح.`,
          },
        ]
      : [{ title: "المنتج — صبح" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductDetails,
  notFoundComponent: ProductNotFound,
});

function ProductDetails() {
  const { product, related, category } = Route.useLoaderData();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const discounted = product.oldPrice && product.oldPrice > product.price;

  return (
    <PageContainer>
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground" aria-label="مسار التصفّح">
        <Link to="/customer" className="hover:text-foreground">الرئيسية</Link>
        <ArrowRight className="h-3 w-3" />
        {category && (
          <>
            <Link
              to="/customer/category/$id"
              params={{ id: category.id }}
              className="hover:text-foreground"
            >
              {category.name}
            </Link>
            <ArrowRight className="h-3 w-3" />
          </>
        )}
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-3xl shadow-elevated"
          style={{
            background: `linear-gradient(135deg, oklch(0.92 0.06 ${product.hue}), oklch(0.78 0.11 ${product.hue}))`,
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-32 w-32 place-items-center rounded-3xl bg-white/40 backdrop-blur">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="h-16 w-16 text-white">
                <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
                <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          {product.badge && (
            <Badge className="absolute right-4 top-4 rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground shadow-sm">
              {product.badge}
            </Badge>
          )}
        </div>

        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            بيع وضمان من صبح
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="num font-semibold text-foreground">{product.rating.toFixed(1)}</span>
            <span className="num text-muted-foreground">({product.reviews} تقييم)</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="num text-4xl font-black text-foreground">
              {product.price} <span className="text-lg font-bold">ر.س</span>
            </span>
            {discounted && (
              <span className="num text-lg text-muted-foreground line-through">
                {product.oldPrice} ر.س
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description ??
              "منتج مختار من صبح ضمن معايير الجودة. متوفّر مع الشحن السريع وضمان الاستبدال والإرجاع من صبح لضمان تجربة تسوّق مطمئنة."}
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-3 text-center text-[11px] font-semibold text-foreground">
            <div className="rounded-xl border border-border bg-card p-3">
              <Truck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <dt>توصيل صبح</dt>
              <dd className="mt-0.5 text-muted-foreground">٢–٥ أيام</dd>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
              <dt>ضمان صبح</dt>
              <dd className="mt-0.5 text-muted-foreground">أصلي ١٠٠٪</dd>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <RotateCcw className="mx-auto mb-1 h-5 w-5 text-primary" />
              <dt>إرجاع مجّاني</dt>
              <dd className="mt-0.5 text-muted-foreground">خلال ١٤ يوم</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border bg-card">
              <button
                type="button"
                aria-label="إنقاص"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-10 w-10 place-items-center text-foreground hover:bg-muted"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="num w-10 text-center text-base font-bold">{qty}</span>
              <button
                type="button"
                aria-label="زيادة"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-10 w-10 place-items-center text-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              size="lg"
              className="h-12 flex-1 rounded-full text-base font-bold"
              onClick={() => {
                addItem(product, qty);
                navigate({ to: "/customer/cart" });
              }}
            >
              أضف إلى السلّة
            </Button>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="mt-3 h-12 rounded-full text-base font-bold"
            onClick={() => {
              addItem(product, qty);
              navigate({ to: "/customer/checkout" });
            }}
          >
            اشترِ الآن
          </Button>

          <p className="mt-4 text-[11px] text-muted-foreground">
            يتم توفير المنتج عبر <span className="font-semibold text-foreground">{product.merchant}</span> — أحد شركاء صبح.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-extrabold text-foreground sm:text-xl">
            منتجات مشابهة
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p: Product) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}

function ProductNotFound() {
  return (
    <PageContainer>
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <h1 className="text-xl font-bold text-foreground">المنتج غير موجود</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          هذا المنتج لم يعد متوفرًا على صبح.
        </p>
        <Link
          to="/customer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowRight className="h-4 w-4" />
          العودة إلى الرئيسية
        </Link>
      </div>
    </PageContainer>
  );
}
