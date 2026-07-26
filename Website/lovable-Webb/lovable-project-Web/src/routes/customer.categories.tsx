import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Layers, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { getCategories, ApiRequestError, type ApiCategory } from "@/lib/api";
import { iconForSlug, toneForSlug } from "@/lib/category-visuals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customer/categories")({
  head: () => ({
    meta: [
      { title: "الفئات — صبح" },
      {
        name: "description",
        content: "تصفّح كل فئات صبح واختر ما يناسبك.",
      },
    ],
  }),
  component: CategoriesPage,
});

type LoadStatus = "loading" | "success" | "error";

function CategoriesPage() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend call: GET /api/categories
    getCategories()
      .then((rows) => {
        setCategories(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(
          err instanceof ApiRequestError ? err : new ApiRequestError("تعذّر جلب الفئات."),
        );
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  return (
    <PageContainer>
      <PageHeader
        title="جميع الفئات"
        subtitle="فئات حقيقية من كتالوج صبح — اختر فئة لبحث ذكي داخلها"
      />

      {status === "loading" && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="mt-3 h-5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </li>
          ))}
        </ul>
      )}

      {status === "error" && error && (
        <div
          role="alert"
          className="rounded-3xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">تعذّر جلب الفئات</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            {error.message}
          </p>
          <Button onClick={load} variant="outline" className="mt-5 rounded-full font-bold">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && categories.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Layers className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">لا توجد فئات بعد</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            لم يُضِف فريق صبح أي فئات إلى الكتالوج حتى الآن.
          </p>
        </div>
      )}

      {status === "success" && categories.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const Icon = iconForSlug(cat.slug);
            return (
              <li key={cat.id}>
                <Link
                  to="/customer/category/$id"
                  params={{ id: cat.id }}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
                >
                  <span
                    className={cn(
                      "grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:scale-105",
                      toneForSlug(cat.slug),
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-foreground">{cat.name_ar}</h2>
                    <p className="num mt-1 text-xs text-muted-foreground" dir="ltr">
                      {cat.slug}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span>تصفّح منتجات الفئة</span>
                    <ChevronLeft className="h-4 w-4" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
