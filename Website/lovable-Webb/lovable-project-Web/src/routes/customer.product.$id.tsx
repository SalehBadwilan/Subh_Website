import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Minus,
  Plus,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/customer/CustomerShell";
import {
  ApiProductCard,
  formatPrice,
  hueFromId,
  toCartProduct,
} from "@/components/customer/ApiProductCard";
import { ApiRequestError, getCategory, type ApiCategory, type ApiProduct } from "@/lib/api";
import { getProductById, getProducts } from "@/lib/api-customer";
import { useCart } from "@/lib/cart-context";

export const Route = createFileRoute("/customer/product/$id")({
  head: () => ({
    meta: [
      { title: "المنتج — صبح" },
      { name: "description", content: "تفاصيل المنتج على صبح مع شحن وضمان صبح." },
    ],
  }),
  component: ProductDetails,
});

type LoadStatus = "loading" | "success" | "error";

function ProductDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [related, setRelated] = useState<ApiProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    setQty(1);
    // Real backend call: GET /api/products/:id (with images)
    getProductById(id)
      .then(async (p) => {
        setProduct(p);
        // Category + related products (same category) — best effort.
        const catId = p.category?.id ?? p.category_id;
        if (catId) {
          getCategory(catId)
            .then(setCategory)
            .catch(() => setCategory(null));
          getProducts({ categoryId: catId, limit: 8 })
            .then((r) => setRelated(r.products.filter((x) => x.id !== p.id).slice(0, 4)))
            .catch(() => setRelated([]));
        } else {
          setCategory(null);
          setRelated([]);
        }
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب المنتج.");
        setStatus("error");
      });
  }, [id]);

  useEffect(load, [load]);

  function addToCart(goCheckout = false) {
    if (!product) return;
    addItem(toCartProduct(product), qty);
    toast.success(`أُضيف «${product.name_ar}» إلى السلّة`);
    if (goCheckout) navigate({ to: "/customer/cart" });
  }

  if (status === "loading") {
    return (
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (status === "error" || !product) {
    return (
      <PageContainer>
        <div
          role="alert"
          className="rounded-3xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-foreground">تعذّر جلب المنتج</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={load} variant="outline" className="rounded-full">
              <RefreshCcw className="h-4 w-4" />
              إعادة المحاولة
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/customer">الرئيسية</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const hue = hueFromId(product.id);
  const price = Number.parseFloat(String(product.price_sar)) || 0;
  const vat = Number.parseFloat(String(product.vat_rate)) || 0;
  const images = product.images ?? [];

  return (
    <PageContainer>
      <nav
        className="mb-4 flex items-center gap-1 text-xs text-muted-foreground"
        aria-label="مسار التصفّح"
      >
        <Link to="/customer" className="hover:text-foreground">
          الرئيسية
        </Link>
        <ArrowRight className="h-3 w-3" />
        {category ? (
          <>
            <Link
              to="/customer/category/$id"
              params={{ id: category.id }}
              className="hover:text-foreground"
            >
              {category.name_ar}
            </Link>
            <ArrowRight className="h-3 w-3" />
          </>
        ) : null}
        <span className="truncate text-foreground">{product.name_ar}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Visual */}
        <div
          className="relative aspect-square w-full overflow-hidden rounded-3xl"
          style={{
            background: `linear-gradient(135deg, oklch(0.92 0.06 ${hue}), oklch(0.82 0.09 ${hue}))`,
          }}
        >
          {images.length > 0 ? (
            <img
              src={images[0].image_url}
              alt={images[0].alt_text_ar ?? product.name_ar}
              className="relative z-10 h-full w-full object-cover"
              onError={(e) => {
                // Training DB rows may carry placeholder URLs — fall back to the tint.
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white/40 text-white backdrop-blur">
                <Sparkles className="h-10 w-10" />
              </div>
            </div>
          )}
          {category && (
            <Badge className="absolute right-4 top-4 z-20 rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground shadow-sm">
              {category.name_ar}
            </Badge>
          )}
          {product.in_stock === false && (
            <Badge className="absolute left-4 top-4 z-20 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground shadow-sm">
              نفدت الكمية
            </Badge>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="text-xs font-semibold text-primary">شحن وضمان من صبح</div>
          <h1 className="mt-1 text-2xl font-extrabold leading-snug text-foreground sm:text-3xl">
            {product.name_ar}
          </h1>
          <p className="num mt-1 text-xs text-muted-foreground">SKU: {product.sku}</p>

          <div className="mt-4 flex items-end gap-2">
            <span className="num text-3xl font-black text-foreground">
              {formatPrice(price)} <span className="text-base font-bold">ر.س</span>
            </span>
            {vat > 0 && (
              <span className="num pb-1 text-xs text-muted-foreground">
                شامل الضريبة {Math.round(vat * 100)}٪
              </span>
            )}
          </div>

          {product.description_ar && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description_ar}
            </p>
          )}

          {typeof product.stock_available === "number" && (
            <p className="mt-3 text-xs font-semibold">
              {product.in_stock ? (
                <span className="text-emerald-600">
                  متوفر — <span className="num">{product.stock_available}</span> قطعة في المخزون
                </span>
              ) : (
                <span className="text-destructive">غير متوفر حاليًا</span>
              )}
            </p>
          )}

          {/* Qty + actions */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-border bg-card">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-muted"
                aria-label="إنقاص الكمية"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="num w-8 text-center text-sm font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-muted"
                aria-label="زيادة الكمية"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              className="h-12 flex-1 rounded-full text-base font-bold"
              onClick={() => addToCart(false)}
              disabled={product.in_stock === false}
            >
              <Plus className="h-5 w-5" />
              أضف إلى السلّة
            </Button>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="mt-3 h-12 w-full rounded-full text-base font-bold"
            onClick={() => addToCart(true)}
            disabled={product.in_stock === false}
          >
            اشترِ الآن
          </Button>

          {/* Assurances */}
          <ul className="mt-6 grid grid-cols-3 gap-3 text-center text-[11px] font-semibold text-muted-foreground">
            <li className="rounded-2xl border border-border bg-card px-2 py-3">
              <Truck className="mx-auto mb-1 h-5 w-5 text-primary" />
              توصيل من صبح
            </li>
            <li className="rounded-2xl border border-border bg-card px-2 py-3">
              <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
              ضمان صبح
            </li>
            <li className="rounded-2xl border border-border bg-card px-2 py-3">
              <RotateCcw className="mx-auto mb-1 h-5 w-5 text-primary" />
              إرجاع سهل
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10" aria-label="منتجات مشابهة">
          <h2 className="mb-4 text-lg font-extrabold text-foreground">منتجات مشابهة</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ApiProductCard product={p} categoryName={category?.name_ar} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}
