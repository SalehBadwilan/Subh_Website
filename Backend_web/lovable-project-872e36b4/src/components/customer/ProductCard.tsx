import { Link } from "@tanstack/react-router";
import { Plus, Star } from "lucide-react";
import type { SVGProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/customer-data";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

/**
 * Product card used across the customer app. Whole card links to the
 * product details page; the add-to-cart button is a nested action.
 *
 * Merchant info is intentionally NOT surfaced on the card — Subh is the
 * marketplace of record and the trust signal shown here is Subh's own
 * shipping/warranty guarantee. Merchant is exposed only in product details.
 */
export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const discounted = product.oldPrice && product.oldPrice > product.price;
  return (
    <Link
      to="/customer/product/$id"
      params={{ id: product.id }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
    >
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, oklch(0.92 0.06 ${product.hue}), oklch(0.82 0.09 ${product.hue}))`,
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/40 text-white backdrop-blur">
            <ShoppingBagPlaceholder className="h-8 w-8" />
          </div>
        </div>
        {product.badge && (
          <Badge
            className={cn(
              "absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm",
              discounted
                ? "bg-destructive text-destructive-foreground"
                : "bg-background text-foreground",
            )}
          >
            {product.badge}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[11px] font-semibold text-primary/80">
          شحن وضمان من صبح
        </div>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-foreground">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 text-xs">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
          <span className="num font-semibold text-foreground">
            {product.rating.toFixed(1)}
          </span>
          <span className="num text-muted-foreground">({product.reviews})</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col leading-tight">
            <span className="num text-lg font-black text-foreground">
              {product.price} <span className="text-xs font-bold">ر.س</span>
            </span>
            {discounted && (
              <span className="num text-xs text-muted-foreground line-through">
                {product.oldPrice} ر.س
              </span>
            )}
          </div>
          <Button
            size="icon"
            type="button"
            className="h-9 w-9 shrink-0 rounded-full shadow-sm"
            aria-label={`أضف ${product.name} إلى السلّة`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product, 1);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

function ShoppingBagPlaceholder(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
      <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
    </svg>
  );
}
