import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Flame, Plus, Sparkles, Star, Tag, Truck, ShoppingCart } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer, SiteFooter } from "@/components/customer/CustomerShell";
import { ProductCard } from "@/components/customer/ProductCard";
import {
  bestSellers,
  categories,
  featured,
  newArrivals,
  offers,
  type IconType,
  type Product,
} from "@/lib/customer-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/")({
  head: () => ({
    meta: [
      { title: "الرئيسية — صبح" },
      {
        name: "description",
        content:
          "تسوّق من صبح: منصة مركزية بمنتجات مختارة وأسعار موحّدة وتوصيل سريع.",
      },
    ],
  }),
  component: CustomerHome,
});

function CustomerHome() {
  return (
    <PageContainer className="space-y-10 lg:space-y-14">
      <HeroBanner />
      <CategoriesSection />
      <ProductSection
        title="منتجات مميّزة"
        subtitle="مختارة بعناية من فريق صبح"
        icon={Sparkles}
        products={featured}
        seeAllTo="/customer/search"
      />
      <ProductSection
        title="الأكثر مبيعًا"
        subtitle="ما يفضّله عملاء صبح هذا الأسبوع"
        icon={Flame}
        products={bestSellers}
        seeAllTo="/customer/search"
      />
      <ProductSection
        title="وصل حديثًا"
        subtitle="أحدث الإضافات إلى المنصة"
        icon={Plus}
        products={newArrivals}
        seeAllTo="/customer/search"
      />
      <ProductSection
        title="عروض حالية"
        subtitle="خصومات لفترة محدودة"
        icon={Tag}
        products={offers}
        seeAllTo="/customer/search"
        accent
      />

      <SiteFooter />
    </PageContainer>
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
                تسوّق العروض
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

function CategoriesSection() {
  return (
    <section aria-labelledby="cats-heading">
      <SectionHeader
        id="cats-heading"
        title="تسوّق حسب الفئة"
        subtitle="كل ما تحتاجه في مكان واحد"
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
        <ul className="flex gap-3 sm:grid sm:grid-cols-4 sm:gap-4 lg:grid-cols-8">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <li key={cat.id} className="shrink-0">
                <Link
                  to="/customer/category/$id"
                  params={{ id: cat.id }}
                  className="group flex w-24 flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft sm:w-full"
                >
                  <span
                    className={cn(
                      "grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-105",
                      cat.tone,
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-semibold text-foreground sm:text-sm">
                    {cat.name}
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
  accent,
  seeAllTo,
}: {
  title: string;
  subtitle?: string;
  icon: IconType;
  products: Product[];
  accent?: boolean;
  seeAllTo: string;
}) {
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
            to={seeAllTo}
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
              <ProductCard product={p} />
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
