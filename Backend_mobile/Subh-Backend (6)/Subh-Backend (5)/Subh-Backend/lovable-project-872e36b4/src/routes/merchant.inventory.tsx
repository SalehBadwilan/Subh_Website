import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, XCircle, Package as PackageIcon, Warehouse } from "lucide-react";
import { MerchantPage } from "@/components/merchant/MerchantShell";
import type { MerchantProduct } from "@/lib/merchant-data";
import { useMerchantStore } from "@/lib/merchant-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/merchant/inventory")({
  head: () => ({ meta: [{ title: "المخزون — صبح تاجر" }] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { products } = useMerchantStore();

  if (products.length === 0) {
    return (
      <MerchantPage title="المخزون" subtitle="تابع مستويات المخزون والتنبيهات.">
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Warehouse className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-foreground">
            لا يوجد مخزون حالياً.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            سيظهر المخزون فور تعيين منتجات لحسابك من إدارة صبح.
          </p>
        </div>
      </MerchantPage>
    );
  }

  const inStock = products.filter((p) => p.stock > p.lowStockThreshold);
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
  const out = products.filter((p) => p.stock === 0);

  return (
    <MerchantPage title="المخزون" subtitle="تابع مستويات المخزون والتنبيهات.">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard tone="emerald" icon={PackageIcon} label="متوفر" count={inStock.length} />
        <SummaryCard tone="amber" icon={AlertTriangle} label="مخزون منخفض" count={low.length} />
        <SummaryCard tone="rose" icon={XCircle} label="نفد" count={out.length} />
      </div>

      <Section title="مخزون منخفض" items={low} emptyText="لا توجد منتجات بمخزون منخفض." />
      <div className="h-4" />
      <Section title="نفدت من المخزون" items={out} emptyText="جميع المنتجات متوفرة." />
      <div className="h-4" />
      <Section title="المخزون الكامل" items={products} emptyText="لا توجد منتجات." showAll />
    </MerchantPage>
  );
}

function SummaryCard({
  tone,
  icon: Icon,
  label,
  count,
}: {
  tone: "emerald" | "amber" | "rose";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  count: number;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <span className={cn("grid h-12 w-12 place-items-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold text-foreground num">{count}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  emptyText,
  showAll,
}: {
  title: string;
  items: MerchantProduct[];
  emptyText: string;
  showAll?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-extrabold text-foreground">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => {
            const pct = Math.min(100, (p.stock / Math.max(p.lowStockThreshold * 4, 1)) * 100);
            const barTone =
              p.stock === 0
                ? "bg-rose-500"
                : p.stock <= p.lowStockThreshold
                  ? "bg-amber-500"
                  : "bg-emerald-500";
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground num">{p.sku}</p>
                  {showAll && (
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full", barTone)} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">المتوفر</p>
                  <p className="text-lg font-extrabold text-foreground num">{p.stock}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">حد التنبيه</p>
                  <p className="text-sm font-bold text-foreground num">{p.lowStockThreshold}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
