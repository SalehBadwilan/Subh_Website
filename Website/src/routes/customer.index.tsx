import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Plus,
  RefreshCcw,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Truck,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, SiteFooter } from "@/components/customer/CustomerShell";
import { ApiProductCard } from "@/components/customer/ApiProductCard";
import { iconForSlug, toneForSlug } from "@/lib/category-visuals";
import {
  ApiRequestError,
  getCategories,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/api";
import { getProducts } from "@/lib/api-customer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/")({
  head: () => ({
    meta: [
      { title: "الرئيسية — صبح" },
      {
        name: "description",
        content: "تسوّق من صبح: منصة مركزية بمنتجات مختارة وأسعار موحّدة وتوصيل سريع.",
      },
    ],
  }),
  component: CustomerHome,
});

type LoadStatus = "loading" | "success" | "error";

function CustomerHome() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    setError(null);
    // Real backend calls: GET /api/products?status=active + GET /api/categories
    Promise.all([getProducts({ limit: 50 }), getCategories()])
      .then(([prod, cats]) => {
        setProducts(prod.products);
        setCategories(cats);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب البيانات.");
        setStatus("error");
      });
  }

  useEffect(load, []);

  // Real sections derived from the live catalog.
  const newest = products.slice(0, 8);
  const bestPrices = [...products]
    .sort(
      (a, b) =>
        (Number.parseFloat(String(a.price_sar)) || 0) -
        (Number.parseFloat(String(b.price_sar)) || 0),
    )
    .slice(0, 8);
  const categoryName = (p: ApiProduct) =>
    p.category_id ? categories.find((c) => c.id === p.category_id)?.name_ar : undefined;

  return (
    <PageContainer className="space-y-10 lg:space-y-14">
      <HeroBanner />
      <AiSearchBanner />

      {status === "loading" && <HomeSkeleton />}

      {status === "error" && (
        <div role="alert" className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">تعذّر الاتصال بالخادم</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button onClick={load} variant="outline" className="mt-5 rounded-full font-bold">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && (
        <>
          <CategoriesSection categories={categories} />
          <ProductSection
            title="وصل حديثًا"
            subtitle="أحدث ما أُضيف إلى كتالوج صبح"
            icon={Plus}
            products={newest}
            categoryName={categoryName}
          />
          <ProductSection
            title="أسعار مناسبة"
            subtitle="الأقل سعرًا في الكتالوج الآن"
            icon={Tag}
            products={bestPrices}
            categoryName={categoryName}
            accent
          />
        </>
      )}

      <SiteFooter />
    </PageContainer>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-24 shrink-0 rounded-2xl" />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroBanner() {
  return (
    <section
      aria-label="عروض صبح"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-primary via-primary to-teal-800 p-6 text-primary-foreground shadow-elevated sm:p-10 lg:p-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, white 1.5px, transparent 1.5px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
          backgroundSize: "48px 48px, 64px 64px",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

      <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            حصريًا على صبح
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            أسواق المملكة
            <br />
            بين يديك
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
            منصة مركزية تجمع أفضل المنتجات بأسعار موحّدة وضمان صبح وتوصيل سريع لجميع مدن المملكة.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-background px-6 font-bold text-primary hover:bg-background/90"
            >
              <Link to="/customer/search">
                تسوّق الآن
                <ChevronLeft className="mr-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/40 bg-transparent px-6 font-bold text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            >
              <Link to="/customer/categories">تصفّح الفئات</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4" />
              توصيل من صبح
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              ضمان صبح
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Tag className="h-4 w-4" />
              أسعار موحّدة
            </span>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative mx-auto grid aspect-[4/5] w-full max-w-sm place-items-center rounded-3xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-white/25 to-white/5" />
            <div className="relative text-center">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-white/25 backdrop-blur">
                <ShoppingCart className="h-12 w-12 text-primary-foreground" />
              </div>
              <div className="num mt-4 text-5xl font-black tracking-tight">‎٥٠٪</div>
              <div className="mt-1 text-sm font-semibold text-primary-foreground/85">
                خصومات تصل إلى
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Entry point to the AI-powered semantic search backed by the real API. */
function AiSearchBanner() {
  return (
    <section aria-label="البحث الذكي">
      <Link
        to="/customer/ai-search"
        className="group flex items-center gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft sm:p-5"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
          <Sparkles className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold text-foreground">البحث الذكي</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground sm:text-sm">
            اكتب طلبك بلغتك الطبيعية — «أبغى جوال بأقل من 2000 ريال» — وسنجده لك.
          </span>
        </span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-primary" />
      </Link>
    </section>
  );
}

function CategoriesSection({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="cats-heading">
      <SectionHeader
        id="cats-heading"
        title="تسوّق حسب الفئة"
        subtitle="فئات حقيقية من كتالوج صبح"
        action={
          <Link
            to="/customer/categories"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            كل الفئات
            <ChevronLeft className="h-4 w-4" />
          </Link>
        }
      />
      <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-3">
          {categories.slice(0, 10).map((cat) => {
            const Icon = iconForSlug(cat.slug);
            return (
              <li key={cat.id} className="shrink-0">
                <Link
                  to="/customer/category/$id"
                  params={{ id: cat.id }}
                  className="group flex w-24 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
                >
                  <span
                    className={cn(
                      "grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-105",
                      toneForSlug(cat.slug),
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="line-clamp-1 w-full text-xs font-semibold text-foreground">
                    {cat.name_ar}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ProductSection({
  title,
  subtitle,
  icon: Icon,
  products,
  categoryName,
  accent,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Plus;
  products: ApiProduct[];
  categoryName: (p: ApiProduct) => string | undefined;
  accent?: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title}>
      <SectionHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg",
                accent ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </span>
        }
        subtitle={subtitle}
        action={
          <Link
            to="/customer/search"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            عرض الكل
            <ChevronLeft className="h-4 w-4" />
          </Link>
        }
      />
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-4 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id} className="w-[68vw] shrink-0 sm:w-auto">
              <ApiProductCard product={p} categoryName={categoryName(p)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionHeader({
  id,
  title,
  subtitle,
  action,
}: {
  id?: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
