/**
 * Card for a REAL backend product (ApiProduct) — the single visual identity for
 * real products across home, category, search, and AI-search screens.
 * Separate from the legacy mock ProductCard (ratings/old prices only exist on
 * mock data).
 */
import { Link } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/customer-data";
import type { ApiProduct } from "@/lib/api";

/** Deterministic hue from a UUID so each product gets a stable placeholder tint. */
export function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export function formatPrice(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return String(value);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

/** Map a backend product onto the cart's Product shape (kept for the session). */
export function toCartProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    name: product.name_ar,

    merchantId: product.merchant?.id ?? "",
    merchant: product.merchant?.commercial_name ?? "",

    categoryId: product.category_id ?? product.category?.id ?? "",

    price: Number.parseFloat(String(product.price_sar)) || 0,

    rating: 0,
    reviews: 0,

    hue: hueFromId(product.id),

    description: product.description_ar ?? undefined,

    image: product.image_url ?? "",
  };
}

export function ApiProductCard({
  product,
  categoryName,
}: {
  product: ApiProduct;
  categoryName?: string;
}) {
  const { addItem } = useCart();
  const hue = hueFromId(product.id);
  const price = Number.parseFloat(String(product.price_sar)) || 0;

  function addToCart() {
    addItem(toCartProduct(product), 1);
    toast.success(`أُضيف «${product.name_ar}» إلى السلّة`);
  }

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated">
      <Link
        to="/customer/product/$id"
        params={{ id: product.id }}
        aria-label={`عرض ${product.name_ar}`}
        className="relative block aspect-square w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, oklch(0.92 0.06 ${hue}), oklch(0.82 0.09 ${hue}))`,
        }}
      >
        {product.image_url ? (
          // Real uploaded image from the backend (product_images table).
          <img
            src={product.image_url}
            alt={product.name_ar}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/40 text-white backdrop-blur">
              <Sparkles className="h-8 w-8" />
            </div>
          </div>
        )}
        {(categoryName ?? product.category?.name_ar) && (
          <Badge className="absolute right-3 top-3 rounded-full bg-background px-2.5 py-0.5 text-[11px] font-bold text-foreground shadow-sm">
            {categoryName ?? product.category?.name_ar}
          </Badge>
        )}
        {product.in_stock === false && (
          <Badge className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-bold text-destructive-foreground shadow-sm">
            نفدت الكمية
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-semibold text-primary/80">شحن وضمان من صبح</div>

          {product.merchant && (
            <div className="text-[11px] text-muted-foreground">
              <span className="font-semibold">التاجر:</span> {product.merchant.commercial_name}
            </div>
          )}
        </div>
        <Link to="/customer/product/$id" params={{ id: product.id }} className="block">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-foreground hover:text-primary">
            {product.name_ar}
          </h3>
        </Link>
        {product.description_ar && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {product.description_ar}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col leading-tight">
            <span className="num text-lg font-black text-foreground">
              {formatPrice(price)} <span className="text-xs font-bold">ر.س</span>
            </span>
            <span className="num text-[10px] text-muted-foreground">SKU: {product.sku}</span>
          </div>
          <Button
            size="icon"
            type="button"
            className="h-9 w-9 shrink-0 rounded-full shadow-sm"
            aria-label={`أضف ${product.name_ar} إلى السلّة`}
            onClick={addToCart}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
