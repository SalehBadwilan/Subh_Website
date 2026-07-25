import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search as SearchIcon, Sparkles, WifiOff, X } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/customer/CustomerShell";
import { ApiProductCard } from "@/components/customer/ApiProductCard";
import {
  ApiRequestError,
  getCategories,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/api";
import { getProducts } from "@/lib/api-customer";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
});

export const Route = createFileRoute("/customer/search")({
  head: () => ({
    meta: [
      { title: "البحث — صبح" },
      { name: "description", content: "ابحث في منتجات صبح حسب الاسم أو الفئة." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: SearchPage,
});

const SEARCH_DEBOUNCE_MS = 300;

type LoadStatus = "loading" | "success" | "error";

function SearchPage() {
  const { q: initialQ = "", cat: initialCat } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [activeCat, setActiveCat] = useState<string | undefined>(initialCat);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    setError(null);
    // Real backend calls: the whole active catalog + categories, then the text
    // filter runs client-side (the backend has no free-text product search —
    // that's what the AI search endpoint is for).
    Promise.all([getProducts({ limit: 100 }), getCategories()])
      .then(([prod, cats]) => {
        setProducts(prod.products);
        setCategories(cats);
        setStatus("success");
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : "تعذّر جلب المنتجات.");
        setStatus("error");
      });
  }

  useEffect(load, []);

  // Live search: debounce the query so results update automatically while
  // typing without hammering the URL or re-renders on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      navigate({
        search: { q: q || undefined, cat: activeCat },
        replace: true,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, activeCat, navigate]);

  const results = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat && p.category_id !== activeCat) return false;
      if (!needle) return true;
      return (
        p.name_ar.toLowerCase().includes(needle) ||
        (p.description_ar ?? "").toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle)
      );
    });
  }, [products, debouncedQ, activeCat]);

  function toggleCat(id: string) {
    setActiveCat((prev) => (prev === id ? undefined : id));
  }

  function clearAll() {
    setQ("");
    setDebouncedQ("");
    setActiveCat(undefined);
    navigate({ search: {}, replace: true });
  }

  const categoryName = (p: ApiProduct) =>
    p.category_id ? categories.find((c) => c.id === p.category_id)?.name_ar : undefined;

  return (
    <PageContainer>
      <PageHeader
        title="البحث في صبح"
        subtitle="ابحث في كتالوج صبح الحقيقي بالاسم أو الفئة"
      />

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن منتج…"
          className="h-12 rounded-full border-border bg-card pr-10 pl-10 text-base"
          aria-label="بحث"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="مسح البحث"
            className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Link
        to="/customer/ai-search"
        search={{ q: q.trim() || undefined }}
        className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary/60"
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        ما لقيت اللي تبغاه؟ جرّب البحث الذكي بالذكاء الاصطناعي
      </Link>

      {status === "loading" && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <div role="alert" className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
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

      {status === "success" && (
        <>
          {categories.length > 0 && (
            <div className="mt-4 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors",
                      activeCat === c.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/40",
                    )}
                  >
                    {c.name_ar}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="num font-semibold text-foreground">{results.length}</span>{" "}
              نتيجة
            </p>
            {(activeCat || q) && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-primary hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState q={debouncedQ} categories={categories} onCat={toggleCat} />
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((p) => (
                <li key={p.id}>
                  <ApiProductCard product={p} categoryName={categoryName(p)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  );
}

function EmptyState({
  q,
  categories,
  onCat,
}: {
  q: string;
  categories: ApiCategory[];
  onCat: (id: string) => void;
}) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <SearchIcon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-foreground">لا توجد نتائج</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        لم نعثر على منتجات تطابق «{q || "بحثك"}». جرّب كلمات أخرى أو تصفّح الفئات.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {categories.slice(0, 5).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCat(c.id)}
            className="rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-primary"
          >
            {c.name_ar}
          </button>
        ))}
      </div>
    </div>
  );
}
