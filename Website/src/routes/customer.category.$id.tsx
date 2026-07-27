import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { ApiProductCard } from "@/components/customer/ApiProductCard";
import { ApiRequestError, getCategory, type ApiCategory, type ApiProduct } from "@/lib/api";
import { getProducts } from "@/lib/api-customer";

export const Route = createFileRoute("/customer/category/$id")({
  head: () => ({
    meta: [
      { title: "الفئة — صبح" },
      { name: "description", content: "تسوّق منتجات الفئة على صبح." },
    ],
  }),
  component: CategoryPage,
});

type LoadStatus = "loading" | "success" | "error";

function CategoryPage() {
  const { id } = Route.useParams();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [category, setCategory] = useState<ApiCategory | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Real backend calls: GET /api/categories/:id + GET /api/products?category_id=
    Promise.all([getCategory(id), getProducts({ categoryId: id, limit: 50 })])
      .then(([cat, res]) => {
        setCategory(cat);
        setProducts(res.products);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب الفئة.");
        setStatus("error");
      });
  }, [id]);

  useEffect(load, [load]);

  return (
    <PageContainer>
      <Link
        to="/customer/categories"
        className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        كل الفئات
      </Link>

      {status === "loading" && (
        <>
          <Skeleton className="h-9 w-48" />
          <ul
            className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            aria-hidden="true"
          >
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
        </>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <WifiOff className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button onClick={load} variant="outline" className="mt-4 rounded-full">
            <RefreshCcw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      )}

      {status === "success" && category && (
        <>
          <PageHeader
            title={category.name_ar}
            subtitle={`منتجات ${category.name_ar} من كتالوج صبح الحقيقي`}
          />

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              لا توجد منتجات في هذه الفئة حاليًا.
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ApiProductCard product={p} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}
